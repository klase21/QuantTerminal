export function clamp(value: number, min = 0, max = 100) {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function round(value: number, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function safeNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}
