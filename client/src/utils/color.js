// Deterministic color per player id, so an empire keeps the same color
// across sessions without the server needing to store one.
export function ownerColorHsl(ownerId, alpha = 0.55) {
  const hue = (ownerId * 137.508) % 360; // golden angle spreads colors apart
  return `hsla(${hue}, 65%, 45%, ${alpha})`;
}
