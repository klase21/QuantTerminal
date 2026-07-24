import { canonicalChecksum } from "@/lib/data-platform/contracts"
import postgres from "postgres"
import { createMvpBlueGreenBranchPlan, type MvpBlueGreenBranchPlan } from "./blueGreen"

export const MVP_GREEN_INFRASTRUCTURE_SCHEMA_VERSION = "mvp-green-infrastructure/1.0.0" as const
export const MVP_GREEN_APPROVAL_SCHEMA_VERSION = "mvp-green-infrastructure-approval/1.3.0" as const
export const MVP_GREEN_PRODUCTION_PROJECT_ID = "soft-cell-16396854" as const
export const MVP_GREEN_PRODUCTION_BRANCH_ID = "br-flat-grass-ao9rtnyr" as const
export const MVP_GREEN_PRODUCTION_DATABASE = "neondb" as const
export const MVP_GREEN_ROLLBACK_BRANCH_ID = "br-royal-block-aop70mzq" as const
export const MVP_GREEN_REJECTED_BRANCH_ID = "br-odd-leaf-ao61pbg4" as const
export const MVP_GREEN_REJECTED_DATABASE = "mvp_release_20260719" as const
export const MVP_GREEN_MIGRATION_OWNER_ROLE = "mvp_green_migration_owner" as const
export const MVP_GREEN_FROZEN_RELEASE_APPLICATION_COMMIT = "a4590b21dd8929df679f9eb2aa823d6c019a0b31" as const
export const MVP_GREEN_FROZEN_RELEASE_CHECKSUM = "894b0cea24a869817d2cdbb3ca94c3b240c18ae5d0ec128353893a4dfcf9587a" as const
export const MVP_GREEN_FROZEN_BRANCH_NAME = "mvp-release-2026-07-21-ef67d73549b7" as const
export const MVP_GREEN_FROZEN_DATABASE_NAME = "mvp_release_20260721_9c177d6309" as const

const PROJECT_ID = /^[a-z0-9-]{1,60}$/
const BRANCH_ID = /^br-[a-z0-9-]{1,57}$/
const BRANCH_NAME = /^mvp-release-\d{4}-\d{2}-\d{2}-[0-9a-f]{12}$/
const DATABASE_NAME = /^[a-z][a-z0-9_]{0,62}$/
const ROLE_NAME = /^[a-z_][a-z0-9_]{0,62}$/
const LSN = /^(0|[1-9A-F][0-9A-F]*)\/(0|[1-9A-F][0-9A-F]*)$/
const MAX_LSN_PART = BigInt("4294967295")
const LSN_LOW_BITS = BigInt(32)
const CHECKSUM = /^[0-9a-f]{64}$/
const COMMIT = /^[0-9a-f]{40}$/

export type MvpGreenOperationKind =
  | "NEON_BRANCH_CREATE"
  | "GREEN_OWNER_ROLE_CREATE"
  | "GREEN_DATABASE_CREATE"
  | "GREEN_ACQUISITION_START"

export type MvpGreenInfrastructureErrorCode =
  | "APPROVAL_REQUIRED"
  | "APPROVAL_STALE"
  | "APPROVED_PARENT_LSN_INVALID"
  | "APPROVED_PARENT_LSN_AHEAD_OF_CURRENT"
  | "NEON_CONFIGURATION_MISSING"
  | "NEON_AUTHENTICATION_FAILURE"
  | "NEON_BAD_REQUEST"
  | "NEON_CONFLICT"
  | "NEON_RESOURCE_LOCKED"
  | "NEON_RATE_LIMIT"
  | "NEON_PROVIDER_TRANSIENT_FAILURE"
  | "NEON_TRANSPORT_FAILURE"
  | "NEON_REQUEST_TIMEOUT"
  | "NEON_MALFORMED_RESPONSE"
  | "NEON_OPERATION_FAILED"
  | "NEON_OPERATION_TIMEOUT"
  | "NEON_ENDPOINT_REQUIRED"
  | "PROJECT_IDENTITY_MISMATCH"
  | "PARENT_BRANCH_IDENTITY_MISMATCH"
  | "PARENT_STATE_CHANGED"
  | "PARENT_STATE_UNRESOLVED"
  | "BRANCH_CREATION_FAILED"
  | "BRANCH_IDENTITY_UNVERIFIED"
  | "TARGET_GREEN_BRANCH_REQUIRED"
  | "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH"
  | "OWNER_ROLE_REQUIRED"
  | "OWNER_ROLE_CONTRACT_MISMATCH"
  | "OWNER_ROLE_MISSING"
  | "ROLE_CREATION_FAILED"
  | "ROLE_IDENTITY_UNVERIFIED"
  | "DATABASE_APPROVAL_BINDING_INVALID"
  | "RELEASE_DATABASE_NAME_CONFLICT"
  | "RELEASE_DATABASE_CREATION_FAILED"
  | "RELEASE_DATABASE_IDENTITY_UNVERIFIED"

export class MvpGreenInfrastructureError extends Error {
  readonly code: MvpGreenInfrastructureErrorCode
  readonly evidence: MvpNeonProviderFailureEvidence | null

  constructor(code: MvpGreenInfrastructureErrorCode, evidence: MvpNeonProviderFailureEvidence | null = null) {
    super(code)
    this.name = "MvpGreenInfrastructureError"
    this.code = code
    this.evidence = evidence ? Object.freeze({ ...evidence }) : null
  }
}

export interface MvpNeonProviderFailureEvidence {
  readonly httpStatus: number | null
  readonly providerErrorCode: string | null
  readonly providerMessage: string | null
  readonly providerRequestId: string | null
  readonly operationIds: readonly string[]
  readonly retryAfterMs: number | null
  readonly requestPath: string
  readonly operationKind: string
  readonly responseReceived: boolean
  readonly timedOut: boolean
}

export interface MvpGreenReleaseIdentity {
  readonly schemaVersion: typeof MVP_GREEN_INFRASTRUCTURE_SCHEMA_VERSION
  readonly projectId: string
  readonly parentBranchId: string
  readonly parentDatabase: string
  readonly applicationCommit: string
  readonly parentWatermark: string
  readonly governedThrough: string
  readonly branchName: string
  readonly databaseName: string
  readonly releaseChecksum: string
}

export interface MvpGreenOperationApproval {
  readonly schemaVersion: typeof MVP_GREEN_APPROVAL_SCHEMA_VERSION
  readonly operation: MvpGreenOperationKind
  readonly releaseChecksum: string
  readonly projectId: string
  readonly parentBranchId: string
  readonly expectedParentState: string
  readonly expectedParentLsn: string
  readonly targetBranchName: string
  readonly targetGreenBranchId: string | null
  readonly targetDatabaseName: string | null
  readonly targetRoleName: string | null
  readonly targetRoleNoLogin: boolean | null
  readonly targetOwnerRole: string | null
  readonly invocationId: string
  readonly actorId: string
  readonly issuedAt: string
  readonly expiresAt: string
  readonly approvalChecksum: string
}

export interface MvpGreenParentState {
  readonly projectId: string
  readonly branchId: string
  readonly databaseName: string
  readonly lsn: string
  readonly readOnlyTransaction: true
  readonly inspectedAt: string
  readonly stateChecksum: string
}

export interface MvpGreenParentStateReader {
  inspect(input: {
    readonly projectId: string
    readonly branchId: string
    readonly databaseName: string
  }): Promise<Omit<MvpGreenParentState, "stateChecksum">>
}

export class PostgresMvpGreenParentStateReader implements MvpGreenParentStateReader {
  private readonly connectionString: string
  private readonly expectedRole: string

  constructor(input: { readonly connectionString?: string; readonly expectedRole?: string }) {
    const connectionString = input.connectionString?.trim()
    if (!connectionString) throw new MvpGreenInfrastructureError("NEON_CONFIGURATION_MISSING")
    this.connectionString = connectionString
    this.expectedRole = input.expectedRole ?? "mvp_serving_reader"
  }

  async inspect(input: {
    readonly projectId: string
    readonly branchId: string
    readonly databaseName: string
  }): Promise<Omit<MvpGreenParentState, "stateChecksum">> {
    const sql = postgres(this.connectionString, {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 10,
      connection: {
        application_name: "mvp-green-parent-readonly-preflight",
        statement_timeout: 15_000,
        lock_timeout: 2_000,
        idle_in_transaction_session_timeout: 15_000,
      },
    })
    try {
      const rows = await sql.begin("READ ONLY", async (transaction) => transaction.unsafe<Array<{
        database_name: string
        role_name: string
        branch_id: string | null
        read_only: string
        lsn: string
      }>>(
        "SELECT current_database() database_name,current_user role_name,current_setting('neon.branch_id',true) branch_id,current_setting('transaction_read_only') read_only,pg_current_wal_lsn()::text lsn",
      ))
      const row = rows[0]
      if (
        !row
        || input.projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID
        || input.branchId !== MVP_GREEN_PRODUCTION_BRANCH_ID
        || input.databaseName !== MVP_GREEN_PRODUCTION_DATABASE
        || row.database_name !== input.databaseName
        || row.role_name !== this.expectedRole
        || row.branch_id !== input.branchId
        || row.read_only !== "on"
        || !LSN.test(row.lsn)
      ) {
        throw new MvpGreenInfrastructureError("PARENT_STATE_UNRESOLVED")
      }
      return Object.freeze({
        projectId: input.projectId,
        branchId: input.branchId,
        databaseName: input.databaseName,
        lsn: row.lsn,
        readOnlyTransaction: true as const,
        inspectedAt: new Date().toISOString(),
      })
    } finally {
      await sql.end({ timeout: 5 })
    }
  }
}

