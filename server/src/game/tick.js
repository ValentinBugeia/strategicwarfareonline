import * as turf from '@turf/turf';
import { pool } from '../db/pool.js';
import { TICK_MS, stepKmPerTick } from './config.js';
import { productionRates } from './economy.js';
import { resolveCombat } from './combat.js';
import { withEta } from './eta.js';

// Grants each owned nation its per-tick production (base + active building
// bonuses) across all four resources, and returns per-owner updates to push.
async function runProductionTick() {
  const { rows } = await pool.query(
    `SELECT n.id, n.owner_user_id AS "ownerId",
            COALESCE(array_agg(b.type) FILTER (WHERE b.status = 'active'), '{}') AS "activeTypes"
     FROM nations n
     LEFT JOIN buildings b ON b.nation_id = n.id AND b.status = 'active'
     WHERE n.owner_user_id IS NOT NULL
     GROUP BY n.id, n.owner_user_id`
  );

  const updates = [];
  for (const nation of rows) {
    const rates = productionRates(nation.activeTypes);
    const { rows: updated } = await pool.query(
      `UPDATE nations
       SET money = money + $2, oil = oil + $3, materials = materials + $4, manpower = manpower + $5
       WHERE id = $1
       RETURNING money, oil, materials, manpower`,
      [nation.id, rates.money, rates.oil, rates.materials, rates.manpower]
    );
    updates.push({ ownerId: nation.ownerId, resources: updated[0], productionRates: rates });
  }
  return updates;
}

// Completes constructions/productions whose time has come. Returns the set of
// owner ids to notify and whether any new unit was deployed onto the map.
async function runCompletionTick() {
  const owners = new Set();

  const { rows: doneBuildings } = await pool.query(
    `UPDATE buildings SET status = 'active'
     WHERE status = 'constructing' AND completes_at <= now()
     RETURNING nation_id AS "nationId"`
  );
  const { rows: doneUnits } = await pool.query(
    `UPDATE units SET status = 'active', ready_at = NULL
     WHERE status = 'producing' AND ready_at <= now()
     RETURNING nation_id AS "nationId"`
  );

  const touchedNations = [...doneBuildings, ...doneUnits].map((r) => r.nationId);
  if (touchedNations.length > 0) {
    const { rows } = await pool.query(
      'SELECT owner_user_id AS "ownerId" FROM nations WHERE id = ANY($1) AND owner_user_id IS NOT NULL',
      [touchedNations]
    );
    for (const r of rows) owners.add(r.ownerId);
  }
  return { owners, unitDeployed: doneUnits.length > 0 };
}

async function runMovementTick() {
  const { rows: moving } = await pool.query(
    `SELECT id, lat, lon, dest_lat AS "destLat", dest_lon AS "destLon", speed_kmh AS "speedKmh"
     FROM units WHERE status = 'active' AND dest_lat IS NOT NULL AND dest_lon IS NOT NULL`
  );

  const updates = [];
  for (const unit of moving) {
    const from = [unit.lon, unit.lat];
    const to = [unit.destLon, unit.destLat];
    const remainingKm = turf.distance(from, to, { units: 'kilometers' });
    const maxStepKm = stepKmPerTick(unit.speedKmh);

    if (remainingKm <= maxStepKm) {
      updates.push({ id: unit.id, lat: unit.destLat, lon: unit.destLon, arrived: true });
    } else {
      const bearing = turf.bearing(from, to);
      const [lon, lat] = turf.destination(from, maxStepKm, bearing, { units: 'kilometers' }).geometry.coordinates;
      updates.push({ id: unit.id, lat, lon, arrived: false });
    }
  }

  for (const u of updates) {
    if (u.arrived) {
      await pool.query(
        'UPDATE units SET lat = $1, lon = $2, dest_lat = NULL, dest_lon = NULL, updated_at = now() WHERE id = $3',
        [u.lat, u.lon, u.id]
      );
    } else {
      await pool.query('UPDATE units SET lat = $1, lon = $2, updated_at = now() WHERE id = $3', [
        u.lat,
        u.lon,
        u.id,
      ]);
    }
  }

  return updates.length > 0;
}

// Resolves one round of combat between deployed enemy units and writes the
// results. Returns { changed, destroyed } where destroyed carries each lost
// unit's type and owning nation so the loop can send combat reports.
async function runCombatTick() {
  const { rows: units } = await pool.query(
    `SELECT id, nation_id AS "nationId", type, lat, lon, hp FROM units WHERE status = 'active'`
  );
  const { damaged, destroyed } = resolveCombat(units);
  if (damaged.length === 0 && destroyed.length === 0) return { changed: false, destroyed: [] };

  for (const u of damaged) {
    await pool.query('UPDATE units SET hp = $1 WHERE id = $2', [u.hp, u.id]);
  }
  if (destroyed.length > 0) {
    await pool.query('DELETE FROM units WHERE id = ANY($1)', [destroyed.map((u) => u.id)]);
  }
  return { changed: true, destroyed };
}

// Tells each affected player how many of their units were lost this tick.
async function sendCombatReports(io, destroyed) {
  if (destroyed.length === 0) return;
  const lossesByNation = new Map();
  for (const u of destroyed) {
    lossesByNation.set(u.nationId, (lossesByNation.get(u.nationId) ?? 0) + 1);
  }
  const { rows } = await pool.query(
    'SELECT id, owner_user_id AS "ownerId" FROM nations WHERE id = ANY($1) AND owner_user_id IS NOT NULL',
    [[...lossesByNation.keys()]]
  );
  for (const nation of rows) {
    io.to(`user:${nation.ownerId}`).emit('combat:event', {
      lost: lossesByNation.get(nation.id),
    });
  }
}

async function broadcastActiveUnits(io) {
  const { rows: units } = await pool.query(
    `SELECT id, nation_id AS "nationId", type, lat, lon, dest_lat AS "destLat",
            dest_lon AS "destLon", speed_kmh AS "speedKmh", hp
     FROM units WHERE status = 'active'`
  );
  io.emit('units:update', units.map(withEta));
}

export function startGameLoop(io) {
  setInterval(async () => {
    try {
      const production = await runProductionTick();
      for (const u of production) {
        io.to(`user:${u.ownerId}`).emit('nation:update', {
          ...u.resources,
          productionRates: u.productionRates,
        });
      }

      const { owners, unitDeployed } = await runCompletionTick();
      for (const ownerId of owners) {
        io.to(`user:${ownerId}`).emit('economy:changed');
      }

      const anyMoved = await runMovementTick();
      const combat = await runCombatTick();
      if (anyMoved || unitDeployed || combat.changed) {
        await broadcastActiveUnits(io);
      }
      await sendCombatReports(io, combat.destroyed);
    } catch (err) {
      console.error('Game tick failed:', err);
    }
  }, TICK_MS);
}
