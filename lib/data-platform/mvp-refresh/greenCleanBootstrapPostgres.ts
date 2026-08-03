import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { RawObjectManifest } from "@/lib/data-platform/persistence/contracts"

import { greenCleanPrivilegeClosurePasses, type GreenCleanPrivilegeClosureReport } from "./greenCleanPrivilegeClosure"
import type { GreenCleanRebuildDatabaseSet } from "./greenCleanRebuildSafety"

export const GREEN_CLEAN_BOOTSTRAP_VERSION = "mvp-green-clean-bootstrap-postgres/1.0.0" as const
export const GREEN_CLEAN_TARGET_START = "2026-07-16T00:00:00.000Z" as const
export const GREEN_CLEAN_TARGET_END = "2026-07-17T00:00:00.000Z" as const
export const GREEN_CLEAN_D3_TO_D2_FOREIGN_KEY_COUNT = 16 as const
export const GREEN_CLEAN_OFFICIAL_BASELINE_BUNDLE_CHECKSUM = "d5d26fa7ff03b93fe64d44ef17a0cfee9467cc8a9493e28b8510ef6b4f489027" as const
export const GREEN_CLEAN_OFFICIAL_BASELINE_MEMBER_COUNT = 74 as const
export const GREEN_CLEAN_OFFICIAL_BASELINE_LOADER = "loadMvpGreenAcquisitionBundle" as const
export const GREEN_CLEAN_OFFICIAL_BASELINE_PUBLISHER = "stageInactiveServingCandidate" as const
export const GREEN_CLEAN_INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const)
export const GREEN_CLEAN_DATASETS = Object.freeze(["ohlcv", "open-interest", "funding", "agg-trade"] as const)

export type GreenCleanDataset = typeof GREEN_CLEAN_DATASETS[number]
export type GreenCleanInstrument = typeof GREEN_CLEAN_INSTRUMENTS[number]
export type GreenCleanMutationOutcome = "CREATED" | "DUPLICATE" | "CONFLICT"
export type GreenCleanComponent = "D2" | "D3" | "D4_DEPENDENCY" | "D4" | "REFRESH" | "SERVING"

export interface GreenCleanRawSlot {
  readonly dataset: GreenCleanDataset
  readonly instrument: GreenCleanInstrument
  readonly intervalStart: typeof GREEN_CLEAN_TARGET_START
  readonly intervalEnd: typeof GREEN_CLEAN_TARGET_END
}

export interface GreenCleanRetainedRawObject {
  readonly slot: GreenCleanRawSlot
  readonly manifest: RawObjectManifest
}

export interface GreenCleanOfficialBaseline {
  readonly loader: typeof GREEN_CLEAN_OFFICIAL_BASELINE_LOADER
  readonly publisher: typeof GREEN_CLEAN_OFFICIAL_BASELINE_PUBLISHER
  readonly bundleId: string
  readonly bundleChecksum: typeof GREEN_CLEAN_OFFICIAL_BASELINE_BUNDLE_CHECKSUM
  readonly candidateId: string
  readonly candidateChecksum: string
  readonly governedThrough: typeof GREEN_CLEAN_TARGET_START
  readonly dependencyIds: readonly string[]
}

export interface GreenCleanMigrationObservation {
  readonly component: GreenCleanComponent
  readonly migrationId: string
  readonly expectedChecksum: string
  readonly actualChecksum: string | null
}

export interface GreenCleanBootstrapInspection {
  readonly localLoopback: boolean
  readonly inactive: boolean
  readonly productionTargetCollision: boolean
  readonly databaseNames: readonly string[]
  readonly exactRoles: readonly string[]
  readonly roleConflicts: readonly string[]
  readonly grantClosureReady: boolean
  readonly privilegeClosure: GreenCleanPrivilegeClosureReport
  readonly migrations: readonly GreenCleanMigrationObservation[]
  readonly d2GovernanceReady: boolean
  readonly d4EvidenceGovernanceReady: boolean
  readonly d4ProjectionDefinitionsReady: boolean
  readonly d3ToD2ForeignKeys: readonly string[]
  readonly retainedRawObjects: readonly GreenCleanRetainedRawObject[]
  readonly retainedRawTargetMatches: readonly string[]
  readonly officialBaseline: GreenCleanOfficialBaseline | null
  readonly refreshCounts: Readonly<Record<string, number>>
}

