import postgres from "postgres"

import { MVP_GREEN_MIGRATION_OWNER_ROLE } from "@/lib/data-platform/mvp-release"
import type { MvpServingMigrationClient } from "./migrationRunner"

const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"])

export interface GreenCleanServingMigrationOwnerObservation {
  readonly database: string
  readonly sessionUser: string
  readonly currentUser: string
  readonly databaseOwner: string
  readonly postgresVersion: number
  readonly ownerExists: boolean
  readonly ownerLogin: boolean
  readonly ownerSuperuser: boolean
  readonly ownerCreateDatabase: boolean
  readonly ownerCreateRole: boolean
  readonly membershipAdmin: boolean
  readonly membershipInherit: boolean
  readonly membershipSet: boolean
  readonly canSetRole: boolean
}

export function assertGreenCleanServingMigrationOwnerObservation(
  observation: GreenCleanServingMigrationOwnerObservation,
  expectedDatabase: string,
  expectedSessionUser: string,
): void {
  if (
    observation.database !== expectedDatabase
    || observation.sessionUser !== expectedSessionUser
    || observation.currentUser !== expectedSessionUser
    || observation.databaseOwner !== MVP_GREEN_MIGRATION_OWNER_ROLE
    || observation.postgresVersion < 160_000
    || observation.postgresVersion >= 170_000
    || !observation.ownerExists
    || observation.ownerLogin
    || observation.ownerSuperuser
    || observation.ownerCreateDatabase
    || observation.ownerCreateRole
    || !observation.membershipAdmin
    || observation.membershipInherit
    || !observation.membershipSet
    || !observation.canSetRole
  ) throw new Error("MVP_GREEN_CLEAN_SERVING_MIGRATION_OWNER_TOPOLOGY_INVALID")
}

export class GreenCleanServingMigrationOwnerClient implements MvpServingMigrationClient {
  readonly roleIntent = "MIGRATION_OWNER" as const
  private readonly sql: postgres.Sql

  constructor(
    connectionString: string,
    private readonly expectedDatabase: string,
    private readonly expectedSessionUser: string,
    expectedManagedHost?: string,
  ) {
    let url: URL
    try { url = new URL(connectionString) } catch { throw new Error("MVP_GREEN_CLEAN_SERVING_MIGRATION_URL_INVALID") }
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
    const role = decodeURIComponent(url.username)
    const host = url.hostname.toLowerCase()
    const hostSafe = expectedManagedHost
      ? !LOOPBACK.has(host) && host === expectedManagedHost.toLowerCase()
      : LOOPBACK.has(host)
    if (
      !["postgres:", "postgresql:"].includes(url.protocol)
      || !hostSafe
      || !url.password
      || database !== expectedDatabase
      || role !== expectedSessionUser
      || !IDENTIFIER.test(expectedDatabase)
      || !IDENTIFIER.test(expectedSessionUser)
    ) throw new Error("MVP_GREEN_CLEAN_SERVING_MIGRATION_TARGET_INVALID")
    this.sql = postgres(connectionString, {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 30,
      connection: {
        application_name: "mvp-green-clean-serving-migration-owner",
        statement_timeout: 30_000,
        lock_timeout: 5_000,
        idle_in_transaction_session_timeout: 30_000,
      },
    })
  }

  async verify(): Promise<void> {
    const rows = await this.sql.unsafe<Array<{
      database: string
      session_user: string
      current_user: string
      database_owner: string
      version: number
      owner_exists: boolean
      owner_login: boolean
      owner_superuser: boolean
      owner_createdb: boolean
      owner_createrole: boolean
      membership_admin: boolean
      membership_inherit: boolean
      membership_set: boolean
      can_set_role: boolean
    }>>(
      `SELECT current_database() database,session_user,current_user,
        pg_get_userbyid(d.datdba) database_owner,
        current_setting('server_version_num')::int version,
        (owner.oid IS NOT NULL) owner_exists,
        COALESCE(owner.rolcanlogin,false) owner_login,
        COALESCE(owner.rolsuper,false) owner_superuser,
        COALESCE(owner.rolcreatedb,false) owner_createdb,
        COALESCE(owner.rolcreaterole,false) owner_createrole,
        COALESCE(m.admin_option,false) membership_admin,
        COALESCE(m.inherit_option,false) membership_inherit,
        COALESCE(m.set_option,false) membership_set,
        pg_has_role(session_user,$1,'SET') can_set_role
       FROM pg_database d
       LEFT JOIN pg_roles owner ON owner.rolname=$1
       LEFT JOIN pg_roles member ON member.rolname=session_user
       LEFT JOIN pg_auth_members m ON m.roleid=owner.oid AND m.member=member.oid
       WHERE d.datname=current_database()`,
      [MVP_GREEN_MIGRATION_OWNER_ROLE],
    )
    const row = rows[0]
    assertGreenCleanServingMigrationOwnerObservation({
      database: row?.database ?? "",
      sessionUser: row?.session_user ?? "",
      currentUser: row?.current_user ?? "",
      databaseOwner: row?.database_owner ?? "",
      postgresVersion: row?.version ?? 0,
      ownerExists: row?.owner_exists ?? false,
      ownerLogin: row?.owner_login ?? true,
      ownerSuperuser: row?.owner_superuser ?? true,
      ownerCreateDatabase: row?.owner_createdb ?? true,
      ownerCreateRole: row?.owner_createrole ?? true,
      membershipAdmin: row?.membership_admin ?? false,
      membershipInherit: row?.membership_inherit ?? true,
      membershipSet: row?.membership_set ?? false,
      canSetRole: row?.can_set_role ?? false,
    }, this.expectedDatabase, this.expectedSessionUser)
  }

  transaction<T>(work: (sql: postgres.TransactionSql) => Promise<T>): Promise<T> {
    return this.sql.begin("ISOLATION LEVEL SERIALIZABLE", async (sql) => {
      await sql.unsafe(`SET LOCAL ROLE "${MVP_GREEN_MIGRATION_OWNER_ROLE}"`)
      const rows = await sql.unsafe<Array<{ database: string; session_user: string; current_user: string; read_only: string }>>(
        "SELECT current_database() database,session_user,current_user,current_setting('transaction_read_only') read_only",
      )
      const row = rows[0]
      if (
        row?.database !== this.expectedDatabase
        || row.session_user !== this.expectedSessionUser
        || row.current_user !== MVP_GREEN_MIGRATION_OWNER_ROLE
        || row.read_only !== "off"
      ) throw new Error("MVP_GREEN_CLEAN_SERVING_SET_ROLE_VERIFICATION_FAILED")
      return work(sql)
    }) as Promise<T>
  }

  shutdown(): Promise<void> {
    return this.sql.end({ timeout: 5 })
  }
}
