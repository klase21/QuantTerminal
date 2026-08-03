export const GREEN_CLEAN_PRIVILEGE_CLOSURE_VERSION = "mvp-green-clean-privilege-closure/1.0.0" as const

export type GreenCleanPrivilegeObjectKind = "DATABASE" | "SCHEMA" | "TABLE" | "SEQUENCE" | "FUNCTION" | "ROLE"
export type GreenCleanPrivilegeExpectation = "ALLOW" | "DENY"

export interface GreenCleanPrivilegeRoleLike {
  readonly roleName: string
  readonly login: boolean
  readonly inherit: boolean
  readonly bypassRls: boolean
  readonly createDatabase: boolean
  readonly createRole: boolean
  readonly superuser: boolean
  readonly connectDatabases?: readonly string[]
  readonly deniedDatabases?: readonly string[]
  readonly setRoleTargets?: readonly string[]
}

export interface GreenCleanPrivilegeOperationLike {
  readonly testId: string
  readonly database: string
  readonly sessionRole: string
  readonly setRole: string | null
  readonly schema: string | null
  readonly object: string
  readonly objectKind: GreenCleanPrivilegeObjectKind
  readonly operation: string
  readonly requiredPrivilege: string
  readonly expected: GreenCleanPrivilegeExpectation
  readonly expectedRole: string
}

export interface GreenCleanPrivilegeMembershipLike {
  readonly memberRole: string
  readonly grantedRole: string
  readonly grantorRole: string
  readonly adminOption: boolean
  readonly inheritOption: boolean
  readonly setOption: boolean
}

export interface GreenCleanPrivilegeOwnershipLike {
  readonly databaseName: string
  readonly objectKind: Exclude<GreenCleanPrivilegeObjectKind, "ROLE">
  readonly schema?: string
  readonly object?: string
  readonly ownerRole: string
}

export interface GreenCleanPrivilegeMatrixLike {
  readonly roles: readonly GreenCleanPrivilegeRoleLike[]
  readonly operations: readonly GreenCleanPrivilegeOperationLike[]
  readonly memberships?: readonly GreenCleanPrivilegeMembershipLike[]
  readonly ownerships?: readonly GreenCleanPrivilegeOwnershipLike[]
}

export interface GreenCleanPrivilegeQueryPort {
  query<T extends Record<string, unknown>>(statement: string, parameters?: readonly unknown[]): Promise<readonly T[]>
}

export interface GreenCleanPrivilegeTransactionContext extends GreenCleanPrivilegeQueryPort {
  savepoint<T>(work: (savepoint: GreenCleanPrivilegeQueryPort) => Promise<T>): Promise<T>
}

export interface GreenCleanPrivilegeTransactionPort extends GreenCleanPrivilegeQueryPort {
  transaction<T>(work: (transaction: GreenCleanPrivilegeTransactionContext) => Promise<T>): Promise<T>
}

export interface GreenCleanExpectedDenialProbe {
  readonly testId: string
  readonly database: string
  readonly role: string
  readonly statement: string
  readonly parameters?: readonly unknown[]
  readonly expectedSqlStates?: readonly string[]
}

export interface GreenCleanPrivilegeClosureCounters {
  readonly missingRoles: number
  readonly roleAttributeMismatches: number
  readonly ownerMismatches: number
  readonly membershipMismatches: number
  readonly setRoleFailures: number
  readonly missingConnectPrivileges: number
  readonly missingSchemaPrivileges: number
  readonly missingTablePrivileges: number
  readonly missingSequencePrivileges: number
  readonly missingFunctionPrivileges: number
  readonly excessivePrivileges: number
  readonly preflightExecutionRoleMismatches: number
  readonly expectedDenialFailures: number
  readonly unclassifiedOperations: number
}

export interface GreenCleanPrivilegeClosureFailure {
  readonly testId: string
  readonly classification: keyof GreenCleanPrivilegeClosureCounters
  readonly detail: string
}

