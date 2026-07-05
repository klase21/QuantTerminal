import type Database from "better-sqlite3"

import { createStorageSuccess, type StorageResult } from "@/lib/persistence/result"
import type { StorageAdapterHealth } from "@/lib/persistence/types"
import { SQLITE_STORAGE_TABLE } from "@/lib/persistence/sqlite/schema"

interface QuickCheckRow {
  readonly quick_check: string
}

interface TableRow {
  readonly name: string
}

export function checkSQLiteHealth(
  database: Database.Database | null,
): StorageResult<StorageAdapterHealth> {
  if (!database || !database.open) {
    return createStorageSuccess(Object.freeze({
      status: "UNAVAILABLE",
      available: false,
      message: "SQLite database is unavailable.",
    }))
  }

  try {
    const table = database.prepare<[string], TableRow>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    ).get(SQLITE_STORAGE_TABLE)
    const checks = database.prepare<[], QuickCheckRow>("PRAGMA quick_check").all()
    const integrityReady = checks.length === 1 && checks[0]?.quick_check === "ok"

    if (!table || !integrityReady) {
      return createStorageSuccess(Object.freeze({
        status: "DEGRADED",
        available: true,
        message: !table
          ? "SQLite storage schema is unavailable."
          : "SQLite integrity check reported a degraded state.",
      }))
    }

    return createStorageSuccess(Object.freeze({
      status: "READY",
      available: true,
      message: null,
    }))
  } catch {
    return createStorageSuccess(Object.freeze({
      status: "UNAVAILABLE",
      available: false,
      message: "SQLite health check could not access storage.",
    }))
  }
}
