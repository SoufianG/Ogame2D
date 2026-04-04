export function formatNumber(n: number): string {
  return Math.floor(n).toLocaleString('fr-FR');
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return `${h}h ${rm}m ${s}s`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return `${d}j ${rh}h ${rm}m`;
}
