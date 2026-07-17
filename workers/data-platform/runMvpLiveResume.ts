import { execFileSync } from "node:child_process"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  ControlledOhlcvRecoveryStore,
  MvpLiveResumeCoordinator,
  MvpRefreshStore,
  assertSanitizedLiveResumeOutput,
  buildRefreshSlotResumePlan,
  createCertifiedLiveResumePlan,
  certifyLiveResumeIdentityCompatibility,
  createMvpRefreshClientFromEnvironment,
  createBoundedArchiveRequest,
  createBoundedFundingRequest,
  createDryRunLiveResumeExecutionSetup,
  createLiveResumeEnvironmentFromProcessEnv,
  inspectBoundedArchiveAvailability,
  inspectIntegratedMvpGovernancePrerequisites,
  liveResumeRunIdentity,
  ensureIntegratedMvpGovernancePrerequisites,
  liveResumeStageOutput,
  parseLiveResumeWorkerOptions,
  PostgresLiveResumeExecutionStore,
  PostgresExecutionGenerationQuarantineStore,
  LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT,
  assertExpectedExecutionGenerationIncident,
  createCleanGenerationInputManifest,
  createCleanExecutionGenerationContext,
  createCleanCertifiedLiveResumePlan,
  verifyCleanGenerationManifest,
  createExecutionGenerationQuarantineProposal,
  readExecutionGenerationDisposition,
  type LiveResumeCoordinatorPorts,
  type LiveResumeStageCheckpoint,
  type CertifiedLiveResumePlan,
} from "@/lib/data-platform/mvp-refresh"
import { createBoundedFundingSourceUrl } from "@/lib/data-platform/mvp-refresh/boundedFunding"
import { createCanonicalPersistenceAdapter } from "@/lib/data-platform/persistence/postgres"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"

const INSTRUMENTS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const
const DATASETS = ["ohlcv", "open-interest", "funding", "agg-trade"] as const
const CONTAMINATED_GENERATION = "mrlr_440fd1b84362eaf01744d9ff22d95c35ebcf564e7c4c827829047aef7266074b" as const
const CONTAMINATED_PLAN = "mrlp_e01c4dc5a8962f070d27b57b718e3914a6973013882d445b0e9a10706accc1c5" as const
const CONTAMINATED_PLAN_CHECKSUM = "e01c4dc5a8962f070d27b57b718e3914a6973013882d445b0e9a10706accc1c5" as const
const TARGET_START = "2026-07-15T00:00:00.000Z" as const
const TARGET_END = "2026-07-16T00:00:00.000Z" as const

async function loadPlan(start: string, end: string) {
  const client = createMvpRefreshClientFromEnvironment()
  try {
    await client.verify()
    const persisted = await new PostgresLiveResumeExecutionStore(client).readPersistedExecution(start, end)
    if (persisted) return Object.freeze({ plan: persisted.plan, authorityCount: 1, persistedExecution: true })
    const attempts = await new MvpRefreshStore(client).auditUnitsForWindow(start, end)
    const authorities = await new ControlledOhlcvRecoveryStore(client).readAuthoritiesForWindow(start, end)
    const slots = buildRefreshSlotResumePlan({ intervalStart: start, intervalEnd: end, attempts, authoritativeResolutions: authorities, sourceFinalizationState: "SOURCE_AVAILABLE" })
    return Object.freeze({ plan: createCertifiedLiveResumePlan({ intervalStart: start, intervalEnd: end, slots }), authorityCount: authorities.length, persistedExecution: false })
  } finally { await client.shutdown() }
}

