import { GAME_SPEED_MULTIPLIER } from './config.js';

// The four resources every nation manages. Order here is the display order.
export const RESOURCES = ['money', 'oil', 'materials', 'manpower'];

// Baseline production per tick for any owned nation, before buildings.
export const BASE_PRODUCTION = {
  money: 50,
  oil: 4,
  materials: 4,
  manpower: 4,
};

// Modern buildings. `cost` is paid up front, construction takes
// `buildGameHours` of game time (accelerated by GAME_SPEED_MULTIPLIER), and
// once active a building adds `production` per tick and/or `unlocks` unit
// types. Multiple copies stack.
export const BUILDINGS = {
  refinery: {
    label: 'Raffinerie',
    cost: { money: 800, materials: 200 },
    buildGameHours: 4,
    production: { oil: 10 },
  },
  arms_factory: {
    label: "Usine d'armement",
    cost: { money: 1000, materials: 150 },
    buildGameHours: 5,
    production: { materials: 10 },
  },
  barracks: {
    label: 'Caserne',
    cost: { money: 700, materials: 150 },
    buildGameHours: 3,
    production: { manpower: 8 },
    unlocks: ['infantry'],
  },
  bank: {
    label: 'Centre financier',
    cost: { money: 1200 },
    buildGameHours: 4,
    production: { money: 40 },
  },
};

export function getBuilding(type) {
  return BUILDINGS[type];
}

// Real seconds a given game-hours duration takes, under time acceleration.
export function gameHoursToRealSeconds(gameHours) {
  return (gameHours * 3600) / GAME_SPEED_MULTIPLIER;
}

// Sums base production and every active building's bonus into a per-tick
// production map for one nation.
export function productionRates(activeBuildingTypes) {
  const rates = { ...BASE_PRODUCTION };
  for (const type of activeBuildingTypes) {
    const spec = BUILDINGS[type];
    if (!spec?.production) continue;
    for (const [res, amount] of Object.entries(spec.production)) {
      rates[res] += amount;
    }
  }
  return rates;
}

// The set of unit types unlocked by a nation's active buildings.
export function unlockedUnitTypes(activeBuildingTypes) {
  const unlocked = new Set();
  for (const type of activeBuildingTypes) {
    for (const unit of BUILDINGS[type]?.unlocks ?? []) unlocked.add(unit);
  }
  return unlocked;
}
