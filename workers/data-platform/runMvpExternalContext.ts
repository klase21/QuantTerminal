import { createHash } from "node:crypto"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { RawObjectManifest } from "@/lib/data-platform/persistence"
import { createCanonicalPersistenceAdapter } from "@/lib/data-platform/persistence/postgres"
import {
  createCandidateId,
  createJobRequestIdentity,
  createPopulationJobId,
  createRetrievalAttemptId,
  createWatermarkEligibility,
  expandPopulationUnits,
  type PopulationCandidate,
  type PopulationJob,
  type PopulationJobProfile,
  type PopulationJobRequest,
} from "@/lib/data-platform/population"
import {
  createD3ToD2CanonicalCommitPort,
  createFilesystemObjectStorage,
  createIntegratedBackfillClientsFromEnvironment,
  ProductionNormalizerRegistry,
  PRODUCTION_NORMALIZER_VERSION,
} from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"
import { fetchExternalCanary, type ExternalCanaryBundle, type ExternalCanaryProvider } from "@/lib/external-context"

type Command = "status" | "canary" | "reconcile"

const SCHEMA_VERSION = "1"
const POLICY_VERSION = "1.0.0"
const WORKER_ID = "mvp6a-external-context-canary"

function argument(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

function isoNow(): string { return new Date().toISOString() }
function stream(buffer: Buffer): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { yield buffer } } }
function providerSnapshotId(bundle: ExternalCanaryBundle): string { return `mvp6a-provider:${bundle.providerId}:1.0.0` }
function providerCertificationId(bundle: ExternalCanaryBundle): string { return `mvp6a-provider-certification:${bundle.providerId}:canary:1.0.0` }
function datasetSnapshotId(bundle: ExternalCanaryBundle): string { return `mvp6a-dataset:${bundle.datasetId}:1.0.0` }
function policyId(bundle: ExternalCanaryBundle): string { return `mvp6a-policy:${bundle.datasetId}:1.0.0` }
function occurrenceIdentity(bundle: ExternalCanaryBundle): string { return `mvp6a-external-context:${bundle.provider}:bounded-canary-v1` }
function partitionKey(bundle: ExternalCanaryBundle): string { return `${bundle.provider}:${bundle.subject}:2026-04-13:2026-07-11` }

function bounds(bundle: ExternalCanaryBundle): { readonly start: string; readonly end: string } {
  const ordered = [...bundle.observations].sort((left, right) => left.effectiveAt.localeCompare(right.effectiveAt))
  const first = ordered[0]
  const last = ordered.at(-1)
  if (!first || !last) throw new Error("EXTERNAL_CANARY_EMPTY")
  const start = first.payload.windowStart
  const end = last.payload.windowEnd
  return { start: typeof start === "string" ? start : first.effectiveAt, end: typeof end === "string" ? end : new Date(Date.parse(last.effectiveAt) + 1).toISOString() }
}

function rawManifest(bundle: ExternalCanaryBundle): RawObjectManifest {
  const contentHash = createHash("sha256").update(bundle.rawBytes).digest("hex")
  const window = bounds(bundle)
  const at = isoNow()
  return Object.freeze({ objectId: `raw_${contentHash}`, datasetId: bundle.datasetId, providerId: bundle.providerId, venue: null, symbolOrSubject: bundle.subject, windowStart: window.start, windowEnd: window.end, contentHash, sizeBytes: bundle.rawBytes.byteLength, mediaType: bundle.mediaType, compression: "NONE", retrievedAt: at, providerSnapshotId: providerSnapshotId(bundle), retentionClass: "ARCHIVE", verificationState: "VERIFIED", objectStorageKey: `raw/${contentHash.slice(0, 2)}/${contentHash}.${bundle.extension}`, createdAt: at })
}

