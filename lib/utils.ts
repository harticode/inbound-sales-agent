export function round(value: number, precision = 2) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

export function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function trendDir(current: number, previous: number): "up" | "down" | "neutral" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "neutral";
}

export function money(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function coerceFloat(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    if (!v.trim()) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

export function coerceInt(v: unknown, defaultVal = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    if (!v.trim()) return defaultVal;
    const n = parseInt(v, 10);
    return isNaN(n) ? defaultVal : n;
  }
  return defaultVal;
}
