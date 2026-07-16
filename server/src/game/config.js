// Central game-time constants, shared by the tick loop and the ETA helper
// so movement and arrival estimates can never drift apart.

// How often the simulation advances, in real milliseconds.
export const TICK_MS = 3000;

// The world runs this many times faster than wall-clock time. Unit speeds
// stay realistic (km/h) while a cross-continent march still completes in a
// playable handful of minutes. Raise it to speed the whole game up, lower
// it to make movement more deliberate - it's the single balance knob.
export const GAME_SPEED_MULTIPLIER = 200;

// The distance a unit of the given real-world speed covers per tick.
export function stepKmPerTick(speedKmh) {
  const gameHoursPerTick = (TICK_MS / 1000 / 3600) * GAME_SPEED_MULTIPLIER;
  return speedKmh * gameHoursPerTick;
}
