import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import postgres from "postgres"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { seedMvpEvidenceGovernance } from "@/lib/data-platform/consistency"
import {
  ConsistencyMigrationRunner,
  ConsistencyPostgresRuntime,
  D2DependencyBootstrapRunner,
  discoverCertifiedD2Dependencies,
  discoverD4Migrations,
  seedMvpProjectionDefinitions,
} from "@/lib/data-platform/consistency-evidence/postgres"
import { MVP_PROJECTION_DEFINITIONS } from "@/lib/data-platform/evidence-platform"
import {
  applyApprovedMigrations,
  createCanonicalPersistenceAdapter,
  createDurableCanonicalPostgresClientFromEnvironment,
  discoverApprovedMigrations,
  type IsolatedPostgresClient,
} from "@/lib/data-platform/persistence/postgres"
import type { RawObjectManifest } from "@/lib/data-platform/persistence"
import {
  applyD3Migrations,
  createDurableD3PostgresClientFromEnvironment,
  discoverD3Migrations,
} from "@/lib/data-platform/population/postgres"
import { D3_TO_D2_FOREIGN_KEY_DEPENDENCIES, INTEGRATED_BACKFILL_DATABASE } from "@/lib/data-platform/population/backfill"
import {
  MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM,
  MVP_GREEN_ACQUISITION_BUNDLE_PATHS,
  loadMvpGreenAcquisitionBundle,
  type LoadedMvpGreenAcquisitionBundle,
} from "@/lib/data-platform/mvp-release/greenAcquisition"
import {
  GreenCleanServingMigrationOwnerClient,
  MvpServingMigrationRunner,
  MvpServingPostgresClient,
  discoverMvpServingMigrations,
  stageInactiveServingCandidate,
} from "@/lib/data-platform/mvp-serving"
import { ensureIntegratedMvpGovernancePrerequisites, inspectIntegratedMvpGovernancePrerequisites, integratedMvpGovernanceDefinitions } from "./integratedGovernance"
import { MvpRefreshPostgresClient } from "./client"
import {
  greenCleanPrivilegeClosurePasses,
  inspectGreenCleanPrivilegeClosure,
  type GreenCleanPrivilegeQueryPort,
} from "./greenCleanPrivilegeClosure"
import { createGreenCleanPrivilegeMatrix } from "./greenCleanPrivilegeMatrix"
import { MvpRefreshMigrationRunner, discoverMvpRefreshMigrations } from "./migrationRunner"
import {
  GREEN_CLEAN_DATASETS,
  GREEN_CLEAN_INSTRUMENTS,
  GREEN_CLEAN_OFFICIAL_BASELINE_LOADER,
  GREEN_CLEAN_OFFICIAL_BASELINE_PUBLISHER,
  GREEN_CLEAN_TARGET_END,
  GREEN_CLEAN_TARGET_START,
  type GreenCleanBootstrapInspection,
  type GreenCleanBootstrapPorts,
  type GreenCleanComponent,
  type GreenCleanDurableOneDayCounts,
  type GreenCleanMigrationObservation,
  type GreenCleanOfficialBaseline,
  type GreenCleanOneDayExecution,
  type GreenCleanRetainedRawObject,
  type GreenCleanMutationOutcome,
} from "./greenCleanBootstrapPostgres"
import {
  GreenCleanPostgresDatabaseAdminPort,
  reconcileGreenCleanDatabaseSet,
} from "./greenCleanDatabaseLifecycle"
import {
  requireGreenCleanRebuildDatabaseSet,
  type GreenCleanRebuildDatabaseSet,
} from "./greenCleanRebuildSafety"
import {
  launchGreenCleanWindowsCommand,
  type GreenCleanOneDayReceiptContext,
  type GreenCleanWindowsCommandResult,
} from "./greenCleanOneDayReceipt"

export { createGreenCleanWindowsCommandLine, launchGreenCleanWindowsCommand } from "./greenCleanOneDayReceipt"

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"])
const CANDIDATE_ID = "mvp8i-candidate:fa295d3b749fd45d8c5172c5b5568463a4e645f9a0312d2d7945c4840753dc57"

interface RuntimeResources {
  readonly environment: NodeJS.ProcessEnv
  readonly ports: GreenCleanBootstrapPorts
  readonly redactedTargets: readonly string[]
  close(): Promise<void>
}

interface OpenClients {
  readonly d2: IsolatedPostgresClient
  readonly d3: ReturnType<typeof createDurableD3PostgresClientFromEnvironment>
  readonly d4: ConsistencyPostgresRuntime
  readonly refresh: MvpRefreshPostgresClient
  readonly serving: MvpServingPostgresClient
  readonly servingMigration: GreenCleanServingMigrationOwnerClient
}

function required(environment: Readonly<Record<string, string | undefined>>, key: string): string {
  const value = environment[key]?.trim()
  if (!value) throw new Error(`GREEN_CLEAN_REQUIRED_ENVIRONMENT_MISSING:${key}`)
  return value
}

function retarget(sourceValue: string, database: string, expectedRole: string): string {
  let source: URL
  try { source = new URL(sourceValue) } catch { throw new Error("GREEN_CLEAN_SOURCE_URL_INVALID") }
  if (
    !["postgres:", "postgresql:"].includes(source.protocol)
    || !LOOPBACK.has(source.hostname.toLowerCase())
    || !source.password
    || decodeURIComponent(source.username) !== expectedRole
  ) throw new Error("GREEN_CLEAN_SOURCE_BINDING_UNSAFE")
  source.pathname = `/${database}`
  return source.toString()
}

function targetUrl(sourceValue: string, database: string): string {
  const source = new URL(sourceValue)
  source.pathname = `/${database}`
  return source.toString()
}

async function applyCanonicalD2RoleBlueprint(sql: postgres.Sql): Promise<void> {
  const source = await readFile(path.join(process.cwd(), "lib/data-platform/persistence/postgres/roles.sql"), "utf8")
  const statements = source
    .split(";")
    .map((value) => value.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean)
  const createRoles = new Set([
    "CREATE ROLE qt_d2_canonical_writer NOLOGIN",
    "CREATE ROLE qt_d2_bounded_writer NOLOGIN",
    "CREATE ROLE qt_d2_read_only NOLOGIN",
  ])
  const observedCreates = statements.filter((value) => /^CREATE ROLE /i.test(value))
  if (observedCreates.length !== createRoles.size || observedCreates.some((value) => !createRoles.has(value))) {
    throw new Error("GREEN_CLEAN_D2_ROLE_BLUEPRINT_UNEXPECTED")
  }
  await sql.begin(async (tx) => {
    for (const statement of statements) {
      if (!createRoles.has(statement)) await tx.unsafe(statement)
    }
  })
}

function redacted(value: string, binding: string): string {
  const url = new URL(value)
  return `${binding}=${url.hostname}:${url.port || "5432"}/${decodeURIComponent(url.pathname.replace(/^\//, ""))}`
}

export function createGreenCleanRuntimeEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): { readonly environment: NodeJS.ProcessEnv; readonly databaseSet: GreenCleanRebuildDatabaseSet; readonly redactedTargets: readonly string[] } {
  const databaseSet = requireGreenCleanRebuildDatabaseSet(source)
  if (!databaseSet) throw new Error("MVP_GREEN_CLEAN_REBUILD_MODE_REQUIRED")
  const environment: NodeJS.ProcessEnv = {
    ...source,
    D2_CANONICAL_POSTGRES_URL: retarget(required(source, "D2_CANONICAL_POSTGRES_URL"), databaseSet.backfillDatabase, databaseSet.d2Role),
    D3_POPULATION_POSTGRES_URL: retarget(required(source, "D3_POPULATION_POSTGRES_URL"), databaseSet.backfillDatabase, databaseSet.d3Role),
    D4_ISOLATED_POSTGRES_URL: retarget(required(source, "D4_ISOLATED_POSTGRES_URL"), databaseSet.d4Database, databaseSet.d4OwnerRole),
    D4_EXPECTED_DATABASE_NAME: databaseSet.d4Database,
    MVP_REFRESH_ISOLATED_POSTGRES_URL: retarget(required(source, "MVP_REFRESH_ISOLATED_POSTGRES_URL"), databaseSet.refreshDatabase, databaseSet.refreshRole),
    MVP_SERVING_ISOLATED_POSTGRES_URL: retarget(required(source, "MVP_SERVING_ISOLATED_POSTGRES_URL"), databaseSet.servingDatabase, databaseSet.servingPublisherRole),
  }
  return Object.freeze({
    environment,
    databaseSet,
    redactedTargets: Object.freeze([
      redacted(environment.D2_CANONICAL_POSTGRES_URL!, "D2_D3_INTEGRATED"),
      redacted(environment.D4_ISOLATED_POSTGRES_URL!, "D4_ISOLATED"),
      redacted(environment.MVP_REFRESH_ISOLATED_POSTGRES_URL!, "MVP_REFRESH_ISOLATED"),
      redacted(environment.MVP_SERVING_ISOLATED_POSTGRES_URL!, "MVP_SERVING_ISOLATED"),
    ]),
  })
}

function d4Runtime(environment: NodeJS.ProcessEnv, intent: ConstructorParameters<typeof ConsistencyPostgresRuntime>[0]["roleIntent"], name: string): ConsistencyPostgresRuntime {
  return new ConsistencyPostgresRuntime({
    connectionString: required(environment, "D4_ISOLATED_POSTGRES_URL"),
    roleIntent: intent,
    maxConnections: 1,
    connectTimeoutSeconds: 10,
    idleTimeoutSeconds: 30,
    applicationName: name,
    environment,
  })
}

async function openClients(environment: NodeJS.ProcessEnv): Promise<OpenClients> {
  const d2 = createDurableCanonicalPostgresClientFromEnvironment({
    roleIntent: "MIGRATION_OWNER",
    maxConnections: 1,
    connectTimeoutSeconds: 10,
    idleTimeoutSeconds: 30,
    applicationName: "mvp-green-clean-d2",
    targetPurpose: "INTEGRATED_BACKFILL",
  }, environment)
  const d3 = createDurableD3PostgresClientFromEnvironment({
    roleIntent: "MIGRATION_OWNER",
    maxConnections: 1,
    applicationName: "mvp-green-clean-d3",
    targetPurpose: "INTEGRATED_BACKFILL",
  }, environment)
  const d4 = d4Runtime(environment, "MIGRATION_OWNER", "mvp-green-clean-d4")
  const refresh = new MvpRefreshPostgresClient(required(environment, "MVP_REFRESH_ISOLATED_POSTGRES_URL"), environment)
  const serving = new MvpServingPostgresClient(required(environment, "MVP_SERVING_ISOLATED_POSTGRES_URL"), "PUBLISHER", environment, "LOCAL_ISOLATED")
  const databaseSet = requireGreenCleanRebuildDatabaseSet(environment)
  if (!databaseSet) throw new Error("MVP_GREEN_CLEAN_REBUILD_MODE_REQUIRED")
  const servingMigration = new GreenCleanServingMigrationOwnerClient(
    targetUrl(required(environment, "D4_ISOLATED_POSTGRES_URL"), databaseSet.servingDatabase),
    databaseSet.servingDatabase,
    databaseSet.d4OwnerRole,
  )
  try {
    await Promise.all([d4.connect(), refresh.verify(), serving.verify(), servingMigration.verify()])
    return Object.freeze({ d2, d3, d4, refresh, serving, servingMigration })
  } catch (error) {
    await Promise.allSettled([d2.shutdown(), d3.shutdown(), d4.shutdown(), refresh.shutdown(), serving.shutdown(), servingMigration.shutdown()])
    throw error
  }
}

async function closeClients(clients: OpenClients | null): Promise<void> {
  if (!clients) return
  await Promise.allSettled([clients.d2.shutdown(), clients.d3.shutdown(), clients.d4.shutdown(), clients.refresh.shutdown(), clients.serving.shutdown(), clients.servingMigration.shutdown()])
}

