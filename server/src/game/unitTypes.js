// Catalog of buildable unit types (modern-warfare roster). Each costs a mix
// of resources, requires an unlocking building, and takes game-time to
// produce before it deploys. Combat stats: `attack` damage dealt per tick to
// the nearest enemy within `rangeKm`. `domain` is informational for now
// (land/air/sea); movement is unconstrained until coastal spawns exist.
export const UNIT_TYPES = {
  infantry: {
    label: 'Infanterie',
    domain: 'land',
    cost: { money: 500, materials: 100, manpower: 100 },
    requiresBuilding: 'barracks',
    buildGameHours: 2,
    speedKmh: 50,
    hp: 100,
    attack: 10,
    rangeKm: 40,
  },
  commando: {
    label: 'Commando',
    domain: 'land',
    cost: { money: 800, materials: 80, manpower: 120 },
    requiresBuilding: 'barracks',
    buildGameHours: 3,
    speedKmh: 60,
    hp: 90,
    attack: 20,
    rangeKm: 30,
  },
  tank: {
    label: 'Char',
    domain: 'land',
    cost: { money: 1200, materials: 300, oil: 100 },
    requiresBuilding: 'arms_factory',
    buildGameHours: 3,
    speedKmh: 70,
    hp: 220,
    attack: 26,
    rangeKm: 45,
  },
  aircraft: {
    label: 'Avion de chasse',
    domain: 'air',
    cost: { money: 2000, materials: 250, oil: 200 },
    requiresBuilding: 'airbase',
    buildGameHours: 4,
    speedKmh: 700,
    hp: 120,
    attack: 34,
    rangeKm: 70,
  },
  helicopter: {
    label: 'Hélicoptère',
    domain: 'air',
    cost: { money: 1500, materials: 200, oil: 150 },
    requiresBuilding: 'airbase',
    buildGameHours: 3,
    speedKmh: 250,
    hp: 150,
    attack: 24,
    rangeKm: 55,
  },
  drone: {
    label: 'Drone',
    domain: 'air',
    cost: { money: 900, materials: 150, oil: 80 },
    requiresBuilding: 'airbase',
    buildGameHours: 2,
    speedKmh: 300,
    hp: 70,
    attack: 18,
    rangeKm: 60,
  },
  warship: {
    label: 'Navire de guerre',
    domain: 'sea',
    cost: { money: 2500, materials: 400, oil: 200 },
    requiresBuilding: 'shipyard',
    buildGameHours: 5,
    speedKmh: 60,
    hp: 320,
    attack: 30,
    rangeKm: 80,
  },
  spy: {
    label: 'Agent secret',
    domain: 'land',
    cost: { money: 1000, manpower: 50 },
    requiresBuilding: 'intelligence_agency',
    buildGameHours: 3,
    speedKmh: 80,
    hp: 40,
    attack: 0,
    rangeKm: 0,
  },
};

export function getUnitType(type) {
  return UNIT_TYPES[type];
}
