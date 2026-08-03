import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { RawObjectManifest } from "@/lib/data-platform/persistence/contracts"
import {
  GREEN_CLEAN_OFFICIAL_BASELINE_BUNDLE_CHECKSUM,
  GREEN_CLEAN_OFFICIAL_BASELINE_LOADER,
  GREEN_CLEAN_OFFICIAL_BASELINE_PUBLISHER,
  GREEN_CLEAN_TARGET_END,
  GREEN_CLEAN_TARGET_START,
  bootstrapGreenCleanPostgres,
  greenCleanRequiredRawSlots,
  greenCleanRequiredRoles,
  preflightGreenCleanBootstrap,
  runGreenCleanOneDay,
  type GreenCleanBootstrapInspection,
  type GreenCleanBootstrapPorts,
  type GreenCleanDurableOneDayCounts,
  type GreenCleanOfficialBaseline,
  type GreenCleanRetainedRawObject,
} from "@/lib/data-platform/mvp-refresh/greenCleanBootstrapPostgres"
import { GREEN_CLEAN_PRIVILEGE_CLOSURE_VERSION } from "@/lib/data-platform/mvp-refresh/greenCleanPrivilegeClosure"
import { requireGreenCleanRebuildDatabaseSet } from "@/lib/data-platform/mvp-refresh/greenCleanRebuildSafety"
import { executeMvpGreenCleanRebuildCommand, parseMvpGreenCleanRebuildCommand } from "@/workers/data-platform/runMvpGreenCleanRebuild"

const id = "bootstrap01"
const prefix = `quantterminal_green_clean_${id}`
const environment = {
  MVP_GREEN_CLEAN_REBUILD_MODE: "INACTIVE_LOCAL_DATABASE_SET",
  MVP_GREEN_CLEAN_REBUILD_ID: id,
  MVP_GREEN_CLEAN_REBUILD_BACKFILL_DATABASE: `${prefix}_backfill`,
  MVP_GREEN_CLEAN_REBUILD_D4_DATABASE: `${prefix}_d4`,
  MVP_GREEN_CLEAN_REBUILD_REFRESH_DATABASE: `${prefix}_refresh`,
  MVP_GREEN_CLEAN_REBUILD_SERVING_DATABASE: `${prefix}_serving`,
}
const databaseSet = requireGreenCleanRebuildDatabaseSet(environment)!
const roles = greenCleanRequiredRoles(databaseSet)
const components = ["D2", "D3", "D4_DEPENDENCY", "D4", "REFRESH", "SERVING"] as const
const migrations = components.map((component) => ({ component, migrationId: "001", expectedChecksum: canonicalChecksum(component), actualChecksum: canonicalChecksum(component) }))
const foreignKeys = [
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
].sort()

function rawObjects(): readonly GreenCleanRetainedRawObject[] {
  return greenCleanRequiredRawSlots().map((slot) => {
    const contentHash = canonicalChecksum(slot)
    const manifest: RawObjectManifest = Object.freeze({
      objectId: `raw_${contentHash}`,
      datasetId: slot.dataset,
      providerId: slot.dataset === "funding" ? "binance-official-rest" : "binance-public-archive",
      venue: "binance-usdm-futures",
      symbolOrSubject: slot.instrument,
      windowStart: slot.intervalStart,
      windowEnd: slot.intervalEnd,
      contentHash,
      sizeBytes: 100 + slot.instrument.length,
      mediaType: slot.dataset === "funding" ? "application/json" : "application/zip",
      compression: slot.dataset === "funding" ? "NONE" : "ZIP",
      retrievedAt: GREEN_CLEAN_TARGET_END,
      providerSnapshotId: `provider:${slot.dataset}`,
      retentionClass: "ARCHIVE",
      verificationState: "VERIFIED",
      objectStorageKey: `raw/${contentHash}`,
      createdAt: GREEN_CLEAN_TARGET_END,
    })
    return Object.freeze({ slot, manifest })
  })
}

const raw = rawObjects()
const baseline: GreenCleanOfficialBaseline = Object.freeze({
  loader: GREEN_CLEAN_OFFICIAL_BASELINE_LOADER,
  publisher: GREEN_CLEAN_OFFICIAL_BASELINE_PUBLISHER,
  bundleId: "official-green-baseline",
  bundleChecksum: GREEN_CLEAN_OFFICIAL_BASELINE_BUNDLE_CHECKSUM,
  candidateId: "mvp8i-candidate:baseline",
  candidateChecksum: canonicalChecksum("mvp8i-candidate:baseline"),
  governedThrough: GREEN_CLEAN_TARGET_START,
  dependencyIds: Object.freeze(Array.from({ length: 74 }, (_, index) => `member:${index}`)),
})
const durable: GreenCleanDurableOneDayCounts = Object.freeze({
  executionId: "fresh-run-1",
  refreshRuns: 1,
  refreshUnits: 24,
  completedRefreshUnits: 24,
  populationRuns: 24,
  populationUnits: 24,
  rawObjects: 24,
  canonicalCommits: 24,
  commonWatermarks: 1,
  servingCandidates: 1,
  candidateGovernedThrough: GREEN_CLEAN_TARGET_END,
  candidateExposed: false,
})

