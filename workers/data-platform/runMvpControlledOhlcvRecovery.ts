import { createHash } from "node:crypto"
import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { promisify } from "node:util"

import postgres from "postgres"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createCanonicalPersistenceAdapter } from "@/lib/data-platform/persistence/postgres"
import {
  createCandidateId,
  createJobRequestIdentity,
  createPopulationJobId,
  createRetrievalAttemptId,
  expandPopulationUnits,
  type PopulationCandidate,
  type PopulationJob,
  type PopulationJobProfile,
  type PopulationJobRequest,
} from "@/lib/data-platform/population"
import {
  PRODUCTION_NORMALIZER_VERSION,
  ProductionNormalizerRegistry,
  createD3ToD2CanonicalCommitPort,
  createFilesystemObjectStorage,
  createIntegratedBackfillClientsFromEnvironment,
  inspectFilesystemObjectRoot,
} from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"
import type { CanonicalCommitResult, RawObjectManifest } from "@/lib/data-platform/persistence"
import {
  ACTIVE_MVP_SERVING_BASELINE,
  CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION,
  ControlledOhlcvRecoveryStore,
  DEFAULT_MVP_REFRESH_POLICY,
  MvpRefreshMigrationRunner,
  MvpRefreshStore,
  boundedArchiveSourceUrl,
  buildRefreshSlotResumePlan,
  classifyProviderAuditDigest,
  computeStableOhlcvDigests,
  createAuthoritativeSlotReconciliation,
  createBoundedArchiveRequest,
  createControlledCandidateSetRecord,
  createControlledCanonicalCommitSetRecord,
  createControlledOhlcvSourceContract,
  createControlledRetrievalRecord,
  createMvpRefreshClientFromEnvironment,
  createRefreshLogicalSlot,
  inspectBoundedArchiveAvailability,
  parseBoundedOhlcvArchive,
  planNextMvpRefresh,
  type BoundedOhlcvRow,
  type ControlledCanonicalFactIdentity,
  type StableOhlcvFact,
} from "@/lib/data-platform/mvp-refresh"

const execFileAsync = promisify(execFile)
const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"
const PRIOR_PROVIDER_DIGEST = "e8c2b46a73c77a0817435e39954af74dc77f120e134ebf1f1d58b0d0518fef89"
const DATASET_REGISTRY_ID = "d3-phase3-dataset-registry-v1"
const PROVIDER_REGISTRY_ID = "d3-phase3-binance-archive-provider-v1"
const PROVIDER_CERTIFICATION_ID = "d3-phase3-binance-archive-ohlcv-certification-v1"
const POLICY_ID = "d3-phase3-ohlcv-canary-policy-v1"
const SCHEMA_VERSION = "1" as const
const WORKER_ID = "mvp-controlled-ohlcv-recovery"
const LEASE_SECONDS = 1800

function sha256(bytes: Uint8Array | string): string { return createHash("sha256").update(bytes).digest("hex") }
function stream(bytes: Uint8Array): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { yield bytes } } }

async function repositoryRevision(): Promise<string> {
  const result = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), windowsHide: true })
  return result.stdout.trim()
}

async function fileChecksum(path: string): Promise<string> { return sha256(await readFile(path)) }

async function sourceContract() {
  const adapterPath = "lib/data-platform/mvp-refresh/boundedAdapters.ts"
  const normalizerPath = "lib/data-platform/population/backfill/normalizers.ts"
  const schemaPath = "lib/data-platform/persistence/postgres/migrations/003_canonical_fact_tables.sql"
  const [adapterChecksum, normalizerChecksum, schemaChecksum, revision] = await Promise.all([fileChecksum(adapterPath), fileChecksum(normalizerPath), fileChecksum(schemaPath), repositoryRevision()])
  return createControlledOhlcvSourceContract({ eventTimeStart: START, eventTimeEnd: END, parserVersion: `sha256:${adapterChecksum}`, parserChecksum: adapterChecksum, normalizerVersion: PRODUCTION_NORMALIZER_VERSION, normalizerChecksum, schemaVersion: SCHEMA_VERSION, schemaChecksum, repositorySourceRevision: revision, boundedAdapterChecksum: adapterChecksum })
}

