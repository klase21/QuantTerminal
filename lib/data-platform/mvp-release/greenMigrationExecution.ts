import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import postgres from "postgres"
import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { MVP_SERVING_MIGRATION_ORDER } from "@/lib/data-platform/mvp-serving/migrationOrder"
import {
  MVP_GREEN_MIGRATION_LOGIN_ROLE,
  MVP_GREEN_MIGRATION_OWNER_ROLE,
  type MvpGreenCredentialHandoffReceipt,
  type MvpGreenMigrationCredentialSink,
} from "./greenInfrastructure"

/**
 * This module deliberately contains contracts and injected execution ports only.
 * It never discovers credentials from the environment and never creates a provider
 * connection, which keeps the governed Green operation explicit at the worker edge.
 */
export const MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION = "mvp-green-migration-execution/1.0.0" as const
export const MVP_GREEN_MIGRATION_GRANT_EXECUTOR_ROLE = "neondb_owner" as const
export const MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_OPERATION = "GREEN_MIGRATION_ROLE_MEMBERSHIP_GRANT" as const
export const MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_REVOKE_OPERATION = "GREEN_MIGRATION_ROLE_MEMBERSHIP_REVOKE" as const
export const MVP_GREEN_MIGRATION_CREDENTIAL_STORE_SCOPE = "WINDOWS_CURRENT_USER_DPAPI" as const
export const MVP_GREEN_MIGRATION_CREDENTIAL_HANDOFF = "WINDOWS_DPAPI_USER_SCOPE" as const

const CHECKSUM = /^[0-9a-f]{64}$/
const POSTGRES_IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/
const MIGRATION_FILENAME = /^(\d{3})_[a-z0-9_]+\.sql$/

export interface MvpGreenServingMigrationArtifact {
  readonly migrationId: string
  readonly filename: string
  readonly checksum: string
  readonly sql: string
}

export interface MvpGreenServingMigrationPlan {
  readonly schemaVersion: typeof MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION
  readonly migrationRoot: string
  readonly migrations: readonly MvpGreenServingMigrationArtifact[]
  readonly planChecksum: string
}

function planBasis(migrations: readonly MvpGreenServingMigrationArtifact[]) {
  return migrations.map(({ migrationId, filename, checksum }) => ({ migrationId, filename, checksum }))
}

/** Discovers only the committed serving order and hashes normalized UTF-8 SQL bytes. */
export async function discoverMvpGreenServingMigrationPlan(
  migrationRoot = path.join(process.cwd(), "lib", "data-platform", "mvp-serving", "migrations"),
): Promise<MvpGreenServingMigrationPlan> {
  const migrations: MvpGreenServingMigrationArtifact[] = []
  for (const filename of MVP_SERVING_MIGRATION_ORDER) {
    const parsed = MIGRATION_FILENAME.exec(filename)
    if (!parsed) throw new Error("MVP_GREEN_SERVING_MIGRATION_FILENAME_INVALID")
    const sql = (await readFile(path.join(migrationRoot, filename), "utf8")).replace(/\r\n/g, "\n")
    migrations.push(Object.freeze({ migrationId: parsed[1], filename, checksum: createHash("sha256").update(sql).digest("hex"), sql }))
  }
  const frozen = Object.freeze(migrations)
  const basis = { schemaVersion: MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION, migrations: planBasis(frozen) }
  return Object.freeze({ ...basis, migrationRoot, migrations: frozen, planChecksum: canonicalChecksum(basis) })
}

export const discoverGreenServingMigrationPlan = discoverMvpGreenServingMigrationPlan

export function verifyMvpGreenServingMigrationPlan(plan: MvpGreenServingMigrationPlan): void {
  if (plan.schemaVersion !== MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION || !CHECKSUM.test(plan.planChecksum)) throw new Error("MVP_GREEN_MIGRATION_PLAN_INVALID")
  if (plan.migrations.length !== MVP_SERVING_MIGRATION_ORDER.length) throw new Error("MVP_GREEN_MIGRATION_PLAN_COUNT_INVALID")
  for (const [index, migration] of plan.migrations.entries()) {
    if (migration.filename !== MVP_SERVING_MIGRATION_ORDER[index] || !MIGRATION_FILENAME.test(migration.filename) || !CHECKSUM.test(migration.checksum)) throw new Error("MVP_GREEN_MIGRATION_PLAN_ARTIFACT_INVALID")
  }
  const basis = { schemaVersion: plan.schemaVersion, migrations: planBasis(plan.migrations) }
  if (canonicalChecksum(basis) !== plan.planChecksum) throw new Error("MVP_GREEN_MIGRATION_PLAN_CHECKSUM_MISMATCH")
}

export interface MvpGreenDpapiProtector {
  readonly scope: typeof MVP_GREEN_MIGRATION_CREDENTIAL_STORE_SCOPE
  protect(plaintext: Uint8Array, entropy: Uint8Array): Promise<Uint8Array>
  unprotect(ciphertext: Uint8Array, entropy: Uint8Array): Promise<Uint8Array>
}

