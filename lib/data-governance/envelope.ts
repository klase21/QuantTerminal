import {
  isSourceDegradationReason,
  type SourceDegradationReason,
} from "@/lib/data-governance/degradation"
import { isSourceFreshness, type SourceFreshness } from "@/lib/data-governance/freshness"
import { isSourceQuality, type SourceQuality } from "@/lib/data-governance/quality"
import { getSource } from "@/lib/data-governance/registry"
import { isSourceStatus, type SourceStatus } from "@/lib/data-governance/sourceStatus"
import {
  isSourceUnavailableReason,
  type SourceUnavailableReason,
} from "@/lib/data-governance/unavailable"

export const SOURCE_CACHE_STATUSES = [
  "HIT",
  "MISS",
  "STALE",
  "BYPASS",
  "UNAVAILABLE",
  "UNKNOWN",
] as const

export type SourceCacheStatus = typeof SOURCE_CACHE_STATUSES[number]

const SOURCE_CACHE_STATUS_SET = new Set<string>(SOURCE_CACHE_STATUSES)

export function isSourceCacheStatus(value: unknown): value is SourceCacheStatus {
  return typeof value === "string" && SOURCE_CACHE_STATUS_SET.has(value)
}

export interface SourceMetadataEnvelope {
  sourceId: string
  sourceName: string | null
  freshnessStatus: SourceFreshness
  qualityLevel: SourceQuality
  sourceStatus: SourceStatus
  lastUpdatedAt: string | null
  retrievedAt: string
  degradedReason: SourceDegradationReason | null
  unavailableReason: SourceUnavailableReason | null
  fallbackSourceId: string | null
  cacheStatus: SourceCacheStatus
  productionApproved: boolean
}

export type SourceMetadataInput = Partial<Pick<
  SourceMetadataEnvelope,
  | "freshnessStatus"
  | "qualityLevel"
  | "sourceStatus"
  | "lastUpdatedAt"
  | "retrievedAt"
  | "degradedReason"
  | "unavailableReason"
  | "fallbackSourceId"
  | "cacheStatus"
>>

export interface SourceBackedSuccess<T> {
  status: "SUCCESS"
  data: T
  metadata: SourceMetadataEnvelope
}

export interface SourceBackedDegraded<T> {
  status: "DEGRADED"
  data: T
  metadata: SourceMetadataEnvelope
}

export interface SourceBackedUnavailable {
  status: "UNAVAILABLE"
  metadata: SourceMetadataEnvelope
}

export type SourceBackedResult<T> =
  | SourceBackedSuccess<T>
  | SourceBackedDegraded<T>
  | SourceBackedUnavailable

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function hasUsableData<T>(data: T): data is NonNullable<T> {
  if (data === null || data === undefined) return false
  if (typeof data === "string") return data.trim().length > 0
  if (Array.isArray(data)) return data.length > 0
  return true
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value))
}

function retrievedTimestamp(value: unknown) {
  return validTimestamp(value) ? value : new Date().toISOString()
}

function lowerQuality(quality: SourceQuality): SourceQuality {
  if (quality === "HIGH") return "MEDIUM"
  if (quality === "MEDIUM") return "LOW"
  return quality
}

function unavailableReasonFor(sourceId: string, requested: SourceUnavailableReason) {
  const source = getSource(sourceId)
  if (!source) return "SOURCE_NOT_REGISTERED" as const
  if (!source.productionApproved || source.status === "DISABLED") return "SOURCE_DISABLED" as const
  return requested
}

export function normalizeSourceMetadata(
  sourceId: string,
  partialMetadata: SourceMetadataInput = {},
): SourceMetadataEnvelope {
  const source = getSource(sourceId)
  const fallbackSourceId = partialMetadata.fallbackSourceId
    && getSource(partialMetadata.fallbackSourceId)
    ? partialMetadata.fallbackSourceId
    : null

  if (!source) {
    return {
      sourceId,
      sourceName: null,
      freshnessStatus: "UNAVAILABLE",
      qualityLevel: "UNAVAILABLE",
      sourceStatus: "UNAVAILABLE",
      lastUpdatedAt: null,
      retrievedAt: retrievedTimestamp(partialMetadata.retrievedAt),
      degradedReason: null,
      unavailableReason: "SOURCE_NOT_REGISTERED",
      fallbackSourceId: null,
      cacheStatus: isSourceCacheStatus(partialMetadata.cacheStatus) ? partialMetadata.cacheStatus : "UNKNOWN",
      productionApproved: false,
    }
  }

  const lastUpdatedAt = validTimestamp(partialMetadata.lastUpdatedAt)
    ? partialMetadata.lastUpdatedAt
    : null

  return {
    sourceId: source.id,
    sourceName: source.displayName,
    freshnessStatus: isSourceFreshness(partialMetadata.freshnessStatus)
      ? partialMetadata.freshnessStatus
      : "UNAVAILABLE",
    qualityLevel: isSourceQuality(partialMetadata.qualityLevel)
      ? partialMetadata.qualityLevel
      : "UNKNOWN",
    sourceStatus: isSourceStatus(partialMetadata.sourceStatus)
      ? partialMetadata.sourceStatus
      : source.status,
    lastUpdatedAt,
    retrievedAt: retrievedTimestamp(partialMetadata.retrievedAt),
    degradedReason: isSourceDegradationReason(partialMetadata.degradedReason)
      ? partialMetadata.degradedReason
      : null,
    unavailableReason: isSourceUnavailableReason(partialMetadata.unavailableReason)
      ? partialMetadata.unavailableReason
      : null,
    fallbackSourceId,
    cacheStatus: isSourceCacheStatus(partialMetadata.cacheStatus) ? partialMetadata.cacheStatus : "UNKNOWN",
    productionApproved: source.productionApproved,
  }
}

