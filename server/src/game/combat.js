import * as turf from '@turf/turf';
import { getUnitType } from './unitTypes.js';

// Pure combat resolution for one tick. Every armed unit deals its `attack`
// to the single nearest ENEMY unit (a unit of a different nation) within its
// weapon `rangeKm`. Damage from all attackers is summed, then applied; units
// dropping to 0 hp are destroyed. Diplomacy doesn't exist yet, so any other
// nation is hostile.
//
// units: [{ id, nationId, type, lat, lon, hp }]
// returns { damaged: [{id, hp}], destroyed: [{id, nationId}] }
export function resolveCombat(units) {
  const damage = new Map(); // unitId -> total damage this tick

  for (const attacker of units) {
    const spec = getUnitType(attacker.type);
    if (!spec || spec.attack <= 0 || spec.rangeKm <= 0) continue;

    let nearest = null;
    let nearestKm = Infinity;
    for (const target of units) {
      if (target.nationId === attacker.nationId) continue; // friendly
      const d = turf.distance([attacker.lon, attacker.lat], [target.lon, target.lat], {
        units: 'kilometers',
      });
      if (d <= spec.rangeKm && d < nearestKm) {
        nearest = target;
        nearestKm = d;
      }
    }
    if (nearest) {
      damage.set(nearest.id, (damage.get(nearest.id) ?? 0) + spec.attack);
    }
  }

  const damaged = [];
  const destroyed = [];
  for (const unit of units) {
    const dmg = damage.get(unit.id);
    if (!dmg) continue;
    const newHp = unit.hp - dmg;
    if (newHp <= 0) {
      destroyed.push({ id: unit.id, nationId: unit.nationId });
    } else {
      damaged.push({ id: unit.id, hp: newHp });
    }
  }
  return { damaged, destroyed };
}