export interface MvpGreenTargetBoundDpapiEnvelope {
  readonly schemaVersion: typeof MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION
  readonly handoff: typeof MVP_GREEN_MIGRATION_CREDENTIAL_HANDOFF
  readonly credentialId: string
  readonly targetChecksum: string
  readonly projectId: string
  readonly branchId: string
  readonly databaseName: string
  readonly roleName: string
  readonly releaseChecksum: string
  readonly creationInvocationId: string
  readonly createdAt: string
  readonly ciphertextBase64: string
  readonly envelopeChecksum: string
}

export interface MvpGreenDpapiEnvelopeStore {
  readEnvelope(path: string): Promise<MvpGreenTargetBoundDpapiEnvelope | null>
  writeEnvelope(path: string, value: MvpGreenTargetBoundDpapiEnvelope): Promise<void>
  removeEnvelope?(path: string): Promise<void>
}

export function createMvpGreenWindowsDpapiCredentialPath(root: string, credentialId: string, targetChecksum: string): string {
  if (!root.trim() || !CHECKSUM.test(targetChecksum)) throw new Error("MVP_GREEN_DPAPI_PATH_INVALID")
  credentialEntropy(credentialId)
  return path.join(root, "QuantTerminal", "mvp-green", targetChecksum, `${credentialId}.dpapi.json`)
}

export function verifyMvpGreenTargetBoundDpapiEnvelope(envelope: MvpGreenTargetBoundDpapiEnvelope, targetChecksum: string): void {
  if (envelope.schemaVersion !== MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION || envelope.handoff !== MVP_GREEN_MIGRATION_CREDENTIAL_HANDOFF || !CHECKSUM.test(targetChecksum) || envelope.targetChecksum !== targetChecksum || !POSTGRES_IDENTIFIER.test(envelope.credentialId) || !POSTGRES_IDENTIFIER.test(envelope.databaseName) || !POSTGRES_IDENTIFIER.test(envelope.roleName) || !CHECKSUM.test(envelope.releaseChecksum) || !envelope.projectId.trim() || !envelope.branchId.trim() || !envelope.creationInvocationId.trim() || !Number.isFinite(Date.parse(envelope.createdAt)) || !/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.ciphertextBase64)) throw new Error("MVP_GREEN_DPAPI_ENVELOPE_INVALID")
  const basis = { schemaVersion: envelope.schemaVersion, handoff: envelope.handoff, credentialId: envelope.credentialId, targetChecksum: envelope.targetChecksum, projectId: envelope.projectId, branchId: envelope.branchId, databaseName: envelope.databaseName, roleName: envelope.roleName, releaseChecksum: envelope.releaseChecksum, creationInvocationId: envelope.creationInvocationId, createdAt: envelope.createdAt, ciphertextBase64: envelope.ciphertextBase64 }
  if (canonicalChecksum(basis) !== envelope.envelopeChecksum) throw new Error("MVP_GREEN_DPAPI_ENVELOPE_CHECKSUM_MISMATCH")
}

function credentialEntropy(credentialId: string): Uint8Array {
  if (!POSTGRES_IDENTIFIER.test(credentialId)) throw new Error("MVP_GREEN_CREDENTIAL_ID_INVALID")
  return Buffer.from(`${MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION}:${credentialId}`, "utf8")
}

/** A concrete envelope contract, but storage writes require a caller's explicit opt-in. */
export class TargetBoundWindowsUserScopeDpapiCredentialStore {
  constructor(private readonly protector: MvpGreenDpapiProtector, private readonly envelopes: MvpGreenDpapiEnvelopeStore) {
    if (protector.scope !== MVP_GREEN_MIGRATION_CREDENTIAL_STORE_SCOPE) throw new Error("MVP_GREEN_DPAPI_CURRENT_USER_REQUIRED")
  }
  async put(input: { readonly path: string; readonly credentialId: string; readonly targetChecksum: string; readonly projectId: string; readonly branchId: string; readonly databaseName: string; readonly roleName: string; readonly releaseChecksum: string; readonly creationInvocationId: string; readonly createdAt: string; readonly secret: string; readonly allowWrite: true }): Promise<MvpGreenTargetBoundDpapiEnvelope> {
    if (!input.secret || input.allowWrite !== true || !CHECKSUM.test(input.targetChecksum)) throw new Error("MVP_GREEN_DPAPI_WRITE_OPT_IN_REQUIRED")
    credentialEntropy(input.credentialId)
    const ciphertextBase64 = Buffer.from(await this.protector.protect(Buffer.from(input.secret, "utf8"), Buffer.from(`${input.targetChecksum}:${input.credentialId}`, "utf8"))).toString("base64")
    const basis = { schemaVersion: MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION, handoff: MVP_GREEN_MIGRATION_CREDENTIAL_HANDOFF, credentialId: input.credentialId, targetChecksum: input.targetChecksum, projectId: input.projectId, branchId: input.branchId, databaseName: input.databaseName, roleName: input.roleName, releaseChecksum: input.releaseChecksum, creationInvocationId: input.creationInvocationId, createdAt: input.createdAt, ciphertextBase64 }
    const envelope = Object.freeze({ ...basis, envelopeChecksum: canonicalChecksum(basis) })
    await this.envelopes.writeEnvelope(input.path, envelope)
    return envelope
  }
  async get(pathname: string, credentialId: string, targetChecksum: string): Promise<string | null> {
    const envelope = await this.envelopes.readEnvelope(pathname)
    if (!envelope) return null
    verifyMvpGreenTargetBoundDpapiEnvelope(envelope, targetChecksum)
    if (envelope.credentialId !== credentialId) throw new Error("MVP_GREEN_DPAPI_CREDENTIAL_BINDING_MISMATCH")
    return Buffer.from(await this.protector.unprotect(Buffer.from(envelope.ciphertextBase64, "base64"), Buffer.from(`${targetChecksum}:${credentialId}`, "utf8"))).toString("utf8")
  }
}

