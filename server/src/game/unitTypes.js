// Catalog of buildable unit types. Each costs a mix of resources, requires
// an unlocking building to be active, and takes game-time to produce before
// it deploys. The shape is generic (cost/speed/hp/build time) so naval, air
// and covert branches can be added here without touching the routes or the
// tick loop.
export const UNIT_TYPES = {
  infantry: {
    label: 'Infanterie',
    cost: { money: 500, materials: 100, manpower: 100 },
    requiresBuilding: 'barracks',
    buildGameHours: 2,
    speedKmh: 50,
    hp: 100,
  },
};

export function getUnitType(type) {
  return UNIT_TYPES[type];
}