function candidate(bundle: ExternalCanaryBundle, raw: RawObjectManifest, unitId: string, retrievalAttemptId: string, index: number, createdAt: string): PopulationCandidate {
  const item = bundle.observations[index]!
  const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId: item.sourceObservationId, parserVersion: bundle.parserVersion, candidateOrdinal: String(index) })
  const common = { candidateId, unitId, retrievalAttemptId, rawManifestId: raw.objectId, datasetId: bundle.datasetId, providerId: bundle.providerId, providerSnapshotId: providerSnapshotId(bundle), sourceObservationId: item.sourceObservationId, sourceObservedAt: item.sourceObservedAt, effectiveAt: item.effectiveAt, parserVersion: bundle.parserVersion, candidateSchemaVersion: SCHEMA_VERSION, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId: item.sourceObservationId, parserVersion: bundle.parserVersion, payload: item.payload }), validationStatus: "ELIGIBLE" as const, qualityEligibility: "ELIGIBLE" as const, normalizationEligibility: "ELIGIBLE" as const, createdAt }
  if (bundle.candidateKind === "MACRO_ECONOMIC_OBSERVATION") return Object.freeze({ ...common, kind: bundle.candidateKind, payload: item.payload as Extract<PopulationCandidate, { kind: "MACRO_ECONOMIC_OBSERVATION" }>["payload"] })
  if (bundle.candidateKind === "DAILY_MARKET_CONTEXT_OBSERVATION") return Object.freeze({ ...common, kind: bundle.candidateKind, payload: item.payload as Extract<PopulationCandidate, { kind: "DAILY_MARKET_CONTEXT_OBSERVATION" }>["payload"] })
  return Object.freeze({ ...common, kind: bundle.candidateKind, payload: item.payload as Extract<PopulationCandidate, { kind: "ETF_FLOW_OBSERVATION" }>["payload"] })
}

function buildRequest(bundle: ExternalCanaryBundle, at: string): { readonly request: PopulationJobRequest; readonly job: PopulationJob } {
  const window = bounds(bundle)
  const profile: PopulationJobProfile = Object.freeze({ profileId: `mvp6a-${bundle.provider}-external-context-canary`, profileVersion: "1.0.0", kind: "BACKFILL", requiredDimensions: ["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const, rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "retry.external-context", retryPolicyVersion: "1.0.0", watermarkPolicyId: `coverage.${bundle.datasetId}.bounded`, watermarkPolicyVersion: "1.0.0" })
  const dimensions = Object.freeze({ venue: bundle.providerId.toUpperCase(), subjectOrSymbol: bundle.subject, windowStart: window.start, windowEnd: window.end, resolution: "1d", partitionKey: partitionKey(bundle) })
  const base = { profile, datasetId: bundle.datasetId, providerId: bundle.providerId, dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: occurrenceIdentity(bundle), intentionalRerunIdentity: null, requestedAt: at, requestedBy: WORKER_ID })
  const jobId = createPopulationJobId(request.requestIdentity, request.occurrenceIdentity, request.intentionalRerunIdentity)
  return { request, job: Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt: at, updatedAt: at }) }
}

async function seedGovernance(bundle: ExternalCanaryBundle, adapter: ReturnType<typeof createCanonicalPersistenceAdapter>): Promise<void> {
  const effectiveAt = "2026-07-15T00:00:00.000Z"
  const sourceRole = bundle.provider === "fred" ? "OFFICIAL_MACRO_BASELINE" : bundle.provider === "alpha-vantage" ? "DAILY_MARKET_CONTEXT" : "OBSERVED_BITCOIN_ETF_FLOW"
  const results = await Promise.all([
    adapter.registerRegistrySnapshot({ snapshotId: datasetSnapshotId(bundle), registryVersion: "1.0.0", contentChecksum: canonicalChecksum({ datasetId: bundle.datasetId, candidateKind: bundle.candidateKind }), canonicalContent: { datasetId: bundle.datasetId, candidateKind: bundle.candidateKind, supplemental: true }, effectiveAt, createdAt: effectiveAt }),
    adapter.registerProviderSnapshot({ snapshotId: providerSnapshotId(bundle), providerId: bundle.providerId, registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ providerId: bundle.providerId, sourceRole, frequency: "DAILY" }), canonicalContent: { providerId: bundle.providerId, sourceRole, frequency: "DAILY", limitations: bundle.limitations.join("|") }, effectiveAt, createdAt: effectiveAt }),
    adapter.registerProviderSnapshot({ snapshotId: providerCertificationId(bundle), providerId: bundle.providerId, registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ providerId: bundle.providerId, certification: "BOUNDED_REAL_CANARY", parserVersion: bundle.parserVersion }), canonicalContent: { providerId: bundle.providerId, certification: "BOUNDED_REAL_CANARY", parserVersion: bundle.parserVersion, limitations: bundle.limitations.join("|") }, effectiveAt, createdAt: effectiveAt }),
    adapter.registerPolicyVersion({ policyVersionId: policyId(bundle), datasetId: bundle.datasetId, policyVersion: POLICY_VERSION, contentChecksum: canonicalChecksum({ datasetId: bundle.datasetId, providerId: bundle.providerId, normalizationVersion: PRODUCTION_NORMALIZER_VERSION }), canonicalContent: { datasetId: bundle.datasetId, providerId: bundle.providerId, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, noForwardFill: true, missingIsNotZero: true }, effectiveAt, createdAt: effectiveAt }),
  ])
  if (results.some((result) => result.status === "CONFLICT" || result.status === "REJECTED")) throw new Error("EXTERNAL_CANARY_GOVERNANCE_CONFLICT")
}

