import {
  EXCHANGE_RESERVE_DELTA_SCHEMA_VERSION,
  EXCHANGE_RESERVE_DELTA_STATUSES,
  type ExchangeReserveDelta,
} from "./exchangeReserveDeltaTypes"

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function finiteOrNull(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value))
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

export function validateExchangeReserveDelta(delta: ExchangeReserveDelta) {
  const errors: string[] = []
  if (delta.schemaVersion !== EXCHANGE_RESERVE_DELTA_SCHEMA_VERSION) {
    errors.push("Unsupported Exchange Reserve Delta schema version.")
  }
  if (!delta.deltaId?.trim()) errors.push("deltaId is required.")
  if (delta.exchange !== "binance") errors.push("exchange must be binance.")
  if (!delta.asset?.trim()) errors.push("asset is required.")
  if (!finiteNonNegative(delta.currentBalance)) {
    errors.push("currentBalance must be finite and non-negative.")
  }
  if (!finiteNonNegative(delta.currentBalanceUsd)) {
    errors.push("currentBalanceUsd must be finite and non-negative.")
  }
  if (!validDate(delta.currentObservedAt)) {
    errors.push("currentObservedAt must be a valid date.")
  }
  if (!finiteOrNull(delta.previousBalance) || (delta.previousBalance ?? 0) < 0) {
    errors.push("previousBalance must be null or finite and non-negative.")
  }
  if (!finiteOrNull(delta.previousBalanceUsd) || (delta.previousBalanceUsd ?? 0) < 0) {
    errors.push("previousBalanceUsd must be null or finite and non-negative.")
  }
  if (delta.previousObservedAt !== null && !validDate(delta.previousObservedAt)) {
    errors.push("previousObservedAt must be null or a valid date.")
  }
  if (!finiteOrNull(delta.balanceDelta)) errors.push("balanceDelta must be null or finite.")
  if (!finiteOrNull(delta.balanceDeltaPct)) errors.push("balanceDeltaPct must be null or finite.")
  if (!finiteOrNull(delta.balanceUsdDelta)) errors.push("balanceUsdDelta must be null or finite.")
  if (!EXCHANGE_RESERVE_DELTA_STATUSES.includes(delta.status)) {
    errors.push("status is invalid.")
  }
  if (!delta.source?.trim()) errors.push("source is required.")
  if (!validDate(delta.generatedAt)) errors.push("generatedAt must be a valid date.")

  const hasPrevious = (
    delta.previousBalance !== null
    && delta.previousBalanceUsd !== null
    && delta.previousObservedAt !== null
  )
  if (delta.status === "available") {
    if (!hasPrevious) errors.push("Available delta requires a previous snapshot.")
    if (
      delta.balanceDelta === null
      || delta.balanceDeltaPct === null
      || delta.balanceUsdDelta === null
    ) errors.push("Available delta requires all delta values.")
  } else if (
    hasPrevious
    || delta.balanceDelta !== null
    || delta.balanceDeltaPct !== null
    || delta.balanceUsdDelta !== null
  ) {
    errors.push("Unavailable delta must not expose calculated values.")
  }
  return { valid: errors.length === 0, errors }
}