function request() {
  return createBoundedArchiveRequest({ dataset: "ohlcv", provider: "binance-vision", instrument: "BTCUSDT", eventTimeStart: START, eventTimeEnd: END, sourceContractVersion: CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION, maximumRecordCount: 288 })
}

function localUrl(value: string | undefined): boolean {
  if (!value) return false
  try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname.toLowerCase()) } catch { return false }
}

async function databaseIdentity(connectionString: string | undefined, expectedDatabase: string, expectedRole: string) {
  if (!connectionString) return Object.freeze({ configured: false, connected: false, databaseOk: false, roleOk: false, postgresMajor16: false, localOnly: false })
  const sql = postgres(connectionString, { max: 1, prepare: false, connect_timeout: 10 })
  try {
    const rows = await sql.unsafe<Array<{ database: string; role: string; version: number }>>("SELECT current_database() database,current_user role,current_setting('server_version_num')::int version")
    return Object.freeze({ configured: true, connected: true, databaseOk: rows[0]?.database === expectedDatabase, roleOk: rows[0]?.role === expectedRole, postgresMajor16: Boolean(rows[0] && rows[0].version >= 160000 && rows[0].version < 170000), localOnly: localUrl(connectionString) })
  } catch (error) {
    return Object.freeze({ configured: true, connected: false, databaseOk: false, roleOk: false, postgresMajor16: false, localOnly: localUrl(connectionString), sanitizedErrorCode: typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null })
  } finally { await sql.end({ timeout: 2 }) }
}

async function preflight() {
  const environmentPresent = Object.freeze({ refresh: Boolean(process.env.MVP_REFRESH_ISOLATED_POSTGRES_URL), d2: Boolean(process.env.D2_CANONICAL_POSTGRES_URL), d3: Boolean(process.env.D3_POPULATION_POSTGRES_URL), d4: Boolean(process.env.D4_ISOLATED_POSTGRES_URL), objectStorage: Boolean(process.env.D3_BACKFILL_OBJECT_ROOT) })
  const [refresh, d2, d3, d4, objectStorage, availability] = await Promise.all([
    databaseIdentity(process.env.MVP_REFRESH_ISOLATED_POSTGRES_URL, "quantterminal_mvp_refresh_isolated", "qt_d2_owner"),
    databaseIdentity(process.env.D2_CANONICAL_POSTGRES_URL, "quantterminal_backfill", "qt_d2_backfill_owner"),
    databaseIdentity(process.env.D3_POPULATION_POSTGRES_URL, "quantterminal_backfill", "qt_d3_backfill_owner"),
    databaseIdentity(process.env.D4_ISOLATED_POSTGRES_URL, "quantterminal_d4_isolated", "qt_d2_owner"),
    process.env.D3_BACKFILL_OBJECT_ROOT ? inspectFilesystemObjectRoot({ root: process.env.D3_BACKFILL_OBJECT_ROOT, repositoryRoot: process.cwd(), createRoot: false }) : Promise.resolve({ safe: false, reasons: ["D3_BACKFILL_OBJECT_ROOT_MISSING"], resolvedRoot: "", availableBytes: null }),
    inspectBoundedArchiveAvailability(request()),
  ])
  const databaseChecks = [refresh, d2, d3, d4]
  const noManagedWriteTarget = databaseChecks.every((item) => item.localOnly)
  const adapterPreflight = (() => { try { const value = request(); return value.dataset === "ohlcv" && value.instrument === "BTCUSDT" && value.maximumRecordCount === 288 } catch { return false } })()
  const passed = Object.values(environmentPresent).every(Boolean) && databaseChecks.every((item) => item.connected && item.databaseOk && item.roleOk && item.postgresMajor16 && item.localOnly) && objectStorage.safe && availability.sourceClassification === "HTTP_SUCCESS" && availability.available && availability.finalized && adapterPreflight && noManagedWriteTarget
  return Object.freeze({ passed, environmentPresent, databases: { refresh, d2, d3, d4 }, objectStorage: { safe: objectStorage.safe, reasons: objectStorage.reasons, capacityAvailable: objectStorage.availableBytes !== null }, source: { classification: availability.sourceClassification, available: availability.available, finalized: availability.finalized, checksumState: availability.checksumState }, adapterPreflight, noManagedWriteTarget })
}

