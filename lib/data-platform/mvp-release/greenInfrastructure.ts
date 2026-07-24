import { canonicalChecksum } from "@/lib/data-platform/contracts"
import postgres from "postgres"
import { createMvpBlueGreenBranchPlan, type MvpBlueGreenBranchPlan } from "./blueGreen"

export const MVP_GREEN_INFRASTRUCTURE_SCHEMA_VERSION = "mvp-green-infrastructure/1.0.0" as const
export const MVP_GREEN_APPROVAL_SCHEMA_VERSION = "mvp-green-infrastructure-approval/1.1.0" as const
export const MVP_GREEN_PRODUCTION_PROJECT_ID = "soft-cell-16396854" as const
export const MVP_GREEN_PRODUCTION_BRANCH_ID = "br-flat-grass-ao9rtnyr" as const
export const MVP_GREEN_PRODUCTION_DATABASE = "neondb" as const
export const MVP_GREEN_ROLLBACK_BRANCH_ID = "br-royal-block-aop70mzq" as const
export const MVP_GREEN_REJECTED_BRANCH_ID = "br-odd-leaf-ao61pbg4" as const
export const MVP_GREEN_REJECTED_DATABASE = "mvp_release_20260719" as const

const PROJECT_ID = /^[a-z0-9-]{1,60}$/
const BRANCH_ID = /^br-[a-z0-9-]{1,57}$/
const BRANCH_NAME = /^mvp-release-\d{4}-\d{2}-\d{2}-[0-9a-f]{12}$/
const DATABASE_NAME = /^[a-z][a-z0-9_]{0,62}$/
const LSN = /^(0|[1-9A-F][0-9A-F]*)\/(0|[1-9A-F][0-9A-F]*)$/
const MAX_LSN_PART = BigInt("4294967295")
const LSN_LOW_BITS = BigInt(32)
const CHECKSUM = /^[0-9a-f]{64}$/
const COMMIT = /^[0-9a-f]{40}$/

export type MvpGreenOperationKind =
  | "NEON_BRANCH_CREATE"
  | "GREEN_DATABASE_CREATE"
  | "GREEN_ACQUISITION_START"

export type MvpGreenInfrastructureErrorCode =
  | "APPROVAL_REQUIRED"
  | "APPROVAL_STALE"
  | "APPROVED_PARENT_LSN_INVALID"
  | "APPROVED_PARENT_LSN_AHEAD_OF_CURRENT"
  | "NEON_CONFIGURATION_MISSING"
  | "NEON_AUTHENTICATION_FAILURE"
  | "PROJECT_IDENTITY_MISMATCH"
  | "PARENT_BRANCH_IDENTITY_MISMATCH"
  | "PARENT_STATE_CHANGED"
  | "PARENT_STATE_UNRESOLVED"
  | "BRANCH_CREATION_FAILED"
  | "BRANCH_IDENTITY_UNVERIFIED"
  | "RELEASE_DATABASE_NAME_CONFLICT"
  | "RELEASE_DATABASE_CREATION_FAILED"
  | "RELEASE_DATABASE_IDENTITY_UNVERIFIED"

export class MvpGreenInfrastructureError extends Error {
  readonly code: MvpGreenInfrastructureErrorCode

  constructor(code: MvpGreenInfrastructureErrorCode) {
    super(code)
    this.name = "MvpGreenInfrastructureError"
    this.code = code
  }
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
  readonly targetDatabaseName: string | null
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

function requireSuccessful(response: MvpNeonTransportResponse, fallback: MvpGreenInfrastructureErrorCode): void {
  if (response.status === 401 || response.status === 403) throw new MvpGreenInfrastructureError("NEON_AUTHENTICATION_FAILURE")
  if (response.status < 200 || response.status >= 300) throw new MvpGreenInfrastructureError(fallback)
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
    || (input.targetDatabaseName !== null && !DATABASE_NAME.test(input.targetDatabaseName))
    || (input.operation === "NEON_BRANCH_CREATE"
      ? input.targetDatabaseName !== null
      : input.targetDatabaseName === null)
    || !input.invocationId.trim()
    || !input.actorId.trim()
  ) {
    throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
  }
  const { approved: _approved, ...approvalInput } = input
  const basis = { schemaVersion: MVP_GREEN_APPROVAL_SCHEMA_VERSION, ...approvalInput }
  return Object.freeze({ ...basis, approvalChecksum: canonicalChecksum(basis) })
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
    || (input.operation === "NEON_BRANCH_CREATE"
      ? approval.targetDatabaseName !== null
      : typeof approval.targetDatabaseName !== "string" || !DATABASE_NAME.test(approval.targetDatabaseName))
    || !approval.invocationId.trim()
    || !approval.actorId.trim()
  ) {
    throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
  }
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
    || approval.targetDatabaseName !== (input.operation === "NEON_BRANCH_CREATE" ? null : input.release.databaseName)
  ) {
    throw new MvpGreenInfrastructureError("APPROVAL_REQUIRED")
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
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    return Object.freeze({ status: response.status, body })
  }
}

