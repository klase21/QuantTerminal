import { canonicalChecksum, normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import type { CanonicalFact, CanonicalRecordIdentity } from "./contracts"
import { canonicalStreamSegmentV2Metadata } from "./streamSegmentContracts"

export type ProviderIdentityMode = "EXCLUDED" | "INCLUDED"
export interface PersistenceIdentityRule { readonly datasetId: string; readonly providerIdentityMode: ProviderIdentityMode; readonly orderedFields: readonly string[] }

export const PERSISTENCE_IDENTITY_RULES = Object.freeze({
  OHLCV: { datasetId: "ohlcv", providerIdentityMode: "EXCLUDED", orderedFields: ["venue", "symbol", "resolution", "openTime"] },
  FUNDING: { datasetId: "funding", providerIdentityMode: "EXCLUDED", orderedFields: ["venue", "symbol", "fundingTime"] },
  OPEN_INTEREST: { datasetId: "open-interest", providerIdentityMode: "INCLUDED", orderedFields: ["providerId", "venue", "symbol", "window", "observedAt"] },
  AGG_TRADE: { datasetId: "agg-trade", providerIdentityMode: "INCLUDED", orderedFields: ["providerId", "venue", "symbol", "aggregateTradeId"] },
  LIQUIDATION: { datasetId: "liquidation", providerIdentityMode: "INCLUDED", orderedFields: ["providerId", "venue", "symbol", "providerRecordId"] },
  PREDICTION_SNAPSHOT: { datasetId: "prediction-market", providerIdentityMode: "INCLUDED", orderedFields: ["providerId", "marketId", "outcomeId", "observedAt"] },
  ETF_OBSERVATION: { datasetId: "etf-flow", providerIdentityMode: "INCLUDED", orderedFields: ["providerId", "instrumentId", "windowStart", "windowEnd"] },
  RESERVE_OBSERVATION: { datasetId: "reserve", providerIdentityMode: "INCLUDED", orderedFields: ["providerId", "venue", "asset", "observedAt"] },
  MACRO_OBSERVATION: { datasetId: "macro", providerIdentityMode: "INCLUDED", orderedFields: ["providerId", "seriesId", "period"] },
  STREAM_MANIFEST: { datasetId: "stream-manifest", providerIdentityMode: "INCLUDED", orderedFields: ["providerId", "streamKind", "venue", "symbol", "windowStart", "windowEnd"] },
} as const satisfies Record<CanonicalFact["kind"], PersistenceIdentityRule>)

export function deriveCanonicalRecordIdentity(fact: CanonicalFact): CanonicalRecordIdentity {
  const segmentV2 = fact.kind === "STREAM_MANIFEST" ? canonicalStreamSegmentV2Metadata(fact) : null
  const rule: PersistenceIdentityRule = segmentV2
    ? { ...PERSISTENCE_IDENTITY_RULES.STREAM_MANIFEST, datasetId: segmentV2.sourceDatasetId }
    : PERSISTENCE_IDENTITY_RULES[fact.kind]
  const fields: readonly string[] = fact.kind === "OHLCV" ? [fact.venue ?? "", normalizeIdentifier(fact.symbolOrSubject), fact.resolution, normalizeIsoTimestamp(fact.observedAt)]
    : fact.kind === "FUNDING" ? [fact.venue ?? "", normalizeIdentifier(fact.symbolOrSubject), normalizeIsoTimestamp(fact.fundingTime)]
    : fact.kind === "OPEN_INTEREST" ? [fact.providerId, fact.venue ?? "", normalizeIdentifier(fact.symbolOrSubject), fact.window, normalizeIsoTimestamp(fact.observedAt)]
    : fact.kind === "AGG_TRADE" ? [fact.providerId, fact.venue ?? "", normalizeIdentifier(fact.symbolOrSubject), fact.aggregateTradeId]
    : fact.kind === "LIQUIDATION" ? [fact.providerId, fact.venue ?? "", normalizeIdentifier(fact.symbolOrSubject), fact.providerRecordId]
    : fact.kind === "PREDICTION_SNAPSHOT" ? [fact.providerId, fact.marketId, fact.outcomeId, normalizeIsoTimestamp(fact.observedAt)]
    : fact.kind === "ETF_OBSERVATION" ? [fact.providerId, fact.instrumentId, normalizeIsoTimestamp(fact.windowStart), normalizeIsoTimestamp(fact.windowEnd)]
    : fact.kind === "RESERVE_OBSERVATION" ? [fact.providerId, fact.venue ?? "", fact.asset, normalizeIsoTimestamp(fact.observedAt)]
    : fact.kind === "MACRO_OBSERVATION" ? [fact.providerId, fact.seriesId, fact.period]
    : [fact.providerId, fact.streamKind, fact.venue ?? "", normalizeIdentifier(fact.symbolOrSubject), normalizeIsoTimestamp(fact.windowStart), normalizeIsoTimestamp(fact.windowEnd)]
  const businessIdentity = canonicalChecksum([rule.datasetId, rule.providerIdentityMode, ...fields])
  return Object.freeze({ datasetId: rule.datasetId, businessIdentity, canonicalRecordId: `rec_${canonicalChecksum([rule.datasetId, businessIdentity])}` })
}

export function deriveCanonicalCommitId(input: { readonly idempotencyKey: string; readonly canonicalRecordId: string; readonly recordVersion: number; readonly checksum: string }): string {
  return `cmt_${canonicalChecksum([input.idempotencyKey, input.canonicalRecordId, input.recordVersion, input.checksum])}`
}