async function cleanGenerationBundle(input: { readonly operatorConfirmationIdentity: string; readonly expectedManifestChecksum?: string }) {
  const refresh = createMvpRefreshClientFromEnvironment()
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-clean-generation-audit" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-clean-generation-audit" } })
  try {
    await refresh.verify()
    const store = new PostgresExecutionGenerationQuarantineStore(refresh, integrated.d3, integrated.d2)
    const snapshot = await store.inspect(CONTAMINATED_GENERATION)
    assertExpectedExecutionGenerationIncident(snapshot, { runId: CONTAMINATED_GENERATION, planId: CONTAMINATED_PLAN, planChecksum: CONTAMINATED_PLAN_CHECKSUM, intervalStart: TARGET_START, intervalEnd: TARGET_END, counts: { refreshUnits: 23, populationRunAttempts: 6, populationUnits: 4, retrievalAttempts: 4, rawObjects: 4, candidates: 294, canonicalFacts: 0, downstreamOutputs: 0, replayOutputs: 0, watermarks: 0, manifests: 0 } })
    const saga = await store.readSagaStatus(CONTAMINATED_GENERATION)
    if (!saga || saga.quarantineSagaState !== "COMPLETE" || saga.resumeEligible || saga.activePopulationLeases !== 0 || !saga.quarantineReceiptId) throw new Error("CLEAN_GENERATION_PREDECESSOR_NOT_SAFELY_QUARANTINED")
    const sourceCommitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
    const proposal = createExecutionGenerationQuarantineProposal({ snapshot, reasonCode: LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT, sourceCommitSha, operatorConfirmationIdentity: input.operatorConfirmationIdentity })
    const lineage = await createPopulationPostgresAdapter(integrated.d3).auditBoundedAcquisitionLineage(TARGET_START, TARGET_END, "mvp-live-resume")
    const predecessor = await new PostgresLiveResumeExecutionStore(refresh).readPersistedExecution(TARGET_START, TARGET_END)
    if (!predecessor || predecessor.runId !== CONTAMINATED_GENERATION) throw new Error("CLEAN_GENERATION_PREDECESSOR_EXECUTION_MISSING")
    const manifest = createCleanGenerationInputManifest({ proposal, logicalSlotIds: predecessor.plan.slots.map((slot) => slot.logicalSlotId), checkpointIds: lineage.units.flatMap((unit) => unit.checkpointId ? [unit.checkpointId] : []) })
    verifyCleanGenerationManifest(manifest)
    if (input.expectedManifestChecksum && manifest.checksum !== input.expectedManifestChecksum) throw new Error("CLEAN_GENERATION_MANIFEST_CHECKSUM_CONFLICT")
    const context = createCleanExecutionGenerationContext({ manifest, predecessorQuarantineReceiptId: saga.quarantineReceiptId, sourceCommitSha, operatorConfirmationIdentity: input.operatorConfirmationIdentity })
    const plan = createCleanCertifiedLiveResumePlan({ predecessorPlan: predecessor.plan, context })
    return Object.freeze({ manifest, context, plan, predecessorSnapshot: snapshot, saga })
  } finally { await Promise.allSettled([refresh.shutdown(), integrated.shutdown()]) }
}

async function loadCleanPlan(executionGenerationId: string): Promise<CertifiedLiveResumePlan> {
  const client = createMvpRefreshClientFromEnvironment()
  try {
    await client.verify()
    const events = await client.sql.unsafe<Array<{ payload: unknown }>>("SELECT payload FROM refresh_control.refresh_event WHERE entity_kind='clean_execution_generation' AND entity_id=$1 AND event_kind='CLEAN_EXECUTION_GENERATION_CREATED'", [executionGenerationId])
    if (events.length !== 1) throw new Error("CLEAN_GENERATION_RECEIPT_NOT_FOUND")
    let receipt = events[0]!.payload
    if (typeof receipt === "string") receipt = JSON.parse(receipt)
    const planId = String((receipt as { planId?: unknown }).planId ?? "")
    const rows = await client.sql.unsafe<Array<{ plan: unknown }>>("SELECT plan FROM refresh_control.refresh_plan WHERE plan_id=$1", [planId])
    if (rows.length !== 1) throw new Error("CLEAN_GENERATION_PLAN_NOT_FOUND")
    let payload = rows[0]!.plan
    for (let index = 0; index < 2 && typeof payload === "string"; index++) payload = JSON.parse(payload)
    const plan = (payload as { certifiedPlan?: CertifiedLiveResumePlan }).certifiedPlan
    if (!plan || plan.executionGeneration?.executionGenerationId !== executionGenerationId) throw new Error("CLEAN_GENERATION_PLAN_IDENTITY_MISMATCH")
    return plan
  } finally { await client.shutdown() }
}

async function cleanGenerationStatus(plan: CertifiedLiveResumePlan) {
  const client = createMvpRefreshClientFromEnvironment()
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-clean-generation-status" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-clean-generation-status" } })
  try {
    await client.verify()
    const status = await new PostgresLiveResumeExecutionStore(client).status(plan)
    const runId = liveResumeRunIdentity(plan).runId
    const counts = await integrated.d3.sql.unsafe<Array<{ jobs: number; runs: number; units: number; retrievals: number; candidates: number; active_leases: number }>>("SELECT (SELECT count(*)::int FROM control.population_jobs WHERE intentional_rerun_identity=$1) jobs,(SELECT count(*)::int FROM control.population_runs r JOIN control.population_jobs j ON j.job_id=r.job_id WHERE j.intentional_rerun_identity=$1) runs,(SELECT count(*)::int FROM control.population_units u JOIN control.population_jobs j ON j.job_id=u.job_id WHERE j.intentional_rerun_identity=$1) units,(SELECT count(*)::int FROM control.retrieval_attempts a JOIN control.population_units u ON u.unit_id=a.unit_id JOIN control.population_jobs j ON j.job_id=u.job_id WHERE j.intentional_rerun_identity=$1) retrievals,(SELECT count(*)::int FROM population.candidates c JOIN control.population_units u ON u.unit_id=c.unit_id JOIN control.population_jobs j ON j.job_id=u.job_id WHERE j.intentional_rerun_identity=$1) candidates,(SELECT count(*)::int FROM control.population_leases l JOIN control.population_units u ON u.unit_id=l.unit_id JOIN control.population_jobs j ON j.job_id=u.job_id WHERE j.intentional_rerun_identity=$1 AND l.released_at IS NULL AND l.expires_at>now()) active_leases", [runId])
    return Object.freeze({ executionGenerationId: plan.executionGeneration!.executionGenerationId, predecessorRunId: plan.executionGeneration!.predecessorRunId, planId: plan.planIdentity, runId, logicalSlots: 24, authoritativeReuse: 1, executableUnits: 23, refresh: status, population: counts[0], activationAvailable: false, productionMutation: false })
  } finally { await Promise.allSettled([client.shutdown(), integrated.shutdown()]) }
}

