import type {
  MarketDirection,
  MarketDriver,
  MarketDriverQuality,
} from "./marketDriverTypes"

export function boundedScore(value: number) {
  return Number(Math.max(0, Math.min(100, value)).toFixed(2))
}

export function qualityWeight(quality: MarketDriverQuality) {
  if (quality === "verified") return 1
  if (quality === "degraded") return 0.6
  if (quality === "unknown") return 0.3
  return 0
}

export function rankedDrivers(drivers: MarketDriver[]) {
  return [...drivers].sort((left, right) => (
    right.impactScore - left.impactScore
    || left.category.localeCompare(right.category)
  ))
}

export function evidenceDirection(drivers: MarketDriver[]): MarketDirection {
  let positive = 0
  let negative = 0
  for (const driver of drivers) {
    const weight = driver.impactScore * qualityWeight(driver.quality)
    if (driver.evidence.direction === "positive") positive += weight
    if (driver.evidence.direction === "negative") negative += weight
  }
  if (!positive && !negative) return "unknown"
  const total = positive + negative
  if (positive / total >= 0.65) return "positive"
  if (negative / total >= 0.65) return "negative"
  return "mixed"
}

export function evidenceConfidence(input: {
  drivers: MarketDriver[]
  totalCategories: number
}) {
  if (!input.drivers.length || input.totalCategories <= 0) return 0
  const coverage = input.drivers.length / input.totalCategories
  const quality = input.drivers.reduce(
    (sum, driver) => sum + qualityWeight(driver.quality),
    0,
  ) / input.drivers.length
  return boundedScore(coverage * quality * 100)
}

export function aggregateQuality(drivers: MarketDriver[]): MarketDriverQuality {
  if (!drivers.length) return "unavailable"
  if (drivers.every((driver) => driver.quality === "verified")) return "verified"
  if (drivers.some((driver) => driver.quality === "verified" || driver.quality === "degraded")) {
    return "degraded"
  }
  return "unknown"
}
