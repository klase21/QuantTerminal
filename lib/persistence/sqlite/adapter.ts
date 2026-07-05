import Database from "better-sqlite3"

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
  StorageListQuery,
  StorageRecord,
  StorageRecordLocator,
  StorageRecordPage,
} from "@/lib/persistence/types"
import { validateStorageRecord } from "@/lib/persistence/validation"
import { checkSQLiteHealth } from "@/lib/persistence/sqlite/health"
import { SQLITE_STORAGE_SCHEMA } from "@/lib/persistence/sqlite/schema"
import {
  deserializeStorageRecordFromSQLite,
  serializeStorageRecordForSQLite,
  type SQLiteStorageRecordRow,
} from "@/lib/persistence/sqlite/serialization"
import {
  validateSQLiteArchiveRequest,
  validateSQLiteListQuery,
  validateSQLiteLocator,
} from "@/lib/persistence/sqlite/validation"

interface ExistsRow {
  readonly found: number
}

interface ArchiveStateRow {
  readonly archived: number
}

function notFound(locator: StorageRecordLocator): StorageResult<never> {
  return createStorageFailure("NOT_FOUND", [createStorageError(
    "not_found",
    `${locator.recordKind} record ${locator.recordId} was not found.`,
  )])
}

export class SQLiteStorageAdapter implements StorageAdapter {
  private database: Database.Database | null = null
  private initializationError: unknown = null

  constructor(databasePath: string) {
    if (typeof databasePath !== "string" || databasePath.trim().length === 0) {
      this.initializationError = new Error("SQLite database path is required.")
      return
    }

    try {
      const database = new Database(databasePath)
      database.pragma("foreign_keys = ON")
      database.pragma("busy_timeout = 5000")
      if (!database.memory) database.pragma("journal_mode = WAL")
      database.exec(SQLITE_STORAGE_SCHEMA)
      this.database = database
    } catch (cause) {
      this.initializationError = cause
      this.database = null
    }
  }

  private unavailable<T>(): StorageResult<T> {
    return createStorageFailure("UNAVAILABLE", [createStorageError(
      "storage_unavailable",
      "SQLite storage is unavailable.",
      { retryable: true, cause: this.initializationError },
    )])
  }

  private storageError<T>(message: string, cause: unknown): StorageResult<T> {
    return createStorageFailure("STORAGE_ERROR", [createStorageError(
      "storage_failure",
      message,
      { retryable: true, cause },
    )])
  }

  async writeRecord(record: StorageRecord): Promise<StorageResult<StorageRecord>> {
    const validation = validateStorageRecord(record)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    const serialized = serializeStorageRecordForSQLite(validation.value)
    if (serialized.status !== "SUCCESS") {
      return createStorageFailure(serialized.status, serialized.errors)
    }
    if (!this.database) return this.unavailable()

    try {
      const result = this.database.prepare(`
        INSERT OR IGNORE INTO storage_records (
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
          @record_id,
          @record_kind,
          @idempotency_key,
          @runtime_version,
          @schema_version,
          @created_at,
          @recorded_at,
          @parent_refs,
          @payload,
          @checksum,
          @archived
        )
      `).run(serialized.value)

      if (result.changes === 0) {
        return createStorageFailure("DUPLICATE", [createStorageError(
          "duplicate_record",
          "SQLite record ID or idempotency key already exists.",
        )])
      }
      return createStorageSuccess(validation.value)
    } catch (cause) {
      return this.storageError("SQLite could not write the StorageRecord.", cause)
    }
  }

  async readRecord(
    locator: StorageRecordLocator,
  ): Promise<StorageResult<StorageRecord>> {
    const validation = validateSQLiteLocator(locator)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    if (!this.database) return this.unavailable()

    try {
      const row = this.database.prepare<[string, string], SQLiteStorageRecordRow>(`
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
        WHERE record_kind = ? AND record_id = ?
      `).get(validation.value.recordKind, validation.value.recordId)
      if (!row) return notFound(validation.value)
      return deserializeStorageRecordFromSQLite(row)
    } catch (cause) {
      return this.storageError("SQLite could not read the StorageRecord.", cause)
    }
  }

  async recordExists(locator: StorageRecordLocator): Promise<StorageResult<boolean>> {
    const validation = validateSQLiteLocator(locator)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    if (!this.database) return this.unavailable()

    try {
      const row = this.database.prepare<[string, string], ExistsRow>(`
        SELECT EXISTS(
          SELECT 1 FROM storage_records WHERE record_kind = ? AND record_id = ?
        ) AS found
      `).get(validation.value.recordKind, validation.value.recordId)
      return createStorageSuccess(row?.found === 1)
    } catch (cause) {
      return this.storageError("SQLite could not check StorageRecord existence.", cause)
    }
  }