export interface GreenCleanBootstrapPorts {
  reconcileDatabaseSet(databaseSet: GreenCleanRebuildDatabaseSet): Promise<Readonly<Record<string, GreenCleanMutationOutcome>>>
  reconcileCanonicalGlobalRoles(roles: readonly string[]): Promise<GreenCleanMutationOutcome>
  inspectCanonicalGlobalRoles(roles: readonly string[]): Promise<{ readonly exact: readonly string[]; readonly conflicts: readonly string[] }>
  reconcileDatabaseAccess(databaseSet: GreenCleanRebuildDatabaseSet): Promise<GreenCleanMutationOutcome>
  reconcileDatabaseGrants(databaseSet: GreenCleanRebuildDatabaseSet): Promise<GreenCleanMutationOutcome>
  applyMigrations(component: GreenCleanComponent): Promise<readonly { readonly status: "APPLIED" | "SKIPPED" | "FAILED"; readonly migrationId: string; readonly checksum: string; readonly reason?: string }[]>
  seedD2Governance(effectiveAt: string): Promise<"CREATED" | "DUPLICATE">
  seedD4EvidenceGovernance(): Promise<"CREATED" | "DUPLICATE">
  seedD4ProjectionDefinitions(): Promise<"CREATED" | "DUPLICATE">
  readRetainedRawObjects(scope: { readonly start: string; readonly end: string; readonly slots: readonly GreenCleanRawSlot[] }): Promise<readonly GreenCleanRetainedRawObject[]>
  verifyRetainedRawFile(value: GreenCleanRetainedRawObject): Promise<{ readonly checksum: string; readonly sizeBytes: number }>
  registerRetainedRawManifest(manifest: RawObjectManifest): Promise<"CREATED" | "DUPLICATE" | "CONFLICT" | "REJECTED">
  loadOfficialBaselineBundle(): Promise<GreenCleanOfficialBaseline>
  publishOfficialBaselineBundle(bundle: GreenCleanOfficialBaseline): Promise<GreenCleanMutationOutcome>
  inspect(): Promise<GreenCleanBootstrapInspection>
  runCurrentCandidateCatchupOnce(input: {
    readonly start: typeof GREEN_CLEAN_TARGET_START
    readonly through: typeof GREEN_CLEAN_TARGET_END
    readonly intent: "RUN"
    readonly allowResume: false
  }): Promise<GreenCleanOneDayExecution>
  readDurableOneDayExecution(executionId: string): Promise<GreenCleanDurableOneDayCounts>
}

export interface GreenCleanBootstrapReport {
  readonly version: typeof GREEN_CLEAN_BOOTSTRAP_VERSION
  readonly status: "CREATED" | "DUPLICATE"
  readonly databaseOutcomes: Readonly<Record<string, Exclude<GreenCleanMutationOutcome, "CONFLICT">>>
  readonly migrations: Readonly<Record<GreenCleanComponent, readonly string[]>>
  readonly rawManifests: { readonly created: number; readonly duplicate: number; readonly exactSlotCount: 24 }
  readonly baseline: { readonly status: Exclude<GreenCleanMutationOutcome, "CONFLICT">; readonly bundleId: string; readonly checksum: string }
  readonly preflight: GreenCleanPreflightReport
}

export interface GreenCleanPreflightReport {
  readonly version: typeof GREEN_CLEAN_BOOTSTRAP_VERSION
  readonly status: "READY" | "BLOCKED"
  readonly blockers: readonly string[]
  readonly closureChecksum: string
  readonly slotCount: 24
  readonly foreignKeyCount: typeof GREEN_CLEAN_D3_TO_D2_FOREIGN_KEY_COUNT
  readonly retainedRawCount: number
}