const PROTECT_SCRIPT = "$p=[Console]::In.ReadToEnd();$e=[Convert]::FromBase64String($env:QT_GREEN_DPAPI_ENTROPY);$b=[Text.Encoding]::UTF8.GetBytes($p);$c=[Security.Cryptography.ProtectedData]::Protect($b,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($c))"
const UNPROTECT_SCRIPT = "$c=[Convert]::FromBase64String([Console]::In.ReadToEnd());$e=[Convert]::FromBase64String($env:QT_GREEN_DPAPI_ENTROPY);$b=[Security.Cryptography.ProtectedData]::Unprotect($c,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($b))"

async function runDpapiPowerShell(script: string, input: Uint8Array | string, entropy: Uint8Array): Promise<Uint8Array> {
  if (process.platform !== "win32") throw new Error("MVP_GREEN_DPAPI_WINDOWS_REQUIRED")
  const encodedScript = Buffer.from(script, "utf16le").toString("base64")
  const windowsRoot = process.env.SystemRoot ?? process.env.WINDIR
  if (!windowsRoot) throw new Error("MVP_GREEN_DPAPI_RUNTIME_UNAVAILABLE")
  const executable = path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  return new Promise<Uint8Array>((resolve, reject) => {
    const child = spawn(executable, ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedScript], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        NODE_ENV: process.env.NODE_ENV,
        SystemRoot: windowsRoot,
        WINDIR: windowsRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        QT_GREEN_DPAPI_ENTROPY: Buffer.from(entropy).toString("base64"),
      },
    })
    const output: Buffer[] = []
    let outputBytes = 0
    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.length
      if (outputBytes <= 1024 * 1024) output.push(chunk)
    })
    child.stderr.resume()
    child.once("error", () => reject(new Error("MVP_GREEN_DPAPI_PROCESS_FAILED")))
    child.once("exit", (code) => {
      if (code !== 0 || outputBytes > 1024 * 1024) return reject(new Error("MVP_GREEN_DPAPI_PROCESS_FAILED"))
      resolve(Buffer.concat(output))
    })
    child.stdin.end(input)
  })
}

async function restrictCurrentWindowsUserAcl(pathname: string): Promise<void> {
  if (process.platform !== "win32") return
  const username = process.env.USERNAME?.trim()
  const windowsRoot = process.env.SystemRoot ?? process.env.WINDIR
  if (!username || /[\r\n"]/u.test(username) || !windowsRoot) throw new Error("MVP_GREEN_CREDENTIAL_STORE_ACL_FAILED")
  const executable = path.join(windowsRoot, "System32", "icacls.exe")
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, [pathname, "/inheritance:r", "/grant:r", `${username}:(R,W)`], {
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore"],
      env: {
        NODE_ENV: process.env.NODE_ENV,
        SystemRoot: windowsRoot,
        WINDIR: windowsRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
      },
    })
    child.once("error", () => reject(new Error("MVP_GREEN_CREDENTIAL_STORE_ACL_FAILED")))
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("MVP_GREEN_CREDENTIAL_STORE_ACL_FAILED")))
  })
}

export class WindowsCurrentUserDpapiProtector implements MvpGreenDpapiProtector {
  readonly scope = MVP_GREEN_MIGRATION_CREDENTIAL_STORE_SCOPE
  async protect(plaintext: Uint8Array, entropy: Uint8Array): Promise<Uint8Array> {
    const encoded = await runDpapiPowerShell(PROTECT_SCRIPT, plaintext, entropy)
    try { return Buffer.from(Buffer.from(encoded).toString("utf8"), "base64") } catch { throw new Error("MVP_GREEN_DPAPI_PROCESS_FAILED") }
  }
  unprotect(ciphertext: Uint8Array, entropy: Uint8Array): Promise<Uint8Array> {
    return runDpapiPowerShell(UNPROTECT_SCRIPT, Buffer.from(ciphertext).toString("base64"), entropy)
  }
}

