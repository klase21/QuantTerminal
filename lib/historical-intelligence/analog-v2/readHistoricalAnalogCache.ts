import {
  HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
  historicalAnalogCacheIdentity,
  type HistoricalAnalogCacheCoordinates,
  type HistoricalAnalogCacheMetadata,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import type { HistoricalAnalogCachePayloadV2 } from "@/core/historical-intelligence/analog-v2/historicalAnalogTypes"
import { consumeHistoricalCache } from "@/lib/historical-intelligence/cache/cacheFirst"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function validPayload(value: unknown): value is HistoricalAnalogCachePayloadV2 {
  if (!isRecord(value)) return false
  if (
    typeof value.source !== "string"
    || typeof value.symbol !== "string"
    || typeof value.interval !== "string"
    || !isRecord(value.currentState)
    || !Array.isArray(value.cases)
    || !isRecord(value.statistics)
    || !isRecord(value.search)
  ) {
    return false
  }
  if (
    typeof value.currentState.id !== "string"
    || !Number.isFinite(value.currentState.timestamp)
    || !isRecord(value.currentState.features)
    || !isRecord(value.statistics.byHorizon)
    || typeof value.statistics.totalCases !== "number"
    || typeof value.search.candidateCount !== "number"
  ) {
    return false
  }
  return value.cases.every((item) => (
    isRecord(item)
    && isRecord(item.state)
    && isRecord(item.outcome)
    && typeof item.state.id === "string"
    && Number.isFinite(item.state.timestamp)
    && Number.isFinite(item.similarity)
    && Number.isFinite(item.comparableFeatures)
    && isRecord(item.outcome.returns)
  ))
}

export async function readHistoricalAnalogCacheV2(coordinates: HistoricalAnalogCacheCoordinates) {
  const result = await consumeHistoricalCache<HistoricalAnalogCachePayloadV2, HistoricalAnalogCacheMetadata>({
    identity: historicalAnalogCacheIdentity(coordinates),
    expectedSchemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
  })
  if (result.ok && !validPayload(result.data)) {
    return {
      ok: false as const,
      state: "corrupted" as const,
      reason: "Historical Analog V2 cache payload is invalid.",
      manifest: result.manifest,
    }
  }
  return result
}