export interface GreenCleanDurableOneDayCounts {
  readonly executionId: string
  readonly refreshRuns: number
  readonly refreshUnits: number
  readonly completedRefreshUnits: number
  readonly populationRuns: number
  readonly populationUnits: number
  readonly rawObjects: number
  readonly canonicalCommits: number
  readonly commonWatermarks: number
  readonly servingCandidates: number
  readonly candidateGovernedThrough: string | null
  readonly candidateExposed: boolean
}

export interface GreenCleanOneDayExecution {
  readonly status: "COMPLETE"
  readonly executionId: string
  readonly commonWatermark: typeof GREEN_CLEAN_TARGET_END
  readonly candidateGovernedThrough: typeof GREEN_CLEAN_TARGET_END
  readonly candidateExposed: false
  readonly durableCounts: GreenCleanDurableOneDayCounts
}

// Mirrors the committed physical closure in integratedTopology.ts without
// loading PostgreSQL client factories in pure preflight/test processes.
const expectedForeignKeys = Object.freeze([
  "control.population_units.provider_snapshot_id->control.provider_snapshots.snapshot_id",
  "control.population_units.policy_version_id->control.policy_versions.policy_version_id",
  "control.population_checkpoints.raw_manifest_id->raw.objects.object_id",
  "control.retrieval_attempts.provider_snapshot_id->control.provider_snapshots.snapshot_id",
  "control.retrieval_attempts.raw_manifest_id->raw.objects.object_id",
  "population.candidates.raw_manifest_id->raw.objects.object_id",
  "population.candidates.provider_snapshot_id->control.provider_snapshots.snapshot_id",
  "quality.candidate_validation_results.policy_version_id->control.policy_versions.policy_version_id",
  "quality.candidate_evaluation_runs.policy_version_id->control.policy_versions.policy_version_id",
  "quality.candidate_evaluation_runs.provider_certification_snapshot_id->control.provider_snapshots.snapshot_id",
  "population.canonical_submissions.canonical_commit_id->control.canonical_commits.commit_id",
  "control.population_outcomes.raw_manifest_id->raw.objects.object_id",
  "control.population_outcomes.canonical_commit_id->control.canonical_commits.commit_id",
  "control.population_outcomes.conflict_id->quarantine.conflicts.conflict_id",
  "control.population_outcomes.quarantine_id->quarantine.candidates.quarantine_id",
  "coverage.watermark_eligibility_decisions.policy_version_id->control.policy_versions.policy_version_id",
].sort())

export function greenCleanRequiredRoles(databaseSet: GreenCleanRebuildDatabaseSet): readonly string[] {
  return Object.freeze([...new Set([
    databaseSet.d2Role,
    databaseSet.d3Role,
    databaseSet.d4OwnerRole,
    databaseSet.d4ConsistencyRole,
    databaseSet.d4EvidenceRole,
    databaseSet.d4ProjectionRole,
    databaseSet.d4ReadOnlyRole,
    databaseSet.refreshRole,
    databaseSet.servingMigrationOwnerRole,
    databaseSet.servingPublisherRole,
    databaseSet.servingReaderRole,
    "qt_d2_canonical_writer",
    "qt_d2_bounded_writer",
    "qt_d2_read_only",
    "qt_d3_scheduler",
    "qt_d3_coordinator",
    "qt_d3_worker",
    "qt_d3_read_only",
    "qt_d4_projection_publisher",
  ])].sort())
}

export function greenCleanRequiredRawSlots(): readonly GreenCleanRawSlot[] {
  return Object.freeze(GREEN_CLEAN_DATASETS.flatMap((dataset) => GREEN_CLEAN_INSTRUMENTS.map((instrument) => Object.freeze({
    dataset,
    instrument,
    intervalStart: GREEN_CLEAN_TARGET_START,
    intervalEnd: GREEN_CLEAN_TARGET_END,
  }))))
}

