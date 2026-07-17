// Display mirror of the server economy/roster config (server is the source
// of truth and re-validates every cost/requirement). Used to render labels,
// costs and requirements in the HUD.

export const RESOURCE_META = {
  money: { label: 'Argent', icon: '💰' },
  oil: { label: 'Pétrole', icon: '🛢️' },
  materials: { label: 'Matériel', icon: '🏭' },
  manpower: { label: "Main-d'œuvre", icon: '👥' },
};

export const RESOURCE_ORDER = ['money', 'oil', 'materials', 'manpower'];

export const BUILDINGS = {
  refinery: { label: 'Raffinerie', icon: '🛢️', cost: { money: 800, materials: 200 }, effect: '+10 pétrole/tick' },
  arms_factory: { label: "Usine d'armement", icon: '🏭', cost: { money: 1000, materials: 150 }, effect: '+10 matériel/tick · débloque le char' },
  barracks: { label: 'Caserne', icon: '🎖️', cost: { money: 700, materials: 150 }, effect: '+8 main-d\'œuvre/tick · débloque infanterie & commando' },
  airbase: { label: 'Base aérienne', icon: '✈️', cost: { money: 1800, materials: 300 }, effect: 'débloque avion, hélicoptère & drone' },
  shipyard: { label: 'Chantier naval', icon: '⚓', cost: { money: 2000, materials: 350 }, effect: 'débloque le navire de guerre' },
  intelligence_agency: { label: 'Agence de renseignement', icon: '🕵️', cost: { money: 1500, materials: 100 }, effect: 'débloque l\'agent secret' },
  bank: { label: 'Centre financier', icon: '🏦', cost: { money: 1200 }, effect: '+40 argent/tick' },
};

// Roster: label, cost, requiredBuilding and combat stats for the HUD tooltip.
export const UNITS = {
  infantry: { label: 'Infanterie', cost: { money: 500, materials: 100, manpower: 100 }, requiresBuilding: 'barracks', stats: 'PV 100 · ATQ 10' },
  commando: { label: 'Commando', cost: { money: 800, materials: 80, manpower: 120 }, requiresBuilding: 'barracks', stats: 'PV 90 · ATQ 20' },
  tank: { label: 'Char', cost: { money: 1200, materials: 300, oil: 100 }, requiresBuilding: 'arms_factory', stats: 'PV 220 · ATQ 26' },
  aircraft: { label: 'Avion de chasse', cost: { money: 2000, materials: 250, oil: 200 }, requiresBuilding: 'airbase', stats: 'PV 120 · ATQ 34' },
  helicopter: { label: 'Hélicoptère', cost: { money: 1500, materials: 200, oil: 150 }, requiresBuilding: 'airbase', stats: 'PV 150 · ATQ 24' },
  drone: { label: 'Drone', cost: { money: 900, materials: 150, oil: 80 }, requiresBuilding: 'airbase', stats: 'PV 70 · ATQ 18' },
  warship: { label: 'Navire de guerre', cost: { money: 2500, materials: 400, oil: 200 }, requiresBuilding: 'shipyard', stats: 'PV 320 · ATQ 30' },
  spy: { label: 'Agent secret', cost: { money: 1000, manpower: 50 }, requiresBuilding: 'intelligence_agency', stats: 'PV 40 · espionnage' },
};

// Display order in the production panel.
export const UNIT_ORDER = ['infantry', 'commando', 'tank', 'aircraft', 'helicopter', 'drone', 'warship', 'spy'];

export function unitLabel(type) {
  return UNITS[type]?.label ?? type;
}

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