export function createSourceUnavailable(
  sourceId: string,
  reason: SourceUnavailableReason,
): SourceBackedUnavailable {
  const unavailableReason = unavailableReasonFor(sourceId, reason)
  return {
    status: "UNAVAILABLE",
    metadata: normalizeSourceMetadata(sourceId, {
      freshnessStatus: "UNAVAILABLE",
      qualityLevel: "UNAVAILABLE",
      sourceStatus: "UNAVAILABLE",
      unavailableReason,
      cacheStatus: "UNAVAILABLE",
    }),
  }
}

export function createSourceSuccess<T>(
  sourceId: string,
  data: T,
  metadata: SourceMetadataInput = {},
): SourceBackedResult<T> {
  const source = getSource(sourceId)
  if (!source) return createSourceUnavailable(sourceId, "SOURCE_NOT_REGISTERED")
  if (!source.productionApproved || source.status === "DISABLED") {
    return createSourceUnavailable(sourceId, "SOURCE_DISABLED")
  }
  if (source.status === "UNAVAILABLE") return createSourceUnavailable(sourceId, "SOURCE_UNAVAILABLE")
  if (!hasUsableData(data)) return createSourceUnavailable(sourceId, "EMPTY_RESPONSE")
  if (source.status === "DEGRADED") {
    return createSourceDegraded(sourceId, data, metadata.degradedReason ?? "UNKNOWN", metadata.fallbackSourceId ?? undefined, metadata)
  }

  return {
    status: "SUCCESS",
    data,
    metadata: normalizeSourceMetadata(sourceId, {
      ...metadata,
      sourceStatus: "ACTIVE",
      degradedReason: null,
      unavailableReason: null,
    }),
  }
}

export function createSourceDegraded<T>(
  sourceId: string,
  data: T,
  reason: SourceDegradationReason,
  fallbackSourceId?: string,
  metadata: SourceMetadataInput = {},
): SourceBackedResult<T> {
  const source = getSource(sourceId)
  if (!source) return createSourceUnavailable(sourceId, "SOURCE_NOT_REGISTERED")
  if (!source.productionApproved || source.status === "DISABLED") {
    return createSourceUnavailable(sourceId, "SOURCE_DISABLED")
  }
  if (!hasUsableData(data)) return createSourceUnavailable(sourceId, "EMPTY_RESPONSE")
  if (fallbackSourceId) {
    const fallback = getSource(fallbackSourceId)
    if (!fallback || !fallback.productionApproved || fallback.status === "DISABLED") {
      return createSourceUnavailable(sourceId, "INVALID_RESPONSE")
    }
  }

  const qualityLevel = isSourceQuality(metadata.qualityLevel)
    ? metadata.qualityLevel
    : lowerQuality(source.quality)
  const freshnessStatus = isSourceFreshness(metadata.freshnessStatus)
    ? metadata.freshnessStatus
    : reason === "STALE_DATA" ? "STALE" : "UNAVAILABLE"

  return {
    status: "DEGRADED",
    data,
    metadata: normalizeSourceMetadata(sourceId, {
      ...metadata,
      freshnessStatus,
      qualityLevel,
      sourceStatus: "DEGRADED",
      degradedReason: reason,
      unavailableReason: null,
      fallbackSourceId: fallbackSourceId ?? null,
    }),
  }
}

function hasValidMetadata(value: unknown): value is SourceMetadataEnvelope {
  if (!isRecord(value)) return false
  return typeof value.sourceId === "string"
    && value.sourceId.length > 0
    && (typeof value.sourceName === "string" || value.sourceName === null)
    && isSourceFreshness(value.freshnessStatus)
    && isSourceQuality(value.qualityLevel)
    && isSourceStatus(value.sourceStatus)
    && (value.lastUpdatedAt === null || validTimestamp(value.lastUpdatedAt))
    && validTimestamp(value.retrievedAt)
    && (value.degradedReason === null || isSourceDegradationReason(value.degradedReason))
    && (value.unavailableReason === null || isSourceUnavailableReason(value.unavailableReason))
    && (value.fallbackSourceId === null || typeof value.fallbackSourceId === "string")
    && isSourceCacheStatus(value.cacheStatus)
    && typeof value.productionApproved === "boolean"
}

export function isSourceBackedSuccess<T = unknown>(value: unknown): value is SourceBackedSuccess<T> {
  return isRecord(value)
    && value.status === "SUCCESS"
    && Object.prototype.hasOwnProperty.call(value, "data")
    && hasUsableData(value.data)
    && hasValidMetadata(value.metadata)
    && value.metadata.degradedReason === null
    && value.metadata.unavailableReason === null
}

export function isSourceBackedUnavailable(value: unknown): value is SourceBackedUnavailable {
  return isRecord(value)
    && value.status === "UNAVAILABLE"
    && !Object.prototype.hasOwnProperty.call(value, "data")
    && hasValidMetadata(value.metadata)
    && value.metadata.sourceStatus === "UNAVAILABLE"
    && value.metadata.unavailableReason !== null
}

export function isSourceBackedDegraded<T = unknown>(value: unknown): value is SourceBackedDegraded<T> {
  return isRecord(value)
    && value.status === "DEGRADED"
    && Object.prototype.hasOwnProperty.call(value, "data")
    && hasUsableData(value.data)
    && hasValidMetadata(value.metadata)
    && value.metadata.sourceStatus === "DEGRADED"
    && value.metadata.degradedReason !== null
    && value.metadata.unavailableReason === null
}

export function isSourceBackedResult<T = unknown>(value: unknown): value is SourceBackedResult<T> {
  return isSourceBackedSuccess<T>(value)
    || isSourceBackedDegraded<T>(value)
    || isSourceBackedUnavailable(value)
}