function inspection(overrides: Partial<GreenCleanBootstrapInspection> = {}): GreenCleanBootstrapInspection {
  return {
    localLoopback: true,
    inactive: true,
    productionTargetCollision: false,
    databaseNames: [databaseSet.backfillDatabase, databaseSet.d4Database, databaseSet.refreshDatabase, databaseSet.servingDatabase],
    exactRoles: roles,
    roleConflicts: Object.freeze([]),
    grantClosureReady: true,
    privilegeClosure: Object.freeze({
      version: GREEN_CLEAN_PRIVILEGE_CLOSURE_VERSION,
      status: "PASS",
      rolesInspected: 18,
      operationsInspected: 298,
      denialTestsExecuted: 0,
      counters: Object.freeze({
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
      }),
      failures: Object.freeze([]),
    }),
    migrations,
    d2GovernanceReady: true,
    d4EvidenceGovernanceReady: true,
    d4ProjectionDefinitionsReady: true,
    d3ToD2ForeignKeys: foreignKeys,
    retainedRawObjects: raw,
    retainedRawTargetMatches: raw.map((value) => value.manifest.objectId),
    officialBaseline: baseline,
    refreshCounts: Object.freeze({ runs: 0, units: 0, events: 0, leases: 0, checkpoints: 0 }),
    ...overrides,
  }
}

function fakePorts(overrides: Partial<GreenCleanBootstrapPorts> = {}) {
  const calls: string[] = []
  let runCalls = 0
  const ports: GreenCleanBootstrapPorts = {
    reconcileDatabaseSet: async () => Object.freeze(Object.fromEntries([
      databaseSet.backfillDatabase,
      databaseSet.d4Database,
      databaseSet.refreshDatabase,
      databaseSet.servingDatabase,
    ].map((databaseName) => {
      calls.push(`database:${databaseName}`)
      return [databaseName, "CREATED" as const]
    }))),
    reconcileCanonicalGlobalRoles: async () => { calls.push("roles"); return "CREATED" },
    inspectCanonicalGlobalRoles: async () => ({ exact: roles, conflicts: Object.freeze([]) }),
    reconcileDatabaseAccess: async () => { calls.push("database-access"); return "CREATED" },
    reconcileDatabaseGrants: async () => { calls.push("grants"); return "CREATED" },
    applyMigrations: async (component) => {
      calls.push(`migration:${component}`)
      return [{ status: "APPLIED", migrationId: "001", checksum: canonicalChecksum(component) }]
    },
    seedD2Governance: async () => { calls.push("seed:d2"); return "CREATED" },
    seedD4EvidenceGovernance: async () => { calls.push("seed:d4-evidence"); return "CREATED" },
    seedD4ProjectionDefinitions: async () => { calls.push("seed:d4-projection"); return "CREATED" },
    readRetainedRawObjects: async () => raw,
    verifyRetainedRawFile: async (value) => ({ checksum: value.manifest.contentHash, sizeBytes: value.manifest.sizeBytes }),
    registerRetainedRawManifest: async (manifest) => { calls.push(`raw:${manifest.objectId}`); return "CREATED" },
    loadOfficialBaselineBundle: async () => { calls.push("baseline:load-official"); return baseline },
    publishOfficialBaselineBundle: async () => { calls.push("baseline:publish-official"); return "CREATED" },
    inspect: async () => inspection(),
    runCurrentCandidateCatchupOnce: async (input) => {
      calls.push(`catchup:${input.intent}:${String(input.allowResume)}`)
      runCalls += 1
      return { status: "COMPLETE", executionId: durable.executionId, commonWatermark: GREEN_CLEAN_TARGET_END, candidateGovernedThrough: GREEN_CLEAN_TARGET_END, candidateExposed: false, durableCounts: durable }
    },
    readDurableOneDayExecution: async () => durable,
    ...overrides,
  }
  return { ports, calls, runCalls: () => runCalls }
}

