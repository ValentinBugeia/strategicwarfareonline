import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const nationsRouter = Router();

// Public world state: who controls what. Money/income stay private to the
// owner (returned only via /me) since that's the strategic info a rival
// shouldn't see for free.
nationsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, iso_code AS "isoCode", name, centroid_lat AS "centroidLat",
            centroid_lon AS "centroidLon", owner_user_id AS "ownerId", claimed_at AS "claimedAt"
     FROM nations ORDER BY name`
  );
  res.json(rows);
});

nationsRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, iso_code AS "isoCode", name, centroid_lat AS "centroidLat",
            centroid_lon AS "centroidLon", money, income_rate AS "incomeRate", claimed_at AS "claimedAt"
     FROM nations WHERE owner_user_id = $1`,
    [req.user.id]
  );
  res.json(rows[0] ?? null);
});

nationsRouter.post('/:iso/claim', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const already = await client.query('SELECT id FROM nations WHERE owner_user_id = $1', [req.user.id]);
    if (already.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already control a nation' });
    }

    const { rows } = await client.query(
      `UPDATE nations SET owner_user_id = $1, claimed_at = now()
       WHERE iso_code = $2 AND owner_user_id IS NULL
       RETURNING id, iso_code AS "isoCode", name, centroid_lat AS "centroidLat",
                 centroid_lon AS "centroidLon", money, income_rate AS "incomeRate", claimed_at AS "claimedAt"`,
      [req.user.id, req.params.iso]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Nation not found or already claimed' });
    }

    await client.query('COMMIT');
    req.app.get('io').emit('nations:changed');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