function providerStableFact(row: BoundedOhlcvRow): StableOhlcvFact {
  return Object.freeze({ canonicalFactIdentity: `provider:BTCUSDT:${row.openTime}`, dataset: "ohlcv", instrument: "BTCUSDT", eventTimestamp: row.openTime, interval: "5m", open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, provider: "binance-vision", sourceEventIdentity: row.openTime, canonicalVersion: null, supersedesIdentity: null, immutablePayloadChecksum: null })
}

function canonicalStableFact(row: BoundedOhlcvRow, fact: ControlledCanonicalFactIdentity): StableOhlcvFact {
  return Object.freeze({ canonicalFactIdentity: fact.canonicalRecordId, dataset: "ohlcv", instrument: "BTCUSDT", eventTimestamp: row.openTime, interval: "5m", open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, provider: "binance-public-archive", sourceEventIdentity: `binance-public-archive:BTCUSDT:5m:${row.openTime}`, canonicalVersion: fact.recordVersion, supersedesIdentity: null, immutablePayloadChecksum: fact.checksum })
}

function populationCandidate(row: BoundedOhlcvRow, ordinal: number, input: { readonly unitId: string; readonly retrievalId: string; readonly raw: RawObjectManifest; readonly parserVersion: string; readonly createdAt: string }): Extract<PopulationCandidate, { readonly kind: "OHLCV" }> {
  const sourceObservationId = `binance-public-archive:BTCUSDT:5m:${row.openTime}`
  const candidateId = createCandidateId({ rawManifestId: input.raw.objectId, sourceObservationId, parserVersion: input.parserVersion, candidateOrdinal: String(ordinal) })
  const payload = Object.freeze({ symbol: "BTCUSDT", resolution: "5m", open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, closeTime: row.closeTime })
  return Object.freeze({ kind: "OHLCV", candidateId, unitId: input.unitId, retrievalAttemptId: input.retrievalId, rawManifestId: input.raw.objectId, datasetId: "ohlcv", providerId: "binance-public-archive", providerSnapshotId: PROVIDER_REGISTRY_ID, sourceObservationId, sourceObservedAt: row.openTime, effectiveAt: row.openTime, parserVersion: input.parserVersion, candidateSchemaVersion: SCHEMA_VERSION, payload, candidateChecksum: canonicalChecksum({ rawObjectId: input.raw.objectId, sourceObservationId, parserVersion: input.parserVersion, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt: input.createdAt })
}

function populationRequest(contractId: string, createdAt: string): { readonly request: PopulationJobRequest; readonly job: PopulationJob } {
  const profile: PopulationJobProfile = Object.freeze({ profileId: "mvp-controlled-ohlcv-reacquisition", profileVersion: CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION, kind: "RECONCILIATION", requiredDimensions: ["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const, rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "retry.controlled-reacquisition", retryPolicyVersion: CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION, watermarkPolicyId: "NO_WATERMARK_MVP_8A2F", watermarkPolicyVersion: CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION })
  const dimensions = Object.freeze({ venue: "binance-usdm-futures", subjectOrSymbol: "BTCUSDT", windowStart: START, windowEnd: END, resolution: "5m", partitionKey: `BTCUSDT:5m:${START.slice(0, 10)}:${contractId}` })
  const base = { profile, datasetId: "ohlcv", providerId: "binance-public-archive", dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: `controlled-reacquisition:${contractId}`, intentionalRerunIdentity: null, requestedAt: createdAt, requestedBy: WORKER_ID })
  const jobId = createPopulationJobId(request.requestIdentity, request.occurrenceIdentity, null)
  return Object.freeze({ request, job: Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt, updatedAt: createdAt }) })
}

function resultIdentity(result: CanonicalCommitResult, eventTimestamp: string, fallbackChecksum: string): Omit<ControlledCanonicalFactIdentity, "commitId"> & { readonly commitId: string | null } {
  if (result.status === "SUCCESS") return Object.freeze({ canonicalRecordId: result.fact.canonicalRecordId, recordVersion: result.fact.recordVersion, checksum: fallbackChecksum, commitId: result.commit.commitId, eventTimestamp })
  if (result.status === "DUPLICATE") return Object.freeze({ canonicalRecordId: result.canonicalRecordId, recordVersion: result.recordVersion, checksum: result.checksum, commitId: null, eventTimestamp })
  throw new Error(result.status === "CONFLICT" ? "CONTROLLED_CANONICAL_CONFLICT" : "CONTROLLED_CANONICAL_COMMIT_INELIGIBLE")
}

async function run() {
  let stage = "PREFLIGHT"
  const gate = await preflight()
  if (!gate.passed) throw new Error("CONTROLLED_REACQUISITION_PREFLIGHT_FAILED")
  const refresh = createMvpRefreshClientFromEnvironment()
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-controlled-ohlcv-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-controlled-ohlcv-d3" } })
  try {
    stage = "MIGRATION"
    await refresh.verify()
    const migrations = await new MvpRefreshMigrationRunner(refresh).apply("mvp-8a2f-controlled-reacquisition")
    if (migrations.some((item) => item.status === "FAILED")) throw new Error("CONTROLLED_REACQUISITION_MIGRATION_FAILED")
    stage = "SOURCE_CONTRACT"
    const contract = await sourceContract()
    const recoveryStore = new ControlledOhlcvRecoveryStore(refresh)
    stage = "AUTHORITY_LOOKUP"
    const existingAuthority = await recoveryStore.readAuthoritiesForWindow(START, END)
    if (existingAuthority.length) return Object.freeze({ status: "DUPLICATE", authority: existingAuthority[0], migrations, productionMutation: false })
    await recoveryStore.putSourceContract(contract)

    stage = "REFRESH_RUN_SETUP"
    const plan = planNextMvpRefresh()
    if (!plan || plan.window.requestedStart !== START || plan.window.requestedEnd !== END) throw new Error("CONTROLLED_REACQUISITION_WINDOW_MISMATCH")
    const refreshStore = new MvpRefreshStore(refresh)
    await refreshStore.putPolicy(DEFAULT_MVP_REFRESH_POLICY)
    await refreshStore.putPlan(plan)
    const runChecksum = canonicalChecksum({ purpose: "CONTROLLED_OHLCV_REACQUISITION", planId: plan.planId, sourceContractId: contract.sourceContractId })
    const runId = `mrr_${runChecksum}`
    const logicalSlot = createRefreshLogicalSlot({ provider: "binance-vision", dataset: "ohlcv", instrument: "BTCUSDT", intervalStart: START, intervalEnd: END, contractVersion: contract.sourceContractId })
    const unitChecksum = canonicalChecksum({ runId, logicalSlotId: logicalSlot.logicalSlotId, purpose: "CONTROLLED_REACQUISITION_PROVENANCE_REPAIR" })
    const unitId = `mru_${unitChecksum}`
    const runInsert = await refreshStore.putRun(runId, plan.planId, runChecksum)
    const unitInsertCount = await refreshStore.putUnits([{ unitId, runId, instrument: "BTCUSDT", datasetId: "ohlcv", intervalStart: START, intervalEnd: END, checksum: unitChecksum }])
    if (runInsert === "INSERTED") await refreshStore.transitionRun(runId, "ACQUIRING")
    const leaseKey = `controlled-recovery:${unitId}`
    const lease = await refreshStore.acquireLease(leaseKey, WORKER_ID, LEASE_SECONDS)
    if (!lease.acquired) throw new Error("CONTROLLED_REACQUISITION_LEASE_UNAVAILABLE")
    const refreshUnit = (await refreshStore.auditUnitsForWindow(START, END)).find((value) => value.unitId === unitId)
    if (refreshUnit?.state === "PENDING") await refreshStore.transitionUnit(unitId, "LEASED")
    await refreshStore.assertFence(leaseKey, WORKER_ID, lease.fencingToken)

    stage = "POPULATION_RUN_SETUP"
    const d3Adapter = createPopulationPostgresAdapter(clients.d3)
    const population = populationRequest(contract.sourceContractId, new Date().toISOString())
    const job = await d3Adapter.createJob(population.request)
    const populationRun = await d3Adapter.createRun(job.jobId, 1, population.request.requestedAt)
    const populationUnits = expandPopulationUnits(population.job, [{ profileId: population.request.profile.profileId, profileVersion: population.request.profile.profileVersion, datasetId: "ohlcv", providerId: "binance-public-archive", providerSnapshotId: PROVIDER_REGISTRY_ID, policyVersionId: POLICY_ID, venue: "binance-usdm-futures", subjectOrSymbol: "BTCUSDT", windowStart: START, windowEnd: END, resolution: "5m", partitionKey: logicalSlot.logicalSlotId, requestFingerprint: population.request.requestIdentity, requestParameters: { sourceContractId: contract.sourceContractId }, required: true }], population.request.requestedAt)
    await d3Adapter.expandUnits(populationUnits)
    let populationLease = await d3Adapter.claimUnit(WORKER_ID, populationRun.runId, new Date().toISOString(), new Date(Date.now() + LEASE_SECONDS * 1000).toISOString())
    if (!populationLease) {
      const existing = await clients.d3.sql<Array<{ unit_id: string; lease_id: string; fencing_token: string }>>`SELECT u.unit_id,l.lease_id,l.fencing_token::text FROM control.population_units u JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.unit_id=${populationUnits[0]!.unitId} AND l.owner_id=${WORKER_ID} AND l.released_at IS NULL AND l.expires_at>now()`
      if (existing[0]) populationLease = Object.freeze({ unitId: existing[0].unit_id, leaseId: existing[0].lease_id, fencingToken: Number(existing[0].fencing_token) })
    }
    if (!populationLease || populationLease.unitId !== populationUnits[0]?.unitId) throw new Error("CONTROLLED_POPULATION_LEASE_UNAVAILABLE")
    const populationState = await clients.d3.sql<Array<{ current_state: string }>>`SELECT current_state::text FROM control.population_units WHERE unit_id=${populationLease.unitId}`
    if (populationState[0]?.current_state === "LEASED") await d3Adapter.advanceUnit(populationLease.unitId, populationLease.leaseId, WORKER_ID, populationLease.fencingToken, "RETRIEVING", `controlled-retrieving:${contract.sourceContractId}`, new Date().toISOString())
    else if (populationState[0]?.current_state !== "RETRIEVING") throw new Error("CONTROLLED_POPULATION_RESUME_STAGE_INVALID")

    const sourceRequest = request()
    stage = "ACQUISITION"
    const response = await fetch(boundedArchiveSourceUrl(sourceRequest), { cache: "no-store", signal: AbortSignal.timeout(60_000), headers: { accept: "application/zip,application/octet-stream" } })
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase() ?? ""
    if (!response.ok || (!contentType.includes("zip") && !contentType.includes("octet-stream"))) throw new Error("CONTROLLED_SOURCE_RESPONSE_INVALID")
    stage = "PAYLOAD_VALIDATION"
    let sourceBytes: Uint8Array | null = new Uint8Array(await response.arrayBuffer())
    const batch = parseBoundedOhlcvArchive(sourceRequest, sourceBytes)
    if (batch.rows.length !== 288 || batch.rows.some((row, index) => Date.parse(row.openTime) !== Date.parse(START) + index * 300_000 || Date.parse(row.closeTime) !== Date.parse(row.openTime) + 299_999)) throw new Error("CONTROLLED_OHLCV_SEQUENCE_INVALID")
    const providerDigest = computeStableOhlcvDigests(batch.rows.map(providerStableFact))
    const providerComparison = classifyProviderAuditDigest(providerDigest.fullStableDomainDigest, PRIOR_PROVIDER_DIGEST)
    if (providerComparison !== "MATCHES_8A2E_PROVIDER_AUDIT") throw new Error(providerComparison === "PROVIDER_OUTPUT_CHANGED" ? "CONTROLLED_PROVIDER_OUTPUT_CHANGED" : "CONTROLLED_PROVIDER_DIGEST_INCONCLUSIVE")
    const rawChecksum = sha256(sourceBytes), byteCount = sourceBytes.byteLength
    const objectStorageKey = `raw/${rawChecksum.slice(0, 2)}/${rawChecksum}.zip`
    const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false })
    stage = "RAW_ARTIFACT_PERSISTENCE"
    const stored = await storage.putImmutable({ objectStorageKey, contentHash: rawChecksum, mediaType: contentType, byteLength: byteCount, content: stream(sourceBytes) })
    sourceBytes = null
    const retrievedAt = new Date().toISOString()
    const raw: RawObjectManifest = Object.freeze({ objectId: stored.rawObjectId, datasetId: "ohlcv", providerId: "binance-public-archive", venue: "binance-usdm-futures", symbolOrSubject: "BTCUSDT", windowStart: START, windowEnd: END, contentHash: rawChecksum, sizeBytes: byteCount, mediaType: contentType, compression: "ZIP", retrievedAt, providerSnapshotId: PROVIDER_REGISTRY_ID, retentionClass: "ARCHIVE", verificationState: stored.verificationState, objectStorageKey, createdAt: retrievedAt })
    const d2Adapter = createCanonicalPersistenceAdapter(clients.d2)
    const rawRegistration = await d2Adapter.registerRawObjectManifest(raw)
    if (rawRegistration.status === "CONFLICT" || rawRegistration.status === "REJECTED") throw new Error("CONTROLLED_RAW_ARTIFACT_CONFLICT")
    const artifactId = `mra_${canonicalChecksum({ unitId, rawObjectId: raw.objectId, sourceContractId: contract.sourceContractId })}`
    const retrieval = createControlledRetrievalRecord({ runId, unitId, sourceContractId: contract.sourceContractId, artifactId, sourceObjectIdentity: sourceRequest.sourceIdentity, contentType, byteCount: raw.sizeBytes, rawChecksum: raw.contentHash, retrievedAt })
    await refreshStore.recordArtifact({ unitId, artifactId, artifactKind: "CONTROLLED_OHLCV_RAW_ARCHIVE", contentChecksum: raw.contentHash, byteCount: raw.sizeBytes, lineage: { retrievalIdentity: retrieval.retrievalId, sourceContractVersion: contract.boundedAdapterVersion, sourceContractId: contract.sourceContractId, rawObjectId: raw.objectId } })
    await recoveryStore.putRetrieval(retrieval)
    await d3Adapter.appendRetrievalAttempt({ attemptId: createRetrievalAttemptId(populationLease.unitId, populationRun.runId, 1), unitId: populationLease.unitId, runId: populationRun.runId, providerId: "binance-public-archive", providerSnapshotId: PROVIDER_REGISTRY_ID, requestFingerprint: population.request.requestIdentity, startedAt: population.request.requestedAt, completedAt: retrievedAt, outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: contentType, rawByteCount: raw.sizeBytes, rawManifestId: raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null })
    await d3Adapter.advanceUnit(populationLease.unitId, populationLease.leaseId, WORKER_ID, populationLease.fencingToken, "RAW_PERSISTED", `controlled-raw:${retrieval.retrievalId}`, retrievedAt)
    await refreshStore.transitionUnit(unitId, "ACQUIRED")
    await refreshStore.writeCheckpoint(unitId, { stage: "ACQUIRED", sourceContractId: contract.sourceContractId, retrievalId: retrieval.retrievalId, artifactId, rawObjectId: raw.objectId, rawChecksum: raw.contentHash })

    const parserVersion = contract.parserVersion
    stage = "CANDIDATE_PERSISTENCE"
    const candidates = batch.rows.map((row, index) => populationCandidate(row, index, { unitId: populationLease.unitId, retrievalId: createRetrievalAttemptId(populationLease.unitId, populationRun.runId, 1), raw, parserVersion, createdAt: retrievedAt }))
    for (const candidate of candidates) {
      const result = await d3Adapter.persistCandidate(candidate)
      if (result.status === "CONFLICT") throw new Error("CONTROLLED_CANDIDATE_CONFLICT")
      if (result.status === "CREATED") await d3Adapter.appendValidation({ validationRunId: `validation:${candidate.candidateId}`, candidateId: candidate.candidateId, retrievalAttemptId: candidate.retrievalAttemptId, layer: "STRUCTURAL", ruleId: "controlled-bounded-ohlcv", ruleVersion: contract.sourceContractId, outcome: "PASSED", blocking: false, failureRouting: null, policyVersionId: POLICY_ID, diagnostics: { rowCountRule: contract.expectedRowCountRule, interval: "5m" }, createdAt: retrievedAt })
    }
    await d3Adapter.advanceUnit(populationLease.unitId, populationLease.leaseId, WORKER_ID, populationLease.fencingToken, "CANDIDATES_READY", `controlled-candidates:${contract.sourceContractId}`, new Date().toISOString())
    const candidateSet = createControlledCandidateSetRecord({ runId, unitId, retrievalId: retrieval.retrievalId, sourceContractId: contract.sourceContractId, candidates: candidates.map((candidate) => ({ candidateId: candidate.candidateId, checksum: candidate.candidateChecksum })) })
    await recoveryStore.putCandidateSet(candidateSet)
    await refreshStore.transitionUnit(unitId, "NORMALIZED")
    await refreshStore.writeCheckpoint(unitId, { stage: "NORMALIZED", sourceContractId: contract.sourceContractId, retrievalId: retrieval.retrievalId, artifactId, candidateSetId: candidateSet.candidateSetId, candidateCount: candidates.length })

    await d3Adapter.advanceUnit(populationLease.unitId, populationLease.leaseId, WORKER_ID, populationLease.fencingToken, "PROCESSING", `controlled-processing:${contract.sourceContractId}`, new Date().toISOString())
    stage = "CANONICAL_COMMIT"
    const normalizer = new ProductionNormalizerRegistry(), commitPort = createD3ToD2CanonicalCommitPort(d2Adapter)
    const facts: ControlledCanonicalFactIdentity[] = []
    let createdCount = 0, duplicateCount = 0
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index]!
      const command = normalizer.normalize({ candidate, datasetRegistrySnapshotId: DATASET_REGISTRY_ID, providerRegistrySnapshotId: PROVIDER_REGISTRY_ID, providerCertificationSnapshotId: PROVIDER_CERTIFICATION_ID, policyVersionId: POLICY_ID, schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: raw.objectId, rawObject: raw })
      const submissionId = `submission:${candidate.candidateId}`, outcomeId = `outcome:${candidate.candidateId}`
      await d3Adapter.createSubmission(submissionId, candidate.candidateId, command.idempotencyKey, new Date().toISOString())
      const result = await commitPort.execute(command)
      if (result.status === "SUCCESS") createdCount += 1
      else if (result.status === "DUPLICATE") duplicateCount += 1
      else throw new Error(result.status === "REJECTED" ? "CONTROLLED_CANONICAL_CONFLICT" : "CONTROLLED_CANONICAL_COMMIT_FAILED")
      const identity = resultIdentity(result, batch.rows[index]!.openTime, command.fact.checksum)
      const persisted = await d2Adapter.readCanonicalRecordVersion(identity.canonicalRecordId, identity.recordVersion)
      if (!persisted || persisted.checksum !== identity.checksum) throw new Error("CONTROLLED_CANONICAL_FACT_NOT_ATTRIBUTABLE")
      facts.push(Object.freeze({ ...identity, commitId: persisted.commitId }))
      const recordInput = { jobId: job.jobId, runId: populationRun.runId, unitId: populationLease.unitId, candidateId: candidate.candidateId, retrievalAttemptId: candidate.retrievalAttemptId, rawManifestId: raw.objectId, submissionId, leaseId: populationLease.leaseId, ownerId: WORKER_ID, fencingToken: populationLease.fencingToken, result, outcomeId, createdAt: new Date().toISOString() }
      if (index === candidates.length - 1) await d3Adapter.recordD2Result(recordInput)
      else await d3Adapter.recordIntermediateD2Result(recordInput)
    }
    const canonicalDigest = computeStableOhlcvDigests(batch.rows.map((row, index) => canonicalStableFact(row, facts[index]!)))
    const commitSet = createControlledCanonicalCommitSetRecord({ runId, unitId, candidateSetId: candidateSet.candidateSetId, status: createdCount ? "CREATED" : "DUPLICATE", facts, canonicalStableDomainDigest: canonicalDigest.fullStableDomainDigest })
    await recoveryStore.putCommitSet(commitSet)
    await refreshStore.transitionUnit(unitId, "COMMITTED")
    await refreshStore.writeCheckpoint(unitId, { stage: "COMMITTED", sourceContractId: contract.sourceContractId, retrievalId: retrieval.retrievalId, artifactId, candidateSetId: candidateSet.candidateSetId, commitSetId: commitSet.commitSetId, canonicalFactSetDigest: canonicalDigest.fullStableDomainDigest, factCount: facts.length })

    const legacy = (await refreshStore.auditUnitsForWindow(START, END)).filter((value) => value.unitId !== unitId)
    const committedLegacy = legacy.filter((value) => value.state === "COMMITTED").map((value) => value.unitId)
    const orphaned = legacy.find((value) => value.state === "ACQUIRED")
    if (committedLegacy.length !== 4 || !orphaned) throw new Error("CONTROLLED_LEGACY_INVENTORY_MISMATCH")
    stage = "AUTHORITY_RECONCILIATION"
    const authority = createAuthoritativeSlotReconciliation({ logicalSlotId: logicalSlot.logicalSlotId, authoritativeUnitId: unitId, sourceContractId: contract.sourceContractId, retrievalId: retrieval.retrievalId, artifactId, candidateSetId: candidateSet.candidateSetId, commitSetId: commitSet.commitSetId, canonicalFactSetDigest: canonicalDigest.fullStableDomainDigest, intervalStart: START, intervalEnd: END, legacyCommittedUnitIds: committedLegacy, orphanedAcquiredUnitId: orphaned.unitId })
    const authorityResult = await recoveryStore.putAuthority(authority, { leaseKey, ownerId: WORKER_ID, fencingToken: lease.fencingToken })
    await refreshStore.transitionUnit(unitId, "VALIDATED")
    await refreshStore.transitionRun(runId, "NORMALIZING")
    await refreshStore.transitionRun(runId, "COMMITTING")
    await refreshStore.transitionRun(runId, "VALIDATING")
    await refreshStore.transitionRun(runId, "BLOCKED", ["DOWNSTREAM_DEFERRED_TO_MVP_8A2B"])
    await refreshStore.releaseLease(leaseKey, WORKER_ID, lease.fencingToken)
    await d3Adapter.releaseLease(populationLease.unitId, populationLease.leaseId, WORKER_ID, populationLease.fencingToken, new Date().toISOString(), "COMPLETED")
    await d3Adapter.completeRun(populationRun.runId, "SUCCEEDED", new Date().toISOString())
    await d3Adapter.aggregateJob(job.jobId, new Date().toISOString())
    const authorities = await recoveryStore.readAuthoritiesForWindow(START, END)
    const attempts = await refreshStore.auditUnitsForWindow(START, END)
    const dryRun = buildRefreshSlotResumePlan({ intervalStart: START, intervalEnd: END, attempts, authoritativeResolutions: authorities, sourceFinalizationState: "SOURCE_AVAILABLE" })
    const counts = { reuseAuthoritative: dryRun.filter((item) => item.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length, createNew: dryRun.filter((item) => item.action === "CREATE_NEW_ON_LIVE_RESUME").length, conflicts: dryRun.filter((item) => item.action === "BLOCKED_CONFLICT").length }
    if (counts.reuseAuthoritative !== 1 || counts.createNew !== 23 || counts.conflicts !== 0) throw new Error("CONTROLLED_RECOVERY_PLANNER_RECONCILIATION_FAILED")
    return Object.freeze({ status: authorityResult, migrations, sourceContract: { sourceContractId: contract.sourceContractId, checksum: contract.checksum }, recovery: { runId, unitId, runInsert, unitInsertCount }, acquisition: { rawChecksum: raw.contentHash, byteCount: raw.sizeBytes, rowCount: batch.rows.length, retainedTemporaryPayload: false }, retrieval, artifact: { artifactId, rawObjectId: raw.objectId, checksum: raw.contentHash }, candidateSet: { candidateSetId: candidateSet.candidateSetId, count: candidates.length, checksum: candidateSet.checksum }, canonical: { status: commitSet.status, createdCount, duplicateCount, conflictCount: 0, factCount: facts.length, commitSetId: commitSet.commitSetId, stableDomainDigest: canonicalDigest.fullStableDomainDigest }, providerComparison: { classification: providerComparison, digest: providerDigest.fullStableDomainDigest }, authority, planner: { counts, slots: dryRun.map((item) => ({ dataset: item.dataset, instrument: item.instrument, action: item.action, authoritativeUnitId: item.authoritativeUnitId })) }, integrity: { watermarkWrites: 0, downstreamWrites: 0, servingWrites: 0, exposureWrites: 0, productionWrites: 0 } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_FAILURE"
    throw new Error(`CONTROLLED_REACQUISITION_${stage}_FAILED:${message}`)
  } finally {
    await Promise.allSettled([refresh.shutdown(), clients.shutdown()])
  }
}

async function main() {
  const command = process.argv[2]
  if (command === "preflight") return console.log(JSON.stringify(await preflight(), null, 2))
  if (command === "run") return console.log(JSON.stringify(await run(), null, 2))
  throw new Error("Usage: runMvpControlledOhlcvRecovery.ts <preflight|run>")
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "CONTROLLED_OHLCV_RECOVERY_FAILED"); process.exitCode = 1 })