export class AtomicJsonDpapiEnvelopeStore implements MvpGreenDpapiEnvelopeStore {
  constructor(private readonly repositoryRoot: string) {}
  private requireExternal(pathname: string): string {
    const target = path.resolve(pathname)
    const root = path.resolve(this.repositoryRoot)
    if (!path.isAbsolute(pathname) || target === root || target.startsWith(`${root}${path.sep}`)) {
      throw new Error("MVP_GREEN_CREDENTIAL_STORE_MUST_BE_OUTSIDE_REPOSITORY")
    }
    return target
  }
  async readEnvelope(pathname: string): Promise<MvpGreenTargetBoundDpapiEnvelope | null> {
    const target = this.requireExternal(pathname)
    try { return JSON.parse(await readFile(target, "utf8")) as MvpGreenTargetBoundDpapiEnvelope } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
      throw new Error("MVP_GREEN_CREDENTIAL_STORE_READ_FAILED")
    }
  }
  async writeEnvelope(pathname: string, value: MvpGreenTargetBoundDpapiEnvelope): Promise<void> {
    const target = this.requireExternal(pathname)
    const directory = path.dirname(target)
    const temporary = `${target}.${process.pid}.tmp`
    await mkdir(directory, { recursive: true, mode: 0o700 })
    try {
      await writeFile(temporary, JSON.stringify(value), { encoding: "utf8", mode: 0o600, flag: "wx" })
      await chmod(temporary, 0o600).catch(() => undefined)
      await rename(temporary, target)
      await chmod(target, 0o600).catch(() => undefined)
      await restrictCurrentWindowsUserAcl(target)
    } catch {
      await rm(temporary, { force: true }).catch(() => undefined)
      throw new Error("MVP_GREEN_CREDENTIAL_STORE_WRITE_FAILED")
    }
  }
}

export interface MvpGreenCredentialIdentity {
  readonly projectId: string
  readonly branchId: string
  readonly databaseName: string
  readonly roleName: typeof MVP_GREEN_MIGRATION_LOGIN_ROLE
  readonly releaseChecksum: string
}

export function createMvpGreenCredentialIdentityChecksum(identity: MvpGreenCredentialIdentity): string {
  if (!identity.projectId.trim() || !identity.branchId.trim() || !POSTGRES_IDENTIFIER.test(identity.databaseName) || identity.roleName !== MVP_GREEN_MIGRATION_LOGIN_ROLE || !CHECKSUM.test(identity.releaseChecksum)) throw new Error("MVP_GREEN_CREDENTIAL_IDENTITY_INVALID")
  return canonicalChecksum({ schemaVersion: MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION, ...identity })
}

export class WindowsDpapiMvpGreenMigrationCredentialSink implements MvpGreenMigrationCredentialSink {
  readonly ready: boolean
  private readonly dpapiStore: TargetBoundWindowsUserScopeDpapiCredentialStore
  private readonly envelopes: MvpGreenDpapiEnvelopeStore
  constructor(private readonly input: { readonly repositoryRoot: string; readonly storePath: string; readonly allowDpapi: boolean; readonly now?: () => string }, protector: MvpGreenDpapiProtector = new WindowsCurrentUserDpapiProtector(), envelopes: MvpGreenDpapiEnvelopeStore = new AtomicJsonDpapiEnvelopeStore(input.repositoryRoot)) {
    this.ready = input.allowDpapi && Boolean(input.storePath.trim()) && path.isAbsolute(input.storePath) && process.platform === "win32"
    this.envelopes = envelopes
    this.dpapiStore = new TargetBoundWindowsUserScopeDpapiCredentialStore(protector, envelopes)
  }
  private identity(input: { readonly projectId: string; readonly branchId: string; readonly databaseName: string; readonly roleName: string; readonly releaseChecksum: string }): MvpGreenCredentialIdentity {
    if (input.roleName !== MVP_GREEN_MIGRATION_LOGIN_ROLE) throw new Error("MVP_GREEN_CREDENTIAL_IDENTITY_INVALID")
    return { ...input, roleName: MVP_GREEN_MIGRATION_LOGIN_ROLE }
  }
  async store(input: { readonly projectId: string; readonly branchId: string; readonly databaseName: string; readonly roleName: string; readonly releaseChecksum: string; readonly creationInvocationId: string; readonly password: string }): Promise<MvpGreenCredentialHandoffReceipt> {
    if (!this.ready) throw new Error("MVP_GREEN_DPAPI_WRITE_OPT_IN_REQUIRED")
    const identity = this.identity(input)
    const targetChecksum = createMvpGreenCredentialIdentityChecksum(identity)
    const createdAt = this.input.now?.() ?? new Date().toISOString()
    await this.dpapiStore.put({ path: this.input.storePath, credentialId: identity.roleName, targetChecksum, ...identity, creationInvocationId: input.creationInvocationId, createdAt, secret: input.password, allowWrite: true })
    return Object.freeze({ status: "STORED" as const, handoffId: canonicalChecksum({ targetChecksum, creationInvocationId: input.creationInvocationId }), encryptedStorePathFingerprint: canonicalChecksum({ path: path.resolve(this.input.storePath) }), createdAt })
  }
  async inspect(input: { readonly projectId: string; readonly branchId: string; readonly databaseName: string; readonly roleName: string; readonly releaseChecksum: string }): Promise<"AVAILABLE" | "ABSENT" | "IDENTITY_MISMATCH"> {
    if (!this.ready) return "ABSENT"
    const identity = this.identity(input)
    const targetChecksum = createMvpGreenCredentialIdentityChecksum(identity)
    const envelope = await this.envelopes.readEnvelope(this.input.storePath)
    if (!envelope) return "ABSENT"
    try {
      verifyMvpGreenTargetBoundDpapiEnvelope(envelope, targetChecksum)
      return envelope.projectId === identity.projectId && envelope.branchId === identity.branchId && envelope.databaseName === identity.databaseName && envelope.roleName === identity.roleName && envelope.releaseChecksum === identity.releaseChecksum ? "AVAILABLE" : "IDENTITY_MISMATCH"
    } catch { return "IDENTITY_MISMATCH" }
  }
}