async function withIntegrated<T>(work: (clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>) => Promise<T>): Promise<T> {
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-live-governance" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-live-governance-read" } })
  try { return await work(integrated) } finally { await integrated.shutdown() }
}

async function withIntegratedD2<T>(work: (client: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>["d2"]) => Promise<T>): Promise<T> { return withIntegrated((clients) => work(clients.d2)) }

async function governanceInventory(start: string) {
  return withIntegratedD2((client) => inspectIntegratedMvpGovernancePrerequisites(client, start))
}

async function bootstrapGovernance(start: string) {
  return withIntegratedD2((client) => ensureIntegratedMvpGovernancePrerequisites({ client, adapter: createCanonicalPersistenceAdapter(client), effectiveAt: start }))
}

async function lineageInventory(start: string, end: string) {
  return withIntegrated(async (clients) => createPopulationPostgresAdapter(clients.d3).auditBoundedAcquisitionLineage(start, end, "mvp-live-resume"))
}

async function resumeLeaseInventory(start: string, end: string) {
  return withIntegrated(async (clients) => createPopulationPostgresAdapter(clients.d3).inspectResumeLeaseEligibility({ intervalStart: start, intervalEnd: end, requestedBy: "mvp-live-resume", now: new Date().toISOString() }))
}

async function generationDisposition(runId: string) {
  const client = createMvpRefreshClientFromEnvironment()
  try { await client.verify(); return await readExecutionGenerationDisposition(client, runId) }
  finally { await client.shutdown() }
}

async function quarantineSagaStatus(runId: string) {
  const refresh = createMvpRefreshClientFromEnvironment()
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-generation-quarantine-status" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-generation-quarantine-status" } })
  try {
    await refresh.verify()
    return await new PostgresExecutionGenerationQuarantineStore(refresh, integrated.d3, integrated.d2).readSagaStatus(runId)
  } finally { await Promise.allSettled([refresh.shutdown(), integrated.shutdown()]) }
}

