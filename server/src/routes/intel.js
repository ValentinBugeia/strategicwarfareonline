import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { countryIsoAt } from '../game/geo.js';
import { productionRates } from '../game/economy.js';

export const intelRouter = Router();

// Espionage payoff: for every one of the player's secret agents standing
// inside a rival nation's borders, reveal that nation's otherwise-private
// economy and a summary of its forces. One report per infiltrated nation.
intelRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows: mine } = await pool.query('SELECT id FROM nations WHERE owner_user_id = $1', [req.user.id]);
    if (mine.length === 0) return res.json([]);
    const myNationId = mine[0].id;

    const { rows: spies } = await pool.query(
      "SELECT lon, lat FROM units WHERE nation_id = $1 AND type = 'spy' AND status = 'active'",
      [myNationId]
    );
    if (spies.length === 0) return res.json([]);

    // Which rival nations are currently infiltrated?
    const infiltrated = new Set();
    for (const spy of spies) {
      const iso = countryIsoAt(spy.lon, spy.lat);
      if (iso) infiltrated.add(iso);
    }
    if (infiltrated.size === 0) return res.json([]);

    const { rows: targets } = await pool.query(
      `SELECT id, iso_code AS "isoCode", name, owner_user_id AS "ownerId",
              money, oil, materials, manpower
       FROM nations
       WHERE iso_code = ANY($1) AND owner_user_id IS NOT NULL AND owner_user_id <> $2`,
      [[...infiltrated], req.user.id]
    );

    const reports = [];
    for (const t of targets) {
      const { rows: buildings } = await pool.query(
        "SELECT type FROM buildings WHERE nation_id = $1 AND status = 'active'",
        [t.id]
      );
      const { rows: unitCounts } = await pool.query(
        "SELECT type, count(*)::int AS count FROM units WHERE nation_id = $1 AND status = 'active' GROUP BY type",
        [t.id]
      );
      reports.push({
        isoCode: t.isoCode,
        name: t.name,
        ownerId: t.ownerId,
        resources: { money: t.money, oil: t.oil, materials: t.materials, manpower: t.manpower },
        productionRates: productionRates(buildings.map((b) => b.type)),
        units: unitCounts,
      });
    }
    res.json(reports);
  })
);
