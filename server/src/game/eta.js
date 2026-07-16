import * as turf from '@turf/turf';
import { GAME_SPEED_MULTIPLIER } from './config.js';

// Real-world seconds until a unit reaches its destination, accounting for
// the game-time acceleration. Returns null for a unit that isn't moving.
// Kept server-side and sent to clients so the map and the panel always
// agree with the simulation that actually moves the unit.
export function etaSeconds(unit) {
  if (unit.destLat == null || unit.destLon == null) return null;
  const remainingKm = turf.distance([unit.lon, unit.lat], [unit.destLon, unit.destLat], {
    units: 'kilometers',
  });
  const effectiveSpeedKmh = Number(unit.speedKmh) * GAME_SPEED_MULTIPLIER;
  if (effectiveSpeedKmh <= 0) return null;
  return Math.round((remainingKm / effectiveSpeedKmh) * 3600);
}

// Adds etaSeconds to a unit row for API/socket payloads.
export function withEta(unit) {
  return { ...unit, etaSeconds: etaSeconds(unit) };
}