export interface MvpNeonTransportResponse {
  readonly status: number
  readonly body: unknown
  readonly headers?: Readonly<Record<string, string>>
  readonly malformedBody?: boolean
}

export interface MvpNeonTransport {
  request(input: {
    readonly method: "GET" | "POST"
    readonly path: string
    readonly body?: Readonly<Record<string, unknown>>
  }): Promise<MvpNeonTransportResponse>
}

export interface MvpGreenProjectInspection {
  readonly projectId: string
  readonly region: string
  readonly status: "VERIFIED"
  readonly fingerprint: string
}

export interface MvpGreenBranchInspection {
  readonly projectId: string
  readonly branchId: string
  readonly branchName: string
  readonly parentBranchId: string | null
  readonly parentLsn: string | null
  readonly region: string
  readonly state: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly status: "VERIFIED"
  readonly fingerprint: string
}

export interface MvpGreenDatabaseInspection {
  readonly projectId: string
  readonly branchId: string
  readonly databaseName: string
  readonly ownerName: string
  readonly createdAt: string
  readonly status: "VERIFIED"
  readonly fingerprint: string
}

export interface MvpGreenRoleInspection {
  readonly projectId: string
  readonly branchId: string
  readonly roleName: string
  readonly protected: boolean | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly status: "VERIFIED"
  readonly fingerprint: string
}

export interface MvpGreenCreatedRole extends MvpGreenRoleInspection {
  readonly creationStatus: "CREATED" | "RECONCILED"
  readonly releaseChecksum: string
  readonly endpointPrerequisite: MvpGreenEndpointPrerequisite
  readonly endpointCount: number
  readonly readWriteEndpointCount: number
  readonly roleNoLogin: true
  readonly providerHttpStatus: number | null
  readonly providerErrorCode: string | null
  readonly providerRequestId: string | null
  readonly operationIds: readonly string[]
  readonly operationPollingResult: "PASS" | "NOT_APPLICABLE" | "FAIL_RECONCILED"
  readonly deterministicReadbackResult: "MATCH"
}

export type MvpGreenEndpointPrerequisite =
  | "READ_WRITE_ENDPOINT_PRESENT"
  | "NO_ENDPOINT"
  | "READ_ONLY_ONLY"
  | "ENDPOINT_IDENTITY_UNVERIFIED"

export interface MvpGreenEndpointInspection {
  readonly projectId: string
  readonly branchId: string
  readonly endpointId: string
  readonly endpointType: "read_write" | "read_only"
  readonly currentState: string
  readonly poolerMode: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly status: "VERIFIED"
  readonly fingerprint: string
}

export interface MvpGreenEndpointInventory {
  readonly endpoints: readonly MvpGreenEndpointInspection[]
  readonly endpointCount: number
  readonly readWriteEndpointCount: number
  readonly readOnlyEndpointCount: number
  readonly prerequisite: MvpGreenEndpointPrerequisite
}

export interface MvpGreenOperationInspection {
  readonly projectId: string
  readonly operationId: string
  readonly branchId: string | null
  readonly endpointId: string | null
  readonly action: string
  readonly state: string
  readonly failuresCount: number
  readonly createdAt: string
  readonly updatedAt: string
  readonly status: "VERIFIED"
  readonly fingerprint: string
}

export interface MvpGreenCreatedBranch {
  readonly status: "CREATED" | "RECONCILED"
  readonly projectId: string
  readonly parentBranchId: string
  readonly parentStateChecksum: string
  readonly parentLsn: string
  readonly branchId: string
  readonly branchName: string
  readonly region: string
  readonly createdAt: string
  readonly branchState: string
  readonly inheritedDatabases: readonly MvpGreenDatabaseInspection[]
  readonly fingerprint: string
}

export interface MvpGreenCreatedDatabase extends MvpGreenDatabaseInspection {
  readonly creationStatus: "CREATED" | "RECONCILED"
  readonly releaseChecksum: string
}

interface NeonProject {
  readonly id?: unknown
  readonly region_id?: unknown
}

interface NeonBranch {
  readonly id?: unknown
  readonly project_id?: unknown
  readonly name?: unknown
  readonly parent_id?: unknown
  readonly parent_lsn?: unknown
  readonly current_state?: unknown
  readonly created_at?: unknown
  readonly updated_at?: unknown
  readonly region_id?: unknown
}

interface NeonDatabase {
  readonly branch_id?: unknown
  readonly name?: unknown
  readonly owner_name?: unknown
  readonly created_at?: unknown
}

interface NeonRole {
  readonly branch_id?: unknown
  readonly name?: unknown
  readonly protected?: unknown
  readonly created_at?: unknown
  readonly updated_at?: unknown
}

interface NeonEndpoint {
  readonly id?: unknown
  readonly project_id?: unknown
  readonly branch_id?: unknown
  readonly type?: unknown
  readonly current_state?: unknown
  readonly pooler_mode?: unknown
  readonly disabled?: unknown
  readonly created_at?: unknown
  readonly updated_at?: unknown
}

interface NeonOperation {
  readonly id?: unknown
  readonly project_id?: unknown
  readonly branch_id?: unknown
  readonly endpoint_id?: unknown
  readonly action?: unknown
  readonly status?: unknown
  readonly failures_count?: unknown
  readonly created_at?: unknown
  readonly updated_at?: unknown
}

function exactIso(value: string, code: MvpGreenInfrastructureErrorCode): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new MvpGreenInfrastructureError(code)
  }
  return parsed
}

function postgresLsnValue(value: unknown, code: MvpGreenInfrastructureErrorCode): bigint {
  if (typeof value !== "string" || !LSN.test(value)) throw new MvpGreenInfrastructureError(code)
  const [highHex, lowHex] = value.split("/")
  const high = BigInt(`0x${highHex}`)
  const low = BigInt(`0x${lowHex}`)
  if (high > MAX_LSN_PART || low > MAX_LSN_PART) throw new MvpGreenInfrastructureError(code)
  return (high << LSN_LOW_BITS) + low
}

export function compareMvpPostgresLsns(currentLsn: string, approvedLsn: string): -1 | 0 | 1 {
  const current = postgresLsnValue(currentLsn, "PARENT_STATE_UNRESOLVED")
  const approved = postgresLsnValue(approvedLsn, "APPROVED_PARENT_LSN_INVALID")
  return current < approved ? -1 : current > approved ? 1 : 0
}

function requiredString(value: unknown, code: MvpGreenInfrastructureErrorCode): string {
  if (typeof value !== "string" || !value.trim()) throw new MvpGreenInfrastructureError(code)
  return value
}

function expectedParentStateChecksum(input: {
  readonly projectId: string
  readonly parentBranchId: string
  readonly expectedParentLsn: string
}): string {
  return canonicalChecksum({
    projectId: input.projectId,
    branchId: input.parentBranchId,
    databaseName: MVP_GREEN_PRODUCTION_DATABASE,
    lsn: input.expectedParentLsn,
    readOnlyTransaction: true,
  })
}

function normalizedProviderIso(value: unknown, code: MvpGreenInfrastructureErrorCode): string {
  const raw = requiredString(value, code)
  const parsed = Date.parse(raw)
  if (!Number.isFinite(parsed)) throw new MvpGreenInfrastructureError(code)
  return new Date(parsed).toISOString()
}

function encoded(value: string): string {
  return encodeURIComponent(value)
}

function branchFromBody(body: unknown): NeonBranch | null {
  if (!body || typeof body !== "object") return null
  const record = body as { branch?: unknown }
  return record.branch && typeof record.branch === "object" ? record.branch as NeonBranch : null
}

function branchesFromBody(body: unknown): readonly NeonBranch[] {
  if (!body || typeof body !== "object") return []
  const values = (body as { branches?: unknown }).branches
  return Array.isArray(values) ? values.filter((value): value is NeonBranch => Boolean(value && typeof value === "object")) : []
}

function databasesFromBody(body: unknown): readonly NeonDatabase[] {
  if (!body || typeof body !== "object") return []
  const values = (body as { databases?: unknown }).databases
  return Array.isArray(values) ? values.filter((value): value is NeonDatabase => Boolean(value && typeof value === "object")) : []
}

function databaseFromBody(body: unknown): NeonDatabase | null {
  if (!body || typeof body !== "object") return null
  const record = body as { database?: unknown }
  return record.database && typeof record.database === "object" ? record.database as NeonDatabase : null
}

function rolesFromBody(body: unknown): readonly NeonRole[] {
  if (!body || typeof body !== "object") return []
  const values = (body as { roles?: unknown }).roles
  return Array.isArray(values) ? values.filter((value): value is NeonRole => Boolean(value && typeof value === "object")) : []
}

