import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getUnitType } from '../game/unitTypes.js';

export const unitsRouter = Router();

async function getOwnNation(userId) {
  const { rows } = await pool.query('SELECT * FROM nations WHERE owner_user_id = $1', [userId]);
  return rows[0] ?? null;
}

// All units are visible to everyone: this is a shared battlefield, not a
// fog-of-war simulation (yet) - seeing enemy troop movements is part of
// the tension. Buying/moving is still restricted to the owning player.
unitsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, nation_id AS "nationId", type, lat, lon, dest_lat AS "destLat",
              dest_lon AS "destLon", speed_kmh AS "speedKmh", hp
       FROM units`
    );
    res.json(rows);
  })
);

unitsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { type } = req.body ?? {};
    const spec = getUnitType(type);
    if (!spec) {
      return res.status(400).json({ error: `Unknown unit type: ${type}` });
    }

    const nation = await getOwnNation(req.user.id);
    if (!nation) {
      return res.status(409).json({ error: 'You do not control a nation yet' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Conditional debit: the money check must happen atomically with the
      // deduction, otherwise two concurrent purchases could both pass a
      // read-then-write check and drive the treasury negative.
      const debit = await client.query(
        'UPDATE nations SET money = money - $1 WHERE id = $2 AND money >= $1 RETURNING id',
        [spec.cost, nation.id]
      );
      if (debit.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(402).json({ error: 'Insufficient funds' });
      }
      const { rows } = await client.query(
        `INSERT INTO units (nation_id, type, lat, lon, speed_kmh, hp)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nation_id AS "nationId", type, lat, lon, dest_lat AS "destLat",
                   dest_lon AS "destLon", speed_kmh AS "speedKmh", hp`,
        [nation.id, type, nation.centroid_lat, nation.centroid_lon, spec.speedKmh, spec.hp]
      );
      await client.query('COMMIT');
      req.app.get('io').emit('units:changed');
      res.status(201).json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

unitsRouter.post(
  '/:id/move',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { lat, lon } = req.body ?? {};
    if (typeof lat !== 'number' || typeof lon !== 'number' || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'lat/lon must be numbers within valid ranges' });
    }
    const unitId = Number(req.params.id);
    if (!Number.isInteger(unitId)) {
      return res.status(400).json({ error: 'Invalid unit id' });
    }

    const nation = await getOwnNation(req.user.id);
    if (!nation) {
      return res.status(409).json({ error: 'You do not control a nation yet' });
    }

    const { rows } = await pool.query(
      `UPDATE units SET dest_lat = $1, dest_lon = $2, updated_at = now()
       WHERE id = $3 AND nation_id = $4
       RETURNING id, nation_id AS "nationId", type, lat, lon, dest_lat AS "destLat",
                 dest_lon AS "destLon", speed_kmh AS "speedKmh", hp`,
      [lat, lon, unitId, nation.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found or not yours' });
    }

    res.json(rows[0]);
  })
);
