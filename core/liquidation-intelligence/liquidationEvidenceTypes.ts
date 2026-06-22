import type { HistoricalCacheIdentity } from "@/core/historical-intelligence/cache/cacheTypes"

export const LIQUIDATION_EVIDENCE_SCHEMA_VERSION = "1"
export const LIQUIDATION_EVIDENCE_NAMESPACE = "liquidation-intelligence"
export const LIQUIDATION_EVIDENCE_DATASET_ID = "liquidation-evidence"

export const LIQUIDATION_SOURCE_QUALITY_STATES = [
  "verified",
  "degraded",
  "unavailable",
  "unknown",
] as const

export type LiquidationSourceQuality =
  typeof LIQUIDATION_SOURCE_QUALITY_STATES[number]

export type LiquidationEvidenceScope = "market-wide" | "symbol"

export interface LiquidationEvidenceCoordinates {
  exchange: string
  date: string
  hour: number
  scope: LiquidationEvidenceScope
  symbol?: string
}

export interface LiquidationEvidenceTotals {
  longLiquidation: number
  shortLiquidation: number
  unknownLiquidation: number
  totalLiquidation: number
  eventCount: number
}

export interface LiquidationSymbolSnapshot extends LiquidationEvidenceTotals {
  symbol: string
  firstTimestamp: string | null
  lastTimestamp: string | null
}

export interface LiquidationEvidence {
  schemaVersion: 1
  evidenceId: string
  scope: LiquidationEvidenceScope
  exchange: string
  symbol: string | null
  window: {
    date: string
    hour: number
    start: string
    end: string
  }
  source: string
  sourceQuality: LiquidationSourceQuality
  generatedAt: string
  totals: LiquidationEvidenceTotals
  symbols: LiquidationSymbolSnapshot[]
  reason?: string
}

export interface LiquidationEvidenceCacheMetadata extends Record<string, unknown> {
  scope: LiquidationEvidenceScope
  symbol: string | null
  source: string
  sourceQuality: LiquidationSourceQuality
  eventCount: number
  symbolCount: number
  totalLiquidation: number
}

export function liquidationEvidenceWindow(date: string, hour: number) {
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`)
  return {
    date,
    hour,
    start: start.toISOString(),
    end: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
  }
}

export function liquidationEvidenceId(
  coordinates: LiquidationEvidenceCoordinates,
) {
  const subject = coordinates.scope === "market-wide"
    ? "market-wide"
    : coordinates.symbol?.trim().toUpperCase()
  if (!subject) throw new Error("Symbol liquidation evidence requires a symbol.")
  return [
    "liquidation-evidence",
    coordinates.exchange.trim().toLowerCase(),
    subject,
    coordinates.date,
    String(coordinates.hour).padStart(2, "0"),
  ].join(":")
}

export function liquidationEvidenceCacheIdentity(
  coordinates: LiquidationEvidenceCoordinates,
): HistoricalCacheIdentity {
  const symbol = coordinates.scope === "symbol"
    ? coordinates.symbol?.trim().toUpperCase()
    : undefined
  if (coordinates.scope === "symbol" && !symbol) {
    throw new Error("Symbol liquidation evidence requires a symbol.")
  }
  return {
    namespace: LIQUIDATION_EVIDENCE_NAMESPACE,
    datasetId: LIQUIDATION_EVIDENCE_DATASET_ID,
    partition: {
      exchange: coordinates.exchange.trim().toLowerCase(),
      scope: coordinates.scope,
      ...(symbol ? { symbol } : {}),
      date: coordinates.date,
      hour: String(coordinates.hour).padStart(2, "0"),
    },
  }
}