function roleFromBody(body: unknown): NeonRole | null {
  if (!body || typeof body !== "object") return null
  const record = body as { role?: unknown }
  return record.role && typeof record.role === "object" ? record.role as NeonRole : null
}

function endpointsFromBody(body: unknown): readonly NeonEndpoint[] {
  if (!body || typeof body !== "object") return []
  const values = (body as { endpoints?: unknown }).endpoints
  return Array.isArray(values)
    ? values.filter((value): value is NeonEndpoint => Boolean(value && typeof value === "object"))
    : []
}

function endpointFromBody(body: unknown): NeonEndpoint | null {
  if (!body || typeof body !== "object") return null
  const value = (body as { endpoint?: unknown }).endpoint
  return value && typeof value === "object" ? value as NeonEndpoint : null
}

function operationsFromBody(body: unknown): readonly NeonOperation[] {
  if (!body || typeof body !== "object") return []
  const values = (body as { operations?: unknown }).operations
  return Array.isArray(values)
    ? values.filter((value): value is NeonOperation => Boolean(value && typeof value === "object"))
    : []
}

function operationFromBody(body: unknown): NeonOperation | null {
  if (!body || typeof body !== "object") return null
  const value = (body as { operation?: unknown }).operation
  return value && typeof value === "object" ? value as NeonOperation : null
}

function sanitizedProviderText(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  return value
    .slice(0, 500)
    .replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/gi, "[REDACTED_URL]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\b(password|authorization|token|connection[_ ]?uri|connection[_ ]?string)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
}

function safeProviderField(body: unknown, field: "code" | "message" | "request_id" | "trace_id"): string | null {
  if (!body || typeof body !== "object") return null
  const record = body as Record<string, unknown>
  const error = record.error && typeof record.error === "object"
    ? record.error as Record<string, unknown>
    : null
  return sanitizedProviderText(record[field] ?? error?.[field])
}

function retryAfterMs(headers: Readonly<Record<string, string>> | undefined): number | null {
  const raw = headers?.["retry-after"]
  if (!raw) return null
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 60_000)
  const parsed = Date.parse(raw)
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed - Date.now(), 0), 60_000) : null
}

function providerEvidence(input: {
  readonly response?: MvpNeonTransportResponse
  readonly requestPath: string
  readonly operationKind: string
  readonly responseReceived: boolean
  readonly timedOut: boolean
}): MvpNeonProviderFailureEvidence {
  const response = input.response
  return Object.freeze({
    httpStatus: response?.status ?? null,
    providerErrorCode: safeProviderField(response?.body, "code"),
    providerMessage: safeProviderField(response?.body, "message"),
    providerRequestId: sanitizedProviderText(
      response?.headers?.["x-request-id"]
      ?? response?.headers?.["neon-request-id"]
      ?? safeProviderField(response?.body, "request_id")
      ?? safeProviderField(response?.body, "trace_id"),
    ),
    operationIds: Object.freeze(operationsFromBody(response?.body).map((operation) => (
      typeof operation.id === "string" ? operation.id : ""
    )).filter(Boolean)),
    retryAfterMs: retryAfterMs(response?.headers),
    requestPath: input.requestPath,
    operationKind: input.operationKind,
    responseReceived: input.responseReceived,
    timedOut: input.timedOut,
  })
}

function requireSuccessful(
  response: MvpNeonTransportResponse,
  fallback: MvpGreenInfrastructureErrorCode,
  requestPath = "UNAVAILABLE",
  operationKind = "NEON_REQUEST",
): void {
  const evidence = providerEvidence({ response, requestPath, operationKind, responseReceived: true, timedOut: false })
  if (response.status === 401 || response.status === 403) {
    throw new MvpGreenInfrastructureError("NEON_AUTHENTICATION_FAILURE", evidence)
  }
  if (response.status === 400 || response.status === 422) {
    throw new MvpGreenInfrastructureError("NEON_BAD_REQUEST", evidence)
  }
  if (response.status === 409) throw new MvpGreenInfrastructureError("NEON_CONFLICT", evidence)
  if (response.status === 423) throw new MvpGreenInfrastructureError("NEON_RESOURCE_LOCKED", evidence)
  if (response.status === 429) throw new MvpGreenInfrastructureError("NEON_RATE_LIMIT", evidence)
  if (response.status >= 500) throw new MvpGreenInfrastructureError("NEON_PROVIDER_TRANSIENT_FAILURE", evidence)
  if (response.status < 200 || response.status >= 300) throw new MvpGreenInfrastructureError(fallback, evidence)
  if (response.malformedBody) throw new MvpGreenInfrastructureError("NEON_MALFORMED_RESPONSE", evidence)
}

function normalizedDatabase(input: {
  readonly projectId: string
  readonly branchId: string
  readonly value: NeonDatabase
}): MvpGreenDatabaseInspection {
  const databaseName = requiredString(input.value.name, "RELEASE_DATABASE_IDENTITY_UNVERIFIED")
  const branchId = requiredString(input.value.branch_id, "RELEASE_DATABASE_IDENTITY_UNVERIFIED")
  if (branchId !== input.branchId || !DATABASE_NAME.test(databaseName)) {
    throw new MvpGreenInfrastructureError("RELEASE_DATABASE_IDENTITY_UNVERIFIED")
  }
  const ownerName = requiredString(input.value.owner_name, "RELEASE_DATABASE_IDENTITY_UNVERIFIED")
  const createdAt = normalizedProviderIso(input.value.created_at, "RELEASE_DATABASE_IDENTITY_UNVERIFIED")
  return Object.freeze({
    projectId: input.projectId,
    branchId,
    databaseName,
    ownerName,
    createdAt,
    status: "VERIFIED" as const,
    fingerprint: `neon:${input.projectId}/${branchId}/${databaseName}`,
  })
}

function normalizedRole(input: {
  readonly projectId: string
  readonly branchId: string
  readonly value: NeonRole
}): MvpGreenRoleInspection {
  const roleName = requiredString(input.value.name, "ROLE_IDENTITY_UNVERIFIED")
  const branchId = requiredString(input.value.branch_id, "ROLE_IDENTITY_UNVERIFIED")
  if (
    input.projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID
    || branchId !== input.branchId
    || !BRANCH_ID.test(branchId)
    || !ROLE_NAME.test(roleName)
    || typeof input.value.protected !== "boolean"
  ) {
    throw new MvpGreenInfrastructureError("ROLE_IDENTITY_UNVERIFIED")
  }
  const createdAt = normalizedProviderIso(input.value.created_at, "ROLE_IDENTITY_UNVERIFIED")
  const updatedAt = normalizedProviderIso(input.value.updated_at, "ROLE_IDENTITY_UNVERIFIED")
  return Object.freeze({
    projectId: input.projectId,
    branchId,
    roleName,
    protected: input.value.protected,
    createdAt,
    updatedAt,
    status: "VERIFIED" as const,
    fingerprint: `neon:${input.projectId}/${branchId}/roles/${roleName}`,
  })
}

export function createMvpGreenReleaseDatabaseName(plan: Pick<
  MvpBlueGreenBranchPlan,
  "applicationCommit" | "currentWatermark" | "governedThrough" | "planChecksum"
>): string {
  if (!COMMIT.test(plan.applicationCommit) || !CHECKSUM.test(plan.planChecksum)) {
    throw new MvpGreenInfrastructureError("RELEASE_DATABASE_NAME_CONFLICT")
  }
  exactIso(plan.currentWatermark, "RELEASE_DATABASE_NAME_CONFLICT")
  exactIso(plan.governedThrough, "RELEASE_DATABASE_NAME_CONFLICT")
  const day = plan.governedThrough.slice(0, 10).replaceAll("-", "")
  const suffix = canonicalChecksum({
    profile: "mvp-blue-green-release/1.0.0",
    applicationCommit: plan.applicationCommit,
    currentWatermark: plan.currentWatermark,
    governedThrough: plan.governedThrough,
    planChecksum: plan.planChecksum,
  }).slice(0, 10)
  const name = `mvp_release_${day}_${suffix}`
  if (!DATABASE_NAME.test(name) || name === MVP_GREEN_PRODUCTION_DATABASE || name === MVP_GREEN_REJECTED_DATABASE) {
    throw new MvpGreenInfrastructureError("RELEASE_DATABASE_NAME_CONFLICT")
  }
  return name
}

export function createMvpGreenReleaseIdentity(plan: MvpBlueGreenBranchPlan): MvpGreenReleaseIdentity {
  const databaseName = createMvpGreenReleaseDatabaseName(plan)
  const basis = {
    schemaVersion: MVP_GREEN_INFRASTRUCTURE_SCHEMA_VERSION,
    projectId: plan.projectId,
    parentBranchId: plan.parentBranchId,
    parentDatabase: MVP_GREEN_PRODUCTION_DATABASE,
    applicationCommit: plan.applicationCommit,
    parentWatermark: plan.currentWatermark,
    governedThrough: plan.governedThrough,
    branchName: plan.branchName,
    databaseName,
  }
  if (
    plan.projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID
    || plan.parentBranchId !== MVP_GREEN_PRODUCTION_BRANCH_ID
    || !BRANCH_NAME.test(plan.branchName)
  ) {
    throw new MvpGreenInfrastructureError("PROJECT_IDENTITY_MISMATCH")
  }
  return Object.freeze({ ...basis, releaseChecksum: canonicalChecksum(basis) })
}