function slotKey(value: GreenCleanRawSlot): string {
  return `${value.dataset}:${value.instrument}:${value.intervalStart}:${value.intervalEnd}`
}

function exactDatabaseNames(databaseSet: GreenCleanRebuildDatabaseSet): readonly string[] {
  return Object.freeze([
    databaseSet.backfillDatabase,
    databaseSet.d4Database,
    databaseSet.refreshDatabase,
    databaseSet.servingDatabase,
  ].sort())
}

function assertExactRawClosure(values: readonly GreenCleanRetainedRawObject[]): void {
  const expected = greenCleanRequiredRawSlots()
  const bySlot = new Map<string, GreenCleanRetainedRawObject>()
  for (const value of values) {
    const key = slotKey(value.slot)
    if (bySlot.has(key)) throw new Error(`GREEN_CLEAN_RETAINED_RAW_SLOT_DUPLICATE:${key}`)
    bySlot.set(key, value)
    const manifest = value.manifest
    if (
      manifest.datasetId !== value.slot.dataset
      || manifest.symbolOrSubject !== value.slot.instrument
      || manifest.windowStart !== value.slot.intervalStart
      || manifest.windowEnd !== value.slot.intervalEnd
      || manifest.verificationState !== "VERIFIED"
      || manifest.objectId !== `raw_${manifest.contentHash}`
    ) throw new Error(`GREEN_CLEAN_RETAINED_RAW_MANIFEST_SCOPE_CONFLICT:${key}`)
  }
  const missing = expected.filter((value) => !bySlot.has(slotKey(value)))
  if (values.length !== 24 || missing.length) throw new Error(`GREEN_CLEAN_RETAINED_RAW_CLOSURE_INCOMPLETE:${missing.map(slotKey).join(",")}`)
}

function assertMutationOutcome(outcome: GreenCleanMutationOutcome, code: string): asserts outcome is Exclude<GreenCleanMutationOutcome, "CONFLICT"> {
  if (outcome === "CONFLICT") throw new Error(code)
}

function assertOfficialBaseline(bundle: GreenCleanOfficialBaseline): void {
  if (
    bundle.loader !== GREEN_CLEAN_OFFICIAL_BASELINE_LOADER
    || bundle.publisher !== GREEN_CLEAN_OFFICIAL_BASELINE_PUBLISHER
    || bundle.bundleChecksum !== GREEN_CLEAN_OFFICIAL_BASELINE_BUNDLE_CHECKSUM
    || bundle.governedThrough !== GREEN_CLEAN_TARGET_START
    || bundle.dependencyIds.length !== GREEN_CLEAN_OFFICIAL_BASELINE_MEMBER_COUNT
    || new Set(bundle.dependencyIds).size !== GREEN_CLEAN_OFFICIAL_BASELINE_MEMBER_COUNT
  ) throw new Error("GREEN_CLEAN_OFFICIAL_BASELINE_BINDING_INVALID")
}

function assertMigrations(component: GreenCleanComponent, outcomes: Awaited<ReturnType<GreenCleanBootstrapPorts["applyMigrations"]>>): void {
  if (!outcomes.length || outcomes.some((value) => value.status === "FAILED")) {
    const failed = outcomes.find((value) => value.status === "FAILED")
    throw new Error(`GREEN_CLEAN_${component}_MIGRATION_FAILED:${failed?.migrationId ?? "EMPTY"}:${failed?.reason ?? "UNKNOWN"}`)
  }
}

