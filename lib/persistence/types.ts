import type { StorageRecordKind } from "@/lib/persistence/recordKind"

export type StorageJsonPrimitive = string | number | boolean | null
export type StorageJsonValue =
  | StorageJsonPrimitive
  | StorageJsonObject
  | StorageJsonArray

export interface StorageJsonObject {
  readonly [key: string]: StorageJsonValue
}

export interface StorageJsonArray extends ReadonlyArray<StorageJsonValue> {}

export interface StorageParentRef {
  readonly recordId: string
  readonly recordKind: StorageRecordKind
}

export interface StorageRecord {
  readonly recordId: string
  readonly recordKind: StorageRecordKind
  readonly idempotencyKey: string
  readonly runtimeVersion: string
  readonly schemaVersion: number
  readonly createdAt: string
  readonly recordedAt: string
  readonly parentRefs: readonly StorageParentRef[]
  readonly payload: StorageJsonValue
  readonly checksum?: string
}

export interface StorageRecordLocator {
  readonly recordId: string
  readonly recordKind: StorageRecordKind
}

export interface StorageListQuery {
  readonly recordKinds?: readonly StorageRecordKind[]
  readonly parentRef?: StorageParentRef
  readonly createdAfter?: string
  readonly createdBefore?: string
  readonly limit?: number
  readonly cursor?: string
}

export interface StorageRecordPage {
  readonly records: readonly StorageRecord[]
  readonly nextCursor: string | null
}

export interface StorageArchiveRequest extends StorageRecordLocator {
  readonly archivedAt: string
  readonly idempotencyKey: string
}

export interface StorageArchiveReceipt extends StorageRecordLocator {
  readonly archivedAt: string
  readonly idempotencyKey: string
}

export const STORAGE_ADAPTER_HEALTH_STATUSES = [
  "READY",
  "DEGRADED",
  "UNAVAILABLE",
] as const

export type StorageAdapterHealthStatus = typeof STORAGE_ADAPTER_HEALTH_STATUSES[number]

export interface StorageAdapterHealth {
  readonly status: StorageAdapterHealthStatus
  readonly available: boolean
  readonly message: string | null
}