export interface MvpGreenGrantExecutorTarget {
  readonly projectId: string
  readonly branchId: string
  readonly databaseName: string
  readonly executorRole: typeof MVP_GREEN_MIGRATION_GRANT_EXECUTOR_ROLE
  readonly ownerRole: typeof MVP_GREEN_MIGRATION_OWNER_ROLE
}

export interface MvpGreenGrantExecutorTargetObservation {
  readonly projectId: string
  readonly branchId: string
  readonly databaseName: string
  readonly currentUser: string
  readonly currentRole: string
  readonly transactionReadOnly: "on" | "off"
}

export function assertMvpGreenGrantExecutorTarget(target: MvpGreenGrantExecutorTarget, observed: MvpGreenGrantExecutorTargetObservation): void {
  if (!target.projectId.trim() || !target.branchId.trim() || !POSTGRES_IDENTIFIER.test(target.databaseName) || target.executorRole !== MVP_GREEN_MIGRATION_GRANT_EXECUTOR_ROLE || target.ownerRole !== MVP_GREEN_MIGRATION_OWNER_ROLE) throw new Error("MVP_GREEN_GRANT_EXECUTOR_TARGET_INVALID")
  if (observed.projectId !== target.projectId || observed.branchId !== target.branchId || observed.databaseName !== target.databaseName || observed.currentUser !== target.executorRole || observed.currentRole !== target.executorRole || observed.transactionReadOnly !== "off") throw new Error("MVP_GREEN_GRANT_EXECUTOR_TARGET_MISMATCH")
}

export function createMvpGreenGrantExecutorTargetChecksum(target: MvpGreenGrantExecutorTarget): string {
  if (!POSTGRES_IDENTIFIER.test(target.databaseName) || target.executorRole !== MVP_GREEN_MIGRATION_GRANT_EXECUTOR_ROLE || target.ownerRole !== MVP_GREEN_MIGRATION_OWNER_ROLE) throw new Error("MVP_GREEN_GRANT_EXECUTOR_TARGET_INVALID")
  return canonicalChecksum({ schemaVersion: MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION, ...target })
}

export interface MvpGreenMigrationMembershipTopology {
  readonly schemaVersion: typeof MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION
  readonly memberRole: typeof MVP_GREEN_MIGRATION_LOGIN_ROLE
  readonly ownerRole: typeof MVP_GREEN_MIGRATION_OWNER_ROLE
  readonly topologyChecksum: string
}

export function createMvpGreenMigrationMembershipTopology(memberRole: typeof MVP_GREEN_MIGRATION_LOGIN_ROLE = MVP_GREEN_MIGRATION_LOGIN_ROLE): MvpGreenMigrationMembershipTopology {
  if (memberRole !== MVP_GREEN_MIGRATION_LOGIN_ROLE) throw new Error("MVP_GREEN_MIGRATION_LOGIN_ROLE_INVALID")
  const basis = { schemaVersion: MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION, memberRole, ownerRole: MVP_GREEN_MIGRATION_OWNER_ROLE }
  return Object.freeze({ ...basis, topologyChecksum: canonicalChecksum(basis) })
}