export class LiveMvpNeonGreenInfrastructureAdapter {
  private readonly transport: MvpNeonTransport
  private readonly parentStateReader: MvpGreenParentStateReader

  constructor(input: { readonly transport: MvpNeonTransport; readonly parentStateReader: MvpGreenParentStateReader }) {
    this.transport = input.transport
    this.parentStateReader = input.parentStateReader
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
    if (
      input.parentState.projectId !== approval.projectId
      || input.parentState.branchId !== approval.parentBranchId
      || input.parentState.databaseName !== MVP_GREEN_PRODUCTION_DATABASE
      || input.parentState.readOnlyTransaction !== true
    ) {
      throw new MvpGreenInfrastructureError("PARENT_STATE_UNRESOLVED")
    }
    if (compareMvpPostgresLsns(input.parentState.lsn, approval.expectedParentLsn) < 0) {
      throw new MvpGreenInfrastructureError("APPROVED_PARENT_LSN_AHEAD_OF_CURRENT")
    }
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
    readonly release: MvpGreenReleaseIdentity
    readonly branchId: string
  }): Promise<MvpGreenDatabaseInspection | null> {
    const response = await this.transport.request({
      method: "GET",
      path: `/projects/${encoded(input.release.projectId)}/branches/${encoded(input.branchId)}/databases/${encoded(input.release.databaseName)}`,
    })
    if (response.status === 404) return null
    requireSuccessful(response, "RELEASE_DATABASE_IDENTITY_UNVERIFIED")
    const database = databaseFromBody(response.body)
    return database ? normalizedDatabase({ projectId: input.release.projectId, branchId: input.branchId, value: database }) : null
  }

  async createReleaseDatabase(input: {
    readonly release: MvpGreenReleaseIdentity
    readonly branch: MvpGreenCreatedBranch
    readonly ownerName: string
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
      input.branch.parentBranchId !== input.release.parentBranchId
      || input.branch.branchName !== input.release.branchName
      || input.branch.parentLsn !== approval.expectedParentLsn
      || input.release.databaseName === MVP_GREEN_PRODUCTION_DATABASE
      || input.release.databaseName === MVP_GREEN_REJECTED_DATABASE
      || !input.ownerName.trim()
    ) {
      throw new MvpGreenInfrastructureError("RELEASE_DATABASE_NAME_CONFLICT")
    }
    if (
      input.parentState.projectId !== approval.projectId
      || input.parentState.branchId !== approval.parentBranchId
      || input.parentState.databaseName !== MVP_GREEN_PRODUCTION_DATABASE
      || input.parentState.readOnlyTransaction !== true
    ) {
      throw new MvpGreenInfrastructureError("PARENT_STATE_UNRESOLVED")
    }
    if (compareMvpPostgresLsns(input.parentState.lsn, approval.expectedParentLsn) < 0) {
      throw new MvpGreenInfrastructureError("APPROVED_PARENT_LSN_AHEAD_OF_CURRENT")
    }
    const inherited = await this.listInheritedDatabases(input.release.projectId, input.branch.branchId)
    const collision = inherited.find((database) => database.databaseName === input.release.databaseName)
    if (collision) {
      if (collision.ownerName !== input.ownerName) {
        throw new MvpGreenInfrastructureError("RELEASE_DATABASE_NAME_CONFLICT")
      }
      return Object.freeze({ ...collision, creationStatus: "RECONCILED" as const, releaseChecksum: input.release.releaseChecksum })
    }
    let mutationReturned = false
    try {
      const response = await this.transport.request({
        method: "POST",
        path: `/projects/${encoded(input.release.projectId)}/branches/${encoded(input.branch.branchId)}/databases`,
        body: { database: { name: input.release.databaseName, owner_name: input.ownerName } },
      })
      requireSuccessful(response, "RELEASE_DATABASE_CREATION_FAILED")
      mutationReturned = Boolean(databaseFromBody(response.body))
    } catch (error) {
      if (error instanceof MvpGreenInfrastructureError && error.code === "NEON_AUTHENTICATION_FAILURE") throw error
    }
    const readback = await this.inspectReleaseDatabase({ release: input.release, branchId: input.branch.branchId })
    if (!readback) {
      throw new MvpGreenInfrastructureError(mutationReturned ? "RELEASE_DATABASE_IDENTITY_UNVERIFIED" : "RELEASE_DATABASE_CREATION_FAILED")
    }
    return Object.freeze({ ...readback, creationStatus: "CREATED" as const, releaseChecksum: input.release.releaseChecksum })
  }
}