async function counts(bundle: ExternalCanaryBundle, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>) {
  const factTable = bundle.datasetId === "etf-flow" ? "canonical.etf_observations" : "canonical.macro_observations"
  const [d2, d3] = await Promise.all([
    clients.d2.sql.unsafe<Array<Record<string, number>>>(`SELECT (SELECT count(1)::int FROM raw.objects WHERE dataset_id=$1 AND provider_id=$2) raw_objects,(SELECT count(1)::int FROM ${factTable} WHERE provider_id=$2) canonical_facts,(SELECT count(1)::int FROM repository.record_versions rv JOIN ${factTable} f ON f.canonical_record_id=rv.canonical_record_id AND f.record_version=rv.record_version WHERE f.provider_id=$2 AND rv.current_publication_state='PENDING') pending_publication,(SELECT count(1)::int FROM repository.lineage_edges e JOIN ${factTable} f ON f.canonical_record_id=e.destination_node_id AND f.record_version::text=e.destination_node_version WHERE f.provider_id=$2) lineage`, [bundle.datasetId, bundle.providerId]),
    clients.d3.sql.unsafe<Array<Record<string, number>>>("SELECT (SELECT count(1)::int FROM control.population_jobs WHERE dataset_id=$1 AND provider_id=$2) jobs,(SELECT count(1)::int FROM control.population_units WHERE dataset_id=$1 AND provider_id=$2) units,(SELECT count(1)::int FROM population.candidates WHERE dataset_id=$1 AND provider_id=$2) candidates,(SELECT count(1)::int FROM control.population_outcomes o JOIN population.candidates c ON c.candidate_id=o.candidate_id WHERE c.dataset_id=$1 AND c.provider_id=$2) outcomes,(SELECT count(1)::int FROM coverage.watermark_eligibility_decisions WHERE dataset_id=$1 AND provider_id=$2) coverage,(SELECT count(1)::int FROM control.population_leases WHERE released_at IS NULL) active_leases", [bundle.datasetId, bundle.providerId]),
  ])
  return Object.freeze({ ...d2[0], ...d3[0] })
}

async function existingRun(bundle: ExternalCanaryBundle, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>) {
  const rows = await clients.d3.sql.unsafe<Array<{ job_id: string; unit_id: string; run_id: string; attempt_id: string; raw_manifest_id: string; current_state: string }>>("SELECT j.job_id,u.unit_id,r.run_id,a.attempt_id,a.raw_manifest_id,u.current_state::text FROM control.population_jobs j JOIN control.population_runs r ON r.job_id=j.job_id JOIN control.population_units u ON u.job_id=j.job_id JOIN control.retrieval_attempts a ON a.unit_id=u.unit_id AND a.run_id=r.run_id WHERE j.occurrence_identity=$1 ORDER BY r.attempt_number,a.started_at LIMIT 1", [occurrenceIdentity(bundle)])
  return rows[0] ?? null
}