async function quarantineGeneration(options: Extract<ReturnType<typeof parseLiveResumeWorkerOptions>, { readonly command: "quarantine-generation" }>) {
  if (options.runId !== CONTAMINATED_GENERATION) throw new Error("QUARANTINE_GENERATION_NOT_CERTIFIED")
  if (options.reason !== LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT) throw new Error("QUARANTINE_REASON_NOT_CERTIFIED")
  const refresh = createMvpRefreshClientFromEnvironment()
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-generation-quarantine-audit" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-generation-quarantine" } })
  try {
    await refresh.verify()
    const store = new PostgresExecutionGenerationQuarantineStore(refresh, integrated.d3, integrated.d2)
    const snapshot = await store.inspect(options.runId)
    assertExpectedExecutionGenerationIncident(snapshot, { runId: CONTAMINATED_GENERATION, planId: CONTAMINATED_PLAN, planChecksum: CONTAMINATED_PLAN_CHECKSUM, intervalStart: TARGET_START, intervalEnd: TARGET_END, counts: { refreshUnits: 23, populationRunAttempts: 6, populationUnits: 4, retrievalAttempts: 4, rawObjects: 4, candidates: 294, canonicalFacts: 0, downstreamOutputs: 0, replayOutputs: 0, watermarks: 0, manifests: 0 } })
    const sourceCommitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8", windowsHide: true }).trim()
    const proposal = createExecutionGenerationQuarantineProposal({ snapshot, reasonCode: LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT, sourceCommitSha, operatorConfirmationIdentity: options.operatorConfirmationIdentity })
    const lineage = await createPopulationPostgresAdapter(integrated.d3).auditBoundedAcquisitionLineage(TARGET_START, TARGET_END, "mvp-live-resume")
    const certified = await loadPlan(TARGET_START, TARGET_END)
    const handoff = createCleanGenerationInputManifest({ proposal, logicalSlotIds: certified.plan.slots.map((slot) => slot.logicalSlotId), checkpointIds: lineage.units.flatMap((unit) => unit.checkpointId ? [unit.checkpointId] : []) })
    if (!options.confirmQuarantine) return Object.freeze({ mode: "PREVIEW", proposal: { version: proposal.version, disposition: proposal.disposition, generationId: proposal.generationId, planId: proposal.planId, runId: proposal.runId, intervalStart: proposal.intervalStart, intervalEnd: proposal.intervalEnd, reasonCode: proposal.reasonCode, incidentChecksum: proposal.incidentChecksum, evidenceSummaryChecksum: proposal.evidenceSummaryChecksum, sourceCommitSha: proposal.sourceCommitSha }, affected: { refreshUnits: snapshot.lineageCounts.refreshUnits, populationRunAttempts: snapshot.lineageCounts.populationRunAttempts, populationUnits: snapshot.lineageCounts.populationUnits, activeLeases: snapshot.activeLeaseCount, unreleasedLeases: snapshot.unreleasedLeaseCount, retrievalAttempts: snapshot.lineageCounts.retrievalAttempts, rawObjects: snapshot.lineageCounts.rawObjects, candidates: snapshot.lineageCounts.candidates, commonWatermark: snapshot.commonWatermark, servingCandidate: snapshot.servingCandidate }, cleanGenerationHandoff: { checksum: handoff.checksum, logicalSlots: handoff.logicalSlotIds.length, logicalSlotIdentitySetChecksum: canonicalChecksum(handoff.logicalSlotIds), reusableRawPayloads: handoff.reusableRawPayloadBytes.length, reusableRawPayloadSetChecksum: canonicalChecksum(handoff.reusableRawPayloadBytes), excludedPopulationRunAttempts: handoff.excludedExecutionIdentities.populationRunAttempts.length, excludedPopulationRunAttemptSetChecksum: canonicalChecksum(handoff.excludedExecutionIdentities.populationRunAttempts), excludedRetrievalAttempts: handoff.excludedExecutionIdentities.retrievalAttempts.length, excludedRetrievalAttemptSetChecksum: canonicalChecksum(handoff.excludedExecutionIdentities.retrievalAttempts), excludedCandidates: handoff.excludedExecutionIdentities.candidates.length, excludedCandidateSetChecksum: canonicalChecksum(handoff.excludedExecutionIdentities.candidates), excludedCheckpoints: handoff.excludedExecutionIdentities.checkpoints.length, excludedCheckpointSetChecksum: canonicalChecksum(handoff.excludedExecutionIdentities.checkpoints), freshLineagePolicy: handoff.freshLineagePolicy }, writes: 0, productionMutation: false })
    const receipt = await store.quarantine({ proposal, expectedIncidentChecksum: options.incidentChecksum!, quarantinedAt: new Date().toISOString() })
    if (receipt.status === "CONFLICT") throw new Error("EXECUTION_GENERATION_QUARANTINE_CONFLICT")
    return Object.freeze({ mode: "CONFIRMED", receipt, handoff })
  } finally { await Promise.allSettled([refresh.shutdown(), integrated.shutdown()]) }
}

async function reconcileQuarantine(options: Extract<ReturnType<typeof parseLiveResumeWorkerOptions>, { readonly command: "reconcile-quarantine" }>) {
  if (options.runId !== CONTAMINATED_GENERATION) throw new Error("QUARANTINE_GENERATION_NOT_CERTIFIED")
  const refresh = createMvpRefreshClientFromEnvironment()
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-generation-quarantine-reconcile-audit" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-generation-quarantine-reconcile" } })
  try {
    await refresh.verify()
    const store = new PostgresExecutionGenerationQuarantineStore(refresh, integrated.d3, integrated.d2)
    const snapshot = await store.inspect(options.runId)
    assertExpectedExecutionGenerationIncident(snapshot, { runId: CONTAMINATED_GENERATION, planId: CONTAMINATED_PLAN, planChecksum: CONTAMINATED_PLAN_CHECKSUM, intervalStart: TARGET_START, intervalEnd: TARGET_END, counts: { refreshUnits: 23, populationRunAttempts: 6, populationUnits: 4, retrievalAttempts: 4, rawObjects: 4, candidates: 294, canonicalFacts: 0, downstreamOutputs: 0, replayOutputs: 0, watermarks: 0, manifests: 0 } })
    const before = await store.readSagaStatus(options.runId)
    if (!before) throw new Error("EXECUTION_GENERATION_QUARANTINE_INTENT_MISSING")
    if (!options.confirmReconcile) return Object.freeze({ mode: "PREVIEW", runId: options.runId, incidentChecksum: before.incidentChecksum, quarantineSagaState: before.quarantineSagaState, missingQuarantineSteps: before.missingQuarantineSteps, quarantineReceiptId: before.quarantineReceiptId, populationUnitCount: before.populationUnitCount, populationFencingEventCount: before.populationFencingEventCount, activePopulationLeases: before.activePopulationLeases, resumeEligible: false, writes: 0, productionMutation: false })
    const receipt = await store.reconcile({ runId: options.runId, expectedIncidentChecksum: options.incidentChecksum!, operatorConfirmationIdentity: options.operatorConfirmationIdentity, reconciledAt: new Date().toISOString() })
    if (receipt.status === "CONFLICT") throw new Error("EXECUTION_GENERATION_QUARANTINE_CONFLICT")
    return Object.freeze({ mode: "CONFIRMED", receipt, productionMutation: false })
  } finally { await Promise.allSettled([refresh.shutdown(), integrated.shutdown()]) }
}

