import {
  EXCHANGE_FLOW_SCHEMA_VERSION,
  EXCHANGE_FLOW_SCOPES,
  EXCHANGE_FLOW_SOURCE_QUALITIES,
  type ExchangeFlowSnapshot,
  type ExchangeFlowSourceFile,
} from "./exchangeFlowTypes"

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function validCommon(snapshot: ExchangeFlowSnapshot) {
  const errors: string[] = []
  if (snapshot.schemaVersion !== EXCHANGE_FLOW_SCHEMA_VERSION) {
    errors.push("Unsupported Exchange Flow schema version.")
  }
  if (!snapshot.snapshotId?.trim()) errors.push("snapshotId is required.")
  if (!EXCHANGE_FLOW_SCOPES.includes(snapshot.scope)) errors.push("scope is invalid.")
  if (!snapshot.exchange?.trim()) errors.push("exchange is required.")
  if (!validDate(snapshot.timestamp)) errors.push("timestamp must be a valid date.")
  if (!validDate(snapshot.generatedAt)) errors.push("generatedAt must be a valid date.")
  if (!snapshot.source?.trim()) errors.push("source is required.")
  if (!EXCHANGE_FLOW_SOURCE_QUALITIES.includes(snapshot.sourceQuality)) {
    errors.push("sourceQuality is invalid.")
  }
  return errors
}

export function validateExchangeFlowSnapshot(snapshot: ExchangeFlowSnapshot) {
  const errors = validCommon(snapshot)
  if (snapshot.scope === "exchange_level") {
    if (!finiteNonNegative(snapshot.totalAssetsUsd)) {
      errors.push("totalAssetsUsd must be finite and non-negative.")
    }
    if (!Number.isFinite(snapshot.netFlow24hUsd)) {
      errors.push("netFlow24hUsd must be finite.")
    }
  } else {
    if (!snapshot.asset?.trim()) errors.push("asset is required.")
    if (!finiteNonNegative(snapshot.holdings)) errors.push("holdings must be finite and non-negative.")
    if (!finiteNonNegative(snapshot.inflow)) errors.push("inflow must be finite and non-negative.")
    if (!finiteNonNegative(snapshot.outflow)) errors.push("outflow must be finite and non-negative.")
    if (!Number.isFinite(snapshot.netFlow)) errors.push("netFlow must be finite.")
    if (
      Number.isFinite(snapshot.netFlow)
      && Math.abs(snapshot.netFlow - (snapshot.inflow - snapshot.outflow)) > 1e-8
    ) {
      errors.push("netFlow must equal inflow minus outflow.")
    }
  }
  return { valid: errors.length === 0, errors }
}

export function isExchangeFlowSourceFile(value: unknown): value is ExchangeFlowSourceFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const candidate = value as Partial<ExchangeFlowSourceFile>
  return (
    candidate.schemaVersion === EXCHANGE_FLOW_SCHEMA_VERSION
    && typeof candidate.source === "string"
    && Boolean(candidate.source.trim())
    && Array.isArray(candidate.snapshots)
    && candidate.snapshots.every((item) => {
      if (
        !item
        || !EXCHANGE_FLOW_SCOPES.includes(item.scope)
        || typeof item.exchange !== "string"
        || !validDate(item.timestamp)
        || !EXCHANGE_FLOW_SOURCE_QUALITIES.includes(item.sourceQuality)
      ) return false
      return item.scope === "exchange_level"
        ? finiteNonNegative(item.totalAssetsUsd) && Number.isFinite(item.netFlow24hUsd)
        : (
            typeof item.asset === "string"
            && finiteNonNegative(item.holdings)
            && finiteNonNegative(item.inflow)
            && finiteNonNegative(item.outflow)
            && (item.netFlow === undefined || Number.isFinite(item.netFlow))
          )
    })
  )
}
