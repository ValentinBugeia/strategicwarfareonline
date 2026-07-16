// Catalog of buildable unit types. MVP ships with ground infantry only;
// the shape is deliberately generic (cost/speed/hp) so naval, air and
// covert unit types can be added here later without touching the routes
// or the tick loop that moves/broadcasts units.
export const UNIT_TYPES = {
  infantry: { label: 'Infantry Squad', cost: 500, speedKmh: 5, hp: 100 },
};

export function getUnitType(type) {
  return UNIT_TYPES[type];
}
