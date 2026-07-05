import postgres from "postgres"

import type { StorageAdapter } from "@/lib/persistence/adapter"
import { createStorageError } from "@/lib/persistence/errors"
import {
  createStorageFailure,
  createStorageSuccess,
  type StorageResult,
} from "@/lib/persistence/result"
import type {
  StorageAdapterHealth,
  StorageArchiveReceipt,
  StorageArchiveRequest,
  StorageJsonArray,
  StorageJsonObject,
  StorageListQuery,
  StorageRecord,
  StorageRecordLocator,
  StorageRecordPage,
} from "@/lib/persistence/types"
import { validateStorageRecord } from "@/lib/persistence/validation"
import { checkPostgresHealth } from "@/lib/persistence/postgres/health"
import {
  deserializeStorageRecordFromPostgres,
  serializeStorageRecordForPostgres,
  type PostgresStorageRecordRow,
} from "@/lib/persistence/postgres/serialization"
import {
  validatePostgresArchiveRequest,
  validatePostgresListQuery,
  validatePostgresLocator,
} from "@/lib/persistence/postgres/validation"

interface RecordIdRow {
  readonly record_id: string
}

interface ExistsRow {
  readonly found: boolean
}

interface ArchiveStateRow {
  readonly archived: boolean
}

const CONNECTION_ERROR_CODES = new Set([
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
])

function errorCode(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const code = (value as { readonly code?: unknown }).code
  return typeof code === "string" ? code : null
}

function notFound(locator: StorageRecordLocator): StorageResult<never> {
  return createStorageFailure("NOT_FOUND", [createStorageError(
    "not_found",
    `${locator.recordKind} record ${locator.recordId} was not found.`,
  )])
}

export class PostgresStorageAdapter implements StorageAdapter {
  private sql: postgres.Sql | null = null

  constructor(connectionString: string) {
    if (typeof connectionString !== "string" || connectionString.trim().length === 0) {
      return
    }

    try {
      this.sql = postgres(connectionString, {
        max: 1,
        prepare: false,
        idle_timeout: 20,
        connect_timeout: 10,
      })
    } catch {
      this.sql = null
    }
  }

  private unavailable<T>(): StorageResult<T> {
    return createStorageFailure("UNAVAILABLE", [createStorageError(
      "storage_unavailable",
      "Postgres storage is unavailable.",
      { retryable: true },
    )])
  }

  private queryError<T>(message: string, cause: unknown): StorageResult<T> {
    const code = errorCode(cause)
    if (code && CONNECTION_ERROR_CODES.has(code)) return this.unavailable()
    return createStorageFailure("STORAGE_ERROR", [createStorageError(
      "storage_failure",
      message,
      { retryable: true },
    )])
  }

  async writeRecord(record: StorageRecord): Promise<StorageResult<StorageRecord>> {
    const validation = validateStorageRecord(record)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    const serialized = serializeStorageRecordForPostgres(validation.value)
    if (serialized.status !== "SUCCESS") {
      return createStorageFailure(serialized.status, serialized.errors)
    }
    if (!this.sql) return this.unavailable()

    const value = serialized.value
    try {
      const rows = await this.sql<RecordIdRow[]>`
        INSERT INTO storage_records (
          record_id,
          record_kind,
          idempotency_key,
          runtime_version,
          schema_version,
          created_at,
          recorded_at,
          parent_refs,
          payload,
          checksum,
          archived
        ) VALUES (
          ${value.record_id},
          ${value.record_kind},
          ${value.idempotency_key},
          ${value.runtime_version},
          ${value.schema_version},
          ${value.created_at}::timestamptz,
          ${value.recorded_at}::timestamptz,
          ${this.sql.json(value.parent_refs)},
          ${this.sql.json(value.payload)},
          ${value.checksum},
          ${value.archived}
        )
        ON CONFLICT DO NOTHING
        RETURNING record_id
      `
      if (rows.length === 0) {
        return createStorageFailure("DUPLICATE", [createStorageError(
          "duplicate_record",
          "Postgres record ID or idempotency key already exists.",
        )])
      }
      return createStorageSuccess(validation.value)
    } catch (cause) {
      return this.queryError("Postgres could not write the StorageRecord.", cause)
    }
  }

  async readRecord(
    locator: StorageRecordLocator,
  ): Promise<StorageResult<StorageRecord>> {
    const validation = validatePostgresLocator(locator)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    if (!this.sql) return this.unavailable()

    try {
      const rows = await this.sql<PostgresStorageRecordRow[]>`
        SELECT
          record_id,
          record_kind,
          idempotency_key,
          runtime_version,
          schema_version,
          created_at,
          recorded_at,
          parent_refs,
          payload,
          checksum,
          archived
        FROM storage_records
        WHERE record_id = ${validation.value.recordId}
          AND record_kind = ${validation.value.recordKind}
        LIMIT 1
      `
      if (!rows[0]) return notFound(validation.value)
      return deserializeStorageRecordFromPostgres(rows[0])
    } catch (cause) {
      return this.queryError("Postgres could not read the StorageRecord.", cause)
    }
  }

