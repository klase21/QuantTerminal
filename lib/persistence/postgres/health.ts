import type postgres from "postgres"

import { createStorageSuccess, type StorageResult } from "@/lib/persistence/result"
import type { StorageAdapterHealth } from "@/lib/persistence/types"

interface TableHealthRow {
  readonly table_name: string | null
}

export async function checkPostgresHealth(
  sql: postgres.Sql | null,
): Promise<StorageResult<StorageAdapterHealth>> {
  if (!sql) {
    return createStorageSuccess(Object.freeze({
      status: "UNAVAILABLE",
      available: false,
      message: "Postgres storage is unavailable.",
    }))
  }

  try {
    await sql`SELECT 1 AS ready`
    const rows = await sql<TableHealthRow[]>`
      SELECT to_regclass('public.storage_records')::text AS table_name
    `
    if (!rows[0]?.table_name) {
      return createStorageSuccess(Object.freeze({
        status: "DEGRADED",
        available: true,
        message: "Postgres is reachable but the storage schema is unavailable.",
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
      message: "Postgres health check could not access storage.",
    }))
  }
}