export function assertMvpGreenFrozenReleaseIdentity(release: MvpGreenReleaseIdentity): void {
  if (
    release.applicationCommit !== MVP_GREEN_FROZEN_RELEASE_APPLICATION_COMMIT
    || release.releaseChecksum !== MVP_GREEN_FROZEN_RELEASE_CHECKSUM
    || release.branchName !== MVP_GREEN_FROZEN_BRANCH_NAME
    || release.databaseName !== MVP_GREEN_FROZEN_DATABASE_NAME
  ) {
    throw new MvpGreenInfrastructureError("DATABASE_APPROVAL_BINDING_INVALID")
  }
}

export function createMvpGreenCertificationPlan(input: {
  readonly projectId: string
  readonly parentBranchId: string
  readonly applicationCommit: string
  readonly currentWatermark: string
  readonly governedThrough: string
}): MvpBlueGreenBranchPlan {
  const seed = createMvpBlueGreenBranchPlan({ ...input, databaseName: "mvp_release_pending" })
  const databaseName = createMvpGreenReleaseDatabaseName(seed)
  return Object.freeze({ ...seed, databaseName })
}

export function createMvpGreenOperationApproval(input: Omit<MvpGreenOperationApproval, "schemaVersion" | "approvalChecksum"> & {
  readonly approved: true
}): MvpGreenOperationApproval {
  if (!input.approved || !CHECKSUM.test(input.releaseChecksum) || !PROJECT_ID.test(input.projectId)) {
    throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
  }
  postgresLsnValue(input.expectedParentLsn, "APPROVED_PARENT_LSN_INVALID")
  const issuedAt = exactIso(input.issuedAt, "APPROVAL_REQUIRED")
  const expiresAt = exactIso(input.expiresAt, "APPROVAL_REQUIRED")
  if (
    expiresAt <= issuedAt
    || input.projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID
    || input.parentBranchId !== MVP_GREEN_PRODUCTION_BRANCH_ID
    || !CHECKSUM.test(input.expectedParentState)
    || input.expectedParentState !== expectedParentStateChecksum(input)
    || !BRANCH_NAME.test(input.targetBranchName)
    || (input.targetGreenBranchId !== null && !BRANCH_ID.test(input.targetGreenBranchId))
    || (input.targetDatabaseName !== null && !DATABASE_NAME.test(input.targetDatabaseName))
    || (input.targetRoleName !== null && !ROLE_NAME.test(input.targetRoleName))
    || (input.targetOwnerRole !== null && !ROLE_NAME.test(input.targetOwnerRole))
    || !input.invocationId.trim()
    || !input.actorId.trim()
  ) {
    throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
  }
  assertMvpGreenApprovalOperationMatrix(input)
  const { approved: _approved, ...approvalInput } = input
  const basis = { schemaVersion: MVP_GREEN_APPROVAL_SCHEMA_VERSION, ...approvalInput }
  return Object.freeze({ ...basis, approvalChecksum: canonicalChecksum(basis) })
}

function assertMvpGreenApprovalOperationMatrix(input: Pick<
  MvpGreenOperationApproval,
  "operation" | "targetGreenBranchId" | "targetDatabaseName" | "targetRoleName" | "targetRoleNoLogin" | "targetOwnerRole"
>): void {
  const protectedBranch = input.targetGreenBranchId !== null
    && new Set<string>([
      MVP_GREEN_PRODUCTION_BRANCH_ID,
      MVP_GREEN_ROLLBACK_BRANCH_ID,
      MVP_GREEN_REJECTED_BRANCH_ID,
    ]).has(input.targetGreenBranchId)
  if (protectedBranch) throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
  if (input.operation === "NEON_BRANCH_CREATE") {
    if (
      input.targetGreenBranchId !== null
      || input.targetDatabaseName !== null
      || input.targetRoleName !== null
      || input.targetRoleNoLogin !== null
      || input.targetOwnerRole !== null
    ) {
      throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
    }
    return
  }
  if (!input.targetGreenBranchId) throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_REQUIRED")
  if (input.operation === "GREEN_OWNER_ROLE_CREATE") {
    if (input.targetRoleName !== MVP_GREEN_MIGRATION_OWNER_ROLE) {
      throw new MvpGreenInfrastructureError("OWNER_ROLE_CONTRACT_MISMATCH")
    }
    if (input.targetRoleNoLogin !== true) throw new MvpGreenInfrastructureError("OWNER_ROLE_CONTRACT_MISMATCH")
    if (input.targetDatabaseName !== null || input.targetOwnerRole !== null) {
      throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
    }
    return
  }
  if (input.operation === "GREEN_DATABASE_CREATE") {
    if (!input.targetDatabaseName) throw new MvpGreenInfrastructureError("DATABASE_APPROVAL_BINDING_INVALID")
    if (input.targetRoleName !== null) throw new MvpGreenInfrastructureError("DATABASE_APPROVAL_BINDING_INVALID")
    if (input.targetRoleNoLogin !== null) throw new MvpGreenInfrastructureError("DATABASE_APPROVAL_BINDING_INVALID")
    if (!input.targetOwnerRole) throw new MvpGreenInfrastructureError("OWNER_ROLE_REQUIRED")
    if (input.targetOwnerRole !== MVP_GREEN_MIGRATION_OWNER_ROLE) {
      throw new MvpGreenInfrastructureError("OWNER_ROLE_CONTRACT_MISMATCH")
    }
    return
  }
  if (
    input.operation !== "GREEN_ACQUISITION_START"
    || !input.targetDatabaseName
    || input.targetRoleName !== null
    || input.targetRoleNoLogin !== null
    || input.targetOwnerRole !== null
  ) {
    throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
  }
}

const MVP_GREEN_APPROVAL_FIELDS = Object.freeze([
  "actorId",
  "approvalChecksum",
  "expectedParentLsn",
  "expectedParentState",
  "expiresAt",
  "invocationId",
  "issuedAt",
  "operation",
  "parentBranchId",
  "projectId",
  "releaseChecksum",
  "schemaVersion",
  "targetBranchName",
  "targetDatabaseName",
  "targetGreenBranchId",
  "targetOwnerRole",
  "targetRoleName",
  "targetRoleNoLogin",
] as const)

export function assertMvpGreenOperationApprovalIntegrity(input: {
  readonly approval: MvpGreenOperationApproval | null
  readonly operation: MvpGreenOperationKind
  readonly at: string
}): void {
  const approval = input.approval
  if (!approval) throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
  const fields = Object.keys(approval).sort()
  if (
    fields.length !== MVP_GREEN_APPROVAL_FIELDS.length
    || fields.some((field, index) => field !== MVP_GREEN_APPROVAL_FIELDS[index])
  ) {
    throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
  }
  postgresLsnValue(approval.expectedParentLsn, "APPROVED_PARENT_LSN_INVALID")
  const { approvalChecksum: _approvalChecksum, ...basis } = approval
  if (
    approval.schemaVersion !== MVP_GREEN_APPROVAL_SCHEMA_VERSION
    || canonicalChecksum(basis) !== approval.approvalChecksum
    || approval.operation !== input.operation
    || !CHECKSUM.test(approval.releaseChecksum)
    || approval.projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID
    || approval.parentBranchId !== MVP_GREEN_PRODUCTION_BRANCH_ID
    || approval.expectedParentState !== expectedParentStateChecksum(approval)
    || !BRANCH_NAME.test(approval.targetBranchName)
    || (approval.targetGreenBranchId !== null && !BRANCH_ID.test(approval.targetGreenBranchId))
    || (approval.targetDatabaseName !== null && !DATABASE_NAME.test(approval.targetDatabaseName))
    || (approval.targetRoleName !== null && !ROLE_NAME.test(approval.targetRoleName))
    || (approval.targetOwnerRole !== null && !ROLE_NAME.test(approval.targetOwnerRole))
    || !approval.invocationId.trim()
    || !approval.actorId.trim()
  ) {
    throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
  }
  assertMvpGreenApprovalOperationMatrix(approval)
  const at = exactIso(input.at, "APPROVAL_STALE")
  if (at < exactIso(approval.issuedAt, "APPROVAL_STALE") || at >= exactIso(approval.expiresAt, "APPROVAL_STALE")) {
    throw new MvpGreenInfrastructureError("APPROVAL_STALE")
  }
}

export function assertMvpGreenOperationApproval(input: {
  readonly approval: MvpGreenOperationApproval | null
  readonly operation: MvpGreenOperationKind
  readonly release: MvpGreenReleaseIdentity
  readonly at: string
}): void {
  assertMvpGreenOperationApprovalIntegrity(input)
  const approval = input.approval!
  if (
    approval.releaseChecksum !== input.release.releaseChecksum
    || approval.projectId !== input.release.projectId
    || approval.parentBranchId !== input.release.parentBranchId
    || approval.targetBranchName !== input.release.branchName
    || approval.targetDatabaseName !== (
      input.operation === "GREEN_DATABASE_CREATE" || input.operation === "GREEN_ACQUISITION_START"
        ? input.release.databaseName
        : null
    )
  ) {
    throw new MvpGreenInfrastructureError(
      input.operation === "GREEN_DATABASE_CREATE"
        ? "DATABASE_APPROVAL_BINDING_INVALID"
        : "APPROVAL_REQUIRED",
    )
  }
}

