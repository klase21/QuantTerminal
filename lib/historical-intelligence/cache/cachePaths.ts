import path from "node:path"

import type { HistoricalCacheIdentity } from "@/core/historical-intelligence/cache/cacheTypes"

export const HISTORICAL_DATA_ROOT = path.join(process.cwd(), ".data")
export const HISTORICAL_RAW_ROOT = path.join(HISTORICAL_DATA_ROOT, "raw")
export const HISTORICAL_PROCESSED_ROOT = path.join(HISTORICAL_DATA_ROOT, "processed")
export const HISTORICAL_CACHE_ROOT = path.join(HISTORICAL_DATA_ROOT, "cache")

function safeSegment(value: string | number | boolean) {
  const normalized = String(value).trim()
  if (!normalized) throw new Error("Historical cache path segments cannot be empty.")
  return encodeURIComponent(normalized).replace(/\./g, "%2E")
}

export function historicalCacheRelativePath(identity: HistoricalCacheIdentity) {
  const partitionSegments = Object.entries(identity.partition ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${safeSegment(key)}=${safeSegment(value)}`)

  return path.join(
    safeSegment(identity.namespace),
    safeSegment(identity.datasetId),
    ...partitionSegments,
  )
}

export function historicalCacheEntryPath(identity: HistoricalCacheIdentity) {
  return path.join(HISTORICAL_CACHE_ROOT, historicalCacheRelativePath(identity))
}

export function historicalCacheManifestPath(identity: HistoricalCacheIdentity) {
  return path.join(historicalCacheEntryPath(identity), "manifest.json")
}