async function persistCanary(bundle: ExternalCanaryBundle) {
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: `mvp6a-${bundle.provider}-d2` }, d3: { roleIntent: "WORKER", maxConnections: 2, applicationName: `mvp6a-${bundle.provider}-d3` } })
  try {
    const d2 = createCanonicalPersistenceAdapter(clients.d2)
    const d3 = createPopulationPostgresAdapter(clients.d3)
    const commit = createD3ToD2CanonicalCommitPort(d2)
    await seedGovernance(bundle, d2)
    const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false })
    const raw = rawManifest(bundle)
    await storage.putImmutable({ objectStorageKey: raw.objectStorageKey, contentHash: raw.contentHash, mediaType: raw.mediaType, byteLength: raw.sizeBytes, content: stream(bundle.rawBytes) })
    const before = await counts(bundle, clients)
    const existing = await existingRun(bundle, clients)
    const normalizer = new ProductionNormalizerRegistry()
    if (existing) {
      if (existing.current_state !== "COMPLETED") throw new Error(`EXTERNAL_CANARY_EXISTING_UNIT_NOT_COMPLETE:${existing.current_state}`)
      if (existing.raw_manifest_id !== raw.objectId) return Object.freeze({ status: "SOURCE_CONTENT_REVISED", provider: bundle.provider, previousRawObjectId: existing.raw_manifest_id, currentRawObjectId: raw.objectId, persisted: false, metadata: bundle.metadata })
      const rawRegistration = await d2.registerRawObjectManifest(raw)
      if (rawRegistration.status !== "DUPLICATE") throw new Error(`EXTERNAL_CANARY_RERUN_RAW_${rawRegistration.status}`)
      let candidateDuplicates = 0; let factDuplicates = 0; let submissionDuplicates = 0
      for (let index = 0; index < bundle.observations.length; index += 1) {
        const value = candidate(bundle, raw, existing.unit_id, existing.attempt_id, index, isoNow())
        if ((await d3.persistCandidate(value)).status === "DUPLICATE") candidateDuplicates += 1
        const command = normalizer.normalize({ candidate: value, datasetRegistrySnapshotId: datasetSnapshotId(bundle), providerRegistrySnapshotId: providerSnapshotId(bundle), providerCertificationSnapshotId: providerCertificationId(bundle), policyVersionId: policyId(bundle), schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: raw.objectId, rawObject: raw })
        if ((await commit.execute(command)).status === "DUPLICATE") factDuplicates += 1
        if ((await d3.createSubmission(`submission:${value.candidateId}`, value.candidateId, command.idempotencyKey, isoNow())) === "DUPLICATE") submissionDuplicates += 1
      }
      const after = await counts(bundle, clients)
      if (JSON.stringify(before) !== JSON.stringify(after) || [candidateDuplicates, factDuplicates, submissionDuplicates].some((count) => count !== bundle.observations.length)) throw new Error("EXTERNAL_CANARY_RERUN_IDEMPOTENCY_FAILED")
      return Object.freeze({ status: "RERUN_DUPLICATE", provider: bundle.provider, rawObjectId: raw.objectId, sourceChecksum: raw.contentHash, observations: bundle.observations.length, candidateDuplicates, factDuplicates, submissionDuplicates, lineageDuplicates: 0, coverageDuplicates: 0, before, after, metadata: bundle.metadata, limitations: bundle.limitations })
    }

    const rawRegistration = await d2.registerRawObjectManifest(raw)
    if (rawRegistration.status === "CONFLICT" || rawRegistration.status === "REJECTED") throw new Error(`EXTERNAL_CANARY_RAW_${rawRegistration.status}`)
    const at = isoNow(); const built = buildRequest(bundle, at)
    const created = await d3.createJob(built.request)
    if (created.status !== "CREATED") throw new Error("EXTERNAL_CANARY_JOB_NOT_CREATED")
    const run = await d3.createRun(created.jobId, 1, at)
    const window = bounds(bundle)
    const units = expandPopulationUnits(built.job, [{ profileId: built.request.profile.profileId, profileVersion: built.request.profile.profileVersion, datasetId: bundle.datasetId, providerId: bundle.providerId, providerSnapshotId: providerSnapshotId(bundle), policyVersionId: policyId(bundle), venue: bundle.providerId.toUpperCase(), subjectOrSymbol: bundle.subject, windowStart: window.start, windowEnd: window.end, resolution: "1d", partitionKey: partitionKey(bundle), requestFingerprint: built.request.requestIdentity, requestParameters: { sourceRole: bundle.provider, parserVersion: bundle.parserVersion, boundedObservationCount: bundle.observations.length }, required: true }], at)
    if (await d3.expandUnits(units) !== 1) throw new Error("EXTERNAL_CANARY_UNIT_NOT_CREATED")
    const lease = await d3.claimUnit(WORKER_ID, run.runId, isoNow(), new Date(Date.now() + 30 * 60_000).toISOString())
    if (!lease || lease.unitId !== units[0]!.unitId) throw new Error("EXTERNAL_CANARY_LEASE_FAILED")
    await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "RETRIEVING", `external-retrieving:${bundle.provider}`, isoNow())
    const retrievalAttemptId = createRetrievalAttemptId(lease.unitId, run.runId, 1)
    await d3.appendRetrievalAttempt({ attemptId: retrievalAttemptId, unitId: lease.unitId, runId: run.runId, providerId: bundle.providerId, providerSnapshotId: providerSnapshotId(bundle), requestFingerprint: built.request.requestIdentity, startedAt: at, completedAt: isoNow(), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: bundle.mediaType, rawByteCount: raw.sizeBytes, rawManifestId: raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null })
    await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "RAW_PERSISTED", `external-raw:${bundle.provider}`, isoNow())
    await d3.checkpoint({ checkpointId: `checkpoint:raw:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "RAW_BOUNDARY", completedStage: "RAW_PERSISTED", rawManifestId: raw.objectId, candidateCursor: null, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, WORKER_ID)
    const candidates = bundle.observations.map((_, index) => candidate(bundle, raw, lease.unitId, retrievalAttemptId, index, isoNow()))
    for (const value of candidates) {
      if ((await d3.persistCandidate(value)).status !== "CREATED") throw new Error("EXTERNAL_CANARY_CANDIDATE_NOT_CREATED")
      await d3.appendValidation({ validationRunId: `validation:${value.candidateId}`, candidateId: value.candidateId, retrievalAttemptId, layer: "STRUCTURAL", ruleId: `mvp6a-${bundle.provider}-source-contract`, ruleVersion: "1.0.0", outcome: "PASSED", blocking: false, failureRouting: null, policyVersionId: policyId(bundle), diagnostics: { parserVersion: bundle.parserVersion, supplemental: true }, createdAt: isoNow() })
    }
    await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "CANDIDATES_READY", `external-candidates:${bundle.provider}`, isoNow())
    await d3.checkpoint({ checkpointId: `checkpoint:candidate:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANDIDATE_BOUNDARY", completedStage: "CANDIDATES_READY", rawManifestId: raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, WORKER_ID)
    await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "PROCESSING", `external-processing:${bundle.provider}`, isoNow())
    const outcomes = []; let lastSubmission = ""; let lastOutcome = ""
    for (const value of candidates) {
      const command = normalizer.normalize({ candidate: value, datasetRegistrySnapshotId: datasetSnapshotId(bundle), providerRegistrySnapshotId: providerSnapshotId(bundle), providerCertificationSnapshotId: providerCertificationId(bundle), policyVersionId: policyId(bundle), schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: raw.objectId, rawObject: raw })
      const submissionId = `submission:${value.candidateId}`; const outcomeId = `outcome:${value.candidateId}`
      if (await d3.createSubmission(submissionId, value.candidateId, command.idempotencyKey, isoNow()) !== "CREATED") throw new Error("EXTERNAL_CANARY_SUBMISSION_NOT_CREATED")
      const result = await commit.execute(command)
      if (result.status !== "SUCCESS" && result.status !== "DUPLICATE") throw new Error(`EXTERNAL_CANARY_COMMIT_${result.status}`)
      outcomes.push(await d3.recordD2Result({ jobId: created.jobId, runId: run.runId, unitId: lease.unitId, candidateId: value.candidateId, retrievalAttemptId, rawManifestId: raw.objectId, submissionId, leaseId: lease.leaseId, ownerId: WORKER_ID, fencingToken: lease.fencingToken, result, outcomeId, createdAt: isoNow() }))
      lastSubmission = submissionId; lastOutcome = outcomeId
    }
    const watermark = createWatermarkEligibility({ decisionId: `watermark:${lease.unitId}`, unitId: lease.unitId, datasetId: bundle.datasetId, providerId: bundle.providerId, dimensions: built.request.dimensions, outcomeIds: outcomes.map((outcome) => outcome.outcomeId), requiredUnitPolicyId: `required-${bundle.datasetId}-canary`, blockingReasons: [], policyVersionId: policyId(bundle), createdAt: isoNow(), outcome: outcomes.at(-1)! })
    await d3.writeWatermarkDecision(watermark)
    await d3.checkpoint({ checkpointId: `checkpoint:canonical:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "COMPLETED", rawManifestId: raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: lastSubmission, lastOutcomeId: lastOutcome, createdAt: isoNow() }, lease.leaseId, WORKER_ID)
    await d3.releaseLease(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, isoNow(), "COMPLETED")
    await d3.completeRun(run.runId, "SUCCEEDED", isoNow()); await d3.aggregateJob(created.jobId, isoNow())
    const reconciliation = { job: await d3.reconcileJob(created.jobId), run: await d3.reconcileRun(run.runId), unit: await d3.reconcileUnit(lease.unitId), lineageAcyclic: await d2.verifyLineageAcyclic() }
    if (!reconciliation.job.consistent || !reconciliation.run.consistent || !reconciliation.unit.consistent || !reconciliation.lineageAcyclic) throw new Error("EXTERNAL_CANARY_RECONCILIATION_FAILED")
    return Object.freeze({ status: "SUCCESS", provider: bundle.provider, rawObjectId: raw.objectId, sourceChecksum: raw.contentHash, sourceBytes: raw.sizeBytes, observations: candidates.length, limitations: bundle.limitations, metadata: bundle.metadata, before, after: await counts(bundle, clients), reconciliation })
  } finally { await clients.shutdown() }
}

async function readStatus(provider: ExternalCanaryProvider, command: "status" | "reconcile") {
  const environmentReady = provider === "fred" ? Boolean(process.env.FRED_API_KEY) : provider === "alpha-vantage" ? Boolean(process.env.ALPHA_VANTAGE_API_KEY) : true
  if (!environmentReady) return { provider, state: "ACCESS_CONFIGURATION_REQUIRED", secretPersisted: false }
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "READ_ONLY", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: `mvp6a-${provider}-status-d2` }, d3: { roleIntent: "READ_ONLY", maxConnections: 1, applicationName: `mvp6a-${provider}-status-d3` } })
  try {
    const datasetId = provider === "fred" ? "macro" : provider === "alpha-vantage" ? "daily-market-context" : "etf-flow"
    const providerId = provider === "farside" ? "farside-investors" : provider
    const rows = await clients.d3.sql.unsafe<Array<Record<string, number>>>("SELECT (SELECT count(1)::int FROM control.population_jobs WHERE dataset_id=$1 AND provider_id=$2) jobs,(SELECT count(1)::int FROM control.population_units WHERE dataset_id=$1 AND provider_id=$2 AND current_state='COMPLETED') completed_units,(SELECT count(1)::int FROM coverage.watermark_eligibility_decisions WHERE dataset_id=$1 AND provider_id=$2 AND eligibility_result='ELIGIBLE') eligible_coverage,(SELECT count(1)::int FROM control.population_leases WHERE released_at IS NULL) active_leases", [datasetId, providerId])
    return { provider, command, state: rows[0]?.completed_units ? "CERTIFIED_BOUNDED_CANARY" : "CONFIGURED_NOT_EXECUTED", ...rows[0], secretPersisted: false }
  } finally { await clients.shutdown() }
}

function sanitized(error: unknown): string {
  let message = error instanceof Error ? error.message : "EXTERNAL_CONTEXT_FAILED"
  for (const value of [process.env.FRED_API_KEY, process.env.ALPHA_VANTAGE_API_KEY]) if (value) message = message.split(value).join("REDACTED")
  return message
}

async function main() {
  const command = (process.argv[2] ?? "status") as Command
  const provider = (argument("provider") ?? "farside") as ExternalCanaryProvider
  if (!["status", "canary", "reconcile"].includes(command)) throw new Error(`Unsupported command: ${command}`)
  if (!["fred", "alpha-vantage", "farside"].includes(provider)) throw new Error(`Unsupported provider: ${provider}`)
  const result = command === "canary" ? await persistCanary(await fetchExternalCanary(provider)) : await readStatus(provider, command)
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

void main().catch((error: unknown) => { process.stderr.write(`${sanitized(error)}\n`); process.exitCode = 1 })