export function assertMvpGreenMigrationMembershipTopology(topology: MvpGreenMigrationMembershipTopology): void {
  if (topology.schemaVersion !== MVP_GREEN_MIGRATION_EXECUTION_SCHEMA_VERSION || topology.ownerRole !== MVP_GREEN_MIGRATION_OWNER_ROLE || topology.memberRole !== MVP_GREEN_MIGRATION_LOGIN_ROLE || canonicalChecksum({ schemaVersion: topology.schemaVersion, memberRole: topology.memberRole, ownerRole: topology.ownerRole }) !== topology.topologyChecksum) throw new Error("MVP_GREEN_MIGRATION_MEMBERSHIP_TOPOLOGY_INVALID")
}

function quoteIdentifier(identifier: string): string {
  if (!POSTGRES_IDENTIFIER.test(identifier)) throw new Error("MVP_GREEN_POSTGRES_IDENTIFIER_INVALID")
  return `"${identifier}"`
}

export function createMvpGreenMigrationMembershipGrantSql(topology: MvpGreenMigrationMembershipTopology): string {
  assertMvpGreenMigrationMembershipTopology(topology)
  return `ALTER ROLE ${quoteIdentifier(topology.memberRole)} NOINHERIT; GRANT ${quoteIdentifier(topology.ownerRole)} TO ${quoteIdentifier(topology.memberRole)} WITH INHERIT FALSE, SET TRUE, ADMIN FALSE`
}

export function createMvpGreenMigrationMembershipRevokeSql(topology: MvpGreenMigrationMembershipTopology): string {
  assertMvpGreenMigrationMembershipTopology(topology)
  return `REVOKE ${quoteIdentifier(topology.ownerRole)} FROM ${quoteIdentifier(topology.memberRole)}`
}

export interface MvpGreenMigrationMembershipState {
  readonly memberRole: string
  readonly ownerRole: string
  readonly member: boolean
  readonly adminOption: boolean
  readonly inheritOption: boolean
  readonly setRole: boolean
  readonly login: boolean
  readonly loginInherit: boolean
}

export function assertMvpGreenMigrationMembershipGranted(topology: MvpGreenMigrationMembershipTopology, state: MvpGreenMigrationMembershipState): void {
  assertMvpGreenMigrationMembershipTopology(topology)
  if (!state.member || state.memberRole !== topology.memberRole || state.ownerRole !== topology.ownerRole || state.adminOption || state.inheritOption || !state.setRole || !state.login || state.loginInherit) throw new Error("MVP_GREEN_MIGRATION_ROLE_MEMBERSHIP_REQUIRED")
}

export interface MvpGreenMigrationSql {
  unsafe<T extends Record<string, unknown> = Record<string, unknown>>(query: string, parameters?: readonly unknown[]): Promise<readonly T[]>
  transaction<T>(work: (sql: MvpGreenMigrationSql) => Promise<T>): Promise<T>
}

export class PostgresMvpGreenMigrationSql implements MvpGreenMigrationSql {
  constructor(readonly sql: postgres.Sql) {}
  unsafe<T extends Record<string, unknown> = Record<string, unknown>>(query: string, parameters?: readonly unknown[]): Promise<readonly T[]> {
    return this.sql.unsafe<T[]>(query, (parameters ?? []) as never[])
  }
  transaction<T>(work: (sql: MvpGreenMigrationSql) => Promise<T>): Promise<T> {
    return this.sql.begin("ISOLATION LEVEL SERIALIZABLE", (tx) => work(new PostgresMvpGreenMigrationSql(tx as unknown as postgres.Sql))) as Promise<T>
  }
  shutdown(): Promise<void> { return this.sql.end({ timeout: 5 }) }
}

function greenPostgresOptions(applicationName: string) {
  return {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 10,
    ssl: "require" as const,
    connection: {
      application_name: applicationName,
      statement_timeout: 30_000,
      lock_timeout: 5_000,
      idle_in_transaction_session_timeout: 30_000,
    },
  }
}

export function createMvpGreenGrantExecutorSql(connectionString: string, expectedDatabase: string): PostgresMvpGreenMigrationSql {
  const parsed = new URL(connectionString)
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""))
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol)
    || !parsed.hostname
    || database !== expectedDatabase
    || !POSTGRES_IDENTIFIER.test(expectedDatabase)
    || parsed.searchParams.get("sslmode") !== "require"
  ) throw new Error("MVP_GREEN_GRANT_EXECUTOR_CONNECTION_INVALID")
  return new PostgresMvpGreenMigrationSql(postgres(connectionString, greenPostgresOptions("mvp-green-grant-executor")))
}

