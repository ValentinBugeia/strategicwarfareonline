import * as turf from '@turf/turf';
import { pool } from '../db/pool.js';
import { TICK_MS, stepKmPerTick } from './config.js';
import { productionRates } from './economy.js';
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
      if (anyMoved || unitDeployed) {
        await broadcastActiveUnits(io);
      }
    } catch (err) {
      console.error('Game tick failed:', err);
    }
  }, TICK_MS);
}
