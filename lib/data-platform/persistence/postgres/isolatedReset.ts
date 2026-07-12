import type { IsolatedPostgresClient } from "./client"
import { D2_POSTGRES_SCHEMAS } from "./schema"

export interface IsolatedResetCommand { readonly explicitOptIn: "RESET_D2_ISOLATED_DATABASE"; readonly auditIdentity: string }

export async function resetIsolatedSchemas(client: IsolatedPostgresClient, command: IsolatedResetCommand): Promise<void> {
  if (client.roleIntent !== "MIGRATION_OWNER") throw new Error("Reset requires MIGRATION_OWNER intent")
  if (command.explicitOptIn !== "RESET_D2_ISOLATED_DATABASE" || !command.auditIdentity.trim()) throw new Error("Explicit isolated reset authorization is required")
  await client.transaction(async (sql) => {
    for (const schema of [...D2_POSTGRES_SCHEMAS].reverse()) await sql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await sql.unsafe("DROP ROLE IF EXISTS qt_d2_bounded_writer")
    await sql.unsafe("DROP ROLE IF EXISTS qt_d2_canonical_writer")
    await sql.unsafe("DROP ROLE IF EXISTS qt_d2_read_only")
  })
}