async function main() {
  assert.equal(parseMvpGreenCleanRebuildCommand(["bootstrap"]), "bootstrap")
  assert.equal(parseMvpGreenCleanRebuildCommand(["preflight"]), "preflight")
  assert.equal(parseMvpGreenCleanRebuildCommand(["run-one-day"]), "run-one-day")
  assert.throws(() => parseMvpGreenCleanRebuildCommand(["resume"]), /Usage/)

  const preflight = await preflightGreenCleanBootstrap(databaseSet, { inspect: async () => inspection() })
  assert.equal(preflight.status, "READY")
  assert.equal(preflight.slotCount, 24)
  assert.equal(preflight.foreignKeyCount, 16)
  const dirtyRefresh = await preflightGreenCleanBootstrap(databaseSet, { inspect: async () => inspection({ refreshCounts: { runs: 1 } }) })
  assert(dirtyRefresh.blockers.includes("REFRESH_TARGET_NOT_EMPTY"))
  const missingGrant = await preflightGreenCleanBootstrap(databaseSet, { inspect: async () => inspection({ grantClosureReady: false }) })
  assert(missingGrant.blockers.includes("ROLE_GRANT_CLOSURE_MISMATCH"))
  const falsePrivilegePassInspection = inspection()
  const falsePrivilegePass = await preflightGreenCleanBootstrap(databaseSet, {
    inspect: async () => inspection({
      privilegeClosure: {
        ...falsePrivilegePassInspection.privilegeClosure,
        status: "PASS",
        counters: { ...falsePrivilegePassInspection.privilegeClosure.counters, missingSchemaPrivileges: 1 },
      },
    }),
  })
  assert(falsePrivilegePass.blockers.includes("ROLE_PRIVILEGE_MATRIX_CLOSURE_MISMATCH"))
  const missingRaw = await preflightGreenCleanBootstrap(databaseSet, { inspect: async () => inspection({ retainedRawObjects: raw.slice(1), retainedRawTargetMatches: raw.slice(1).map((value) => value.manifest.objectId) }) })
  assert(missingRaw.blockers.includes("GREEN_CLEAN_RETAINED_RAW_CLOSURE_INCOMPLETE"))

  const bootstrapFake = fakePorts()
  const bootstrapped = await bootstrapGreenCleanPostgres(databaseSet, bootstrapFake.ports)
  assert.equal(bootstrapped.status, "CREATED")
  assert.deepEqual(bootstrapFake.calls.filter((value) => value.startsWith("migration:")), components.map((value) => `migration:${value}`))
  assert(bootstrapFake.calls.indexOf("baseline:load-official") < bootstrapFake.calls.indexOf("baseline:publish-official"))
  assert.equal(bootstrapped.rawManifests.created, 24)

  const roleConflict = fakePorts({ inspectCanonicalGlobalRoles: async () => ({ exact: roles.slice(1), conflicts: [roles[0]!] }) })
  await assert.rejects(() => bootstrapGreenCleanPostgres(databaseSet, roleConflict.ports), /CANONICAL_GLOBAL_ROLES_NOT_EXACT/)
  assert.deepEqual(roleConflict.calls, ["roles"])

  const fileConflict = fakePorts({ verifyRetainedRawFile: async (value) => ({ checksum: "0".repeat(64), sizeBytes: value.manifest.sizeBytes }) })
  await assert.rejects(() => bootstrapGreenCleanPostgres(databaseSet, fileConflict.ports), /RETAINED_RAW_FILE_CONFLICT/)
  assert.equal(fileConflict.calls.some((value) => value === "baseline:load-official"), false)

  const oneDayFake = fakePorts()
  const oneDay = await runGreenCleanOneDay(databaseSet, oneDayFake.ports)
  assert.equal(oneDay.status, "COMPLETE")
  assert.equal(oneDayFake.runCalls(), 1)
  assert(oneDayFake.calls.includes("catchup:RUN:false"))

  const durableConflict = fakePorts({ readDurableOneDayExecution: async () => ({ ...durable, canonicalCommits: 23 }) })
  await assert.rejects(() => runGreenCleanOneDay(databaseSet, durableConflict.ports), /DURABLE_COUNTS_MISMATCH/)
  assert.equal(durableConflict.runCalls(), 1)

  const commandFake = fakePorts()
  assert.equal((await executeMvpGreenCleanRebuildCommand("preflight", databaseSet, commandFake.ports) as { status: string }).status, "READY")
  console.log(JSON.stringify({ status: "PASS", canonicalGlobalRoles: true, uniqueDatabaseSet: true, officialBaselineBundle: true, exactRetainedRawReuse: 24, exactForeignKeys: 16, runOnlyNoResume: true, durableReadback: true }))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "GREEN_CLEAN_BOOTSTRAP_UNIT_SUITE_FAILED")
  process.exitCode = 1
})