export interface GreenCleanPrivilegeClosureReport {
  readonly version: typeof GREEN_CLEAN_PRIVILEGE_CLOSURE_VERSION
  readonly status: "PASS" | "FAIL"
  readonly rolesInspected: number
  readonly operationsInspected: number
  readonly denialTestsExecuted: number
  readonly counters: GreenCleanPrivilegeClosureCounters
  readonly failures: readonly GreenCleanPrivilegeClosureFailure[]
}

export function greenCleanPrivilegeClosurePasses(
  value: Pick<GreenCleanPrivilegeClosureReport, "status" | "counters">,
): boolean {
  return value.status === "PASS" && Object.values(value.counters).every((count) => count === 0)
}

type RoleRow = {
  readonly role_name: string
  readonly login: boolean
  readonly inherit: boolean
  readonly bypass_rls: boolean
  readonly create_database: boolean
  readonly create_role: boolean
  readonly superuser: boolean
}

type MembershipRow = {
  readonly member_role: string
  readonly granted_role: string
  readonly grantor_role: string
  readonly admin_option: boolean
  readonly inherit_option: boolean
  readonly set_option: boolean
}

type OwnershipRow = { readonly owner_role: string | null }
type BooleanRow = { readonly allowed: boolean }

const safePrivilegeNames = Object.freeze({
  DATABASE: new Set(["CONNECT", "CREATE", "TEMP", "TEMPORARY"]),
  SCHEMA: new Set(["USAGE", "CREATE"]),
  TABLE: new Set(["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]),
  SEQUENCE: new Set(["USAGE", "SELECT", "UPDATE"]),
  FUNCTION: new Set(["EXECUTE"]),
} satisfies Record<Exclude<GreenCleanPrivilegeObjectKind, "ROLE">, ReadonlySet<string>>)

function quotedIdentifier(value: string): string {
  if (!value || value.includes("\0")) throw new Error("GREEN_CLEAN_PRIVILEGE_IDENTIFIER_INVALID")
  return `"${value.replaceAll("\"", "\"\"")}"`
}

function membershipKey(value: GreenCleanPrivilegeMembershipLike): string {
  return [
    value.memberRole,
    value.grantedRole,
    value.grantorRole,
    String(value.adminOption),
    String(value.inheritOption),
    String(value.setOption),
  ].join("|")
}

function actualMembershipKey(value: MembershipRow): string {
  return [
    value.member_role,
    value.granted_role,
    value.grantor_role,
    String(value.admin_option),
    String(value.inherit_option),
    String(value.set_option),
  ].join("|")
}

function qualifiedObject(value: GreenCleanPrivilegeOperationLike): string {
  if (value.objectKind === "SCHEMA") return value.object
  return value.schema && !value.object.startsWith(`${value.schema}.`) ? `${value.schema}.${value.object}` : value.object
}

function newCounters(): Record<keyof GreenCleanPrivilegeClosureCounters, number> {
  return {
    missingRoles: 0,
    roleAttributeMismatches: 0,
    ownerMismatches: 0,
    membershipMismatches: 0,
    setRoleFailures: 0,
    missingConnectPrivileges: 0,
    missingSchemaPrivileges: 0,
    missingTablePrivileges: 0,
    missingSequencePrivileges: 0,
    missingFunctionPrivileges: 0,
    excessivePrivileges: 0,
    preflightExecutionRoleMismatches: 0,
    expectedDenialFailures: 0,
    unclassifiedOperations: 0,
  }
}

function freezeCounters(value: Record<keyof GreenCleanPrivilegeClosureCounters, number>): GreenCleanPrivilegeClosureCounters {
  return Object.freeze({ ...value })
}

function missingCounter(kind: GreenCleanPrivilegeObjectKind): keyof GreenCleanPrivilegeClosureCounters {
  if (kind === "DATABASE") return "missingConnectPrivileges"
  if (kind === "SCHEMA") return "missingSchemaPrivileges"
  if (kind === "TABLE") return "missingTablePrivileges"
  if (kind === "SEQUENCE") return "missingSequencePrivileges"
  if (kind === "FUNCTION") return "missingFunctionPrivileges"
  return "setRoleFailures"
}

function addFailure(
  failures: GreenCleanPrivilegeClosureFailure[],
  counters: Record<keyof GreenCleanPrivilegeClosureCounters, number>,
  classification: keyof GreenCleanPrivilegeClosureCounters,
  testId: string,
  detail: string,
): void {
  counters[classification] += 1
  failures.push(Object.freeze({ testId, classification, detail }))
}

function requirePort(
  ports: Readonly<Record<string, GreenCleanPrivilegeQueryPort>>,
  database: string,
): GreenCleanPrivilegeQueryPort {
  const port = ports[database]
  if (!port) throw new Error(`GREEN_CLEAN_PRIVILEGE_DATABASE_PORT_REQUIRED:${database}`)
  return port
}

async function inspectPrivilege(
  port: GreenCleanPrivilegeQueryPort,
  value: GreenCleanPrivilegeOperationLike,
): Promise<boolean | null> {
  const privilege = value.requiredPrivilege.trim().toUpperCase()
  if (value.objectKind === "ROLE") {
    if (privilege === "SET" || privilege === "SET_ROLE") {
      const rows = await port.query<BooleanRow>(
        "SELECT pg_has_role($1,$2,'SET') allowed",
        [value.sessionRole, value.object],
      )
      return rows[0]?.allowed ?? false
    }
    if (privilege === "MANAGE_ROLE" || value.operation === "MANAGE_ROLE") {
      const rows = await port.query<BooleanRow>(
        "SELECT (r.rolsuper OR r.rolcreaterole) allowed FROM pg_roles r WHERE r.rolname=$1",
        [value.expectedRole],
      )
      return rows[0]?.allowed ?? false
    }
    return null
  }
  if (!safePrivilegeNames[value.objectKind].has(privilege)) return null
  const target = value.objectKind === "DATABASE" ? value.database : qualifiedObject(value)
  const functionName = value.objectKind === "DATABASE"
    ? "has_database_privilege"
    : value.objectKind === "SCHEMA"
      ? "has_schema_privilege"
      : value.objectKind === "TABLE"
        ? "has_table_privilege"
        : value.objectKind === "SEQUENCE"
          ? "has_sequence_privilege"
          : "has_function_privilege"
  const rows = await port.query<BooleanRow>(
    `SELECT ${functionName}($1,$2,$3) allowed`,
    [value.expectedRole, target, privilege],
  )
  return rows[0]?.allowed ?? false
}

async function inspectOwnership(
  port: GreenCleanPrivilegeQueryPort,
  value: GreenCleanPrivilegeOwnershipLike,
): Promise<string | null> {
  if (value.objectKind === "DATABASE") {
    const rows = await port.query<OwnershipRow>(
      "SELECT pg_get_userbyid(d.datdba) owner_role FROM pg_database d WHERE d.datname=$1",
      [value.databaseName],
    )
    return rows[0]?.owner_role ?? null
  }
  if (value.objectKind === "SCHEMA") {
    const rows = await port.query<OwnershipRow>(
      "SELECT pg_get_userbyid(n.nspowner) owner_role FROM pg_namespace n WHERE n.nspname=$1",
      [value.schema ?? value.object ?? ""],
    )
    return rows[0]?.owner_role ?? null
  }
  if (value.objectKind === "FUNCTION") {
    const signature = value.object?.startsWith(`${value.schema}.`)
      ? value.object
      : `${value.schema}.${value.object}`
    const rows = await port.query<OwnershipRow>(
      `SELECT pg_get_userbyid(p.proowner) owner_role
       FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname=$1 AND p.oid=to_regprocedure($2)`,
      [value.schema ?? "", signature],
    )
    return rows[0]?.owner_role ?? null
  }
  const relationKinds = value.objectKind === "SEQUENCE" ? ["S"] : ["r", "p", "v", "m", "f"]
  const rows = await port.query<OwnershipRow>(
    `SELECT pg_get_userbyid(c.relowner) owner_role
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind::text=ANY($3::text[])`,
    [value.schema ?? "", value.object ?? "", relationKinds],
  )
  return rows[0]?.owner_role ?? null
}

function assertDenialProbeStatement(value: string): void {
  const normalized = value.trim()
  if (!normalized || normalized.includes(";")) throw new Error("GREEN_CLEAN_DENIAL_PROBE_STATEMENT_INVALID")
  if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|VACUUM)\b/i.test(normalized)) throw new Error("GREEN_CLEAN_DENIAL_PROBE_TRANSACTION_CONTROL_FORBIDDEN")
  if (/\b(ALTER\s+SYSTEM|CREATE\s+DATABASE|DROP\s+DATABASE|COPY\b[\s\S]*\bPROGRAM|SET\s+SESSION\s+AUTHORIZATION|RESET\s+SESSION\s+AUTHORIZATION)\b/i.test(normalized)) {
    throw new Error("GREEN_CLEAN_DENIAL_PROBE_NON_TRANSACTIONAL_OPERATION_FORBIDDEN")
  }
}