async function preflight(start: string, end: string, planOverride?: CertifiedLiveResumePlan) {
  const loaded = planOverride ? Object.freeze({ plan: planOverride, authorityCount: 1, persistedExecution: true }) : await loadPlan(start, end)
  const disposition = await generationDisposition(liveResumeRunIdentity(loaded.plan).runId)
  if (disposition?.disposition === "QUARANTINED") {
    const saga = await quarantineSagaStatus(disposition.runId)
    return Object.freeze({ passed: false, blocker: "EXECUTION_GENERATION_QUARANTINED", disposition, quarantineSagaState: saga?.quarantineSagaState ?? "INTENT_RECORDED", missingQuarantineSteps: saga?.missingQuarantineSteps ?? Object.freeze(["POPULATION_FENCING", "QUARANTINE_COMPLETED_RECEIPT"]), quarantineReceiptId: saga?.quarantineReceiptId ?? null, productionOrNeonWriteTarget: false as const })
  }
  if (disposition?.disposition === "SUPERSEDED") return Object.freeze({ passed: false, blocker: "EXECUTION_GENERATION_SUPERSEDED", disposition, productionOrNeonWriteTarget: false as const })
  const governance = await governanceInventory(start)
  const governanceReady = governance.every((entry) => entry.state === "READY")
  if (!governanceReady) {
    const conflicts = governance.filter((entry) => entry.state === "CHECKSUM_CONFLICT" || entry.state === "VERSION_MISMATCH").map((entry) => entry.identity)
    return Object.freeze({ passed: false, blocker: conflicts.length ? "GOVERNANCE_PREREQUISITE_CONFLICT" : "GOVERNANCE_PREREQUISITE_MISSING", governance: { ready: governance.filter((entry) => entry.state === "READY").length, missing: governance.filter((entry) => entry.state === "MISSING").map((entry) => entry.identity), conflicts }, productionOrNeonWriteTarget: false as const })
  }
  const archiveRequests = DATASETS.filter((value) => value !== "funding").flatMap((dataset) => INSTRUMENTS.map((instrument) => createBoundedArchiveRequest({ dataset, provider: "binance-vision", instrument, eventTimeStart: start, eventTimeEnd: end, sourceContractVersion: dataset === "ohlcv" ? "mvp-bounded-ohlcv/1.0.0" : dataset === "open-interest" ? "mvp-bounded-open-interest/1.0.0" : "mvp-bounded-agg-trade/1.0.0", maximumRecordCount: dataset === "ohlcv" ? 288 : dataset === "open-interest" ? 10_000 : 10_000_000 })))
  const fundingRequests = INSTRUMENTS.map((instrument) => createBoundedFundingRequest({ provider: "binance-official-rest-funding-rate", instrument, eventTimeStart: start, eventTimeEnd: end, maximumEventCount: 1_000, requestedAt: new Date().toISOString() }))
  const [archives, funding, resumeLeases] = await Promise.all([
    Promise.all(archiveRequests.map((request) => inspectBoundedArchiveAvailability(request))),
    Promise.all(fundingRequests.map(async (request) => {
      try {
        const response = await fetch(createBoundedFundingSourceUrl(request), { cache: "no-store", signal: AbortSignal.timeout(20_000) })
        if (!response.ok) return Object.freeze({ instrument: request.instrument, ready: false, classification: "SOURCE_UNAVAILABLE" })
        const value: unknown = await response.json()
        return Object.freeze({ instrument: request.instrument, ready: Array.isArray(value), classification: Array.isArray(value) ? "READY" : "MALFORMED_SOURCE_DATA" })
      } catch { return Object.freeze({ instrument: request.instrument, ready: false, classification: "CONNECTION_FAILED" }) }
    })),
    planOverride?.executionGeneration ? Promise.resolve(Object.freeze([])) : resumeLeaseInventory(start, end),
  ])
  const localEnvironment = await createLiveResumeEnvironmentFromProcessEnv({ mode: "PREFLIGHT", intervalStart: start, intervalEnd: end, plannerIdentity: loaded.plan.planIdentity, plannerChecksum: loaded.plan.planChecksum })
  const authoritySlot = loaded.plan.slots.find((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT")!
  const identityCompatibility = localEnvironment.ports ? certifyLiveResumeIdentityCompatibility(loaded.plan, await localEnvironment.ports.authoritativeOhlcv.reuse(authoritySlot)) : null
  const environment = Object.freeze({ version: "mvp-live-resume-environment/1.0.0", passed: localEnvironment.passed && identityCompatibility?.passed === true, capabilities: localEnvironment.capabilities, identityCompatibility, productionOrNeonWriteTarget: false as const })
  await localEnvironment.close()
  const planCounts = { reuseAuthoritative: loaded.plan.slots.filter((slot) => slot.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length, createNew: loaded.plan.slots.filter((slot) => slot.action === "CREATE_NEW_ON_LIVE_RESUME").length, conflicts: loaded.plan.slots.filter((slot) => slot.action === "BLOCKED_CONFLICT").length }
  const archivePass = archives.length === 18 && archives.every((value) => value.sourceClassification === "HTTP_SUCCESS" && value.available && value.finalized)
  const fundingPass = funding.length === 6 && funding.every((value) => value.ready)
  const resumableLeases = resumeLeases.filter((value) => value.stage !== "COMPLETE")
  const resumeLeasePass = resumableLeases.every((value) => value.eligible)
  const passed = environment.passed && archivePass && fundingPass && resumeLeasePass && loaded.authorityCount === 1 && planCounts.reuseAuthoritative === 1 && planCounts.createNew === 23 && planCounts.conflicts === 0
  return Object.freeze({ passed, disposition: disposition?.disposition ?? "ACTIVE", governance: { ready: governance.length, missing: Object.freeze([]), conflicts: Object.freeze([]) }, environment, sourceAvailability: { archives: { checked: archives.length, ready: archives.filter((value) => value.available && value.finalized).length, passed: archivePass }, funding: { checked: funding.length, ready: funding.filter((value) => value.ready).length, passed: fundingPass } }, resumeLeaseEligibility: { checked: resumableLeases.length, eligible: resumableLeases.filter((value) => value.eligible).length, passed: resumeLeasePass, units: resumableLeases.map((value) => ({ unitId: value.unitId, dataset: value.dataset, instrument: value.instrument, state: value.currentState, runState: value.runState, stage: value.stage, fence: value.currentFence, activeLease: value.activeLease, leaseExpired: value.leaseExpired, eligible: value.eligible, reason: value.reason })) }, authority: { count: loaded.authorityCount, checksumValid: loaded.authorityCount === 1 }, planner: { planIdentity: loaded.plan.planIdentity, planChecksum: loaded.plan.planChecksum, logicalSlots: loaded.plan.slots.length, ...planCounts }, productionOrNeonWriteTarget: false })
}

function dryRunPorts(gate: Awaited<ReturnType<typeof preflight>>): LiveResumeCoordinatorPorts {
  if (!("environment" in gate)) throw new Error("GOVERNANCE_PREREQUISITE_MISSING")
  const checkpoints = new Map<string, LiveResumeStageCheckpoint>()
  return {
    targets: { classify: async () => ({ refreshLocal: gate.environment.passed, truthPlaneLocal: gate.environment.passed, servingLocal: gate.environment.passed, objectStorageLocal: gate.environment.passed, servingPublisher: gate.environment.passed, managedOrProductionTarget: gate.productionOrNeonWriteTarget }) },
    execution: { resolveOrCreate: async ({ plan }) => createDryRunLiveResumeExecutionSetup(plan) },
    lease: { acquire: async () => ({ fencingToken: 1 }), assert: async () => undefined, release: async () => undefined },
    checkpoints: { read: async (runId, stage) => checkpoints.get(`${runId}:${stage}`) ?? null, append: async (checkpoint) => { const key = `${checkpoint.coordinatorRunId}:${checkpoint.stage}`, existing = checkpoints.get(key); if (existing && existing.checksum !== checkpoint.checksum) throw new Error("LIVE_RESUME_DRY_RUN_CHECKPOINT_CONFLICT"); if (existing) return "DUPLICATE"; checkpoints.set(key, checkpoint); return "CREATED" }, appendFailure: async () => "CREATED" },
    authoritativeOhlcv: { reuse: async () => { throw new Error("DRY_RUN_MUST_NOT_EXECUTE_AUTHORITY") } },
    executors: Object.fromEntries(DATASETS.map((dataset) => [dataset, { execute: async () => { throw new Error("DRY_RUN_MUST_NOT_EXECUTE_DATASET") } }])) as unknown as LiveResumeCoordinatorPorts["executors"],
    watermarks: { persistDataset: async () => { throw new Error("DRY_RUN_MUST_NOT_WRITE_WATERMARK") }, persistCommon: async () => { throw new Error("DRY_RUN_MUST_NOT_WRITE_WATERMARK") } },
    downstream: Object.fromEntries(["coverage", "consistency", "evidence", "projections", "replay"].map((name) => [name, async () => { throw new Error(`DRY_RUN_MUST_NOT_EXECUTE_${name.toUpperCase()}`) }])) as unknown as LiveResumeCoordinatorPorts["downstream"],
    candidate: { assemble: async () => { throw new Error("DRY_RUN_MUST_NOT_ASSEMBLE_CANDIDATE") }, persistManifest: async () => { throw new Error("DRY_RUN_MUST_NOT_PERSIST_MANIFEST") }, compare: async () => liveResumeStageOutput({}, []) },
  }
}

async function main() {
  const options = parseLiveResumeWorkerOptions(process.argv.slice(2))
  if (options.command === "quarantine-generation") return print({ command: options.command, result: await quarantineGeneration(options) })
  if (options.command === "reconcile-quarantine") return print({ command: options.command, result: await reconcileQuarantine(options) })
  if (options.command === "create-clean-generation") {
    if (options.predecessorRunId !== CONTAMINATED_GENERATION || options.start !== TARGET_START || options.end !== TARGET_END) throw new Error("CLEAN_GENERATION_TARGET_NOT_CERTIFIED")
    const bundle = await cleanGenerationBundle({ operatorConfirmationIdentity: options.operatorConfirmationIdentity, expectedManifestChecksum: options.manifestChecksum })
    const gate = await preflight(options.start, options.end, bundle.plan)
    if (!gate.passed) throw new Error("CLEAN_GENERATION_PRECONDITION_FAILED")
    const client = createMvpRefreshClientFromEnvironment()
    try {
      await client.verify()
      const setup = await new PostgresLiveResumeExecutionStore(client).resolveOrCreate({ plan: bundle.plan, mode: "LIVE", intent: "RUN" })
      return print({ command: options.command, status: setup.runStatus === "CREATED" ? "CREATED" : "DUPLICATE", executionGenerationId: bundle.context.executionGenerationId, manifestChecksum: bundle.manifest.checksum, planId: setup.persistedPlanId, runId: setup.persistedRunId, refreshUnits: setup.unitOutcomes.length, authoritativeReuse: 1, populationAttempts: 0, retrievals: 0, candidates: 0, downstream: 0, commonWatermark: null, candidateManifest: null, activationAvailable: false, productionMutation: false })
    } finally { await client.shutdown() }
  }
  if (options.command === "clean-generation-status") {
    const plan = await loadCleanPlan(options.executionGenerationId)
    return print({ command: options.command, status: await cleanGenerationStatus(plan) })
  }
  if (options.command === "clean-generation-preflight") {
    const plan = await loadCleanPlan(options.executionGenerationId)
    const result = await preflight(plan.intervalStart, plan.intervalEnd, plan)
    return print({ command: options.command, executionGenerationId: options.executionGenerationId, result })
  }
  if (options.command === "execute-clean-generation") {
    const plan = await loadCleanPlan(options.executionGenerationId)
    const environment = await createLiveResumeEnvironmentFromProcessEnv({ mode: "LIVE", intervalStart: plan.intervalStart, intervalEnd: plan.intervalEnd, plannerIdentity: plan.planIdentity, plannerChecksum: plan.planChecksum })
    try {
      if (!environment.ports) throw new Error("LIVE_RESUME_LOCAL_PREFLIGHT_FAILED")
      const result = await new MvpLiveResumeCoordinator(environment.ports).execute({ plan, allowedInstruments: INSTRUMENTS, allowedDatasets: DATASETS, mode: "LIVE", intent: "RESUME" })
      return print({ command: options.command, executionGenerationId: options.executionGenerationId, result })
    } finally { await environment.close() }
  }
  if (!("start" in options)) throw new Error("LIVE_RESUME_COMMAND_INVALID")
  if (options.command === "inspect") {
    const environment = await createLiveResumeEnvironmentFromProcessEnv({ mode: "INSPECT" })
    return print({ command: options.command, coordinatorVersion: "mvp-live-resume-coordinator/1.0.0", environmentVersion: "mvp-live-resume-environment/1.0.0", capabilities: environment.capabilities, commands: ["inspect", "plan", "preflight", "bootstrap-governance", "quarantine-generation", "reconcile-quarantine", "create-clean-generation", "clean-generation-status", "clean-generation-preflight", "execute-clean-generation", "dry-run", "run", "resume", "status", "verify"], liveConfirmationRequired: true })
  }
  if (options.command === "bootstrap-governance") {
    const result = await bootstrapGovernance(options.start)
    return print({ command: options.command, status: result.status, entries: result.entries.map((entry) => ({ kind: entry.kind, dataset: entry.dataset, identity: entry.identity, checksum: entry.expectedChecksum, state: entry.state })), productionMutation: false })
  }
  if (options.command === "status") {
    const client = createMvpRefreshClientFromEnvironment()
    try {
      await client.verify()
      const status = await new PostgresLiveResumeExecutionStore(client).statusForWindow(options.start, options.end)
      const governance = await governanceInventory(options.start)
      const lineage = await lineageInventory(options.start, options.end)
      const saga = status?.persistedRunId ? await quarantineSagaStatus(status.persistedRunId) : null
      const lineageBlockers = lineage.units.filter((unit) => unit.retrievalAttempts > 0 && unit.candidates === 0).map((unit) => ({ unitId: unit.unitId, dataset: unit.dataset, instrument: unit.instrument, reason: "CANDIDATE_LINEAGE_INCOMPLETE" }))
      const quarantined = status?.disposition === "QUARANTINED"
      const lineageUnits = lineage.units.map(({ fencingToken, ...unit }) => ({ ...unit, resumeEligible: quarantined ? false : unit.resumeEligible, fence: fencingToken }))
      const durablePopulationStage = lineage.units.some((unit) => unit.resumeStage === "CANDIDATE_LINEAGE") ? "CANDIDATE_LINEAGE" : lineage.units.some((unit) => unit.resumeStage === "CANONICAL_COMMIT") ? "CANONICAL_COMMIT" : lineage.units.every((unit) => unit.resumeStage === "COMPLETE") ? "COMPLETE" : "SOURCE_ACQUISITION"
      return print({ command: options.command, status: status ? { ...status, quarantineSagaState: saga?.quarantineSagaState ?? null, missingQuarantineSteps: saga?.missingQuarantineSteps ?? Object.freeze([]), quarantineReceiptId: saga?.quarantineReceiptId ?? null, durablePopulationStage, effectiveCoordinatorStage: status.currentCoordinatorStage === "UNITS_RESOLVED" ? durablePopulationStage : status.currentCoordinatorStage } : null, lineage: { ...lineage, units: lineageUnits, activeLeases: lineage.units.filter((unit) => unit.activeLease).length, immutableCounts: { retrievalAttempts: lineage.retrievalAttempts, rawObjects: lineage.rawObjects, candidates: lineage.candidates }, nonAuthoritativeExecutionAttempts: lineage.units.reduce((total, unit) => total + unit.nonAuthoritativePartialOutputs, 0), unattributedPayloadCount: Math.max(0, (status?.retainedArtifacts ?? 0) - lineage.rawObjects), blockers: quarantined ? Object.freeze([{ reason: "EXECUTION_GENERATION_QUARANTINED" }]) : lineageBlockers }, governance: { ready: governance.filter((entry) => entry.state === "READY").length, missing: governance.filter((entry) => entry.state === "MISSING").map((entry) => entry.identity), conflicts: governance.filter((entry) => entry.state === "CHECKSUM_CONFLICT" || entry.state === "VERSION_MISMATCH").map((entry) => entry.identity) }, productionMutation: false })
    } finally { await client.shutdown() }
  }
  const loaded = await loadPlan(options.start, options.end)
  if (options.command === "plan") return print({ command: options.command, plan: { planIdentity: loaded.plan.planIdentity, planChecksum: loaded.plan.planChecksum, logicalSlots: 24, reuseAuthoritative: 1, createNew: 23, conflicts: 0 } })
  const gate = await preflight(options.start, options.end)
  if (options.command === "preflight") return print({ command: options.command, result: gate })
  if (options.command === "dry-run" || options.command === "verify") {
    if (!gate.passed) throw new Error("LIVE_RESUME_PREFLIGHT_FAILED")
    const result = await new MvpLiveResumeCoordinator(dryRunPorts(gate)).execute({ plan: loaded.plan, allowedInstruments: INSTRUMENTS, allowedDatasets: DATASETS, mode: "DRY_RUN" })
    return print({ command: options.command, result })
  }
  if (options.command === "run" || options.command === "resume") {
    if (!gate.passed) throw new Error("LIVE_RESUME_PREFLIGHT_FAILED")
    const environment = await createLiveResumeEnvironmentFromProcessEnv({ mode: "LIVE", intervalStart: options.start, intervalEnd: options.end, plannerIdentity: loaded.plan.planIdentity, plannerChecksum: loaded.plan.planChecksum })
    try {
      if (!environment.ports) throw new Error("LIVE_RESUME_LOCAL_PREFLIGHT_FAILED")
      const result = await new MvpLiveResumeCoordinator(environment.ports).execute({ plan: loaded.plan, allowedInstruments: INSTRUMENTS, allowedDatasets: DATASETS, mode: "LIVE", intent: options.command === "resume" ? "RESUME" : "RUN" })
      return print({ command: options.command, result })
    } finally { await environment.close() }
  }
}

function print(value: unknown): void {
  assertSanitizedLiveResumeOutput(value)
  console.log(JSON.stringify(value, null, 2))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "LIVE_RESUME_WORKER_FAILED"); process.exitCode = 1 })
