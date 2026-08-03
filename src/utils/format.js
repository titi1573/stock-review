export const STATUS = { SUCCESS: "success", PARTIAL: "partial", STALE: "stale" };

export const TYPE = { UP: "up", DOWN: "down" };

export function formatPct(n) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function formatChange(n) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}

export function numClass(n) {
  return n >= 0 ? "num-up" : "num-down";
}