async function rowsFromSource(
  sourceUrl: string,
  scope: { readonly start: string; readonly end: string },
): Promise<readonly GreenCleanRetainedRawObject[]> {
  const sql = postgres(sourceUrl, {
    max: 1,
    prepare: false,
    connection: { application_name: "mvp-green-clean-retained-source", default_transaction_read_only: true },
  })
  try {
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT object_id,dataset_id,provider_id,venue,symbol_or_subject,window_start,window_end,
        content_hash,size_bytes,media_type,compression,retrieved_at,provider_snapshot_id,
        retention_class,verification_state,object_storage_key,created_at
       FROM raw.objects
       WHERE window_start=$1 AND window_end=$2
         AND dataset_id=ANY($3::text[]) AND symbol_or_subject=ANY($4::text[])
         AND verification_state='VERIFIED'
       ORDER BY dataset_id,symbol_or_subject,object_id`,
      [scope.start, scope.end, [...GREEN_CLEAN_DATASETS], [...GREEN_CLEAN_INSTRUMENTS]],
    )
    return Object.freeze(rows.map((row) => {
      const manifest: RawObjectManifest = Object.freeze({
        objectId: String(row.object_id),
        datasetId: String(row.dataset_id),
        providerId: String(row.provider_id),
        venue: String(row.venue),
        symbolOrSubject: String(row.symbol_or_subject),
        windowStart: new Date(String(row.window_start)).toISOString(),
        windowEnd: new Date(String(row.window_end)).toISOString(),
        contentHash: String(row.content_hash),
        sizeBytes: Number(row.size_bytes),
        mediaType: String(row.media_type),
        compression: String(row.compression) as RawObjectManifest["compression"],
        retrievedAt: new Date(String(row.retrieved_at)).toISOString(),
        providerSnapshotId: String(row.provider_snapshot_id),
        retentionClass: String(row.retention_class) as RawObjectManifest["retentionClass"],
        verificationState: String(row.verification_state) as RawObjectManifest["verificationState"],
        objectStorageKey: String(row.object_storage_key),
        createdAt: new Date(String(row.created_at)).toISOString(),
      })
      return Object.freeze({
        slot: Object.freeze({
          dataset: manifest.datasetId as GreenCleanRetainedRawObject["slot"]["dataset"],
          instrument: manifest.symbolOrSubject as GreenCleanRetainedRawObject["slot"]["instrument"],
          intervalStart: GREEN_CLEAN_TARGET_START,
          intervalEnd: GREEN_CLEAN_TARGET_END,
        }),
        manifest,
      })
    }))
  } finally {
    await sql.end({ timeout: 5 })
  }
}

export function resolveGreenCleanRetainedRawSourceUrl(sourceUrl: string, databaseSet: GreenCleanRebuildDatabaseSet): string {
  let source: URL
  try { source = new URL(sourceUrl) } catch { throw new Error("GREEN_CLEAN_RETAINED_SOURCE_URL_INVALID") }
  const database = decodeURIComponent(source.pathname.replace(/^\/+/, ""))
  const role = decodeURIComponent(source.username)
  if (!['postgres:', 'postgresql:'].includes(source.protocol)
    || !["127.0.0.1", "localhost", "::1"].includes(source.hostname.toLowerCase())
    || (source.port || "5432") !== "55432"
    || role !== databaseSet.d2Role
    || !source.password
    || ![databaseSet.backfillDatabase, INTEGRATED_BACKFILL_DATABASE].includes(database)) {
    throw new Error("GREEN_CLEAN_RETAINED_SOURCE_TARGET_UNSAFE")
  }
  source.pathname = `/${INTEGRATED_BACKFILL_DATABASE}`
  return source.toString()
}

function safeObjectPath(root: string, key: string): string {
  const base = path.resolve(root)
  const target = path.resolve(base, ...key.split("/"))
  const relative = path.relative(base, target)
  if (!key || key.includes("\\") || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("GREEN_CLEAN_RETAINED_RAW_PATH_UNSAFE")
  }
  return target
}

async function verifyFile(root: string, value: GreenCleanRetainedRawObject): Promise<{ readonly checksum: string; readonly sizeBytes: number }> {
  const bytes = await readFile(safeObjectPath(root, value.manifest.objectStorageKey))
  return Object.freeze({ checksum: createHash("sha256").update(bytes).digest("hex"), sizeBytes: bytes.byteLength })
}

async function loadBaselineBundle(environment: NodeJS.ProcessEnv): Promise<LoadedMvpGreenAcquisitionBundle> {
  const explicit = environment.MVP_GREEN_CLEAN_BASELINE_BUNDLE_DIRECTORY?.trim()
  const local = required(environment, "LOCALAPPDATA")
  const directory = explicit || path.join(local, "QuantTerminal", "GreenAcquisition", CANDIDATE_ID.replace(":", "-"))
  const entries = await readdir(directory, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort()
  if (files.join("|") !== [...MVP_GREEN_ACQUISITION_BUNDLE_PATHS].sort().join("|")) throw new Error("GREEN_CLEAN_BASELINE_FILE_SET_INVALID")
  const payloads = await Promise.all(MVP_GREEN_ACQUISITION_BUNDLE_PATHS.map(async (name) => Object.freeze({ path: name, content: await readFile(path.join(directory, name)) })))
  const bundle = loadMvpGreenAcquisitionBundle(payloads)
  if (bundle.aggregateChecksum !== MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM || bundle.candidate.candidateId !== CANDIDATE_ID) throw new Error("GREEN_CLEAN_BASELINE_BUNDLE_INVALID")
  return bundle
}

function baselineMetadata(bundle: LoadedMvpGreenAcquisitionBundle): GreenCleanOfficialBaseline {
  return Object.freeze({
    loader: GREEN_CLEAN_OFFICIAL_BASELINE_LOADER,
    publisher: GREEN_CLEAN_OFFICIAL_BASELINE_PUBLISHER,
    bundleId: bundle.candidate.manifestId,
    bundleChecksum: MVP_GREEN_ACQUISITION_BUNDLE_CHECKSUM,
    candidateId: bundle.candidate.candidateId,
    candidateChecksum: bundle.candidate.servingChecksum,
    governedThrough: GREEN_CLEAN_TARGET_START,
    dependencyIds: Object.freeze(bundle.candidate.members.map((member) => member.memberId)),
  })
}

async function runChild(environment: NodeJS.ProcessEnv, receiptContext?: GreenCleanOneDayReceiptContext): Promise<Record<string, unknown>> {
  const args = [
    "--import",
    "tsx",
    "workers/data-platform/runMvpRefresh.ts",
    "catch-up-current-candidate",
    `--start=${GREEN_CLEAN_TARGET_START}`,
    `--through=${GREEN_CLEAN_TARGET_END}`,
    "--execution-mode=live",
    "--confirm-local-inactive-candidate=true",
    "--max-concurrency=2",
  ]
  let result: GreenCleanWindowsCommandResult
  try {
    result = await launchGreenCleanWindowsCommand({ command: process.execPath, args, cwd: process.cwd(), environment, receiptContext })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code ?? "UNKNOWN"
    throw new Error(`GREEN_CLEAN_ONE_DAY_PROCESS_START_FAILED:${code}`)
  }
  if (result.exitCode !== 0) {
    throw new Error(`GREEN_CLEAN_ONE_DAY_PROCESS_FAILED:${result.exitCode ?? "UNKNOWN"}`)
  }
  if (receiptContext && !receiptContext.receiptPersisted) throw new Error("GREEN_CLEAN_ONE_DAY_RECEIPT_WRITE_FAILED")
  try {
    return JSON.parse(result.stdout.trim()) as Record<string, unknown>
  } catch {
    throw new Error("GREEN_CLEAN_ONE_DAY_PROCESS_OUTPUT_INVALID")
  }
}

async function durableCounts(environment: NodeJS.ProcessEnv, executionId: string): Promise<GreenCleanDurableOneDayCounts> {
  const backfill = postgres(required(environment, "D2_CANONICAL_POSTGRES_URL"), { max: 1, prepare: false, connection: { default_transaction_read_only: true } })
  const population = postgres(required(environment, "D3_POPULATION_POSTGRES_URL"), { max: 1, prepare: false, connection: { default_transaction_read_only: true } })
  const refresh = postgres(required(environment, "MVP_REFRESH_ISOLATED_POSTGRES_URL"), { max: 1, prepare: false, connection: { default_transaction_read_only: true } })
  const serving = postgres(required(environment, "MVP_SERVING_ISOLATED_POSTGRES_URL"), { max: 1, prepare: false, connection: { default_transaction_read_only: true } })
  try {
    const [coreRows, populationRows, refreshRows, servingRows] = await Promise.all([
      backfill.unsafe<Array<{ raw_objects: number; commits: number }>>(
        `SELECT
          (SELECT count(*)::int FROM raw.objects WHERE window_start=$1 AND window_end=$2) raw_objects,
          (SELECT count(*)::int FROM control.canonical_commits c WHERE c.committed_at >= $1 AND c.committed_at IS NOT NULL) commits`,
        [GREEN_CLEAN_TARGET_START, GREEN_CLEAN_TARGET_END],
      ),
      population.unsafe<Array<{ population_runs: number; population_units: number }>>(
        `SELECT
          (SELECT count(*)::int FROM control.population_runs) population_runs,
          (SELECT count(*)::int FROM control.population_units WHERE window_start=$1 AND window_end=$2) population_units`,
        [GREEN_CLEAN_TARGET_START, GREEN_CLEAN_TARGET_END],
      ),
      refresh.unsafe<Array<{ runs: number; units: number; completed: number; watermarks: number }>>(
        `SELECT
          (SELECT count(*)::int FROM refresh_control.refresh_run) runs,
          (SELECT count(*)::int FROM refresh_control.refresh_unit) units,
          (SELECT count(*)::int FROM refresh_control.refresh_unit WHERE state='COMPLETE') completed,
          (SELECT count(*)::int FROM refresh_control.refresh_event WHERE entity_kind='live_resume_coordinator' AND event_kind='STAGE_COMMON_WATERMARK_VALIDATED') watermarks`,
      ),
      serving.unsafe<Array<{ candidates: number; governed_through: Date | null; exposed: boolean }>>(
        `SELECT
          count(*) FILTER (WHERE c.governed_through=$1 AND c.lifecycle='WITHHELD')::int candidates,
          max(c.governed_through) FILTER (WHERE c.governed_through=$1) governed_through,
          EXISTS(SELECT 1 FROM serving.serving_exposure e JOIN serving.serving_corpus c2 ON c2.corpus_id=e.corpus_id WHERE c2.governed_through=$1) exposed
         FROM serving.serving_corpus c`,
        [GREEN_CLEAN_TARGET_END],
      ),
    ])
    const core = coreRows[0]!, populationControl = populationRows[0]!, control = refreshRows[0]!, candidate = servingRows[0]!
    return Object.freeze({
      executionId,
      refreshRuns: control.runs,
      refreshUnits: control.units,
      completedRefreshUnits: control.completed,
      populationRuns: populationControl.population_runs,
      populationUnits: populationControl.population_units,
      rawObjects: core.raw_objects,
      canonicalCommits: core.commits,
      commonWatermarks: control.watermarks,
      servingCandidates: candidate.candidates,
      candidateGovernedThrough: candidate.governed_through?.toISOString() ?? null,
      candidateExposed: candidate.exposed,
    })
  } finally {
    await Promise.allSettled([backfill.end({ timeout: 5 }), population.end({ timeout: 5 }), refresh.end({ timeout: 5 }), serving.end({ timeout: 5 })])
  }
}

function normalizeMigration(component: GreenCleanComponent, values: readonly { readonly status: "APPLIED" | "SKIPPED" | "FAILED"; readonly migrationId?: string; readonly sequence?: string; readonly checksum: string; readonly reason?: string }[]) {
  return Object.freeze(values.map((value) => Object.freeze({
    status: value.status,
    migrationId: value.migrationId ?? value.sequence ?? "UNKNOWN",
    checksum: value.checksum,
    ...(value.reason ? { reason: value.reason } : {}),
  })))
}

export async function createGreenCleanBootstrapRuntime(
  sourceEnvironment: NodeJS.ProcessEnv = process.env,
  oneDayReceiptContext?: GreenCleanOneDayReceiptContext,
): Promise<RuntimeResources> {
  const configuredD2Url = required(sourceEnvironment, "D2_CANONICAL_POSTGRES_URL")
  const sourceD4Url = required(sourceEnvironment, "D4_ISOLATED_POSTGRES_URL")
  const objectRoot = required(sourceEnvironment, "D3_BACKFILL_OBJECT_ROOT")
  const { environment, databaseSet, redactedTargets } = createGreenCleanRuntimeEnvironment(sourceEnvironment)
  const sourceD2Url = resolveGreenCleanRetainedRawSourceUrl(configuredD2Url, databaseSet)
  const lifecycle = new GreenCleanPostgresDatabaseAdminPort(sourceD4Url, "D4_ISOLATED_POSTGRES_URL", databaseSet, async ({ specification, readOnlyQuery }) => {
    const markers: Readonly<Record<string, string>> = Object.freeze({
      BACKFILL: "SELECT (SELECT count(*) FROM control.migration_ledger)=8 AND (SELECT count(*) FROM control.population_migration_ledger)=5 exact",
      D4: "SELECT (SELECT count(*) FROM d4_control.dependency_bootstrap_ledger)=8 AND (SELECT count(*) FROM d4_control.migration_ledger)=14 exact",
      REFRESH: "SELECT (SELECT count(*) FROM refresh_control.migration_ledger)=2 exact",
      SERVING: "SELECT (SELECT count(*) FROM serving_control.migration_ledger)=5 exact",
    })
    const rows = await readOnlyQuery<Array<{ exact: boolean }>>(markers[specification.database]!)
    return rows[0]?.exact ? "RECONCILED" : "CONFLICT"
  })
  const adminUrl = new URL(sourceD4Url)
  adminUrl.pathname = "/postgres"
  const admin = postgres(adminUrl.toString(), { max: 1, prepare: false, connection: { application_name: "mvp-green-clean-bootstrap-admin" } })
  let clients: OpenClients | null = null
  let sourceRows: readonly GreenCleanRetainedRawObject[] | null = null
  let baseline: LoadedMvpGreenAcquisitionBundle | null = null
  let lastExecutionId: string | null = null

  const ensureClients = async (): Promise<OpenClients> => {
    clients ??= await openClients(environment)
    return clients
  }

  const targetAdmin = async (database: string, work: (sql: postgres.Sql) => Promise<void>): Promise<void> => {
    const sql = postgres(targetUrl(adminUrl.toString(), database), { max: 1, prepare: false, connection: { application_name: "mvp-green-clean-target-admin" } })
    try { await work(sql) } finally { await sql.end({ timeout: 5 }) }
  }

  const inspectPrivilegeClosure = async () => {
    const databases = [
      databaseSet.backfillDatabase,
      databaseSet.d4Database,
      databaseSet.refreshDatabase,
      databaseSet.servingDatabase,
    ] as const
    const sqlByDatabase = Object.fromEntries(databases.map((database) => [
      database,
      postgres(targetUrl(adminUrl.toString(), database), {
        max: 1,
        prepare: false,
        connection: { application_name: "mvp-green-clean-privilege-closure" },
      }),
    ])) as Record<string, postgres.Sql>
    const ports = Object.fromEntries(databases.map((database) => {
      const sql = sqlByDatabase[database]!
      const port: GreenCleanPrivilegeQueryPort = {
        query: <T extends Record<string, unknown>>(statement: string, parameters: readonly unknown[] = []) =>
          sql.unsafe<T[]>(statement, [...parameters] as never[]),
      }
      return [database, port]
    })) as Record<string, GreenCleanPrivilegeQueryPort>
    try {
      return await inspectGreenCleanPrivilegeClosure(
        createGreenCleanPrivilegeMatrix(databaseSet),
        ports,
        { roleCatalogDatabase: databaseSet.backfillDatabase },
      )
    } finally {
      await Promise.all(Object.values(sqlByDatabase).map((sql) => sql.end({ timeout: 5 }).catch(() => undefined)))
    }
  }

  const ports: GreenCleanBootstrapPorts = {
    async reconcileDatabaseSet() {
      const result = await reconcileGreenCleanDatabaseSet(lifecycle, databaseSet)
      return Object.freeze(Object.fromEntries(result.identities.map((identity) => [
        identity.databaseName,
        result.outcomes[identity.database] === "CREATED" ? "CREATED" : "DUPLICATE",
      ])) as Readonly<Record<string, GreenCleanMutationOutcome>>)
    },
    async reconcileDatabaseAccess() {
      const access = Object.freeze([
        { database: databaseSet.backfillDatabase, roles: [databaseSet.d2Role, databaseSet.d3Role] },
        { database: databaseSet.d4Database, roles: [databaseSet.d4OwnerRole] },
        { database: databaseSet.refreshDatabase, roles: [databaseSet.refreshRole] },
        { database: databaseSet.servingDatabase, roles: [databaseSet.d4OwnerRole, databaseSet.servingPublisherRole, databaseSet.servingReaderRole] },
      ] as const)
      let changed = false
      for (const item of access) {
        const rows = await admin.unsafe<Array<{ public_connect: boolean; approved_connect: boolean }>>(
          `SELECT
             EXISTS(
               SELECT 1
               FROM pg_database target,
               LATERAL aclexplode(COALESCE(target.datacl,acldefault('d',target.datdba))) acl
               WHERE target.datname=$1 AND acl.grantee=0 AND acl.privilege_type='CONNECT'
             ) public_connect,
             bool_and(has_database_privilege(role_name,$1,'CONNECT')) approved_connect
           FROM unnest($2::text[]) role_name`,
          [item.database, [...item.roles]],
        )
        if (rows[0]?.public_connect || rows[0]?.approved_connect !== true) changed = true
        await admin.begin(async (sql) => {
          await sql.unsafe(`REVOKE CONNECT ON DATABASE "${item.database}" FROM PUBLIC`)
          await sql.unsafe(`GRANT CONNECT ON DATABASE "${item.database}" TO ${item.roles.map((role) => `"${role}"`).join(",")}`)
        })
      }
      return changed ? "CREATED" : "DUPLICATE"
    },
    async reconcileCanonicalGlobalRoles(roles) {
      const rows = await admin.unsafe<Array<{ rolname: string; rolcanlogin: boolean; rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean; rolreplication: boolean; rolbypassrls: boolean }>>(
        "SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[])",
        [[...roles]],
      )
      const existing = new Set(rows.map((row) => row.rolname))
      const creatable = new Set([
        databaseSet.servingMigrationOwnerRole,
        "qt_d2_canonical_writer", "qt_d2_bounded_writer", "qt_d2_read_only",
        "qt_d3_scheduler", "qt_d3_coordinator", "qt_d3_worker", "qt_d3_read_only",
        "qt_d4_consistency_worker", "qt_d4_evidence_assembler", "qt_d4_projection_builder",
        "qt_d4_projection_publisher", "qt_d4_read_only",
      ])
      const missing = roles.filter((role) => !existing.has(role))
      if (missing.some((role) => !creatable.has(role))) return "CONFLICT"
      const owner = rows.find((row) => row.rolname === databaseSet.servingMigrationOwnerRole)
      if (owner && (owner.rolcanlogin || owner.rolsuper || owner.rolcreatedb || owner.rolcreaterole || owner.rolreplication || owner.rolbypassrls)) return "CONFLICT"
      const requiredMemberships = Object.freeze([
        { role: databaseSet.servingMigrationOwnerRole, member: databaseSet.d4OwnerRole, admin: true },
        { role: "qt_d2_canonical_writer", member: databaseSet.d2Role, admin: false },
        { role: "qt_d2_bounded_writer", member: databaseSet.d2Role, admin: false },
        { role: "qt_d2_read_only", member: databaseSet.d2Role, admin: false },
        { role: "qt_d3_scheduler", member: databaseSet.d3Role, admin: false },
        { role: "qt_d3_coordinator", member: databaseSet.d3Role, admin: false },
        { role: "qt_d3_worker", member: databaseSet.d3Role, admin: false },
        { role: "qt_d3_read_only", member: databaseSet.d3Role, admin: false },
        { role: databaseSet.d4ConsistencyRole, member: databaseSet.d4OwnerRole, admin: false },
        { role: databaseSet.d4EvidenceRole, member: databaseSet.d4OwnerRole, admin: false },
        { role: databaseSet.d4ProjectionRole, member: databaseSet.d4OwnerRole, admin: false },
        { role: "qt_d4_projection_publisher", member: databaseSet.d4OwnerRole, admin: false },
        { role: databaseSet.d4ReadOnlyRole, member: databaseSet.d4OwnerRole, admin: false },
      ] as const)
      const membershipBefore = await admin.unsafe<Array<{ role_name: string; member_name: string; admin_option: boolean; inherit_option: boolean; set_option: boolean }>>(
        `SELECT owner_role.rolname role_name,member_role.rolname member_name,
           m.admin_option,m.inherit_option,m.set_option
         FROM pg_auth_members m
         JOIN pg_roles owner_role ON owner_role.oid=m.roleid
         JOIN pg_roles member_role ON member_role.oid=m.member
         WHERE owner_role.rolname=ANY($1::text[]) AND member_role.rolname=ANY($2::text[])`,
        [[...new Set(requiredMemberships.map((item) => item.role))], [...new Set(requiredMemberships.map((item) => item.member))]],
      )
      for (const role of missing) {
        await admin.unsafe(`CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`)
      }
      for (const membership of requiredMemberships) {
        await admin.unsafe(
          `GRANT "${membership.role}" TO "${membership.member}" WITH ADMIN ${membership.admin ? "TRUE" : "FALSE"}, INHERIT FALSE, SET TRUE`,
        )
      }
      const membershipsExact = requiredMemberships.every((expected) => membershipBefore.some((row) =>
        row.role_name === expected.role
        && row.member_name === expected.member
        && row.admin_option === expected.admin
        && row.inherit_option === false
        && row.set_option === true
      ))
      return missing.length || !membershipsExact ? "CREATED" : "DUPLICATE"
    },
    async inspectCanonicalGlobalRoles(roles) {
      const rows = await admin.unsafe<Array<{ rolname: string; rolcanlogin: boolean; rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean; rolreplication: boolean; rolbypassrls: boolean }>>(
        "SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname",
        [[...roles]],
      )
      const found = new Set(rows.map((row) => row.rolname))
      const runtimeRoles = new Set(roles.filter((role) => ![
        databaseSet.d2Role, databaseSet.d3Role, databaseSet.d4OwnerRole,
        databaseSet.refreshRole, databaseSet.servingMigrationOwnerRole,
        databaseSet.servingPublisherRole, databaseSet.servingReaderRole,
      ].includes(role)))
      const conflicts = roles.filter((role) => !found.has(role))
      conflicts.push(...rows.filter((row) =>
        (
          row.rolname !== databaseSet.d4OwnerRole
          && (row.rolsuper || row.rolcreatedb || row.rolcreaterole || row.rolreplication || row.rolbypassrls)
        )
        || (runtimeRoles.has(row.rolname) && row.rolcanlogin)
      ).map((row) => row.rolname))
      const requiredMemberships = Object.freeze([
        { role: databaseSet.servingMigrationOwnerRole, member: databaseSet.d4OwnerRole, admin: true },
        { role: "qt_d2_canonical_writer", member: databaseSet.d2Role, admin: false },
        { role: "qt_d2_bounded_writer", member: databaseSet.d2Role, admin: false },
        { role: "qt_d2_read_only", member: databaseSet.d2Role, admin: false },
        { role: "qt_d3_scheduler", member: databaseSet.d3Role, admin: false },
        { role: "qt_d3_coordinator", member: databaseSet.d3Role, admin: false },
        { role: "qt_d3_worker", member: databaseSet.d3Role, admin: false },
        { role: "qt_d3_read_only", member: databaseSet.d3Role, admin: false },
        { role: databaseSet.d4ConsistencyRole, member: databaseSet.d4OwnerRole, admin: false },
        { role: databaseSet.d4EvidenceRole, member: databaseSet.d4OwnerRole, admin: false },
        { role: databaseSet.d4ProjectionRole, member: databaseSet.d4OwnerRole, admin: false },
        { role: "qt_d4_projection_publisher", member: databaseSet.d4OwnerRole, admin: false },
        { role: databaseSet.d4ReadOnlyRole, member: databaseSet.d4OwnerRole, admin: false },
      ] as const)
      const memberships = await admin.unsafe<Array<{ role_name: string; member_name: string; admin_option: boolean; inherit_option: boolean; set_option: boolean }>>(
        `SELECT owner_role.rolname role_name,member_role.rolname member_name,
           m.admin_option,m.inherit_option,m.set_option
         FROM pg_auth_members m
         JOIN pg_roles owner_role ON owner_role.oid=m.roleid
         JOIN pg_roles member_role ON member_role.oid=m.member
         WHERE owner_role.rolname=ANY($1::text[]) AND member_role.rolname=ANY($2::text[])`,
        [[...new Set(requiredMemberships.map((item) => item.role))], [...new Set(requiredMemberships.map((item) => item.member))]],
      )
      for (const expected of requiredMemberships) {
        const row = memberships.find((item) => item.role_name === expected.role && item.member_name === expected.member)
        if (
          !row
          || row.admin_option !== expected.admin
          || row.inherit_option !== false
          || row.set_option !== true
        ) conflicts.push(`ROLE_MEMBERSHIP:${expected.role}->${expected.member}`)
      }
      return Object.freeze({ exact: Object.freeze(rows.map((row) => row.rolname)), conflicts: Object.freeze(conflicts) })
    },
    async reconcileDatabaseGrants() {
      let grantsAlreadyExact = false
      let d3MigrationsComplete = false
      await targetAdmin(databaseSet.backfillDatabase, async (sql) => {
        const before = await sql.unsafe<Array<{ exact: boolean; d3_ledger_exists: boolean }>>(
          `SELECT
            has_schema_privilege('qt_d2_canonical_writer','canonical','USAGE')
            AND has_table_privilege('qt_d2_canonical_writer','repository.record_versions','INSERT')
            AND has_table_privilege('qt_d2_read_only','control.canonical_commits','SELECT') exact,
            to_regclass('control.population_migration_ledger') IS NOT NULL d3_ledger_exists`,
        )
        grantsAlreadyExact = before[0]?.exact === true
        if (before[0]?.d3_ledger_exists === true) {
          const d3Rows = await sql.unsafe<Array<{ complete: boolean }>>("SELECT count(*)=5 complete FROM control.population_migration_ledger")
          d3MigrationsComplete = d3Rows[0]?.complete === true
        }
        await applyCanonicalD2RoleBlueprint(sql)
        if (!d3MigrationsComplete) {
          await sql.begin(async (tx) => {
            await tx.unsafe(`GRANT CONNECT,CREATE ON DATABASE "${databaseSet.backfillDatabase}" TO "${databaseSet.d3Role}"`)
            await tx.unsafe(`GRANT USAGE,CREATE ON SCHEMA control,raw,canonical,repository,quality,coverage,projection,evidence,consistency,quarantine TO "${databaseSet.d3Role}"`)
            await tx.unsafe(`GRANT REFERENCES ON ALL TABLES IN SCHEMA control,raw,canonical,repository,quarantine TO "${databaseSet.d3Role}"`)
          })
        }
      })
      return grantsAlreadyExact && d3MigrationsComplete ? "DUPLICATE" : "CREATED"
    },
    async applyMigrations(component) {
      const value = await ensureClients()
      if (component === "D2") return normalizeMigration(component, await applyApprovedMigrations(value.d2, "mvp-green-clean-bootstrap"))
      if (component === "D3") {
        const ledgerRows = await value.d3.sql.unsafe<Array<{ exists: boolean }>>(
          "SELECT to_regclass('control.population_migration_ledger') IS NOT NULL exists",
        )
        const completeRows = ledgerRows[0]?.exists === true
          ? await value.d3.sql.unsafe<Array<{ complete: boolean }>>("SELECT count(*)=5 complete FROM control.population_migration_ledger")
          : []
        const requiresBootstrapAuthority = completeRows[0]?.complete !== true
        if (requiresBootstrapAuthority) await admin.unsafe(`ALTER ROLE "${databaseSet.d3Role}" CREATEROLE`)
        try {
          const outcomes = normalizeMigration(component, await applyD3Migrations(value.d3, "mvp-green-clean-bootstrap"))
          if (!outcomes.some((outcome) => outcome.status === "FAILED")) {
            await targetAdmin(databaseSet.backfillDatabase, async (sql) => {
              await sql.unsafe("GRANT USAGE ON SCHEMA control TO qt_d3_scheduler,qt_d3_coordinator,qt_d3_worker,qt_d3_read_only")
              await sql.unsafe("GRANT USAGE ON SCHEMA population,raw,quality,coverage,quarantine TO qt_d3_worker,qt_d3_read_only")
              await sql.unsafe("GRANT UPDATE ON control.population_runs,control.population_units,control.population_leases TO qt_d3_worker")
              await sql.unsafe("GRANT INSERT ON control.population_runs,control.population_run_events,control.population_unit_events,control.population_leases TO qt_d3_worker")
              await sql.unsafe("GRANT SELECT ON control.retrieval_attempts,control.population_outcomes,control.population_unit_events,control.population_checkpoints TO qt_d3_worker")
            })
          }
          return outcomes
        } finally {
          if (requiresBootstrapAuthority) {
            await admin.unsafe(`ALTER ROLE "${databaseSet.d3Role}" NOCREATEROLE`)
            await targetAdmin(databaseSet.backfillDatabase, async (sql) => {
              await sql.unsafe(`REVOKE CREATE ON DATABASE "${databaseSet.backfillDatabase}" FROM "${databaseSet.d3Role}"`)
              await sql.unsafe(`REVOKE CREATE ON SCHEMA control,raw,canonical,repository,quality,coverage,projection,evidence,consistency,quarantine FROM "${databaseSet.d3Role}"`)
            })
          }
        }
      }
      if (component === "D4_DEPENDENCY") return normalizeMigration(component, await new D2DependencyBootstrapRunner(value.d4).apply("mvp-green-clean-bootstrap"))
      if (component === "D4") {
        const outcomes = await new ConsistencyMigrationRunner(value.d4).apply("mvp-green-clean-bootstrap")
        if (!outcomes.some((outcome) => outcome.status === "FAILED")) {
          for (const role of [
            databaseSet.d4ConsistencyRole,
            databaseSet.d4EvidenceRole,
            databaseSet.d4ProjectionRole,
            "qt_d4_projection_publisher",
            databaseSet.d4ReadOnlyRole,
          ]) {
            await admin.unsafe(`GRANT "${role}" TO "${databaseSet.d4OwnerRole}" WITH ADMIN FALSE, INHERIT FALSE, SET TRUE`)
          }
        }
        return normalizeMigration(component, outcomes)
      }
      if (component === "REFRESH") return normalizeMigration(component, await new MvpRefreshMigrationRunner(value.refresh).apply("mvp-green-clean-bootstrap"))
      const outcomes = await new MvpServingMigrationRunner(value.servingMigration).apply("mvp-green-clean-bootstrap")
      if (!outcomes.some((outcome) => outcome.status === "FAILED")) {
        await value.servingMigration.transaction(async (sql) => {
          await sql.unsafe(`GRANT CONNECT ON DATABASE "${databaseSet.servingDatabase}" TO "${databaseSet.servingPublisherRole}","${databaseSet.servingReaderRole}"`)
          await sql.unsafe(`GRANT USAGE ON SCHEMA serving TO "${databaseSet.servingPublisherRole}"`)
          await sql.unsafe(`GRANT SELECT ON serving.serving_corpus,serving.serving_projection,serving.serving_evidence_summary,serving.serving_replay_sequence,serving.serving_corpus_member,serving.serving_candidate_manifest,serving.serving_exposure TO "${databaseSet.servingPublisherRole}"`)
          await sql.unsafe(`GRANT INSERT ON serving.serving_corpus,serving.serving_projection,serving.serving_evidence_summary,serving.serving_replay_sequence,serving.serving_corpus_member,serving.serving_candidate_manifest TO "${databaseSet.servingPublisherRole}"`)
          await sql.unsafe(`REVOKE SELECT ON serving.serving_demo_profile,serving.serving_release_inventory,serving.serving_publication_event FROM "${databaseSet.servingPublisherRole}"`)
          await sql.unsafe(`REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON serving.serving_exposure,serving.serving_publication_event FROM "${databaseSet.servingPublisherRole}"`)
          await sql.unsafe(`REVOKE ALL ON ALL TABLES IN SCHEMA serving_control FROM "${databaseSet.servingPublisherRole}"`)
          await sql.unsafe(`REVOKE USAGE ON SCHEMA serving_control FROM "${databaseSet.servingPublisherRole}"`)
          await sql.unsafe(`REVOKE CREATE ON SCHEMA serving,serving_control FROM "${databaseSet.servingPublisherRole}","${databaseSet.servingReaderRole}"`)
        })
      }
      return normalizeMigration(component, outcomes)
    },
    async seedD2Governance(effectiveAt) {
      const value = await ensureClients()
      const result = await ensureIntegratedMvpGovernancePrerequisites({ client: value.d2, adapter: createCanonicalPersistenceAdapter(value.d2), effectiveAt })
      return result.status
    },
    async seedD4EvidenceGovernance() {
      return seedMvpEvidenceGovernance((await ensureClients()).d4)
    },
    async seedD4ProjectionDefinitions() {
      const runtime = (await ensureClients()).d4
      const before = await runtime.sql.unsafe<Array<{ count: number }>>(
        "SELECT count(*)::int count FROM projection.mvp_projection_definitions WHERE projection_kind=ANY($1::text[])",
        [MVP_PROJECTION_DEFINITIONS.map((item) => item.projectionKind)],
      )
      await seedMvpProjectionDefinitions(runtime, MVP_PROJECTION_DEFINITIONS)
      return before[0]?.count === MVP_PROJECTION_DEFINITIONS.length ? "DUPLICATE" : "CREATED"
    },
    async readRetainedRawObjects(scope) {
      sourceRows ??= await rowsFromSource(sourceD2Url, scope)
      return sourceRows
    },
    verifyRetainedRawFile: (value) => verifyFile(objectRoot, value),
    async registerRetainedRawManifest(manifest) {
      const result = await createCanonicalPersistenceAdapter((await ensureClients()).d2).registerRawObjectManifest(manifest)
      return result.status === "SUCCESS" ? "CREATED" : result.status
    },
    async loadOfficialBaselineBundle() {
      baseline ??= await loadBaselineBundle(environment)
      return baselineMetadata(baseline)
    },
    async publishOfficialBaselineBundle(bundle) {
      baseline ??= await loadBaselineBundle(environment)
      if (canonicalChecksum(baselineMetadata(baseline)) !== canonicalChecksum(bundle)) throw new Error("GREEN_CLEAN_BASELINE_METADATA_CONFLICT")
      const result = await stageInactiveServingCandidate((await ensureClients()).serving, baseline.input)
      return result.status
    },
    async inspect(): Promise<GreenCleanBootstrapInspection> {
      const value = await ensureClients()
      const [d2Migrations, d3Migrations, dependencies, d4Migrations, refreshMigrations, servingMigrations, governance] = await Promise.all([
        discoverApprovedMigrations(),
        discoverD3Migrations(),
        discoverCertifiedD2Dependencies(),
        discoverD4Migrations(),
        discoverMvpRefreshMigrations(),
        discoverMvpServingMigrations(),
        inspectIntegratedMvpGovernancePrerequisites(value.d2, GREEN_CLEAN_TARGET_START),
      ])
      const observations: GreenCleanMigrationObservation[] = []
      const ledger = async (read: () => Promise<Array<{ id: string; checksum: string }>>, component: GreenCleanComponent, expected: readonly { readonly id: string; readonly checksum: string }[]) => {
        const rows = await read()
        const map = new Map(rows.map((row) => [row.id, row.checksum]))
        for (const item of expected) observations.push(Object.freeze({ component, migrationId: item.id, expectedChecksum: item.checksum, actualChecksum: map.get(item.id) ?? null }))
      }
      await ledger(() => value.d2.sql.unsafe<Array<{ id: string; checksum: string }>>("SELECT migration_id id,migration_checksum checksum FROM control.migration_ledger"), "D2", d2Migrations.map((item) => ({ id: item.migrationId, checksum: item.checksum })))
      await ledger(() => value.d3.sql.unsafe<Array<{ id: string; checksum: string }>>("SELECT migration_id id,migration_checksum checksum FROM control.population_migration_ledger"), "D3", d3Migrations.map((item) => ({ id: item.migrationId, checksum: item.checksum })))
      await ledger(() => value.d4.sql.unsafe<Array<{ id: string; checksum: string }>>("SELECT sequence id,source_checksum checksum FROM d4_control.dependency_bootstrap_ledger"), "D4_DEPENDENCY", dependencies.map((item) => ({ id: item.sequence, checksum: item.checksum })))
      await ledger(() => value.d4.sql.unsafe<Array<{ id: string; checksum: string }>>("SELECT migration_id id,migration_checksum checksum FROM d4_control.migration_ledger"), "D4", d4Migrations.map((item) => ({ id: item.migrationId, checksum: item.checksum })))
      await ledger(() => value.refresh.sql.unsafe<Array<{ id: string; checksum: string }>>("SELECT migration_id id,migration_checksum checksum FROM refresh_control.migration_ledger"), "REFRESH", refreshMigrations.map((item) => ({ id: item.migrationId, checksum: item.checksum })))
      await value.servingMigration.transaction(async (sql) => {
        await ledger(() => sql.unsafe<Array<{ id: string; checksum: string }>>("SELECT migration_id id,migration_checksum checksum FROM serving_control.migration_ledger"), "SERVING", servingMigrations.map((item) => ({ id: item.migrationId, checksum: item.checksum })))
      })
      sourceRows ??= await rowsFromSource(sourceD2Url, { start: GREEN_CLEAN_TARGET_START, end: GREEN_CLEAN_TARGET_END })
      const targetRaw = await value.d2.sql.unsafe<Array<{ object_id: string }>>(
        "SELECT object_id FROM raw.objects WHERE window_start=$1 AND window_end=$2 ORDER BY object_id",
        [GREEN_CLEAN_TARGET_START, GREEN_CLEAN_TARGET_END],
      )
      baseline ??= await loadBaselineBundle(environment)
      const baselineRows = await value.serving.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM serving.serving_candidate_manifest WHERE corpus_id=$1", [baseline.candidate.candidateId])
      const d4SeedRows = await value.d4.sql.unsafe<Array<{ policies: number; rules: number; profiles: number; projections: number }>>(
        `SELECT
          (SELECT count(*)::int FROM control.policy_versions WHERE policy_version_id LIKE 'mvp-evidence-%/1.0.0') policies,
          (SELECT count(*)::int FROM consistency.rules WHERE rule_set_id='MVP-MARKET-EVIDENCE') rules,
          (SELECT count(*)::int FROM evidence.core_assembly_profiles WHERE profile_id='MVP-MARKET-STATE-CORE-EVIDENCE') profiles,
          (SELECT count(*)::int FROM projection.mvp_projection_definitions WHERE projection_kind=ANY($1::text[])) projections`,
        [MVP_PROJECTION_DEFINITIONS.map((item) => item.projectionKind)],
      )
      const refreshCountsRows = await value.refresh.sql.unsafe<Array<{ runs: number; units: number; leases: number; candidates: number }>>(
        "SELECT (SELECT count(*)::int FROM refresh_control.refresh_run) runs,(SELECT count(*)::int FROM refresh_control.refresh_unit) units,(SELECT count(*)::int FROM refresh_control.refresh_lease) leases,(SELECT count(*)::int FROM refresh_control.refresh_candidate) candidates",
      )
      const roleNames = [...new Set([
        databaseSet.d2Role, databaseSet.d3Role, databaseSet.d4OwnerRole,
        databaseSet.d4ConsistencyRole, databaseSet.d4EvidenceRole, databaseSet.d4ProjectionRole,
        databaseSet.d4ReadOnlyRole, databaseSet.refreshRole, databaseSet.servingMigrationOwnerRole, databaseSet.servingPublisherRole,
        databaseSet.servingReaderRole, "qt_d2_canonical_writer", "qt_d2_bounded_writer",
        "qt_d2_read_only", "qt_d3_scheduler", "qt_d3_coordinator", "qt_d3_worker",
        "qt_d3_read_only", "qt_d4_projection_publisher",
      ])]
      const roleRows = await admin.unsafe<Array<{ rolname: string }>>("SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname", [roleNames])
      const grantRows = await value.d2.sql.unsafe<Array<{ ready: boolean }>>(
        `SELECT
          has_schema_privilege('qt_d2_canonical_writer','canonical','USAGE')
          AND has_table_privilege('qt_d2_canonical_writer','repository.record_versions','INSERT')
          AND has_table_privilege('qt_d2_read_only','control.canonical_commits','SELECT')
          AND has_schema_privilege($1,'population','USAGE')
          AND has_table_privilege($1,'control.provider_snapshots','REFERENCES')
          AND has_table_privilege($1,'quarantine.conflicts','REFERENCES')
          AS ready`,
        [databaseSet.d3Role],
      )
      const d4GrantRows = await value.d4.sql.unsafe<Array<{ ready: boolean }>>(
        `SELECT
          has_schema_privilege($1,'consistency','USAGE')
          AND has_table_privilege($1,'consistency.immutable_results','INSERT')
          AND has_schema_privilege($2,'evidence','USAGE')
          AND has_table_privilege($2,'evidence.mvp_market_assessments','INSERT')
          AND has_schema_privilege($3,'projection','USAGE')
          AND has_table_privilege($3,'projection.mvp_projection_versions','INSERT')
          AS ready`,
        [databaseSet.d4ConsistencyRole, databaseSet.d4EvidenceRole, databaseSet.d4ProjectionRole],
      )
      const servingGrantRows = await value.servingMigration.transaction(async (sql) => sql.unsafe<Array<{ ready: boolean }>>(
        `SELECT
          pg_get_userbyid(d.datdba)=$3
          AND pg_has_role($4,$3,'SET')
          AND has_database_privilege($1,current_database(),'CONNECT')
          AND has_schema_privilege($1,'serving','USAGE')
          AND has_table_privilege($1,'serving.serving_corpus','SELECT,INSERT')
          AND has_table_privilege($1,'serving.serving_projection','SELECT,INSERT')
          AND has_table_privilege($1,'serving.serving_evidence_summary','SELECT,INSERT')
          AND has_table_privilege($1,'serving.serving_replay_sequence','SELECT,INSERT')
          AND has_table_privilege($1,'serving.serving_corpus_member','SELECT,INSERT')
          AND has_table_privilege($1,'serving.serving_candidate_manifest','SELECT,INSERT')
          AND has_table_privilege($1,'serving.serving_exposure','SELECT')
          AND NOT has_schema_privilege($1,'serving','CREATE')
          AND NOT has_schema_privilege($1,'serving_control','USAGE')
          AND NOT has_table_privilege($1,'serving.serving_exposure','INSERT,UPDATE,DELETE,TRUNCATE')
          AND NOT has_table_privilege($1,'serving.serving_publication_event','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
          AND has_database_privilege($2,current_database(),'CONNECT')
          AND has_schema_privilege($2,'serving','USAGE')
          AND has_table_privilege($2,'serving.serving_corpus','SELECT')
          AND NOT has_table_privilege($2,'serving.serving_corpus','INSERT,UPDATE,DELETE,TRUNCATE')
          AND NOT has_schema_privilege($2,'serving','CREATE')
          AS ready
         FROM pg_database d
         WHERE d.datname=current_database()`,
        [databaseSet.servingPublisherRole, databaseSet.servingReaderRole, databaseSet.servingMigrationOwnerRole, databaseSet.d4OwnerRole],
      ))
      const foreignKeys = D3_TO_D2_FOREIGN_KEY_DEPENDENCIES.map((item) => `${item.sourceTable}.${item.sourceColumn}->${item.targetTable}.${item.targetColumn}`).sort()
      const d4Seeds = d4SeedRows[0]
      const privilegeClosure = await inspectPrivilegeClosure()
      return Object.freeze({
        localLoopback: redactedTargets.every((item) => item.includes("127.0.0.1") || item.includes("localhost") || item.includes("[::1]")),
        inactive: true,
        productionTargetCollision: Boolean(environment.DATABASE_URL && [
          environment.D2_CANONICAL_POSTGRES_URL,
          environment.D3_POPULATION_POSTGRES_URL,
          environment.D4_ISOLATED_POSTGRES_URL,
          environment.MVP_REFRESH_ISOLATED_POSTGRES_URL,
          environment.MVP_SERVING_ISOLATED_POSTGRES_URL,
        ].includes(environment.DATABASE_URL)),
        databaseNames: Object.freeze([databaseSet.backfillDatabase, databaseSet.d4Database, databaseSet.refreshDatabase, databaseSet.servingDatabase]),
        exactRoles: Object.freeze(roleRows.map((row) => row.rolname)),
        roleConflicts: Object.freeze(roleNames.filter((role) => !roleRows.some((row) => row.rolname === role))),
        grantClosureReady: grantRows[0]?.ready === true
          && d4GrantRows[0]?.ready === true
          && servingGrantRows[0]?.ready === true
          && greenCleanPrivilegeClosurePasses(privilegeClosure),
        privilegeClosure,
        migrations: Object.freeze(observations),
        d2GovernanceReady: governance.length === integratedMvpGovernanceDefinitions(GREEN_CLEAN_TARGET_START).length
          && governance.every((item) => item.state === "READY"),
        d4EvidenceGovernanceReady: d4Seeds?.policies === 4 && d4Seeds.rules === 5 && d4Seeds.profiles === 1,
        d4ProjectionDefinitionsReady: d4Seeds?.projections === MVP_PROJECTION_DEFINITIONS.length,
        d3ToD2ForeignKeys: Object.freeze(foreignKeys),
        retainedRawObjects: sourceRows,
        retainedRawTargetMatches: Object.freeze(targetRaw.map((row) => row.object_id)),
        officialBaseline: baselineRows[0]?.count === 1 ? baselineMetadata(baseline) : null,
        refreshCounts: Object.freeze(refreshCountsRows[0] ?? { runs: -1, units: -1, leases: -1, candidates: -1 }),
      })
    },
    async runCurrentCandidateCatchupOnce() {
      const refreshRows = await (await ensureClients()).refresh.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.refresh_run")
      if (refreshRows[0]?.count !== 0) throw new Error("GREEN_CLEAN_FRESH_RUN_REQUIRED")
      const output = await runChild(environment, oneDayReceiptContext)
      const result = output.result as Record<string, unknown> | undefined
      const day = Array.isArray(result?.days) ? result.days[0] as Record<string, unknown> | undefined : undefined
      if (result?.status !== "COMPLETE" || result.completedThrough !== GREEN_CLEAN_TARGET_END || result.operationalMutationCalls !== 1 || day?.executionState !== "COMPLETE") {
        throw new Error("GREEN_CLEAN_ONE_DAY_WORKER_INCOMPLETE")
      }
      const executionId = String(day.runId ?? "")
      if (!executionId) throw new Error("GREEN_CLEAN_ONE_DAY_EXECUTION_ID_MISSING")
      lastExecutionId = executionId
      const counts = await durableCounts(environment, executionId)
      return Object.freeze({
        status: "COMPLETE",
        executionId,
        commonWatermark: GREEN_CLEAN_TARGET_END,
        candidateGovernedThrough: GREEN_CLEAN_TARGET_END,
        candidateExposed: false,
        durableCounts: counts,
      }) as GreenCleanOneDayExecution
    },
    async readDurableOneDayExecution(executionId) {
      if (lastExecutionId !== executionId) throw new Error("GREEN_CLEAN_EXECUTION_READBACK_ID_MISMATCH")
      return durableCounts(environment, executionId)
    },
  }

  return Object.freeze({
    environment,
    ports,
    redactedTargets,
    async close() {
      await closeClients(clients)
      await Promise.allSettled([admin.end({ timeout: 5 }), lifecycle.shutdown()])
    },
  })
}
