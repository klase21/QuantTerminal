export type Direction = "UP" | "DOWN" | "FLAT" | "UNKNOWN"

export function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function average(values: number[]) {
  const clean = values.filter(Number.isFinite)
  if (!clean.length) return 0
  return clean.reduce((sum, value) => sum + value, 0) / clean.length
}

export function metric2(value?: number | null, fallback = "—") {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return value.toFixed(2)
}

export function compactNumber(value?: number | null, fallback = "—") {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

export function directionFromDelta(delta?: number | null, epsilon = 0.001): Direction {
  if (typeof delta !== "number" || !Number.isFinite(delta)) return "UNKNOWN"
  if (delta > epsilon) return "UP"
  if (delta < -epsilon) return "DOWN"
  return "FLAT"
}

export function percentileRank(values: number[], current?: number | null) {
  if (typeof current !== "number" || !Number.isFinite(current)) return null
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!clean.length) return null
  const below = clean.filter((value) => value <= current).length
  return clamp((below / clean.length) * 100)
}
