// Coherent unit iconography: every unit type shares one badge frame (a
// rounded square, tinted by owner color, white outline) with a distinct
// white line-art glyph inside. This keeps friendly/enemy reading instant
// (color) and unit type recognizable at a glance (glyph), and gives every
// future branch - air, naval, armor, covert - a slot in the same visual
// language. Icons are generated as SVG data URIs and cached.

// White line-art glyph per unit type, drawn centered in a 64x64 viewport.
// Only `infantry` is buildable today; the rest are defined so the map stays
// visually consistent the moment those branches ship.
const GLYPHS = {
  // Infantry: the NATO crossed-lines symbol.
  infantry: `<path d='M20 20 L44 44 M44 20 L20 44' stroke='white' stroke-width='5' stroke-linecap='round' fill='none'/>`,
  // Armored / ground vehicle: NATO armor oval.
  armor: `<ellipse cx='32' cy='32' rx='14' ry='8' fill='none' stroke='white' stroke-width='4'/>`,
  // Fixed-wing aircraft: a delta planform.
  plane: `<path d='M32 16 L46 44 L32 37 L18 44 Z' fill='white'/>`,
  // Helicopter: rotor disc, body and tail.
  helicopter: `<g stroke='white' stroke-width='3.5' stroke-linecap='round' fill='none'><line x1='15' y1='22' x2='49' y2='22'/><line x1='32' y1='22' x2='32' y2='27'/><circle cx='32' cy='34' r='7'/><line x1='38' y1='39' x2='48' y2='45'/></g>`,
  // Warship: a hull with a mast.
  ship: `<g fill='white'><path d='M17 34 H47 L41 45 H23 Z'/><rect x='30.5' y='19' width='3' height='15'/></g>`,
  // Drone: quadcopter — four rotors around a core.
  drone: `<g fill='white'><circle cx='21' cy='21' r='4.5'/><circle cx='43' cy='21' r='4.5'/><circle cx='21' cy='43' r='4.5'/><circle cx='43' cy='43' r='4.5'/><rect x='29' y='29' width='6' height='6' rx='1'/></g><g stroke='white' stroke-width='3'><line x1='24' y1='24' x2='40' y2='40'/><line x1='40' y1='24' x2='24' y2='40'/></g>`,
  // Commando / special forces: a dagger.
  commando: `<g fill='white'><path d='M32 15 L35 39 H29 Z'/><rect x='24' y='39' width='16' height='3.5' rx='1'/><rect x='30.5' y='42' width='3' height='7'/></g>`,
  // Secret agent: an eye.
  spy: `<g fill='none' stroke='white' stroke-width='3'><path d='M17 32 Q32 20 47 32 Q32 44 17 32 Z'/></g><circle cx='32' cy='32' r='4.5' fill='white'/>`,
};

// Maps server unit-type names to the glyph that depicts them.
const TYPE_GLYPH = {
  infantry: 'infantry',
  commando: 'commando',
  tank: 'armor',
  aircraft: 'plane',
  helicopter: 'helicopter',
  drone: 'drone',
  warship: 'ship',
  spy: 'spy',
};

const cache = new Map();

// colorHex tints the badge; the glyph stays white for contrast on any color.
export function unitIconDataUri(type, colorHex) {
  const key = `${type}|${colorHex}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const glyph = GLYPHS[TYPE_GLYPH[type] ?? type] ?? GLYPHS.infantry;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>` +
    `<rect x='9' y='9' width='46' height='46' rx='11' fill='${colorHex}' stroke='white' stroke-width='3'/>` +
    glyph +
    `</svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}

// Friendly units read cyan, everyone else's read red. Kept as hex so the
// same values can tint both the SVG badge and any HUD chip.
export const OWN_UNIT_COLOR = '#22d3ee';
export const ENEMY_UNIT_COLOR = '#f43f5e';

const hpCache = new Map();

// A small horizontal health bar (green→amber→red by fraction) as an SVG data
// URI, bucketed to 5% steps so the cache stays small. Rendered as a billboard
// above damaged units.
export function hpBarDataUri(fraction) {
  const f = Math.max(0, Math.min(1, fraction));
  const bucket = Math.round(f * 20) / 20;
  const cached = hpCache.get(bucket);
  if (cached) return cached;

  const color = bucket > 0.5 ? '#4ade80' : bucket > 0.25 ? '#facc15' : '#f43f5e';
  const w = 40;
  const fillW = Math.round(w * bucket);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='8' viewBox='0 0 ${w} 8'>` +
    `<rect x='0' y='0' width='${w}' height='8' rx='2' fill='black' fill-opacity='0.55'/>` +
    `<rect x='1' y='1' width='${Math.max(0, fillW - 2)}' height='6' rx='1' fill='${color}'/>` +
    `</svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  hpCache.set(bucket, uri);
  return uri;
}