  async listRecords(query?: StorageListQuery): Promise<StorageResult<StorageRecordPage>> {
    const validation = validateSQLiteListQuery(query)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    if (!this.database) return this.unavailable()

    const value = validation.value
    const clauses = ["archived = 0"]
    const parameters: Array<string | number> = []
    if (value?.recordKinds && value.recordKinds.length > 0) {
      clauses.push(`record_kind IN (${value.recordKinds.map(() => "?").join(", ")})`)
      parameters.push(...value.recordKinds)
    }
    if (value?.parentRef) {
      clauses.push(`EXISTS (
        SELECT 1
        FROM json_each(storage_records.parent_refs) AS parent
        WHERE json_extract(parent.value, '$.recordId') = ?
          AND json_extract(parent.value, '$.recordKind') = ?
      )`)
      parameters.push(value.parentRef.recordId, value.parentRef.recordKind)
    }
    if (value?.createdAfter) {
      clauses.push("julianday(created_at) >= julianday(?)")
      parameters.push(value.createdAfter)
    }
    if (value?.createdBefore) {
      clauses.push("julianday(created_at) <= julianday(?)")
      parameters.push(value.createdBefore)
    }
    if (value?.cursor) {
      clauses.push("rowid > ?")
      parameters.push(Number(value.cursor))
    }

    const limit = value?.limit ?? 100
    parameters.push(limit + 1)
    try {
      const rows = this.database.prepare<unknown[], SQLiteStorageRecordRow>(`
        SELECT
          rowid AS cursor_id,
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
        WHERE ${clauses.join(" AND ")}
        ORDER BY rowid ASC
        LIMIT ?
      `).all(...parameters)

      const hasNextPage = rows.length > limit
      const selectedRows = hasNextPage ? rows.slice(0, limit) : rows
      const records: StorageRecord[] = []
      for (const row of selectedRows) {
        const record = deserializeStorageRecordFromSQLite(row)
        if (record.status !== "SUCCESS") {
          return createStorageFailure(record.status, record.errors)
        }
        records.push(record.value)
      }
      const lastRow = selectedRows[selectedRows.length - 1]
      return createStorageSuccess(Object.freeze({
        records: Object.freeze(records),
        nextCursor: hasNextPage && lastRow?.cursor_id !== undefined
          ? String(lastRow.cursor_id)
          : null,
      }))
    } catch (cause) {
      return this.storageError("SQLite could not list StorageRecords.", cause)
    }
  }

  async appendEvent(record: StorageRecord): Promise<StorageResult<StorageRecord>> {
    return this.writeRecord(record)
  }

  async markArchived(
    request: StorageArchiveRequest,
  ): Promise<StorageResult<StorageArchiveReceipt>> {
    const validation = validateSQLiteArchiveRequest(request)
    if (validation.status !== "SUCCESS") {
      return createStorageFailure(validation.status, validation.errors)
    }
    if (!this.database) return this.unavailable()

    try {
      const state = this.database.prepare<[string, string], ArchiveStateRow>(`
        SELECT archived
        FROM storage_records
        WHERE record_kind = ? AND record_id = ?
      `).get(validation.value.recordKind, validation.value.recordId)
      if (!state) return notFound(validation.value)
      if (state.archived === 1) {
        return createStorageFailure("DUPLICATE", [createStorageError(
          "duplicate_record",
          "SQLite record is already archived.",
        )])
      }

      const result = this.database.prepare(`
        UPDATE storage_records
        SET archived = 1
        WHERE record_kind = @recordKind
          AND record_id = @recordId
          AND archived = 0
      `).run({
        recordKind: validation.value.recordKind,
        recordId: validation.value.recordId,
      })
      if (result.changes !== 1) {
        return createStorageFailure("CONFLICT", [createStorageError(
          "record_conflict",
          "SQLite record archive state changed before the update completed.",
          { retryable: true },
        )])
      }

      return createStorageSuccess(Object.freeze({ ...validation.value }))
    } catch (cause) {
      return this.storageError("SQLite could not archive the StorageRecord.", cause)
    }
  }

  async healthCheck(): Promise<StorageResult<StorageAdapterHealth>> {
    return checkSQLiteHealth(this.database)
  }
}
