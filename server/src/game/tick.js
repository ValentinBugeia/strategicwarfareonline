import * as turf from '@turf/turf';
import { pool } from '../db/pool.js';
import { TICK_MS, stepKmPerTick } from './config.js';
import { withEta } from './eta.js';

async function runIncomeTick() {
  const { rows } = await pool.query(
    `UPDATE nations SET money = money + income_rate
     WHERE owner_user_id IS NOT NULL
     RETURNING owner_user_id AS "ownerId", money, income_rate AS "incomeRate"`
  );
  return rows;
}

async function runMovementTick() {
  const { rows: moving } = await pool.query(
    `SELECT id, lat, lon, dest_lat AS "destLat", dest_lon AS "destLon", speed_kmh AS "speedKmh"
     FROM units WHERE dest_lat IS NOT NULL AND dest_lon IS NOT NULL`
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

export function startGameLoop(io) {
  setInterval(async () => {
    try {
      const incomeUpdates = await runIncomeTick();
      for (const nation of incomeUpdates) {
        io.to(`user:${nation.ownerId}`).emit('nation:update', {
          money: nation.money,
          incomeRate: nation.incomeRate,
        });
      }

      const anyMoved = await runMovementTick();
      if (anyMoved) {
        const { rows: units } = await pool.query(
          `SELECT id, nation_id AS "nationId", type, lat, lon, dest_lat AS "destLat",
                  dest_lon AS "destLon", speed_kmh AS "speedKmh", hp
           FROM units`
        );
        io.emit('units:update', units.map(withEta));
      }
    } catch (err) {
      console.error('Game tick failed:', err);
    }
  }, TICK_MS);
}
