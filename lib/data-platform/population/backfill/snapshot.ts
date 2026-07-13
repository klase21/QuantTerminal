import { buildHistoricalDatasetScope } from "./classification"
import type { BackfillManifestContent, BackfillPartition } from "./contracts"
import { buildInstrumentLifecycleInventory } from "./instruments"
import { createBackfillManifest } from "./manifest"
import { ProductionNormalizerRegistry } from "./normalizers"
import { createBinanceVisionOhlcvPartition } from "./sourceAdapters"

const CUTOFF = "2026-07-12T00:00:00.000Z"
const instruments = buildInstrumentLifecycleInventory()
const canaryPartitions: readonly BackfillPartition[] = Object.freeze(instruments.map((instrument) => {
  const source = createBinanceVisionOhlcvPartition({ symbol: instrument.providerSymbol, resolution: "5m", day: "2026-07-11" })
  return Object.freeze({ partitionId: `ohlcv:${instrument.canonicalInstrumentId}:5m:2026-07-11`, datasetId: source.datasetId, providerId: source.providerId, canonicalInstrumentId: instrument.canonicalInstrumentId, providerSymbol: source.providerSymbol, venue: source.venue, market: source.market, resolution: source.resolution, windowStart: source.windowStart, windowEnd: source.windowEnd, sourceObject: source.sourceUrl, status: "EXECUTABLE" as const, blockerIds: Object.freeze([]) })
}))

const blockedNormalizers = [
  ["agg-trade", "STREAM_MANIFEST", "D2_STREAM_IDENTITY_BOUNDARY"], ["orderbook", "STREAM_MANIFEST", "D2_STREAM_IDENTITY_BOUNDARY"],
  ["prediction-market", "PREDICTION_SNAPSHOT", "PROVIDER_FORMAT_UNVERIFIED"], ["etf-flow", "ETF_OBSERVATION", "PROVIDER_FORMAT_UNVERIFIED"],
  ["reserve", "RESERVE_OBSERVATION", "PROVIDER_FORMAT_UNVERIFIED"], ["macro", "MACRO_OBSERVATION", "PROVIDER_FORMAT_UNVERIFIED"],
  ["research-document", "DOCUMENT_METADATA", "CANONICAL_TARGET_MISSING"],
] as const

export const D3_PHASE3_MANIFEST_CONTENT: BackfillManifestContent = Object.freeze({
  manifestSchemaVersion: "1.0.0", approvalStatus: "APPROVED_WITH_BLOCKERS", executable: true, frozenCutoffUtc: CUTOFF,
  datasetRegistryVersion: "1.0.0", providerRegistryVersion: "1.0.0", datasets: buildHistoricalDatasetScope(), instruments,
  partitions: canaryPartitions,
  objectStorageBinding: { environmentVariable: "D3_BACKFILL_OBJECT_ROOT" as const, targetIdentity: "filesystem:D:\\QuantTerminalData\\raw-artifacts", status: "BOUND" as const },
  d2CanonicalTargetBinding: { environmentVariable: "D2_CANONICAL_POSTGRES_URL" as const, targetIdentity: "postgresql:localhost:55432/quantterminal_backfill#qt_d2_backfill_owner", status: "BOUND" as const },
  d3PopulationTargetBinding: { environmentVariable: "D3_POPULATION_POSTGRES_URL" as const, targetIdentity: "postgresql:localhost:55432/quantterminal_backfill#qt_d3_backfill_owner", status: "BOUND" as const },
  normalizerBindings: Object.freeze([...new ProductionNormalizerRegistry().bindings(), ...blockedNormalizers.map(([datasetId, candidateKind, normalizerId]) => Object.freeze({ datasetId, candidateKind, normalizerId, version: "UNAVAILABLE", status: "BLOCKED" as const }))]),
  policies: Object.freeze([
    { policyId: "checksum.sha256", version: "1.0.0", state: "APPROVED" as const, source: "D2 RawObjectManifest contract" },
    { policyId: "correction.immutable-supersession", version: "1.0.0", state: "APPROVED" as const, source: "D2 canonical persistence contract" },
    { policyId: "partition.ohlcv.daily", version: "1.0.0", state: "APPROVED" as const, source: "Existing Binance Vision daily archive boundary" },
    { policyId: "retry.historical-source", version: "UNAVAILABLE", state: "BLOCKED" as const, source: "No approved numeric retry policy" },
    { policyId: "retention.raw-artifact", version: "UNAVAILABLE", state: "BLOCKED" as const, source: "No approved retention duration" },
  ]),
  checksumPolicy: "SHA-256", retryPolicyReference: "UNRESOLVED", incrementalHandoffBoundary: CUTOFF,
  unresolvedBlockers: Object.freeze(["D3P3-B02", "D3P3-B04", "D3P3-B07", "D3P3-B08", "D3P3-B09", "D3P3-B10"]),
})

export const D3_PHASE3_MANIFEST = createBackfillManifest(D3_PHASE3_MANIFEST_CONTENT)