export async function preflightGreenCleanBootstrap(databaseSet: GreenCleanRebuildDatabaseSet, ports: Pick<GreenCleanBootstrapPorts, "inspect">): Promise<GreenCleanPreflightReport> {
  const observed = await ports.inspect()
  const blockers: string[] = []
  const wantedDatabases = exactDatabaseNames(databaseSet)
  const wantedRoles = greenCleanRequiredRoles(databaseSet)
  const observedDatabases = [...observed.databaseNames].sort()
  const observedRoles = [...observed.exactRoles].sort()
  const observedForeignKeys = [...observed.d3ToD2ForeignKeys].sort()
  const rawIds = observed.retainedRawObjects.map((value) => value.manifest.objectId).sort()

  if (!observed.localLoopback) blockers.push("NON_LOCAL_TARGET")
  if (!observed.inactive) blockers.push("TARGET_NOT_INACTIVE")
  if (observed.productionTargetCollision) blockers.push("PRODUCTION_TARGET_COLLISION")
  if (new Set(wantedDatabases).size !== 4 || observedDatabases.join("|") !== wantedDatabases.join("|")) blockers.push("DATABASE_SET_MISMATCH")
  if (observed.roleConflicts.length || observedRoles.join("|") !== wantedRoles.join("|")) blockers.push("CANONICAL_GLOBAL_ROLE_SET_MISMATCH")
  if (!observed.grantClosureReady) blockers.push("ROLE_GRANT_CLOSURE_MISMATCH")
  if (!greenCleanPrivilegeClosurePasses(observed.privilegeClosure)) blockers.push("ROLE_PRIVILEGE_MATRIX_CLOSURE_MISMATCH")
  if (observed.migrations.some((value) => value.actualChecksum !== value.expectedChecksum)) blockers.push("MIGRATION_CLOSURE_MISMATCH")
  if (!observed.d2GovernanceReady) blockers.push("D2_GOVERNANCE_MISSING")
  if (!observed.d4EvidenceGovernanceReady) blockers.push("D4_EVIDENCE_GOVERNANCE_MISSING")
  if (!observed.d4ProjectionDefinitionsReady) blockers.push("D4_PROJECTION_DEFINITIONS_MISSING")
  if (observedForeignKeys.join("|") !== expectedForeignKeys.join("|")) blockers.push("D3_D2_FOREIGN_KEY_CLOSURE_MISMATCH")
  try { assertExactRawClosure(observed.retainedRawObjects) } catch (error) { blockers.push(error instanceof Error ? error.message.split(":", 1)[0]! : "RETAINED_RAW_CLOSURE_INVALID") }
  if (observed.retainedRawTargetMatches.slice().sort().join("|") !== rawIds.join("|")) blockers.push("RETAINED_RAW_TARGET_READBACK_MISMATCH")
  if (!observed.officialBaseline) blockers.push("OFFICIAL_BASELINE_MISSING")
  else {
    try { assertOfficialBaseline(observed.officialBaseline) } catch { blockers.push("OFFICIAL_BASELINE_BINDING_INVALID") }
  }
  if (Object.values(observed.refreshCounts).some((value) => value !== 0)) blockers.push("REFRESH_TARGET_NOT_EMPTY")

  const closure = {
    version: GREEN_CLEAN_BOOTSTRAP_VERSION,
    databases: wantedDatabases,
    roles: wantedRoles,
    grantClosureReady: observed.grantClosureReady,
    privilegeClosure: {
      version: observed.privilegeClosure.version,
      status: observed.privilegeClosure.status,
      rolesInspected: observed.privilegeClosure.rolesInspected,
      operationsInspected: observed.privilegeClosure.operationsInspected,
      counters: observed.privilegeClosure.counters,
    },
    migrations: observed.migrations.map((value) => [value.component, value.migrationId, value.expectedChecksum, value.actualChecksum]).sort(),
    foreignKeys: expectedForeignKeys,
    rawObjects: rawIds,
    baseline: observed.officialBaseline ? [observed.officialBaseline.bundleId, observed.officialBaseline.bundleChecksum, observed.officialBaseline.candidateId, observed.officialBaseline.candidateChecksum] : null,
    refreshCounts: observed.refreshCounts,
  }
  return Object.freeze({
    version: GREEN_CLEAN_BOOTSTRAP_VERSION,
    status: blockers.length ? "BLOCKED" : "READY",
    blockers: Object.freeze([...new Set(blockers)].sort()),
    closureChecksum: canonicalChecksum(closure),
    slotCount: 24,
    foreignKeyCount: GREEN_CLEAN_D3_TO_D2_FOREIGN_KEY_COUNT,
    retainedRawCount: observed.retainedRawObjects.length,
  })
}