export function createMvpGreenMigrationLoginSql(input: {
  readonly host: string
  readonly databaseName: string
  readonly roleName: typeof MVP_GREEN_MIGRATION_LOGIN_ROLE
  readonly password: string
}): PostgresMvpGreenMigrationSql {
  if (!/^[a-z0-9.-]+$/i.test(input.host) || input.host.includes("@") || !POSTGRES_IDENTIFIER.test(input.databaseName) || input.roleName !== MVP_GREEN_MIGRATION_LOGIN_ROLE || !input.password) {
    throw new Error("MVP_GREEN_MIGRATION_LOGIN_CONNECTION_INVALID")
  }
  return new PostgresMvpGreenMigrationSql(postgres({
    host: input.host,
    database: input.databaseName,
    username: input.roleName,
    password: input.password,
    ...greenPostgresOptions("mvp-green-migration-login"),
  }))
}

const MEMBERSHIP_INSPECTION_SQL = "SELECT member_role.rolname member_role,owner_role.rolname owner_role,member_role.rolcanlogin login,member_role.rolinherit login_inherit,(membership.roleid IS NOT NULL) member,COALESCE(membership.admin_option,false) admin_option,COALESCE(membership.inherit_option,false) inherit_option,COALESCE(membership.set_option,false) set_role FROM pg_roles member_role CROSS JOIN pg_roles owner_role LEFT JOIN pg_auth_members membership ON membership.member=member_role.oid AND membership.roleid=owner_role.oid WHERE member_role.rolname=$1 AND owner_role.rolname=$2"

export async function inspectMvpGreenMigrationMembership(sql: MvpGreenMigrationSql, topology: MvpGreenMigrationMembershipTopology): Promise<MvpGreenMigrationMembershipState> {
  assertMvpGreenMigrationMembershipTopology(topology)
  const rows = await sql.unsafe<{
    readonly member_role: string
    readonly owner_role: string
    readonly login: boolean
    readonly login_inherit: boolean
    readonly member: boolean
    readonly admin_option: boolean
    readonly inherit_option: boolean
    readonly set_role: boolean
  }>(MEMBERSHIP_INSPECTION_SQL, [topology.memberRole, topology.ownerRole])
  const row = rows[0]
  if (!row || row.member_role !== topology.memberRole || row.owner_role !== topology.ownerRole || !row.login) {
    throw new Error("MVP_GREEN_MIGRATION_MEMBERSHIP_IDENTITY_UNVERIFIED")
  }
  return Object.freeze({
    memberRole: row.member_role,
    ownerRole: row.owner_role,
    member: row.member,
    adminOption: row.admin_option,
    inheritOption: row.inherit_option,
    setRole: row.set_role,
    login: row.login,
    loginInherit: row.login_inherit,
  })
}

export interface MvpGreenMembershipMutationReceipt {
  readonly result: "APPLIED" | "RECONCILED"
  readonly mutationCalls: 0 | 1
  readonly automaticRetries: 0
  readonly membership: MvpGreenMigrationMembershipState
}

export async function grantMvpGreenMigrationMembership(sql: MvpGreenMigrationSql, topology: MvpGreenMigrationMembershipTopology): Promise<MvpGreenMembershipMutationReceipt> {
  const before = await inspectMvpGreenMigrationMembership(sql, topology)
  if (before.member) {
    assertMvpGreenMigrationMembershipGranted(topology, before)
    return Object.freeze({ result: "RECONCILED" as const, mutationCalls: 0 as const, automaticRetries: 0 as const, membership: before })
  }
  return sql.transaction(async (tx) => {
    await tx.unsafe(`ALTER ROLE ${quoteIdentifier(topology.memberRole)} NOINHERIT`)
    await tx.unsafe(`GRANT ${quoteIdentifier(topology.ownerRole)} TO ${quoteIdentifier(topology.memberRole)} WITH INHERIT FALSE, SET TRUE, ADMIN FALSE`)
    const after = await inspectMvpGreenMigrationMembership(tx, topology)
    assertMvpGreenMigrationMembershipGranted(topology, after)
    return Object.freeze({ result: "APPLIED" as const, mutationCalls: 1 as const, automaticRetries: 0 as const, membership: after })
  })
}

export async function revokeMvpGreenMigrationMembership(sql: MvpGreenMigrationSql, topology: MvpGreenMigrationMembershipTopology): Promise<MvpGreenMembershipMutationReceipt> {
  const before = await inspectMvpGreenMigrationMembership(sql, topology)
  if (!before.member) {
    return Object.freeze({ result: "RECONCILED" as const, mutationCalls: 0 as const, automaticRetries: 0 as const, membership: before })
  }
  return sql.transaction(async (tx) => {
    await tx.unsafe(`REVOKE ${quoteIdentifier(topology.ownerRole)} FROM ${quoteIdentifier(topology.memberRole)}`)
    const after = await inspectMvpGreenMigrationMembership(tx, topology)
    if (after.member) throw new Error("MVP_GREEN_MIGRATION_MEMBERSHIP_REVOKE_UNVERIFIED")
    return Object.freeze({ result: "APPLIED" as const, mutationCalls: 1 as const, automaticRetries: 0 as const, membership: after })
  })
}

