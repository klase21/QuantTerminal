import postgres from "postgres"

type ProbeResult = Readonly<{
  name: string
  outcome: "ALLOWED" | "DENIED"
  sqlstate: string | null
}>

const rollbackMarker = "D3_PRIVILEGE_PROBE_ROLLBACK"

function sqlstateOf(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null
  return typeof error.code === "string" ? error.code : null
}

async function probeMutation(sql: postgres.Sql, name: string, statement: string): Promise<ProbeResult> {
  try {
    await sql.begin(async (transaction) => {
      await transaction.unsafe(statement)
      throw new Error(rollbackMarker)
    })
  } catch (error) {
    if (error instanceof Error && error.message === rollbackMarker) {
      return { name, outcome: "ALLOWED", sqlstate: null }
    }
    return { name, outcome: "DENIED", sqlstate: sqlstateOf(error) }
  }
  throw new Error("Privilege probe completed without an outcome")
}

async function main() {
  const connectionString = process.env.D3_POPULATION_POSTGRES_URL
  if (!connectionString) throw new Error("D3_POPULATION_POSTGRES_URL is required")
  const target = new URL(connectionString)
  if (target.hostname !== "localhost" || target.port !== "55432" || target.pathname !== "/quantterminal_backfill") {
    throw new Error("Integrated privilege probes require localhost:55432/quantterminal_backfill")
  }

  const sql = postgres(connectionString, { max: 1, prepare: false })
  try {
    const results: ProbeResult[] = []
    try {
      await sql`SELECT count(*)::integer AS count FROM canonical.ohlcv`
      results.push({ name: "READ_D2_CANONICAL", outcome: "ALLOWED", sqlstate: null })
    } catch (error) {
      results.push({ name: "READ_D2_CANONICAL", outcome: "DENIED", sqlstate: sqlstateOf(error) })
    }

    for (const [name, statement] of [
      ["INSERT_D2_CANONICAL", "INSERT INTO canonical.ohlcv DEFAULT VALUES"],
      ["UPDATE_D2_CANONICAL", "UPDATE canonical.ohlcv SET checksum = checksum WHERE false"],
      ["DELETE_D2_CANONICAL", "DELETE FROM canonical.ohlcv WHERE false"],
      ["ALTER_D2_CANONICAL", "ALTER TABLE canonical.ohlcv ADD COLUMN forbidden_probe integer"],
      ["WRITE_D2_LEDGER", "UPDATE control.migration_ledger SET migration_checksum = migration_checksum WHERE false"],
      ["SELF_GRANT_D2", "GRANT SELECT ON canonical.ohlcv TO qt_d3_backfill_owner"],
      ["CREATE_ROLE", "CREATE ROLE qt_d3_forbidden_probe NOLOGIN"],
      ["REVOKE_PUBLIC_CONTROL_TABLES", "REVOKE ALL ON ALL TABLES IN SCHEMA control FROM PUBLIC"],
    ] as const) {
      results.push(await probeMutation(sql, name, statement))
    }
    console.log(JSON.stringify({ database: target.pathname.slice(1), role: decodeURIComponent(target.username), results }))
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" }))
  process.exitCode = 1
})