export async function bootstrapGreenCleanPostgres(databaseSet: GreenCleanRebuildDatabaseSet, ports: GreenCleanBootstrapPorts): Promise<GreenCleanBootstrapReport> {
  const roles = greenCleanRequiredRoles(databaseSet)
  const roleOutcome = await ports.reconcileCanonicalGlobalRoles(roles)
  assertMutationOutcome(roleOutcome, "GREEN_CLEAN_CANONICAL_GLOBAL_ROLE_CONFLICT")
  const roleInspection = await ports.inspectCanonicalGlobalRoles(roles)
  if (roleInspection.conflicts.length || [...roleInspection.exact].sort().join("|") !== [...roles].sort().join("|")) throw new Error("GREEN_CLEAN_CANONICAL_GLOBAL_ROLES_NOT_EXACT")

  const databaseSpecs = [
    { databaseName: databaseSet.backfillDatabase, ownerRole: databaseSet.d2Role },
    { databaseName: databaseSet.d4Database, ownerRole: databaseSet.d4OwnerRole },
    { databaseName: databaseSet.refreshDatabase, ownerRole: databaseSet.refreshRole },
    { databaseName: databaseSet.servingDatabase, ownerRole: databaseSet.servingMigrationOwnerRole },
  ] as const
  const databaseOutcomes: Record<string, "CREATED" | "DUPLICATE"> = {}
  const reconciledDatabases = await ports.reconcileDatabaseSet(databaseSet)
  for (const spec of databaseSpecs) {
    const outcome = reconciledDatabases[spec.databaseName]
    if (!outcome) throw new Error(`GREEN_CLEAN_DATABASE_OUTCOME_MISSING:${spec.databaseName}`)
    assertMutationOutcome(outcome, `GREEN_CLEAN_DATABASE_CONFLICT:${spec.databaseName}`)
    databaseOutcomes[spec.databaseName] = outcome
  }
  const databaseAccessOutcome = await ports.reconcileDatabaseAccess(databaseSet)
  assertMutationOutcome(databaseAccessOutcome, "GREEN_CLEAN_DATABASE_ACCESS_CONFLICT")
  const migrations = {} as Record<GreenCleanComponent, readonly string[]>
  let appliedMigration = false
  const apply = async (component: GreenCleanComponent) => {
    const outcomes = await ports.applyMigrations(component)
    assertMigrations(component, outcomes)
    appliedMigration ||= outcomes.some((value) => value.status === "APPLIED")
    migrations[component] = Object.freeze(outcomes.map((value) => `${value.status}:${value.migrationId}:${value.checksum}`))
  }
  await apply("D2")
  const grantOutcome = await ports.reconcileDatabaseGrants(databaseSet)
  assertMutationOutcome(grantOutcome, "GREEN_CLEAN_DATABASE_GRANT_CONFLICT")
  for (const component of ["D3", "D4_DEPENDENCY", "D4", "REFRESH", "SERVING"] as const) await apply(component)
  const d2Seed = await ports.seedD2Governance(GREEN_CLEAN_TARGET_START)
  const d4EvidenceSeed = await ports.seedD4EvidenceGovernance()
  const d4ProjectionSeed = await ports.seedD4ProjectionDefinitions()

  const retained = await ports.readRetainedRawObjects({ start: GREEN_CLEAN_TARGET_START, end: GREEN_CLEAN_TARGET_END, slots: greenCleanRequiredRawSlots() })
  assertExactRawClosure(retained)
  let rawCreated = 0
  let rawDuplicate = 0
  for (const value of retained) {
    const file = await ports.verifyRetainedRawFile(value)
    if (file.checksum !== value.manifest.contentHash || file.sizeBytes !== value.manifest.sizeBytes) throw new Error(`GREEN_CLEAN_RETAINED_RAW_FILE_CONFLICT:${value.manifest.objectId}`)
    const result = await ports.registerRetainedRawManifest(value.manifest)
    if (result === "CONFLICT" || result === "REJECTED") throw new Error(`GREEN_CLEAN_RETAINED_RAW_IMPORT_${result}:${value.manifest.objectId}`)
    if (result === "CREATED") rawCreated += 1
    else rawDuplicate += 1
  }

  const baseline = await ports.loadOfficialBaselineBundle()
  assertOfficialBaseline(baseline)
  const baselineStatus = await ports.publishOfficialBaselineBundle(baseline)
  assertMutationOutcome(baselineStatus, "GREEN_CLEAN_OFFICIAL_BASELINE_CONFLICT")
  const preflight = await preflightGreenCleanBootstrap(databaseSet, ports)
  if (preflight.status !== "READY") throw new Error(`GREEN_CLEAN_BOOTSTRAP_PREFLIGHT_BLOCKED:${preflight.blockers.join(",")}`)
  const created = roleOutcome === "CREATED" || Object.values(databaseOutcomes).includes("CREATED") || databaseAccessOutcome === "CREATED" || grantOutcome === "CREATED" || appliedMigration
    || d2Seed === "CREATED" || d4EvidenceSeed === "CREATED" || d4ProjectionSeed === "CREATED"
    || rawCreated > 0 || baselineStatus === "CREATED"
  return Object.freeze({
    version: GREEN_CLEAN_BOOTSTRAP_VERSION,
    status: created ? "CREATED" : "DUPLICATE",
    databaseOutcomes: Object.freeze(databaseOutcomes),
    migrations: Object.freeze(migrations),
    rawManifests: Object.freeze({ created: rawCreated, duplicate: rawDuplicate, exactSlotCount: 24 as const }),
    baseline: Object.freeze({ status: baselineStatus, bundleId: baseline.bundleId, checksum: baseline.bundleChecksum }),
    preflight,
  })
}

