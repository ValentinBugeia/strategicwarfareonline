// Display mirror of the server economy config (server is the source of truth
// and re-validates every cost/requirement). Used to render resource labels,
// building/unit costs and requirements in the HUD.

export const RESOURCE_META = {
  money: { label: 'Argent', icon: '💰' },
  oil: { label: 'Pétrole', icon: '🛢️' },
  materials: { label: 'Matériel', icon: '🏭' },
  manpower: { label: "Main-d'œuvre", icon: '👥' },
};

export const RESOURCE_ORDER = ['money', 'oil', 'materials', 'manpower'];

export const BUILDINGS = {
  refinery: { label: 'Raffinerie', icon: '🛢️', cost: { money: 800, materials: 200 }, effect: '+10 pétrole/tick' },
  arms_factory: { label: "Usine d'armement", icon: '🏭', cost: { money: 1000, materials: 150 }, effect: '+10 matériel/tick' },
  barracks: { label: 'Caserne', icon: '🎖️', cost: { money: 700, materials: 150 }, effect: '+8 main-d\'œuvre/tick · débloque l\'infanterie' },
  bank: { label: 'Centre financier', icon: '🏦', cost: { money: 1200 }, effect: '+40 argent/tick' },
};

export const UNIT_COSTS = {
  infantry: { cost: { money: 500, materials: 100, manpower: 100 }, requiresBuilding: 'barracks' },
};

// Compact cost string like "500💰 100🏭 100👥".
export function formatCost(cost) {
  return RESOURCE_ORDER.filter((r) => cost[r])
    .map((r) => `${cost[r]}${RESOURCE_META[r].icon}`)
    .join(' ');
}

// True if the nation's stockpiles cover every resource in the cost.
export function canAfford(nation, cost) {
  return Object.entries(cost).every(([r, amount]) => Number(nation[r] ?? 0) >= amount);
}
