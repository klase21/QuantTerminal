import {
  EXCHANGE_RESERVE_QUALITIES,
  EXCHANGE_RESERVE_SCHEMA_VERSION,
  type ExchangeReserveSnapshot,
  type ExchangeReserveSourceFile,
} from "./exchangeReserveTypes"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

export function validateExchangeReserveSnapshot(snapshot: ExchangeReserveSnapshot) {
  const errors: string[] = []
  if (snapshot.schemaVersion !== EXCHANGE_RESERVE_SCHEMA_VERSION) {
    errors.push("Unsupported Exchange Reserve schema version.")
  }
  if (!snapshot.snapshotId?.trim()) errors.push("snapshotId is required.")
  if (snapshot.exchange !== "binance") errors.push("exchange must be binance.")
  if (!snapshot.walletAddress?.trim()) errors.push("walletAddress is required.")
  if (!snapshot.network?.trim()) errors.push("network is required.")
  if (!snapshot.asset?.trim()) errors.push("asset is required.")
  if (!finiteNonNegative(snapshot.balance)) {
    errors.push("balance must be finite and non-negative.")
  }
  if (!finiteNonNegative(snapshot.balanceUsd)) {
    errors.push("balanceUsd must be finite and non-negative.")
  }
  if (!validDate(snapshot.updateTime)) errors.push("updateTime must be a valid date.")
  if (!validDate(snapshot.generatedAt)) errors.push("generatedAt must be a valid date.")
  if (!snapshot.source?.trim()) errors.push("source is required.")
  if (!EXCHANGE_RESERVE_QUALITIES.includes(snapshot.quality)) {
    errors.push("quality is invalid.")
  }
  return { valid: errors.length === 0, errors }
}

export function isExchangeReserveSourceFile(
  value: unknown,
): value is ExchangeReserveSourceFile {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === EXCHANGE_RESERVE_SCHEMA_VERSION
    && typeof value.source === "string"
    && Boolean(value.source.trim())
    && Array.isArray(value.snapshots)
    && value.snapshots.every((snapshot) => (
      isRecord(snapshot)
      && snapshot.exchange === "binance"
      && typeof snapshot.walletAddress === "string"
      && Boolean(snapshot.walletAddress.trim())
      && typeof snapshot.network === "string"
      && Boolean(snapshot.network.trim())
      && typeof snapshot.asset === "string"
      && Boolean(snapshot.asset.trim())
      && finiteNonNegative(snapshot.balance)
      && finiteNonNegative(snapshot.balanceUsd)
      && validDate(snapshot.updateTime)
      && EXCHANGE_RESERVE_QUALITIES.includes(
        snapshot.quality as ExchangeReserveSnapshot["quality"],
      )
    ))
  )
}
