import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const nationsRouter = Router();

// Public world state: who controls what. Money/income stay private to the
// owner (returned only via /me) since that's the strategic info a rival
// shouldn't see for free.
nationsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, iso_code AS "isoCode", name, centroid_lat AS "centroidLat",
              centroid_lon AS "centroidLon", owner_user_id AS "ownerId", claimed_at AS "claimedAt"
       FROM nations ORDER BY name`
    );
    res.json(rows);
  })
);

nationsRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, iso_code AS "isoCode", name, centroid_lat AS "centroidLat",
              centroid_lon AS "centroidLon", money, income_rate AS "incomeRate", claimed_at AS "claimedAt"
       FROM nations WHERE owner_user_id = $1`,
      [req.user.id]
    );
    res.json(rows[0] ?? null);
  })
);

nationsRouter.post(
  '/:iso/claim',
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      // The WHERE owner_user_id IS NULL guard stops two players racing for
      // the same country; the uniq_nations_owner partial unique index stops
      // one player racing themselves into owning two different countries.
      const { rows } = await pool.query(
        `UPDATE nations SET owner_user_id = $1, claimed_at = now()
         WHERE iso_code = $2 AND owner_user_id IS NULL
         RETURNING id, iso_code AS "isoCode", name, centroid_lat AS "centroidLat",
                   centroid_lon AS "centroidLon", money, income_rate AS "incomeRate", claimed_at AS "claimedAt"`,
        [req.user.id, req.params.iso]
      );

      if (rows.length === 0) {
        return res.status(409).json({ error: 'Nation not found or already claimed' });
      }

      req.app.get('io').emit('nations:changed');
      res.json(rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'You already control a nation' });
      }
      throw err;
    }
  })
);