export type MvpGreenMigrationResult = Readonly<{ status: "APPLIED" | "SKIPPED" | "FAILED"; migrationId: string; checksum: string; reason?: string }>

export interface MvpGreenSetRoleMigrationExecution {
  readonly target: MvpGreenGrantExecutorTarget
  readonly topology: MvpGreenMigrationMembershipTopology
  readonly observedTarget: MvpGreenGrantExecutorTargetObservation
  readonly membership: MvpGreenMigrationMembershipState
  readonly executionIdentity: Readonly<{ sessionUser: string; currentUser: string }>
  readonly plan: MvpGreenServingMigrationPlan
  readonly appliedBy: string
}

/** Executes only after exact target and membership evidence are supplied by the caller. */
export async function executeMvpGreenSetRoleServingMigrations(sql: MvpGreenMigrationSql, execution: MvpGreenSetRoleMigrationExecution): Promise<readonly MvpGreenMigrationResult[]> {
  assertMvpGreenGrantExecutorTarget(execution.target, execution.observedTarget)
  assertMvpGreenMigrationMembershipTopology(execution.topology)
  if (execution.target.executorRole !== MVP_GREEN_MIGRATION_GRANT_EXECUTOR_ROLE || execution.target.ownerRole !== execution.topology.ownerRole || !POSTGRES_IDENTIFIER.test(execution.appliedBy) || execution.executionIdentity.sessionUser !== execution.topology.memberRole || execution.executionIdentity.currentUser !== execution.topology.memberRole) throw new Error("MVP_GREEN_MIGRATION_EXECUTION_BINDING_INVALID")
  assertMvpGreenMigrationMembershipGranted(execution.topology, execution.membership)
  verifyMvpGreenServingMigrationPlan(execution.plan)
  return sql.transaction(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE ${quoteIdentifier(execution.topology.ownerRole)}`)
    const identity = await tx.unsafe<{ readonly session_user: string; readonly current_user: string; readonly database_name: string; readonly branch_id: string | null }>("SELECT session_user,current_user,current_database() database_name,current_setting('neon.branch_id',true) branch_id")
    if (identity[0]?.session_user !== execution.topology.memberRole || identity[0]?.current_user !== execution.topology.ownerRole || identity[0]?.database_name !== execution.target.databaseName || identity[0]?.branch_id !== execution.target.branchId) throw new Error("MVP_GREEN_SET_ROLE_VERIFICATION_FAILED")
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [execution.plan.planChecksum])
    await tx.unsafe("CREATE SCHEMA IF NOT EXISTS serving_control")
    await tx.unsafe("CREATE TABLE IF NOT EXISTS serving_control.migration_ledger (migration_id text PRIMARY KEY,migration_filename text NOT NULL UNIQUE,migration_checksum text NOT NULL CHECK (migration_checksum ~ '^[0-9a-f]{64}$'),applied_at timestamptz NOT NULL,applied_by text NOT NULL)")
    const ledger = await tx.unsafe<{ readonly migration_id: string; readonly migration_filename: string; readonly migration_checksum: string }>("SELECT migration_id,migration_filename,migration_checksum FROM serving_control.migration_ledger ORDER BY migration_id")
    if ((ledger.length !== 0 && ledger.length !== execution.plan.migrations.length) || ledger.some((row, index) => row.migration_id !== execution.plan.migrations[index]?.migrationId || row.migration_filename !== execution.plan.migrations[index]?.filename || row.migration_checksum !== execution.plan.migrations[index]?.checksum)) throw new Error("MVP_GREEN_SERVING_LEDGER_NOT_FRESH_OR_EXACT")
    const results: MvpGreenMigrationResult[] = []
    for (const artifact of execution.plan.migrations) {
      try {
        const rows = await tx.unsafe<{ readonly migration_checksum: string }>("SELECT migration_checksum FROM serving_control.migration_ledger WHERE migration_id=$1", [artifact.migrationId])
        if (rows[0]) {
          if (rows[0].migration_checksum !== artifact.checksum) throw new Error("MVP_GREEN_SERVING_LEDGER_CHECKSUM_MISMATCH")
          results.push(Object.freeze({ status: "SKIPPED", migrationId: artifact.migrationId, checksum: artifact.checksum }))
          continue
        }
        await tx.unsafe(artifact.sql)
        await tx.unsafe("INSERT INTO serving_control.migration_ledger VALUES($1,$2,$3,now(),$4)", [artifact.migrationId, artifact.filename, artifact.checksum, execution.appliedBy])
        results.push(Object.freeze({ status: "APPLIED", migrationId: artifact.migrationId, checksum: artifact.checksum }))
      } catch {
        throw new Error(`MVP_GREEN_SERVING_MIGRATION_FAILED:${artifact.migrationId}`)
      }
    }
    return Object.freeze(results)
  })
}

export const runMvpGreenSetRoleServingMigrations = executeMvpGreenSetRoleServingMigrations
