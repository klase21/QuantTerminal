import {
  TREASURY_QUALITIES,
  TREASURY_SNAPSHOT_SCHEMA_VERSION,
  type TreasurySnapshot,
  type TreasurySourceFile,
} from "./treasuryTypes"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function finiteOrNull(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value))
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

export function validateTreasurySnapshot(snapshot: TreasurySnapshot) {
  const errors: string[] = []
  if (snapshot.schemaVersion !== TREASURY_SNAPSHOT_SCHEMA_VERSION) {
    errors.push("Unsupported Treasury schema version.")
  }
  if (!snapshot.snapshotId?.trim()) errors.push("snapshotId is required.")
  if (!snapshot.holder?.trim()) errors.push("holder is required.")
  if (!snapshot.holderType?.trim()) errors.push("holderType is required.")
  if (!snapshot.asset?.trim()) errors.push("asset is required.")
  if (!Number.isFinite(snapshot.holdings) || snapshot.holdings < 0) {
    errors.push("holdings must be finite and non-negative.")
  }
  if (!finiteOrNull(snapshot.holdingsValueUsd) || (snapshot.holdingsValueUsd ?? 0) < 0) {
    errors.push("holdingsValueUsd must be null or finite and non-negative.")
  }
  if (!finiteOrNull(snapshot.changeAmount)) {
    errors.push("changeAmount must be null or finite.")
  }
  if (!finiteOrNull(snapshot.changePercent)) {
    errors.push("changePercent must be null or finite.")
  }
  if (snapshot.timestamp !== null && !validDate(snapshot.timestamp)) {
    errors.push("timestamp must be null or a valid date.")
  }
  if (snapshot.timestamp === null && snapshot.quality === "verified") {
    errors.push("verified Treasury snapshots require a timestamp.")
  }
  if (!validDate(snapshot.generatedAt)) errors.push("generatedAt must be a valid date.")
  if (!snapshot.source?.trim()) errors.push("source is required.")
  if (!TREASURY_QUALITIES.includes(snapshot.quality)) errors.push("quality is invalid.")
  return { valid: errors.length === 0, errors }
}

export function isTreasurySourceFile(value: unknown): value is TreasurySourceFile {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === TREASURY_SNAPSHOT_SCHEMA_VERSION
    && typeof value.source === "string"
    && Boolean(value.source.trim())
    && Array.isArray(value.snapshots)
    && value.snapshots.every((snapshot) => (
      isRecord(snapshot)
      && typeof snapshot.holder === "string"
      && (snapshot.holderType === undefined || typeof snapshot.holderType === "string")
      && typeof snapshot.asset === "string"
      && typeof snapshot.holdings === "number"
      && Number.isFinite(snapshot.holdings)
      && (
        snapshot.holdingsValueUsd === undefined
        || finiteOrNull(snapshot.holdingsValueUsd)
      )
      && (snapshot.changeAmount === undefined || finiteOrNull(snapshot.changeAmount))
      && (snapshot.changePercent === undefined || finiteOrNull(snapshot.changePercent))
      && (snapshot.timestamp === null || validDate(snapshot.timestamp))
      && !(snapshot.timestamp === null && snapshot.quality === "verified")
      && TREASURY_QUALITIES.includes(snapshot.quality as TreasurySnapshot["quality"])
    ))
  )
}