export class FetchMvpNeonTransport implements MvpNeonTransport {
  private readonly token: string
  private readonly fetchImpl: typeof fetch
  private readonly baseUrl: string

  constructor(input: { readonly apiToken?: string; readonly fetchImpl?: typeof fetch; readonly baseUrl?: string }) {
    const token = input.apiToken?.trim()
    if (!token) throw new MvpGreenInfrastructureError("NEON_CONFIGURATION_MISSING")
    this.token = token
    this.fetchImpl = input.fetchImpl ?? fetch
    this.baseUrl = (input.baseUrl ?? "https://console.neon.tech/api/v2").replace(/\/+$/, "")
  }

  async request(input: {
    readonly method: "GET" | "POST"
    readonly path: string
    readonly body?: Readonly<Record<string, unknown>>
  }): Promise<MvpNeonTransportResponse> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${input.path}`, {
        method: input.method,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          "User-Agent": "QuantTerminal-MvpGreenRelease/1.0",
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: AbortSignal.timeout(20_000),
      })
      const text = await response.text()
      let body: unknown = null
      let malformedBody = false
      if (text.trim()) {
        try {
          body = JSON.parse(text)
        } catch {
          malformedBody = true
        }
      }
      const headers = Object.freeze({
        "retry-after": response.headers.get("retry-after") ?? "",
        "x-request-id": response.headers.get("x-request-id") ?? "",
        "neon-request-id": response.headers.get("neon-request-id") ?? "",
      })
      return Object.freeze({ status: response.status, body, headers, malformedBody })
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError"
      throw new MvpGreenInfrastructureError(
        timedOut ? "NEON_REQUEST_TIMEOUT" : "NEON_TRANSPORT_FAILURE",
        providerEvidence({
          requestPath: input.path,
          operationKind: `${input.method}_NEON_RESOURCE`,
          responseReceived: false,
          timedOut,
        }),
      )
    }
  }
}

function normalizedEndpoint(input: {
  readonly projectId: string
  readonly branchId: string
  readonly value: NeonEndpoint
}): MvpGreenEndpointInspection {
  const endpointId = requiredString(input.value.id, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
  const projectId = requiredString(input.value.project_id, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
  const branchId = requiredString(input.value.branch_id, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
  const endpointType = requiredString(input.value.type, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
  if (
    projectId !== input.projectId
    || branchId !== input.branchId
    || !/^ep-[a-z0-9-]{1,57}$/.test(endpointId)
    || (endpointType !== "read_write" && endpointType !== "read_only")
    || input.value.disabled === true
  ) {
    throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
  }
  return Object.freeze({
    projectId,
    branchId,
    endpointId,
    endpointType,
    currentState: requiredString(input.value.current_state, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH"),
    poolerMode: typeof input.value.pooler_mode === "string" ? input.value.pooler_mode : null,
    createdAt: normalizedProviderIso(input.value.created_at, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH"),
    updatedAt: normalizedProviderIso(input.value.updated_at, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH"),
    status: "VERIFIED" as const,
    fingerprint: `neon:${projectId}/${branchId}/endpoints/${endpointId}`,
  })
}

function normalizedOperation(input: {
  readonly projectId: string
  readonly value: NeonOperation
}): MvpGreenOperationInspection {
  const operationId = requiredString(input.value.id, "NEON_MALFORMED_RESPONSE")
  const projectId = requiredString(input.value.project_id, "NEON_MALFORMED_RESPONSE")
  if (projectId !== input.projectId || !/^[0-9a-f-]{36}$/.test(operationId)) {
    throw new MvpGreenInfrastructureError("NEON_MALFORMED_RESPONSE")
  }
  const failuresCount = Number(input.value.failures_count ?? 0)
  if (!Number.isInteger(failuresCount) || failuresCount < 0) {
    throw new MvpGreenInfrastructureError("NEON_MALFORMED_RESPONSE")
  }
  const branchId = input.value.branch_id === null || input.value.branch_id === undefined
    ? null
    : requiredString(input.value.branch_id, "NEON_MALFORMED_RESPONSE")
  const endpointId = input.value.endpoint_id === null || input.value.endpoint_id === undefined
    ? null
    : requiredString(input.value.endpoint_id, "NEON_MALFORMED_RESPONSE")
  return Object.freeze({
    projectId,
    operationId,
    branchId,
    endpointId,
    action: requiredString(input.value.action, "NEON_MALFORMED_RESPONSE"),
    state: requiredString(input.value.status, "NEON_MALFORMED_RESPONSE"),
    failuresCount,
    createdAt: normalizedProviderIso(input.value.created_at, "NEON_MALFORMED_RESPONSE"),
    updatedAt: normalizedProviderIso(input.value.updated_at, "NEON_MALFORMED_RESPONSE"),
    status: "VERIFIED" as const,
    fingerprint: `neon:${projectId}/operations/${operationId}`,
  })
}

export class LiveMvpNeonGreenInfrastructureAdapter {
  private readonly transport: MvpNeonTransport
  private readonly parentStateReader: MvpGreenParentStateReader
  private readonly operationPolling: {
    readonly maxAttempts: number
    readonly delayMs: number
    readonly sleep: (milliseconds: number) => Promise<void>
  }

  constructor(input: {
    readonly transport: MvpNeonTransport
    readonly parentStateReader: MvpGreenParentStateReader
    readonly operationPolling?: {
      readonly maxAttempts?: number
      readonly delayMs?: number
      readonly sleep?: (milliseconds: number) => Promise<void>
    }
  }) {
    this.transport = input.transport
    this.parentStateReader = input.parentStateReader
    this.operationPolling = Object.freeze({
      maxAttempts: input.operationPolling?.maxAttempts ?? 20,
      delayMs: input.operationPolling?.delayMs ?? 500,
      sleep: input.operationPolling?.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))),
    })
  }

  async inspectProject(projectId: string): Promise<MvpGreenProjectInspection> {
    if (projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID) throw new MvpGreenInfrastructureError("PROJECT_IDENTITY_MISMATCH")
    const response = await this.transport.request({ method: "GET", path: `/projects/${encoded(projectId)}` })
    requireSuccessful(response, "PROJECT_IDENTITY_MISMATCH")
    const project = response.body && typeof response.body === "object"
      ? (response.body as { project?: NeonProject }).project
      : null
    if (!project || project.id !== projectId) throw new MvpGreenInfrastructureError("PROJECT_IDENTITY_MISMATCH")
    const region = requiredString(project.region_id, "PROJECT_IDENTITY_MISMATCH")
    return Object.freeze({
      projectId,
      region,
      status: "VERIFIED" as const,
      fingerprint: `neon:${projectId}`,
    })
  }

  async inspectBranch(projectId: string, branchId: string): Promise<MvpGreenBranchInspection> {
    if (projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID || !BRANCH_ID.test(branchId)) {
      throw new MvpGreenInfrastructureError("PARENT_BRANCH_IDENTITY_MISMATCH")
    }
    const project = await this.inspectProject(projectId)
    const response = await this.transport.request({
      method: "GET",
      path: `/projects/${encoded(projectId)}/branches/${encoded(branchId)}`,
    })
    requireSuccessful(response, "PARENT_BRANCH_IDENTITY_MISMATCH")
    const branch = branchFromBody(response.body)
    if (!branch || branch.id !== branchId || (branch.project_id !== undefined && branch.project_id !== projectId)) {
      throw new MvpGreenInfrastructureError("PARENT_BRANCH_IDENTITY_MISMATCH")
    }
    const branchName = requiredString(branch.name, "PARENT_BRANCH_IDENTITY_MISMATCH")
    const branchRegion = typeof branch.region_id === "string" ? branch.region_id.trim() : ""
    if (branchRegion && branchRegion !== project.region) {
      throw new MvpGreenInfrastructureError("PARENT_BRANCH_IDENTITY_MISMATCH")
    }
    const region = branchRegion || project.region
    const state = requiredString(branch.current_state, "PARENT_BRANCH_IDENTITY_MISMATCH")
    const createdAt = normalizedProviderIso(branch.created_at, "PARENT_BRANCH_IDENTITY_MISMATCH")
    const updatedAt = normalizedProviderIso(branch.updated_at, "PARENT_BRANCH_IDENTITY_MISMATCH")
    const parentBranchId = branch.parent_id === null || branch.parent_id === undefined
      ? null
      : requiredString(branch.parent_id, "PARENT_BRANCH_IDENTITY_MISMATCH")
    const parentLsn = branch.parent_lsn === null || branch.parent_lsn === undefined
      ? null
      : requiredString(branch.parent_lsn, "PARENT_BRANCH_IDENTITY_MISMATCH")
    return Object.freeze({
      projectId,
      branchId,
      branchName,
      parentBranchId,
      parentLsn,
      region,
      state,
      createdAt,
      updatedAt,
      status: "VERIFIED" as const,
      fingerprint: `neon:${projectId}/${branchId}`,
    })
  }

  async resolveParentState(): Promise<MvpGreenParentState> {
    await this.inspectBranch(MVP_GREEN_PRODUCTION_PROJECT_ID, MVP_GREEN_PRODUCTION_BRANCH_ID)
    const state = await this.parentStateReader.inspect({
      projectId: MVP_GREEN_PRODUCTION_PROJECT_ID,
      branchId: MVP_GREEN_PRODUCTION_BRANCH_ID,
      databaseName: MVP_GREEN_PRODUCTION_DATABASE,
    })
    if (
      state.projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID
      || state.branchId !== MVP_GREEN_PRODUCTION_BRANCH_ID
      || state.databaseName !== MVP_GREEN_PRODUCTION_DATABASE
      || state.readOnlyTransaction !== true
    ) {
      throw new MvpGreenInfrastructureError("PARENT_STATE_UNRESOLVED")
    }
    postgresLsnValue(state.lsn, "PARENT_STATE_UNRESOLVED")
    exactIso(state.inspectedAt, "PARENT_STATE_UNRESOLVED")
    const stateChecksum = canonicalChecksum({
      projectId: state.projectId,
      branchId: state.branchId,
      databaseName: state.databaseName,
      lsn: state.lsn,
      readOnlyTransaction: state.readOnlyTransaction,
    })
    return Object.freeze({ ...state, stateChecksum })
  }

  async listInheritedDatabases(projectId: string, branchId: string): Promise<readonly MvpGreenDatabaseInspection[]> {
    const response = await this.transport.request({
      method: "GET",
      path: `/projects/${encoded(projectId)}/branches/${encoded(branchId)}/databases`,
    })
    requireSuccessful(response, "RELEASE_DATABASE_IDENTITY_UNVERIFIED")
    return Object.freeze(databasesFromBody(response.body).map((value) => normalizedDatabase({ projectId, branchId, value })))
  }

  async listRoles(projectId: string, branchId: string): Promise<readonly MvpGreenRoleInspection[]> {
    if (projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID || !BRANCH_ID.test(branchId)) {
      throw new MvpGreenInfrastructureError("ROLE_IDENTITY_UNVERIFIED")
    }
    const response = await this.transport.request({
      method: "GET",
      path: `/projects/${encoded(projectId)}/branches/${encoded(branchId)}/roles`,
    })
    requireSuccessful(response, "ROLE_IDENTITY_UNVERIFIED")
    return Object.freeze(rolesFromBody(response.body).map((value) => normalizedRole({ projectId, branchId, value })))
  }

  async listEndpoints(projectId: string, branchId: string): Promise<readonly MvpGreenEndpointInspection[]> {
    if (projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID || !BRANCH_ID.test(branchId)) {
      throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
    }
    const path = `/projects/${encoded(projectId)}/branches/${encoded(branchId)}/endpoints`
    const response = await this.transport.request({ method: "GET", path })
    requireSuccessful(response, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH", path, "LIST_ENDPOINTS")
    return Object.freeze(endpointsFromBody(response.body).map((value) => normalizedEndpoint({ projectId, branchId, value })))
  }

  async inspectEndpoint(projectId: string, endpointId: string): Promise<MvpGreenEndpointInspection | null> {
    if (projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID || !/^ep-[a-z0-9-]{1,57}$/.test(endpointId)) {
      throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
    }
    const path = `/projects/${encoded(projectId)}/endpoints/${encoded(endpointId)}`
    const response = await this.transport.request({ method: "GET", path })
    if (response.status === 404) return null
    requireSuccessful(response, "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH", path, "INSPECT_ENDPOINT")
    const endpoint = endpointFromBody(response.body)
    if (!endpoint || typeof endpoint.branch_id !== "string") {
      throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
    }
    return normalizedEndpoint({ projectId, branchId: endpoint.branch_id, value: endpoint })
  }

  async inspectEndpointPrerequisite(projectId: string, branchId: string): Promise<MvpGreenEndpointInventory> {
    const endpoints = await this.listEndpoints(projectId, branchId)
    const readWriteEndpointCount = endpoints.filter((endpoint) => endpoint.endpointType === "read_write").length
    const readOnlyEndpointCount = endpoints.filter((endpoint) => endpoint.endpointType === "read_only").length
    const prerequisite: MvpGreenEndpointPrerequisite = endpoints.length === 0
      ? "NO_ENDPOINT"
      : readWriteEndpointCount === 0
        ? "READ_ONLY_ONLY"
        : readWriteEndpointCount === 1
          ? "READ_WRITE_ENDPOINT_PRESENT"
          : "ENDPOINT_IDENTITY_UNVERIFIED"
    return Object.freeze({
      endpoints,
      endpointCount: endpoints.length,
      readWriteEndpointCount,
      readOnlyEndpointCount,
      prerequisite,
    })
  }

  async inspectOperation(projectId: string, operationId: string): Promise<MvpGreenOperationInspection> {
    const path = `/projects/${encoded(projectId)}/operations/${encoded(operationId)}`
    const response = await this.transport.request({ method: "GET", path })
    requireSuccessful(response, "NEON_OPERATION_FAILED", path, "INSPECT_OPERATION")
    const operation = operationFromBody(response.body)
    if (!operation) throw new MvpGreenInfrastructureError("NEON_MALFORMED_RESPONSE")
    return normalizedOperation({ projectId, value: operation })
  }

  async pollOperation(projectId: string, operationId: string): Promise<MvpGreenOperationInspection> {
    for (let attempt = 0; attempt < this.operationPolling.maxAttempts; attempt += 1) {
      const operation = await this.inspectOperation(projectId, operationId)
      if (operation.state === "finished" || operation.state === "skipped") return operation
      if (operation.state === "failed" || operation.state === "error" || operation.state === "cancelled") {
        throw new MvpGreenInfrastructureError("NEON_OPERATION_FAILED", {
          httpStatus: 200,
          providerErrorCode: operation.state,
          providerMessage: null,
          providerRequestId: null,
          operationIds: Object.freeze([operationId]),
          retryAfterMs: null,
          requestPath: `/projects/${projectId}/operations/${operationId}`,
          operationKind: "GREEN_OWNER_ROLE_CREATE",
          responseReceived: true,
          timedOut: false,
        })
      }
      if (attempt + 1 < this.operationPolling.maxAttempts) {
        await this.operationPolling.sleep(this.operationPolling.delayMs)
      }
    }
    throw new MvpGreenInfrastructureError("NEON_OPERATION_TIMEOUT", {
      httpStatus: null,
      providerErrorCode: null,
      providerMessage: null,
      providerRequestId: null,
      operationIds: Object.freeze([operationId]),
      retryAfterMs: null,
      requestPath: `/projects/${projectId}/operations/${operationId}`,
      operationKind: "GREEN_OWNER_ROLE_CREATE",
      responseReceived: true,
      timedOut: true,
    })
  }

  async inspectRole(projectId: string, branchId: string, roleName: string): Promise<MvpGreenRoleInspection | null> {
    if (
      projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID
      || !BRANCH_ID.test(branchId)
      || !ROLE_NAME.test(roleName)
    ) {
      throw new MvpGreenInfrastructureError("ROLE_IDENTITY_UNVERIFIED")
    }
    const response = await this.transport.request({
      method: "GET",
      path: `/projects/${encoded(projectId)}/branches/${encoded(branchId)}/roles/${encoded(roleName)}`,
    })
    if (response.status === 404) return null
    requireSuccessful(response, "ROLE_IDENTITY_UNVERIFIED")
    const role = roleFromBody(response.body)
    return role ? normalizedRole({ projectId, branchId, value: role }) : null
  }

  async inspectApprovedGreenBranch(
    release: MvpGreenReleaseIdentity,
    approval: MvpGreenOperationApproval,
  ): Promise<MvpGreenCreatedBranch> {
    const branchId = approval.targetGreenBranchId
    if (!branchId) throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_REQUIRED")
    if (
      [MVP_GREEN_PRODUCTION_BRANCH_ID, MVP_GREEN_ROLLBACK_BRANCH_ID, MVP_GREEN_REJECTED_BRANCH_ID]
        .some((protectedBranch) => protectedBranch === branchId)
    ) {
      throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
    }
    let branch: MvpGreenBranchInspection
    try {
      branch = await this.inspectBranch(approval.projectId, branchId)
    } catch (error) {
      if (error instanceof MvpGreenInfrastructureError && error.code === "NEON_AUTHENTICATION_FAILURE") throw error
      throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
    }
    if (
      release.projectId !== approval.projectId
      || release.parentBranchId !== approval.parentBranchId
      || release.branchName !== approval.targetBranchName
      || release.releaseChecksum !== approval.releaseChecksum
      || branch.branchId !== branchId
      || branch.branchName !== approval.targetBranchName
      || branch.parentBranchId !== approval.parentBranchId
      || branch.parentLsn !== approval.expectedParentLsn
      || branch.state !== "ready"
    ) {
      throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
    }
    const inheritedDatabases = await this.listInheritedDatabases(approval.projectId, branchId)
    if (!inheritedDatabases.some((database) => database.databaseName === MVP_GREEN_PRODUCTION_DATABASE)) {
      throw new MvpGreenInfrastructureError("TARGET_GREEN_BRANCH_IDENTITY_MISMATCH")
    }
    return Object.freeze({
      status: "RECONCILED" as const,
      projectId: approval.projectId,
      parentBranchId: approval.parentBranchId,
      parentStateChecksum: approval.expectedParentState,
      parentLsn: approval.expectedParentLsn,
      branchId,
      branchName: branch.branchName,
      region: branch.region,
      createdAt: branch.createdAt,
      branchState: branch.state,
      inheritedDatabases,
      fingerprint: branch.fingerprint,
    })
  }

  async readBackCreatedRole(
    release: MvpGreenReleaseIdentity,
    approval: MvpGreenOperationApproval,
    endpointInventory?: MvpGreenEndpointInventory,
  ): Promise<MvpGreenCreatedRole | null> {
    if (approval.targetRoleName !== MVP_GREEN_MIGRATION_OWNER_ROLE || approval.targetRoleNoLogin !== true) {
      throw new MvpGreenInfrastructureError("OWNER_ROLE_CONTRACT_MISMATCH")
    }
    const branch = await this.inspectApprovedGreenBranch(release, approval)
    const inventory = endpointInventory ?? await this.inspectEndpointPrerequisite(approval.projectId, branch.branchId)
    const roles = await this.listRoles(approval.projectId, branch.branchId)
    const matches = roles.filter((role) => role.roleName === approval.targetRoleName)
    if (!matches.length) return null
    if (matches.length !== 1) throw new MvpGreenInfrastructureError("ROLE_IDENTITY_UNVERIFIED")
    const role = await this.inspectRole(approval.projectId, branch.branchId, approval.targetRoleName)
    if (
      !role
      || role.projectId !== approval.projectId
      || role.branchId !== branch.branchId
      || role.roleName !== MVP_GREEN_MIGRATION_OWNER_ROLE
      || role.protected !== false
    ) {
      throw new MvpGreenInfrastructureError("ROLE_IDENTITY_UNVERIFIED")
    }
    return Object.freeze({
      ...role,
      creationStatus: "RECONCILED" as const,
      releaseChecksum: approval.releaseChecksum,
      endpointPrerequisite: inventory.prerequisite,
      endpointCount: inventory.endpointCount,
      readWriteEndpointCount: inventory.readWriteEndpointCount,
      roleNoLogin: true as const,
      providerHttpStatus: null,
      providerErrorCode: null,
      providerRequestId: null,
      operationIds: Object.freeze([]),
      operationPollingResult: "NOT_APPLICABLE" as const,
      deterministicReadbackResult: "MATCH" as const,
    })
  }

  async createMigrationOwnerRole(input: {
    readonly release: MvpGreenReleaseIdentity
    readonly approval: MvpGreenOperationApproval | null
    readonly parentState: MvpGreenParentState
    readonly at: string
  }): Promise<MvpGreenCreatedRole> {
    assertMvpGreenOperationApproval({
      approval: input.approval,
      operation: "GREEN_OWNER_ROLE_CREATE",
      release: input.release,
      at: input.at,
    })
    const approval = Object.freeze({ ...input.approval! })
    this.assertApprovedParentState(input.parentState, approval)
    const existing = await this.readBackCreatedRole(input.release, approval)
    if (existing) return existing
    const endpointInventory = await this.inspectEndpointPrerequisite(approval.projectId, approval.targetGreenBranchId!)
    if (endpointInventory.prerequisite !== "READ_WRITE_ENDPOINT_PRESENT") {
      throw new MvpGreenInfrastructureError(
        endpointInventory.prerequisite === "ENDPOINT_IDENTITY_UNVERIFIED"
          ? "TARGET_GREEN_BRANCH_IDENTITY_MISMATCH"
          : "NEON_ENDPOINT_REQUIRED",
        {
        httpStatus: null,
        providerErrorCode: endpointInventory.prerequisite,
        providerMessage: null,
        providerRequestId: null,
        operationIds: Object.freeze([]),
        retryAfterMs: null,
        requestPath: `/projects/${approval.projectId}/branches/${approval.targetGreenBranchId}/endpoints`,
        operationKind: "GREEN_OWNER_ROLE_CREATE",
        responseReceived: true,
        timedOut: false,
        },
      )
    }
    const path = `/projects/${encoded(approval.projectId)}/branches/${encoded(approval.targetGreenBranchId!)}/roles`
    let response: MvpNeonTransportResponse | null = null
    let failure: MvpGreenInfrastructureError | null = null
    let operationIds: readonly string[] = Object.freeze([])
    let operationPollingResult: MvpGreenCreatedRole["operationPollingResult"] = "NOT_APPLICABLE"
    try {
      response = await this.transport.request({
        method: "POST",
        path,
        body: { role: { name: approval.targetRoleName, no_login: approval.targetRoleNoLogin } },
      })
      requireSuccessful(response, "ROLE_CREATION_FAILED", path, "GREEN_OWNER_ROLE_CREATE")
      const providerRole = roleFromBody(response.body)
      operationIds = Object.freeze(operationsFromBody(response.body).map((operation) => (
        typeof operation.id === "string" ? operation.id : ""
      )).filter((operationId) => /^[0-9a-f-]{36}$/.test(operationId)))
      if (!providerRole && !operationIds.length) {
        throw new MvpGreenInfrastructureError("NEON_MALFORMED_RESPONSE", providerEvidence({
          response,
          requestPath: path,
          operationKind: "GREEN_OWNER_ROLE_CREATE",
          responseReceived: true,
          timedOut: false,
        }))
      }
      for (const operationId of operationIds) {
        await this.pollOperation(approval.projectId, operationId)
      }
      operationPollingResult = operationIds.length ? "PASS" : "NOT_APPLICABLE"
    } catch (error) {
      failure = error instanceof MvpGreenInfrastructureError
        ? error
        : new MvpGreenInfrastructureError("NEON_TRANSPORT_FAILURE", providerEvidence({
          requestPath: path,
          operationKind: "GREEN_OWNER_ROLE_CREATE",
          responseReceived: false,
          timedOut: false,
        }))
      if (failure.code === "NEON_AUTHENTICATION_FAILURE" || failure.code === "NEON_BAD_REQUEST") throw failure
      if (failure.code === "NEON_OPERATION_FAILED" || failure.code === "NEON_OPERATION_TIMEOUT") {
        operationPollingResult = "FAIL_RECONCILED"
      }
    }
    const readback = await this.readBackCreatedRole(input.release, approval, endpointInventory)
    if (!readback) {
      if (failure) throw failure
      throw new MvpGreenInfrastructureError("ROLE_IDENTITY_UNVERIFIED", response
        ? providerEvidence({
          response,
          requestPath: path,
          operationKind: "GREEN_OWNER_ROLE_CREATE",
          responseReceived: true,
          timedOut: false,
        })
        : null)
    }
    const evidence = response
      ? providerEvidence({
        response,
        requestPath: path,
        operationKind: "GREEN_OWNER_ROLE_CREATE",
        responseReceived: true,
        timedOut: false,
      })
      : failure?.evidence
    return Object.freeze({
      ...readback,
      creationStatus: failure ? "RECONCILED" as const : "CREATED" as const,
      providerHttpStatus: evidence?.httpStatus ?? null,
      providerErrorCode: evidence?.providerErrorCode ?? null,
      providerRequestId: evidence?.providerRequestId ?? null,
      operationIds,
      operationPollingResult,
    })
  }

  private assertApprovedParentState(
    parentState: MvpGreenParentState,
    approval: MvpGreenOperationApproval,
  ): void {
    const runtimeStateChecksum = canonicalChecksum({
      projectId: parentState.projectId,
      branchId: parentState.branchId,
      databaseName: parentState.databaseName,
      lsn: parentState.lsn,
      readOnlyTransaction: parentState.readOnlyTransaction,
    })
    if (
      parentState.projectId !== approval.projectId
      || parentState.branchId !== approval.parentBranchId
      || parentState.databaseName !== MVP_GREEN_PRODUCTION_DATABASE
      || parentState.readOnlyTransaction !== true
      || parentState.stateChecksum !== runtimeStateChecksum
    ) {
      throw new MvpGreenInfrastructureError("PARENT_STATE_UNRESOLVED")
    }
    if (compareMvpPostgresLsns(parentState.lsn, approval.expectedParentLsn) < 0) {
      throw new MvpGreenInfrastructureError("APPROVED_PARENT_LSN_AHEAD_OF_CURRENT")
    }
  }

  async readBackCreatedBranch(
    release: MvpGreenReleaseIdentity,
    approval: Pick<
      MvpGreenOperationApproval,
      "projectId" | "parentBranchId" | "expectedParentLsn" | "expectedParentState" | "targetBranchName"
    >,
  ): Promise<MvpGreenCreatedBranch | null> {
    const response = await this.transport.request({
      method: "GET",
      path: `/projects/${encoded(approval.projectId)}/branches?search=${encoded(approval.targetBranchName)}&limit=100`,
    })
    requireSuccessful(response, "BRANCH_IDENTITY_UNVERIFIED")
    const matches = branchesFromBody(response.body).filter((branch) => branch.name === approval.targetBranchName)
    if (!matches.length) return null
    if (matches.length !== 1) throw new MvpGreenInfrastructureError("BRANCH_IDENTITY_UNVERIFIED")
    const branchId = requiredString(matches[0]!.id, "BRANCH_IDENTITY_UNVERIFIED")
    const branch = await this.inspectBranch(approval.projectId, branchId)
    if (
      release.projectId !== approval.projectId
      || release.parentBranchId !== approval.parentBranchId
      || release.branchName !== approval.targetBranchName
      || branch.branchName !== approval.targetBranchName
      || branch.parentBranchId !== approval.parentBranchId
      || branch.parentLsn !== approval.expectedParentLsn
      || branch.state !== "ready"
    ) {
      throw new MvpGreenInfrastructureError("BRANCH_IDENTITY_UNVERIFIED")
    }
    const inheritedDatabases = await this.listInheritedDatabases(approval.projectId, branch.branchId)
    if (!inheritedDatabases.some((database) => database.databaseName === MVP_GREEN_PRODUCTION_DATABASE)) {
      throw new MvpGreenInfrastructureError("BRANCH_IDENTITY_UNVERIFIED")
    }
    return Object.freeze({
      status: "RECONCILED" as const,
      projectId: approval.projectId,
      parentBranchId: approval.parentBranchId,
      parentStateChecksum: approval.expectedParentState,
      parentLsn: approval.expectedParentLsn,
      branchId: branch.branchId,
      branchName: branch.branchName,
      region: branch.region,
      createdAt: branch.createdAt,
      branchState: branch.state,
      inheritedDatabases,
      fingerprint: branch.fingerprint,
    })
  }

  async createChildBranch(input: {
    readonly release: MvpGreenReleaseIdentity
    readonly approval: MvpGreenOperationApproval | null
    readonly parentState: MvpGreenParentState
    readonly at: string
  }): Promise<MvpGreenCreatedBranch> {
    assertMvpGreenOperationApproval({
      approval: input.approval,
      operation: "NEON_BRANCH_CREATE",
      release: input.release,
      at: input.at,
    })
    const approval = Object.freeze({ ...input.approval! })
    if (
      input.release.parentBranchId !== MVP_GREEN_PRODUCTION_BRANCH_ID
      || [MVP_GREEN_PRODUCTION_BRANCH_ID, MVP_GREEN_ROLLBACK_BRANCH_ID, MVP_GREEN_REJECTED_BRANCH_ID]
        .some((protectedBranch) => protectedBranch === input.release.branchName)
    ) {
      throw new MvpGreenInfrastructureError("PARENT_BRANCH_IDENTITY_MISMATCH")
    }
    this.assertApprovedParentState(input.parentState, approval)
    const existing = await this.readBackCreatedBranch(input.release, approval)
    if (existing) return existing
    let mutationReturned = false
    try {
      const response = await this.transport.request({
        method: "POST",
        path: `/projects/${encoded(input.release.projectId)}/branches`,
        body: {
          branch: {
            name: approval.targetBranchName,
            parent_id: approval.parentBranchId,
            parent_lsn: approval.expectedParentLsn,
          },
        },
      })
      requireSuccessful(response, "BRANCH_CREATION_FAILED")
      mutationReturned = Boolean(branchFromBody(response.body))
    } catch (error) {
      if (error instanceof MvpGreenInfrastructureError && error.code === "NEON_AUTHENTICATION_FAILURE") throw error
    }
    const readback = await this.readBackCreatedBranch(input.release, approval)
    if (!readback) {
      throw new MvpGreenInfrastructureError(mutationReturned ? "BRANCH_IDENTITY_UNVERIFIED" : "BRANCH_CREATION_FAILED")
    }
    return Object.freeze({ ...readback, status: "CREATED" as const })
  }

  async inspectReleaseDatabase(input: {
    readonly projectId: string
    readonly branchId: string
    readonly databaseName: string
  }): Promise<MvpGreenDatabaseInspection | null> {
    if (
      input.projectId !== MVP_GREEN_PRODUCTION_PROJECT_ID
      || !BRANCH_ID.test(input.branchId)
      || !DATABASE_NAME.test(input.databaseName)
    ) {
      throw new MvpGreenInfrastructureError("RELEASE_DATABASE_IDENTITY_UNVERIFIED")
    }
    const response = await this.transport.request({
      method: "GET",
      path: `/projects/${encoded(input.projectId)}/branches/${encoded(input.branchId)}/databases/${encoded(input.databaseName)}`,
    })
    if (response.status === 404) return null
    requireSuccessful(response, "RELEASE_DATABASE_IDENTITY_UNVERIFIED")
    const database = databaseFromBody(response.body)
    return database ? normalizedDatabase({ projectId: input.projectId, branchId: input.branchId, value: database }) : null
  }

  async createReleaseDatabase(input: {
    readonly release: MvpGreenReleaseIdentity
    readonly approval: MvpGreenOperationApproval | null
    readonly parentState: MvpGreenParentState
    readonly at: string
  }): Promise<MvpGreenCreatedDatabase> {
    assertMvpGreenOperationApproval({
      approval: input.approval,
      operation: "GREEN_DATABASE_CREATE",
      release: input.release,
      at: input.at,
    })
    const approval = Object.freeze({ ...input.approval! })
    if (
      approval.targetDatabaseName !== input.release.databaseName
      || approval.targetDatabaseName === MVP_GREEN_PRODUCTION_DATABASE
      || approval.targetDatabaseName === MVP_GREEN_REJECTED_DATABASE
      || approval.targetOwnerRole !== MVP_GREEN_MIGRATION_OWNER_ROLE
      || approval.targetRoleName !== null
      || !approval.targetGreenBranchId
    ) {
      throw new MvpGreenInfrastructureError("DATABASE_APPROVAL_BINDING_INVALID")
    }
    this.assertApprovedParentState(input.parentState, approval)
    const branch = await this.inspectApprovedGreenBranch(input.release, approval)
    const roles = await this.listRoles(approval.projectId, branch.branchId)
    const ownerMatches = roles.filter((role) => role.roleName === approval.targetOwnerRole)
    if (!ownerMatches.length) throw new MvpGreenInfrastructureError("OWNER_ROLE_MISSING")
    if (
      ownerMatches.length !== 1
      || ownerMatches[0]!.branchId !== branch.branchId
      || ownerMatches[0]!.protected !== false
    ) {
      throw new MvpGreenInfrastructureError("OWNER_ROLE_CONTRACT_MISMATCH")
    }
    const owner = await this.inspectRole(approval.projectId, branch.branchId, approval.targetOwnerRole)
    if (
      !owner
      || owner.roleName !== MVP_GREEN_MIGRATION_OWNER_ROLE
      || owner.branchId !== branch.branchId
      || owner.protected !== false
    ) {
      throw new MvpGreenInfrastructureError("OWNER_ROLE_CONTRACT_MISMATCH")
    }
    const collisions = branch.inheritedDatabases.filter(
      (database) => database.databaseName === approval.targetDatabaseName,
    )
    if (collisions.length > 1) throw new MvpGreenInfrastructureError("RELEASE_DATABASE_IDENTITY_UNVERIFIED")
    if (collisions.length === 1) {
      const collision = await this.inspectReleaseDatabase({
        projectId: approval.projectId,
        branchId: approval.targetGreenBranchId,
        databaseName: approval.targetDatabaseName,
      })
      if (
        !collision
        || collision.branchId !== branch.branchId
        || collision.ownerName !== approval.targetOwnerRole
      ) {
        throw new MvpGreenInfrastructureError("OWNER_ROLE_CONTRACT_MISMATCH")
      }
      return Object.freeze({ ...collision, creationStatus: "RECONCILED" as const, releaseChecksum: input.release.releaseChecksum })
    }
    let mutationReturned = false
    try {
      const response = await this.transport.request({
        method: "POST",
        path: `/projects/${encoded(approval.projectId)}/branches/${encoded(approval.targetGreenBranchId)}/databases`,
        body: { database: { name: approval.targetDatabaseName, owner_name: approval.targetOwnerRole } },
      })
      requireSuccessful(response, "RELEASE_DATABASE_CREATION_FAILED")
      mutationReturned = Boolean(databaseFromBody(response.body))
    } catch (error) {
      if (error instanceof MvpGreenInfrastructureError && error.code === "NEON_AUTHENTICATION_FAILURE") throw error
    }
    const readback = await this.inspectReleaseDatabase({
      projectId: approval.projectId,
      branchId: approval.targetGreenBranchId,
      databaseName: approval.targetDatabaseName,
    })
    if (!readback) {
      throw new MvpGreenInfrastructureError(mutationReturned ? "RELEASE_DATABASE_IDENTITY_UNVERIFIED" : "RELEASE_DATABASE_CREATION_FAILED")
    }
    if (readback.ownerName !== approval.targetOwnerRole || readback.branchId !== approval.targetGreenBranchId) {
      throw new MvpGreenInfrastructureError("RELEASE_DATABASE_IDENTITY_UNVERIFIED")
    }
    return Object.freeze({ ...readback, creationStatus: "CREATED" as const, releaseChecksum: input.release.releaseChecksum })
  }
}