function assertExactDurableCounts(expected: GreenCleanDurableOneDayCounts, observed: GreenCleanDurableOneDayCounts): void {
  if (canonicalChecksum(expected) !== canonicalChecksum(observed)) throw new Error("GREEN_CLEAN_ONE_DAY_DURABLE_COUNTS_MISMATCH")
  if (
    observed.refreshRuns !== 1
    || observed.refreshUnits !== 24
    || observed.completedRefreshUnits !== 24
    || observed.populationRuns < 1
    || observed.populationUnits !== 24
    || observed.rawObjects !== 24
    || observed.canonicalCommits < 24
    || observed.commonWatermarks !== 1
    || observed.servingCandidates !== 1
    || observed.candidateGovernedThrough !== GREEN_CLEAN_TARGET_END
    || observed.candidateExposed
  ) throw new Error("GREEN_CLEAN_ONE_DAY_DURABLE_INVARIANT_FAILED")
}

export async function runGreenCleanOneDay(databaseSet: GreenCleanRebuildDatabaseSet, ports: GreenCleanBootstrapPorts): Promise<GreenCleanOneDayExecution> {
  const gate = await preflightGreenCleanBootstrap(databaseSet, ports)
  if (gate.status !== "READY") throw new Error(`GREEN_CLEAN_ONE_DAY_PREFLIGHT_BLOCKED:${gate.blockers.join(",")}`)
  const execution = await ports.runCurrentCandidateCatchupOnce({
    start: GREEN_CLEAN_TARGET_START,
    through: GREEN_CLEAN_TARGET_END,
    intent: "RUN",
    allowResume: false,
  })
  if (execution.status !== "COMPLETE" || execution.commonWatermark !== GREEN_CLEAN_TARGET_END || execution.candidateGovernedThrough !== GREEN_CLEAN_TARGET_END || execution.candidateExposed) throw new Error("GREEN_CLEAN_ONE_DAY_EXECUTION_INCOMPLETE")
  const durable = await ports.readDurableOneDayExecution(execution.executionId)
  assertExactDurableCounts(execution.durableCounts, durable)
  return Object.freeze({ ...execution, durableCounts: durable })
}
