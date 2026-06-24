import {
  RESERVE_ASSET_CLASSIFICATIONS,
  RESERVE_INTELLIGENCE_QUALITIES,
  RESERVE_INTELLIGENCE_SCHEMA_VERSION,
  RESERVE_OBSERVATION_TYPES,
  RESERVE_TREND_HORIZONS,
  type ReserveIntelligenceObservation,
  type ReserveTrendObservation,
} from "./reserveIntelligenceTypes"

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function finiteOrNull(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value))
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function validateTrend(trend: ReserveTrendObservation, index: number) {
  const errors: string[] = []
  if (!RESERVE_TREND_HORIZONS.includes(trend.horizon)) {
    errors.push(`trend ${index} horizon is invalid.`)
  }
  if (trend.status !== "available" && trend.status !== "unavailable") {
    errors.push(`trend ${index} status is invalid.`)
  }
  if (trend.previousObservedAt !== null && !validDate(trend.previousObservedAt)) {
    errors.push(`trend ${index} previousObservedAt is invalid.`)
  }
  if (!finiteOrNull(trend.quantityChange)) errors.push(`trend ${index} quantityChange is invalid.`)
  if (!finiteOrNull(trend.absoluteChange) || (trend.absoluteChange ?? 0) < 0) {
    errors.push(`trend ${index} absoluteChange is invalid.`)
  }
  if (!finiteOrNull(trend.percentageChange)) errors.push(`trend ${index} percentageChange is invalid.`)
  if (!finiteOrNull(trend.balanceUsdChange)) errors.push(`trend ${index} balanceUsdChange is invalid.`)
  if (trend.status === "available") {
    if (
      trend.previousObservedAt === null
      || trend.quantityChange === null
      || trend.absoluteChange === null
      || trend.percentageChange === null
      || trend.balanceUsdChange === null
    ) errors.push(`trend ${index} available trend requires all calculated fields.`)
  } else if (
    trend.previousObservedAt !== null
    || trend.quantityChange !== null
    || trend.absoluteChange !== null
    || trend.percentageChange !== null
    || trend.balanceUsdChange !== null
  ) {
    errors.push(`trend ${index} unavailable trend must not expose calculated fields.`)
  }
  return errors
}

export function validateReserveIntelligenceObservation(
  observation: ReserveIntelligenceObservation,
) {
  const errors: string[] = []
  if (observation.schemaVersion !== RESERVE_INTELLIGENCE_SCHEMA_VERSION) {
    errors.push("Unsupported Reserve Intelligence schema version.")
  }
  if (!observation.observationId?.trim()) errors.push("observationId is required.")
  if (observation.exchange !== "binance") errors.push("exchange must be binance.")
  if (!observation.asset?.trim()) errors.push("asset is required.")
  if (!RESERVE_ASSET_CLASSIFICATIONS.includes(observation.classification)) {
    errors.push("classification is invalid.")
  }
  if (!RESERVE_OBSERVATION_TYPES.includes(observation.observationType)) {
    errors.push("observationType is invalid.")
  }
  if (!finiteNonNegative(observation.currentBalance)) {
    errors.push("currentBalance must be finite and non-negative.")
  }
  if (!finiteNonNegative(observation.currentBalanceUsd)) {
    errors.push("currentBalanceUsd must be finite and non-negative.")
  }
  if (!validDate(observation.currentObservedAt)) {
    errors.push("currentObservedAt must be a valid date.")
  }
  if (observation.previousObservedAt !== null && !validDate(observation.previousObservedAt)) {
    errors.push("previousObservedAt must be null or a valid date.")
  }
  if (!finiteOrNull(observation.quantityChange)) errors.push("quantityChange is invalid.")
  if (!finiteOrNull(observation.absoluteChange) || (observation.absoluteChange ?? 0) < 0) {
    errors.push("absoluteChange is invalid.")
  }
  if (!finiteOrNull(observation.percentageChange)) errors.push("percentageChange is invalid.")
  if (!finiteOrNull(observation.balanceUsdChange)) errors.push("balanceUsdChange is invalid.")
  if (!Array.isArray(observation.trends)) errors.push("trends must be an array.")
  else observation.trends.forEach((trend, index) => errors.push(...validateTrend(trend, index)))
  if (!RESERVE_INTELLIGENCE_QUALITIES.includes(observation.quality)) {
    errors.push("quality is invalid.")
  }
  if (!observation.source?.trim()) errors.push("source is required.")
  if (!validDate(observation.generatedAt)) errors.push("generatedAt must be a valid date.")
  if (observation.quality === "verified") {
    if (
      observation.previousObservedAt === null
      || observation.quantityChange === null
      || observation.absoluteChange === null
      || observation.percentageChange === null
      || observation.balanceUsdChange === null
    ) errors.push("Verified observation requires delta fields.")
  }
  if (observation.quality === "unavailable" && observation.reason === null) {
    errors.push("Unavailable observation requires a reason.")
  }
  return { valid: errors.length === 0, errors }
}