function errorSqlState(error: unknown): string | null {
  if (!error || typeof error !== "object") return null
  const code = (error as { readonly code?: unknown }).code
  return typeof code === "string" ? code : null
}

async function executeExpectedDenial(
  port: GreenCleanPrivilegeTransactionPort,
  probe: GreenCleanExpectedDenialProbe,
): Promise<{ readonly denied: boolean; readonly roleEstablished: boolean; readonly sqlState: string | null }> {
  assertDenialProbeStatement(probe.statement)
  return port.transaction(async (transaction) => {
    try {
      await transaction.query(`SET LOCAL ROLE ${quotedIdentifier(probe.role)}`)
      try {
        await transaction.savepoint((savepoint) => savepoint.query(probe.statement, probe.parameters))
        return Object.freeze({ denied: false, roleEstablished: true, sqlState: null })
      } catch (error) {
        const sqlState = errorSqlState(error)
        return Object.freeze({ denied: true, roleEstablished: true, sqlState })
      }
    } catch (error) {
      const sqlState = errorSqlState(error)
      return Object.freeze({ denied: false, roleEstablished: false, sqlState })
    }
  })
}

export async function inspectGreenCleanPrivilegeClosure(
  matrix: GreenCleanPrivilegeMatrixLike,
  ports: Readonly<Record<string, GreenCleanPrivilegeQueryPort>>,
  options: {
    readonly roleCatalogDatabase?: string
    readonly denialProbes?: readonly GreenCleanExpectedDenialProbe[]
    readonly denialPorts?: Readonly<Record<string, GreenCleanPrivilegeTransactionPort>>
    readonly requireDenialProbeForEachDeniedOperation?: boolean
  } = {},
): Promise<GreenCleanPrivilegeClosureReport> {
  const failures: GreenCleanPrivilegeClosureFailure[] = []
  const counters = newCounters()
  const databaseNames = [...new Set([
    ...matrix.operations.map((value) => value.database),
    ...(matrix.ownerships ?? []).map((value) => value.databaseName),
  ])]
  const catalogDatabase = options.roleCatalogDatabase ?? databaseNames[0]
  if (!catalogDatabase) throw new Error("GREEN_CLEAN_PRIVILEGE_ROLE_CATALOG_DATABASE_REQUIRED")
  const catalog = requirePort(ports, catalogDatabase)
  const roleNames = [...new Set(matrix.roles.map((value) => value.roleName))].sort()
  const roleRows = await catalog.query<RoleRow>(
    `SELECT rolname role_name,rolcanlogin login,rolinherit inherit,rolbypassrls bypass_rls,
            rolcreatedb create_database,rolcreaterole create_role,rolsuper superuser
     FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname`,
    [roleNames],
  )
  const rolesByName = new Map(roleRows.map((value) => [value.role_name, value]))
  for (const expected of matrix.roles) {
    const actual = rolesByName.get(expected.roleName)
    if (!actual) {
      addFailure(failures, counters, "missingRoles", `role:${expected.roleName}`, "ROLE_MISSING")
      continue
    }
    const mismatches = [
      ["login", actual.login, expected.login],
      ["inherit", actual.inherit, expected.inherit],
      ["bypassRls", actual.bypass_rls, expected.bypassRls],
      ["createDatabase", actual.create_database, expected.createDatabase],
      ["createRole", actual.create_role, expected.createRole],
      ["superuser", actual.superuser, expected.superuser],
    ].filter(([, actualValue, expectedValue]) => actualValue !== expectedValue)
    if (mismatches.length) {
      addFailure(
        failures,
        counters,
        "roleAttributeMismatches",
        `role:${expected.roleName}`,
        mismatches.map(([name]) => String(name)).join(","),
      )
      if (mismatches.some(([, actualValue, expectedValue]) => actualValue === true && expectedValue === false)) counters.excessivePrivileges += 1
    }
    for (const database of expected.connectDatabases ?? []) {
      const rows = await requirePort(ports, database).query<BooleanRow>(
        "SELECT has_database_privilege($1,$2,'CONNECT') allowed",
        [expected.roleName, database],
      )
      if (!rows[0]?.allowed) addFailure(failures, counters, "missingConnectPrivileges", `connect:${expected.roleName}:${database}`, "CONNECT_MISSING")
    }
    for (const database of expected.deniedDatabases ?? []) {
      const rows = await requirePort(ports, database).query<BooleanRow>(
        "SELECT has_database_privilege($1,$2,'CONNECT') allowed",
        [expected.roleName, database],
      )
      if (rows[0]?.allowed) addFailure(failures, counters, "excessivePrivileges", `connect:${expected.roleName}:${database}`, "UNEXPECTED_CONNECT")
    }
    for (const target of expected.setRoleTargets ?? []) {
      const setRoleRows = await catalog.query<BooleanRow>(
        "SELECT pg_has_role($1,$2,'SET') allowed",
        [expected.roleName, target],
      )
      if (!setRoleRows[0]?.allowed) addFailure(failures, counters, "setRoleFailures", `set-role:${expected.roleName}:${target}`, "EXPECTED_SET_ROLE_MISSING")
    }
  }

  const expectedMemberships = matrix.memberships ?? []
  const membershipRows = await catalog.query<MembershipRow>(
    `SELECT member.rolname member_role,granted.rolname granted_role,grantor.rolname grantor_role,
            am.admin_option,am.inherit_option,am.set_option
     FROM pg_auth_members am
     JOIN pg_roles member ON member.oid=am.member
     JOIN pg_roles granted ON granted.oid=am.roleid
     JOIN pg_roles grantor ON grantor.oid=am.grantor
     WHERE member.rolname=ANY($1::text[])
     ORDER BY member.rolname,granted.rolname`,
    [roleNames],
  )
  const expectedMembershipKeys = new Set(expectedMemberships.map(membershipKey))
  const actualMembershipKeys = new Set(membershipRows.map(actualMembershipKey))
  for (const expected of expectedMemberships) {
    if (!actualMembershipKeys.has(membershipKey(expected))) {
      addFailure(failures, counters, "membershipMismatches", `membership:${expected.memberRole}:${expected.grantedRole}`, "EXPECTED_MEMBERSHIP_MISSING_OR_OPTIONS_MISMATCH")
    }
  }
  for (const actual of membershipRows) {
    if (!expectedMembershipKeys.has(actualMembershipKey(actual))) {
      addFailure(failures, counters, "membershipMismatches", `membership:${actual.member_role}:${actual.granted_role}`, "UNEXPECTED_MEMBERSHIP")
      counters.excessivePrivileges += 1
    }
  }

  for (const expected of matrix.ownerships ?? []) {
    const owner = await inspectOwnership(requirePort(ports, expected.databaseName), expected)
    if (owner !== expected.ownerRole) {
      addFailure(
        failures,
        counters,
        "ownerMismatches",
        `owner:${expected.databaseName}:${expected.schema ?? ""}:${expected.object ?? ""}`,
        `EXPECTED_${expected.ownerRole}:ACTUAL_${owner ?? "ABSENT"}`,
      )
    }
  }

  for (const operation of matrix.operations) {
    const effectiveRole = operation.setRole ?? operation.sessionRole
    if (effectiveRole !== operation.expectedRole) {
      addFailure(failures, counters, "preflightExecutionRoleMismatches", operation.testId, `EXPECTED_${operation.expectedRole}:ACTUAL_${effectiveRole}`)
      continue
    }
    const port = requirePort(ports, operation.database)
    if (operation.setRole) {
      const rows = await port.query<BooleanRow>("SELECT pg_has_role($1,$2,'SET') allowed", [operation.sessionRole, operation.setRole])
      if (!rows[0]?.allowed) {
        addFailure(failures, counters, "setRoleFailures", operation.testId, `SET_ROLE_DENIED:${operation.sessionRole}:${operation.setRole}`)
        continue
      }
    }
    let allowed: boolean | null
    try {
      allowed = await inspectPrivilege(port, operation)
    } catch (error) {
      addFailure(
        failures,
        counters,
        operation.expected === "ALLOW" ? missingCounter(operation.objectKind) : "unclassifiedOperations",
        operation.testId,
        `CATALOG_LOOKUP_FAILED:${errorSqlState(error) ?? (error instanceof Error ? error.message : "UNKNOWN")}`,
      )
      continue
    }
    if (allowed === null) {
      addFailure(failures, counters, "unclassifiedOperations", operation.testId, `UNSUPPORTED:${operation.objectKind}:${operation.requiredPrivilege}`)
      continue
    }
    if (operation.expected === "ALLOW" && !allowed) {
      addFailure(failures, counters, missingCounter(operation.objectKind), operation.testId, `MISSING:${operation.requiredPrivilege}`)
    } else if (operation.expected === "DENY" && allowed) {
      addFailure(failures, counters, "excessivePrivileges", operation.testId, `UNEXPECTED_ALLOW:${operation.requiredPrivilege}`)
    }
  }

  let denialTestsExecuted = 0
  const denialProbeIds = new Set((options.denialProbes ?? []).map((value) => value.testId))
  if (options.requireDenialProbeForEachDeniedOperation) {
    for (const operation of matrix.operations.filter((value) => value.expected === "DENY")) {
      if (!denialProbeIds.has(operation.testId)) {
        addFailure(failures, counters, "expectedDenialFailures", operation.testId, "EXPECTED_DENIAL_PROBE_MISSING")
      }
    }
  }
  for (const probe of options.denialProbes ?? []) {
    denialTestsExecuted += 1
    const port = options.denialPorts?.[probe.database]
    if (!port) {
      addFailure(failures, counters, "expectedDenialFailures", probe.testId, "DENIAL_TRANSACTION_PORT_REQUIRED")
      continue
    }
    let outcome: Awaited<ReturnType<typeof executeExpectedDenial>>
    try {
      outcome = await executeExpectedDenial(port, probe)
    } catch (error) {
      addFailure(failures, counters, "expectedDenialFailures", probe.testId, error instanceof Error ? error.message : "DENIAL_PROBE_FAILED")
      continue
    }
    const expectedStates = probe.expectedSqlStates ?? ["42501"]
    if (!outcome.roleEstablished || !outcome.denied || !outcome.sqlState || !expectedStates.includes(outcome.sqlState)) {
      addFailure(
        failures,
        counters,
        "expectedDenialFailures",
        probe.testId,
        !outcome.roleEstablished
          ? `DENIAL_ROLE_UNAVAILABLE:${outcome.sqlState ?? "NONE"}`
          : outcome.denied
            ? `UNEXPECTED_SQLSTATE:${outcome.sqlState ?? "NONE"}`
            : "FORBIDDEN_OPERATION_SUCCEEDED",
      )
    }
  }

  const frozenCounters = freezeCounters(counters)
  const status = Object.values(frozenCounters).every((value) => value === 0) ? "PASS" : "FAIL"
  return Object.freeze({
    version: GREEN_CLEAN_PRIVILEGE_CLOSURE_VERSION,
    status,
    rolesInspected: matrix.roles.length,
    operationsInspected: matrix.operations.length,
    denialTestsExecuted,
    counters: frozenCounters,
    failures: Object.freeze(failures),
  })
}
