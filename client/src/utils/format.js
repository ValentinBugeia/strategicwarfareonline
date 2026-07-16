// Human-readable arrival delay, e.g. "arrivé", "12 s", "4 min", "1 h 20",
// "2 j 3 h". Keeps to the two most significant units so it stays glanceable.
export function formatEta(seconds) {
  if (seconds == null) return null;
  if (seconds <= 0) return 'arrivé';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')}`;
  if (minutes > 0) return `${minutes} min`;
  return `${secs} s`;
}
