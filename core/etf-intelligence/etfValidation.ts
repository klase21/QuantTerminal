import {
  ETF_QUALITIES,
  ETF_SNAPSHOT_SCHEMA_VERSION,
  type EtfSnapshot,
  type EtfSourceFile,
} from "./etfTypes"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function finiteOrNull(value: unknown) {
  return value === null || (typeof value === "number" && Number.isFinite(value))
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

export function validateEtfSnapshot(snapshot: EtfSnapshot) {
  const errors: string[] = []
  if (snapshot.schemaVersion !== ETF_SNAPSHOT_SCHEMA_VERSION) {
    errors.push("Unsupported ETF schema version.")
  }
  if (!snapshot.snapshotId?.trim()) errors.push("snapshotId is required.")
  if (!snapshot.asset?.trim()) errors.push("asset is required.")
  if (!validDate(snapshot.timestamp)) errors.push("timestamp must be a valid date.")
  if (!validDate(snapshot.generatedAt)) errors.push("generatedAt must be a valid date.")
  if (!snapshot.source?.trim()) errors.push("source is required.")
  if (!ETF_QUALITIES.includes(snapshot.quality)) errors.push("quality is invalid.")
  if (!finiteOrNull(snapshot.netInflowUsd)) {
    errors.push("netInflowUsd must be null or finite.")
  }
  for (const [name, value] of [
    ["inflowUsd", snapshot.inflowUsd],
    ["outflowUsd", snapshot.outflowUsd],
    ["holdings", snapshot.holdings],
    ["holdingsValueUsd", snapshot.holdingsValueUsd],
  ] as const) {
    if (!finiteOrNull(value) || (value ?? 0) < 0) {
      errors.push(`${name} must be null or finite and non-negative.`)
    }
  }
  if (
    snapshot.netInflowUsd !== null
    && snapshot.inflowUsd !== null
    && snapshot.outflowUsd !== null
    && Math.abs(snapshot.netInflowUsd - (snapshot.inflowUsd - snapshot.outflowUsd)) > 1e-6
  ) {
    errors.push("netInflowUsd must equal inflowUsd minus outflowUsd when all are supplied.")
  }
  return { valid: errors.length === 0, errors }
}

export function isEtfSourceFile(value: unknown): value is EtfSourceFile {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === ETF_SNAPSHOT_SCHEMA_VERSION
    && typeof value.source === "string"
    && Boolean(value.source.trim())
    && Array.isArray(value.snapshots)
    && value.snapshots.every((snapshot) => (
      isRecord(snapshot)
      && typeof snapshot.asset === "string"
      && validDate(snapshot.timestamp)
      && (
        snapshot.netInflowUsd === undefined
        || finiteOrNull(snapshot.netInflowUsd)
      )
      && (snapshot.inflowUsd === undefined || finiteOrNull(snapshot.inflowUsd))
      && (snapshot.outflowUsd === undefined || finiteOrNull(snapshot.outflowUsd))
      && (snapshot.holdings === undefined || finiteOrNull(snapshot.holdings))
      && (
        snapshot.holdingsValueUsd === undefined
        || finiteOrNull(snapshot.holdingsValueUsd)
      )
      && ETF_QUALITIES.includes(snapshot.quality as EtfSnapshot["quality"])
    ))
  )
}