  async recordExists(locator: StorageRecordLocator): Promise<StorageResult<boolean>> {
    const validation = validatePostgresLocator(locator)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    if (!this.sql) return this.unavailable()

    try {
      const rows = await this.sql<ExistsRow[]>`
        SELECT EXISTS(
          SELECT 1
          FROM storage_records
          WHERE record_id = ${validation.value.recordId}
            AND record_kind = ${validation.value.recordKind}
        ) AS found
      `
      return createStorageSuccess(rows[0]?.found === true)
    } catch (cause) {
      return this.queryError("Postgres could not check StorageRecord existence.", cause)
    }
  }

  async listRecords(query?: StorageListQuery): Promise<StorageResult<StorageRecordPage>> {
    const validation = validatePostgresListQuery(query)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    if (!this.sql) return this.unavailable()

    const value = validation.value
    const recordKinds = [...(value?.recordKinds ?? [])]
    const parentRefs: StorageJsonArray = value?.parentRef
      ? [Object.freeze({
        recordId: value.parentRef.recordId,
        recordKind: value.parentRef.recordKind,
      }) as StorageJsonObject]
      : []
    const createdAfter = value?.createdAfter ?? null
    const createdBefore = value?.createdBefore ?? null
    const cursor = value?.cursor ?? null
    const limit = value?.limit ?? 100

    try {
      const rows = await this.sql<PostgresStorageRecordRow[]>`
        SELECT
          record_id,
          record_kind,
          idempotency_key,
          runtime_version,
          schema_version,
          created_at,
          recorded_at,
          parent_refs,
          payload,
          checksum,
          archived
        FROM storage_records
        WHERE archived = false
          AND (${recordKinds.length === 0}
            OR record_kind = ANY(${this.sql.array(recordKinds as never[])}::text[]))
          AND (${parentRefs.length === 0}
            OR parent_refs @> ${this.sql.json(parentRefs)})
          AND (${createdAfter}::timestamptz IS NULL
            OR created_at >= ${createdAfter}::timestamptz)
          AND (${createdBefore}::timestamptz IS NULL
            OR created_at <= ${createdBefore}::timestamptz)
          AND (${cursor}::text IS NULL OR record_id > ${cursor})
        ORDER BY record_id ASC
        LIMIT ${limit + 1}
      `

      const hasNextPage = rows.length > limit
      const selectedRows = hasNextPage ? rows.slice(0, limit) : rows
      const records: StorageRecord[] = []
      for (const row of selectedRows) {
        const record = deserializeStorageRecordFromPostgres(row)
        if (record.status !== "SUCCESS") {
          return createStorageFailure(record.status, record.errors)
        }
        records.push(record.value)
      }
      const lastRow = selectedRows[selectedRows.length - 1]
      return createStorageSuccess(Object.freeze({
        records: Object.freeze(records),
        nextCursor: hasNextPage && lastRow ? lastRow.record_id : null,
      }))
    } catch (cause) {
      return this.queryError("Postgres could not list StorageRecords.", cause)
    }
  }

  async appendEvent(record: StorageRecord): Promise<StorageResult<StorageRecord>> {
    return this.writeRecord(record)
  }

  async markArchived(
    request: StorageArchiveRequest,
  ): Promise<StorageResult<StorageArchiveReceipt>> {
    const validation = validatePostgresArchiveRequest(request)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    if (!this.sql) return this.unavailable()

    try {
      const state = await this.sql<ArchiveStateRow[]>`
        SELECT archived
        FROM storage_records
        WHERE record_id = ${validation.value.recordId}
          AND record_kind = ${validation.value.recordKind}
        LIMIT 1
      `
      if (!state[0]) return notFound(validation.value)
      if (state[0].archived) {
        return createStorageFailure("DUPLICATE", [createStorageError(
          "duplicate_record",
          "Postgres record is already archived.",
        )])
      }

      const rows = await this.sql<RecordIdRow[]>`
        UPDATE storage_records
        SET archived = true
        WHERE record_id = ${validation.value.recordId}
          AND record_kind = ${validation.value.recordKind}
          AND archived = false
        RETURNING record_id
      `
      if (rows.length !== 1) {
        return createStorageFailure("CONFLICT", [createStorageError(
          "record_conflict",
          "Postgres record archive state changed before the update completed.",
          { retryable: true },
        )])
      }
      return createStorageSuccess(Object.freeze({ ...validation.value }))
    } catch (cause) {
      return this.queryError("Postgres could not archive the StorageRecord.", cause)
    }
  }

  async healthCheck(): Promise<StorageResult<StorageAdapterHealth>> {
    return checkPostgresHealth(this.sql)
  }
}
