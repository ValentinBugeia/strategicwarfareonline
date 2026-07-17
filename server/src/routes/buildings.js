import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getBuilding, gameHoursToRealSeconds } from '../game/economy.js';
import { debitResources } from '../game/resourceOps.js';

export const buildingsRouter = Router();

async function getOwnNation(userId) {
  const { rows } = await pool.query('SELECT * FROM nations WHERE owner_user_id = $1', [userId]);
  return rows[0] ?? null;
}

// Buildings are private economy state, so only the owner lists their own.
buildingsRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const nation = await getOwnNation(req.user.id);
    if (!nation) return res.json([]);
    const { rows } = await pool.query(
      `SELECT id, type, status, completes_at AS "completesAt"
       FROM buildings WHERE nation_id = $1 ORDER BY created_at`,
      [nation.id]
    );
    res.json(rows);
  })
);

buildingsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { type } = req.body ?? {};
    const spec = getBuilding(type);
    if (!spec) {
      return res.status(400).json({ error: `Unknown building type: ${type}` });
    }

    const nation = await getOwnNation(req.user.id);
    if (!nation) {
      return res.status(409).json({ error: 'You do not control a nation yet' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const paid = await debitResources(client, nation.id, spec.cost);
      if (!paid) {
        await client.query('ROLLBACK');
        return res.status(402).json({ error: 'Insufficient resources' });
      }
      const completesInSeconds = gameHoursToRealSeconds(spec.buildGameHours);
      const { rows } = await client.query(
        `INSERT INTO buildings (nation_id, type, status, completes_at)
         VALUES ($1, $2, 'constructing', now() + ($3 || ' seconds')::interval)
         RETURNING id, type, status, completes_at AS "completesAt"`,
        [nation.id, type, completesInSeconds]
      );
      await client.query('COMMIT');
      req.app.get('io').to(`user:${req.user.id}`).emit('economy:changed');
      res.status(201).json(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);
