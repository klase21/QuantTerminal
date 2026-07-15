import { randomBytes } from "node:crypto"

import postgres from "postgres"

import { createMvpServingManagedClient, type MvpServingPostgresClient } from "./client"
import { requireMvpServingManagedAdminTarget } from "./safety"

export interface ManagedServingRoleSession {
  readonly migrationOwner: MvpServingPostgresClient
  readonly publisher: MvpServingPostgresClient
  readonly reader: MvpServingPostgresClient
  readonly adminRole: string
  readonly database: string
}

export async function bootstrapManagedServingRoles(): Promise<ManagedServingRoleSession> {
  const direct = process.env.MVP_SERVING_PUBLISHER_POSTGRES_URL
  requireMvpServingManagedAdminTarget(direct)
  const admin = postgres(direct!, { max: 1, prepare: false, connect_timeout: 15, idle_timeout: 30, connection: { application_name: "mvp-serving-managed-bootstrap", statement_timeout: 30_000, lock_timeout: 5_000 } })
  try {
    const identity = await admin.unsafe<Array<{ database: string; role: string; version: number; can_create_role: boolean }>>("SELECT current_database() database,current_user role,current_setting('server_version_num')::int version,r.rolcreaterole can_create_role FROM pg_roles r WHERE r.rolname=current_user")
    const current = identity[0]
    if (!current || current.version < 160000 || current.version >= 170000 || !current.can_create_role) throw new Error("MVP_SERVING_MANAGED_ADMIN_VERIFICATION_FAILED")
    const publisherSecret = randomBytes(32).toString("base64url"), readerSecret = randomBytes(32).toString("base64url")
    await upsertLoginRole(admin, "mvp_serving_publisher", publisherSecret)
    await upsertLoginRole(admin, "mvp_serving_reader", readerSecret)
    const database = quoteIdentifier(current.database)
    await admin.unsafe(`GRANT CONNECT,CREATE ON DATABASE ${database} TO mvp_serving_publisher`)
    await admin.unsafe(`GRANT CONNECT ON DATABASE ${database} TO mvp_serving_reader`)
    const publisherUrl = roleUrl(direct!, "mvp_serving_publisher", publisherSecret), readerUrl = roleUrl(direct!, "mvp_serving_reader", readerSecret)
    const migrationOwner = createMvpServingManagedClient(publisherUrl, "MIGRATION_OWNER"), publisher = createMvpServingManagedClient(publisherUrl, "PUBLISHER"), reader = createMvpServingManagedClient(readerUrl, "READER")
    await migrationOwner.verify(); await publisher.verify(); await reader.verify()
    return Object.freeze({ migrationOwner, publisher, reader, adminRole: current.role, database: current.database })
  } finally { await admin.end({ timeout: 5 }) }
}

async function upsertLoginRole(sql: postgres.Sql, role: "mvp_serving_publisher" | "mvp_serving_reader", secret: string): Promise<void> {
  const exists = await sql.unsafe<Array<{ exists: boolean }>>("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=$1) exists", [role])
  const password = quoteLiteral(secret)
  if (exists[0]?.exists) await sql.unsafe(`ALTER ROLE ${role} WITH LOGIN PASSWORD ${password}`)
  else await sql.unsafe(`CREATE ROLE ${role} LOGIN PASSWORD ${password} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`)
  const attributes = await sql.unsafe<Array<{ login: boolean; superuser: boolean; create_db: boolean; create_role: boolean; replication: boolean }>>("SELECT rolcanlogin login,rolsuper superuser,rolcreatedb create_db,rolcreaterole create_role,rolreplication replication FROM pg_roles WHERE rolname=$1", [role])
  if (!attributes[0]?.login || attributes[0].superuser || attributes[0].create_db || attributes[0].create_role || attributes[0].replication) throw new Error(`MVP_SERVING_MANAGED_ROLE_ATTRIBUTES_INVALID:${role}`)
}

function roleUrl(source: string, role: string, password: string): string { const value = new URL(source); value.username = role; value.password = password; return value.toString() }
function quoteIdentifier(value: string): string { return `"${value.replace(/"/g, '""')}"` }
function quoteLiteral(value: string): string { return `'${value.replace(/'/g, "''")}'` }
