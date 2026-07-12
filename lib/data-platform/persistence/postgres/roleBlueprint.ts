import { readFile } from "node:fs/promises"
import path from "node:path"
import type { IsolatedPostgresClient } from "./client"

export const ROLE_BLUEPRINT_PATH = path.join(process.cwd(), "lib", "data-platform", "persistence", "postgres", "roles.sql")

export async function applyIsolatedRoleBlueprint(client: IsolatedPostgresClient): Promise<void> {
  if (client.roleIntent !== "MIGRATION_OWNER") throw new Error("Role blueprint requires MIGRATION_OWNER intent")
  const sqlText = await readFile(ROLE_BLUEPRINT_PATH, "utf8")
  await client.transaction(async (sql) => { await sql.unsafe(sqlText) })
}
