export const HISTORICAL_CACHE_MANIFEST_VERSION = 1

export type HistoricalCacheGenerationStatus =
  | "pending"
  | "generating"
  | "complete"
  | "partial"
  | "failed"

export type HistoricalCacheFormat = "json"

export interface HistoricalCacheIdentity {
  namespace: string
  datasetId: string
  partition?: Record<string, string | number | boolean>
}

export interface HistoricalCacheSource {
  id: string
  kind: "primary" | "secondary" | "enrichment" | "derived"
  metadata?: Record<string, unknown>
}

export interface HistoricalCachePayloadDescriptor {
  file: string
  format: HistoricalCacheFormat
  bytes?: number
  recordCount?: number
  checksum?: string
}

export interface HistoricalCacheManifest<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  manifestVersion: number
  identity: HistoricalCacheIdentity
  source: HistoricalCacheSource
  generatedAt: string
  expiresAt: string | null
  schemaVersion: string
  status: HistoricalCacheGenerationStatus
  metadata: TMetadata
  payload: HistoricalCachePayloadDescriptor | null
  error?: {
    code: string
    message: string
  }
}

export type HistoricalCacheUnavailableCode =
  | "missing"
  | "corrupted"
  | "expired"
  | "version_mismatch"
  | "partial"
  | "generation_failed"

export type HistoricalCacheReadResult<TData, TMetadata extends Record<string, unknown> = Record<string, unknown>> =
  | {
      ok: true
      state: "ready"
      data: TData
      manifest: HistoricalCacheManifest<TMetadata>
    }
  | {
      ok: false
      state: HistoricalCacheUnavailableCode
      reason: string
      manifest?: HistoricalCacheManifest<TMetadata>
    }

export interface HistoricalCacheReadOptions {
  expectedSchemaVersion?: string
  allowExpired?: boolean
  allowPartial?: boolean
  now?: Date
}

export interface HistoricalCacheWriteInput<TData, TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  identity: HistoricalCacheIdentity
  source: HistoricalCacheSource
  schemaVersion: string
  data: TData
  metadata?: TMetadata
  expiresAt?: string | Date | null
  status?: Extract<HistoricalCacheGenerationStatus, "complete" | "partial">
  recordCount?: number
}

export interface HistoricalCacheFailureInput<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  identity: HistoricalCacheIdentity
  source: HistoricalCacheSource
  schemaVersion: string
  metadata?: TMetadata
  status?: Extract<HistoricalCacheGenerationStatus, "pending" | "generating" | "failed">
  error?: {
    code: string
    message: string
  }
}
