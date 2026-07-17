import { createHash } from "node:crypto"
import { randomUUID } from "node:crypto"
import { rm } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { validateRawObjectScope, type RawObjectManifest } from "@/lib/data-platform/persistence"
import { buildCanonicalStreamSegmentCommand, createCanonicalPersistenceAdapter, type CanonicalPersistenceAdapter, type IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"
import { createCandidateId, createJobRequestIdentity, createPopulationJobId, createRetrievalAttemptId, expandPopulationUnits, type PopulationCandidate, type PopulationJob, type PopulationJobProfile, type PopulationJobRequest } from "@/lib/data-platform/population"
import { createPopulationPostgresAdapter, type D3PostgresClient, type PopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"
import { AGG_TRADES_SEGMENT_NORMALIZER_VERSION, AGG_TRADES_SEGMENT_ORDER_POLICY, AGG_TRADES_SEGMENT_SCHEMA_VERSION, createD3ToD2CanonicalCommitPort, createFilesystemObjectStorage, createIntegratedBackfillClientsFromEnvironment, ProductionNormalizerRegistry, PRODUCTION_NORMALIZER_VERSION, type OpenInterestSourceRow } from "@/lib/data-platform/population/backfill"
import type { CanonicalCommitPort, ObjectStoragePort } from "@/lib/data-platform/population/contracts"
import { ConsistencyPostgresRuntime } from "@/lib/data-platform/consistency-evidence/postgres"
import { loadMvpProjectionEvidenceInputs, MvpProjectionStore } from "@/lib/data-platform/consistency-evidence/postgres"
import { persistMvpConsistencyWindow, persistMvpEvidenceWindow, readMvpEvidenceWindows, type MvpEvidenceWindowData } from "@/lib/data-platform/consistency"
import { MVP_PROJECTION_DEFINITIONS, type MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import { persistBoundedMvpProjections } from "@/lib/data-platform/consistency-evidence/postgres"
import { MvpServingPostgresClient } from "@/lib/data-platform/mvp-serving"
import { canonicalizeServingCorpusMembers, compareServingCorpusMembership, computeCandidateServingChecksum, LocalInactiveCandidateAssemblyService } from "@/lib/data-platform/mvp-serving/candidateMembership"
import type { ServingCorpusMember } from "@/lib/data-platform/mvp-serving/candidateMembership"
import { materializeMvpReplaySequence } from "@/lib/replay-sequence"
import type { ConsumerProjection } from "@/lib/data-platform/consumer-projections"
import { MvpRefreshPostgresClient } from "./client"
import { boundedArchiveSourceUrl, buildBoundedAggTradesSegment, createBoundedArchiveRequest, parseBoundedAggTradesArchive, parseBoundedOhlcvArchive, parseBoundedOpenInterestArchive, type BoundedArchiveBatch, type BoundedOhlcvRow } from "./boundedAdapters"
import { createBoundedFundingCandidate, createBoundedFundingRequest, createBoundedFundingSourceUrl, parseBoundedFundingEvents, type ProviderNativeFundingEvent } from "./boundedFunding"
import { ControlledOhlcvRecoveryStore } from "./controlledOhlcvRecovery"
import { createLiveExecutorPortSet, composeConcreteLiveResumePorts, type BoundedLiveSlotAdapter, type LiveCandidateExecutor, type LiveDownstreamExecutor, type LiveWatermarkAuditPort } from "./liveExecutorPorts"
import { PostgresLiveResumeCoordinatorControlPlane, PostgresLiveResumeExecutionStore } from "./liveResumePostgres"
import { LIVE_MVP_DATASET_GOVERNANCE } from "./integratedGovernance"
import { MvpRefreshStore } from "./store"
import type { LiveResumeLocalBindingSet, LiveResumeBindingCapability, LiveResumeEnvironmentMode } from "./liveResumeEnvironment"
import type { LiveResumeSlotResult, LiveResumeStageOutput } from "./liveResumeCoordinator"
import type { RefreshLogicalDataset, RefreshLogicalInstrument, RefreshSlotResumePlanEntry } from "./unitReconciliation"

const INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const)
const DATASETS = Object.freeze(["ohlcv", "open-interest", "funding", "agg-trade"] as const)
const SOURCE_CONTRACTS: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({
  ohlcv: "mvp-bounded-ohlcv/1.0.0",
  "open-interest": "mvp-bounded-open-interest/1.0.0",
  funding: "binance-official-rest-funding-rate/1.0.0",
  "agg-trade": "mvp-bounded-agg-trade/1.0.0",
})

export interface ProcessLiveResumeBootstrapInput {
  readonly mode: Exclude<LiveResumeEnvironmentMode, "INSPECT">
  readonly environment: NodeJS.ProcessEnv
  readonly capabilities: readonly LiveResumeBindingCapability[]
  readonly intervalStart?: string
  readonly intervalEnd?: string
  readonly plannerIdentity?: string
  readonly plannerChecksum?: string
}

interface OpenResource { close(): Promise<void> }

type ArchiveRow = BoundedOhlcvRow | OpenInterestSourceRow | Awaited<ReturnType<typeof parseBoundedAggTradesArchive>>["rows"][number]
interface PopulationContext { readonly jobId: string; readonly runId: string; readonly unitId: string; readonly leaseId: string; readonly fencingToken: number; readonly retrievalAttemptId: string }
interface SlotState {
  readonly bytes: Uint8Array
  readonly contentType: string
  readonly sourceChecksum: string
  readonly observedThrough: string
  readonly rows: readonly ArchiveRow[] | readonly ProviderNativeFundingEvent[]
  raw?: RawObjectManifest
  population?: PopulationContext
  candidates?: readonly PopulationCandidate[]
  segment?: Awaited<ReturnType<typeof buildBoundedAggTradesSegment>>
  commitOutputs?: readonly { readonly identity: string; readonly checksum: string }[]
  resumeStage?: "SOURCE_ACQUISITION" | "CANDIDATE_LINEAGE" | "CANONICAL_COMMIT"
}

class ResourceScope {
  private readonly resources: OpenResource[] = []
  add<T extends OpenResource>(resource: T): T { this.resources.push(resource); return resource }
  async close(): Promise<void> {
    const resources = this.resources.splice(0).reverse()
    await Promise.allSettled(resources.map((resource) => resource.close()))
  }
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]
  if (!value) throw new Error(`${name}_VARIABLE_MISSING`)
  return value
}

function exactDay(start: string, end: string): void {
  if (Date.parse(end) - Date.parse(start) !== 86_400_000 || new Date(Date.parse(start)).toISOString() !== start || new Date(Date.parse(end)).toISOString() !== end) throw new Error("LIVE_RESUME_EXACT_DAY_REQUIRED")
}

function sanitizedIdentity(prefix: string, value: unknown): { readonly identity: string; readonly checksum: string } {
  const checksum = canonicalChecksum(value)
  return Object.freeze({ identity: `${prefix}_${checksum}`, checksum })
}

function stageOutput(prefix: string, value: unknown): LiveResumeStageOutput {
  const output = sanitizedIdentity(prefix, value)
  return Object.freeze({ identities: Object.freeze([output.identity]), checksum: output.checksum })
}

async function rollbackProbe(execute: (sql: string) => Promise<unknown>): Promise<void> {
  await execute("CREATE TEMP TABLE mvp_live_resume_preflight_probe(value integer) ON COMMIT DROP")
  await execute("INSERT INTO mvp_live_resume_preflight_probe(value) VALUES(1)")
  await execute("SELECT value FROM mvp_live_resume_preflight_probe")
  throw new Error("LIVE_PREFLIGHT_ROLLBACK")
}

async function expectRollback(work: () => Promise<unknown>): Promise<void> {
  try { await work(); throw new Error("LIVE_PREFLIGHT_ROLLBACK_NOT_ENFORCED") }
  catch (error) { if (!(error instanceof Error) || error.message !== "LIVE_PREFLIGHT_ROLLBACK") throw error }
}

async function objectStorageProbe(storage: ObjectStoragePort, root: string): Promise<void> {
  const bytes = new TextEncoder().encode("mvp-live-resume-preflight")
  const checksum = createHash("sha256").update(bytes).digest("hex")
  const key = `_preflight/${randomUUID()}/${checksum}.probe`
  try {
    await storage.putImmutable({ objectStorageKey: key, contentHash: checksum, mediaType: "application/octet-stream", byteLength: bytes.byteLength, content: stream(bytes) })
    const stat = await storage.stat(key)
    if (!stat.exists || stat.contentHash !== checksum || stat.byteLength !== bytes.byteLength) throw new Error("LIVE_OBJECT_STORAGE_PREFLIGHT_FAILED")
    let readBytes = 0
    for await (const chunk of storage.read(key)) readBytes += chunk.byteLength
    if (readBytes !== bytes.byteLength) throw new Error("LIVE_OBJECT_STORAGE_PREFLIGHT_FAILED")
  } finally {
    const target = path.resolve(root, key)
    await Promise.allSettled([rm(target, { force: true }), rm(`${target}.metadata.json`, { force: true }), rm(path.dirname(target), { recursive: true, force: true })])
  }
}

async function boundedLineageProbe(adapter: PopulationPostgresAdapter, client: D3PostgresClient, intervalStart: string, intervalEnd: string): Promise<void> {
  const rows = await client.sql<Array<Record<string, unknown>>>`
    SELECT c.*,a.run_id,a.provider_id attempt_provider_id,a.provider_snapshot_id attempt_provider_snapshot_id,
      a.raw_manifest_id attempt_raw_manifest_id
    FROM population.candidates c
    JOIN control.retrieval_attempts a ON a.attempt_id=c.retrieval_attempt_id
    JOIN control.population_units u ON u.unit_id=c.unit_id
    WHERE u.window_start=${intervalStart} AND u.window_end=${intervalEnd}
    ORDER BY c.created_at,c.candidate_id LIMIT 1`
  const row = rows[0]
  if (!row) throw new Error("LIVE_LINEAGE_PREFLIGHT_TEMPLATE_MISSING")
  const nonce = randomUUID(), at = new Date().toISOString(), attemptId = `retrieval-attempt-probe:${nonce}`, candidateId = `population-candidate-probe:${nonce}`
  const candidate = Object.freeze({
    kind: String(row.candidate_kind), candidateId, unitId: String(row.unit_id), retrievalAttemptId: attemptId,
    rawManifestId: String(row.raw_manifest_id), datasetId: String(row.dataset_id), providerId: String(row.provider_id),
    providerSnapshotId: String(row.provider_snapshot_id), sourceObservationId: `lineage-probe:${nonce}`,
    sourceObservedAt: at, effectiveAt: at, parserVersion: String(row.parser_version), candidateSchemaVersion: String(row.candidate_schema_version),
    payload: Object.freeze({ lineageProbe: true }), candidateChecksum: canonicalChecksum({ candidateId, attemptId }), validationStatus: "NOT_EVALUATED",
    qualityEligibility: "NOT_EVALUATED", normalizationEligibility: "NOT_EVALUATED", createdAt: at,
  }) as unknown as PopulationCandidate
  const result = await adapter.probeBoundedAcquisitionLineage({
    retrievalAttempt: { attemptId, unitId: String(row.unit_id), runId: String(row.run_id), providerId: String(row.attempt_provider_id), providerSnapshotId: String(row.attempt_provider_snapshot_id), requestFingerprint: `lineage-probe:${nonce}`, startedAt: at, completedAt: at, outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: "application/octet-stream", rawByteCount: 0, rawManifestId: String(row.attempt_raw_manifest_id), errorClass: null, errorCode: null, retryClassificationId: null },
    rawObjectChecksum: String(row.candidate_checksum), candidates: Object.freeze([candidate]),
  })
  if (!result.passed || result.retainedRows !== 0) throw new Error("LIVE_LINEAGE_PREFLIGHT_FAILED")
}

async function boundedRawObjectProbe(client: IsolatedPostgresClient, intervalStart: string, intervalEnd: string): Promise<void> {
  const nonce = randomUUID(), checksum = createHash("sha256").update(`mvp-lineage-raw-probe:${nonce}`).digest("hex"), objectId = `raw_${checksum}`
  const manifest: RawObjectManifest = Object.freeze({ objectId, datasetId: "ohlcv", providerId: "binance-public-archive", venue: "binance-usdm-futures", symbolOrSubject: "BTCUSDT", windowStart: intervalStart, windowEnd: intervalEnd, contentHash: checksum, sizeBytes: 0, mediaType: "application/octet-stream", compression: "NONE", retrievedAt: intervalEnd, providerSnapshotId: GOVERNANCE.ohlcv.providerRegistry, retentionClass: "STANDARD", verificationState: "VERIFIED", objectStorageKey: `_preflight/${objectId}.probe`, createdAt: intervalEnd })
  try {
    await client.transaction(async (sql) => {
      const transactionClient = { ...client, sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as IsolatedPostgresClient
      const result = await createCanonicalPersistenceAdapter(transactionClient).registerRawObjectManifest(manifest)
      if (result.status !== "SUCCESS") throw new Error("LIVE_RAW_OBJECT_LINEAGE_PROBE_FAILED")
      throw new Error("LIVE_RAW_OBJECT_LINEAGE_PROBE_ROLLBACK")
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "LIVE_RAW_OBJECT_LINEAGE_PROBE_ROLLBACK") throw error
  }
  const retained = await client.sql<{ readonly count: number }[]>`SELECT count(*)::int count FROM raw.objects WHERE object_id=${objectId}`
  if (retained[0]?.count !== 0) throw new Error("LIVE_RAW_OBJECT_LINEAGE_PROBE_RETAINED_ROW")
}

const GOVERNANCE = LIVE_MVP_DATASET_GOVERNANCE

function stream(bytes: Uint8Array): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { yield bytes } } }
async function readObjectBytes(storage: ObjectStoragePort, key: string): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []; let length = 0
  for await (const chunk of storage.read(key)) { chunks.push(chunk); length += chunk.byteLength }
  const bytes = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}
function canonicalInstrument(symbol: string): string { return `binance-usdm-perpetual:${symbol.slice(0, -4)}-USDT` }
function rawTransportProvider(dataset: RefreshLogicalDataset): string { return dataset === "funding" ? GOVERNANCE.funding.providerId : "binance-public-archive" }

function populationDefinition(input: Parameters<BoundedLiveSlotAdapter["persistArtifact"]>[0], at: string) {
  const profile: PopulationJobProfile = Object.freeze({ profileId: `mvp-live-${input.dataset}`, profileVersion: "1.0.0", kind: "INCREMENTAL", requiredDimensions: Object.freeze(["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const), rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "mvp-live-bounded-retry", retryPolicyVersion: "1.0.0", watermarkPolicyId: `mvp-live-${input.dataset}`, watermarkPolicyVersion: "1.0.0" })
  const dimensions = Object.freeze({ venue: "binance-usdm-futures", subjectOrSymbol: input.instrument, windowStart: input.intervalStart, windowEnd: input.intervalEnd, resolution: input.dataset === "agg-trade" ? "tick" : input.dataset === "funding" ? "event" : "5m", partitionKey: input.logicalSlotId })
  const base = { profile, datasetId: input.dataset, providerId: GOVERNANCE[input.dataset].providerId, dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: input.logicalSlotId, intentionalRerunIdentity: input.executionGenerationId, requestedAt: at, requestedBy: "mvp-live-resume" })
  const jobId = createPopulationJobId(requestIdentity, request.occurrenceIdentity, request.intentionalRerunIdentity)
  const job: PopulationJob = Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt: at, updatedAt: at })
  const units = expandPopulationUnits(job, [{ profileId: profile.profileId, profileVersion: profile.profileVersion, datasetId: input.dataset, providerId: base.providerId, providerSnapshotId: GOVERNANCE[input.dataset].providerRegistry, policyVersionId: GOVERNANCE[input.dataset].policy, venue: dimensions.venue, subjectOrSymbol: input.instrument, windowStart: input.intervalStart, windowEnd: input.intervalEnd, resolution: dimensions.resolution, partitionKey: input.logicalSlotId, requestFingerprint: requestIdentity, requestParameters: { logicalSlotId: input.logicalSlotId, executionGenerationId: input.executionGenerationId, sourceContractId: input.sourceContractId }, required: true }], at).map((unit) => Object.freeze({ ...unit, unitId: `population-unit-execution-v1:${canonicalChecksum({ logicalSlotId: input.logicalSlotId, executionGenerationId: input.executionGenerationId })}` }))
  return Object.freeze({ request, jobId, units })
}

async function preparePopulation(input: Parameters<BoundedLiveSlotAdapter["persistArtifact"]>[0], adapter: PopulationPostgresAdapter, at: string): Promise<PopulationContext> {
  const definition = populationDefinition(input, at)
  await adapter.createJob(definition.request)
  const run = await adapter.createRun(definition.jobId, 1, at)
  const units = definition.units
  await adapter.expandUnits(units)
  const expiresAt = new Date(Date.parse(at) + 300_000).toISOString()
  const claimed = await adapter.claimUnit("mvp-live-resume", run.runId, at, expiresAt) ?? await adapter.recoverPopulationUnitLease({ unitId: units[0]!.unitId, runId: run.runId, ownerId: "mvp-live-resume", now: at, expiresAt })
  if (!claimed) throw new Error("LIVE_POPULATION_UNIT_LEASE_UNAVAILABLE")
  const transition = await adapter.transitionUnitIdempotently({ eventId: `live-retrieving:${input.logicalSlotId}:fence:${claimed.fencingToken}`, unitId: claimed.unitId, runId: run.runId, eventType: "STATE_ADVANCED", previousState: "LEASED", nextState: "RETRIEVING", fencingToken: claimed.fencingToken, actorId: "mvp-live-resume", occurredAt: at, details: {}, leaseId: claimed.leaseId, ownerId: "mvp-live-resume" })
  if (transition.status === "CONFLICT") throw new Error("LIVE_POPULATION_RETRIEVING_EVENT_CONFLICT")
  return Object.freeze({ jobId: definition.jobId, runId: run.runId, unitId: claimed.unitId, leaseId: claimed.leaseId, fencingToken: claimed.fencingToken, retrievalAttemptId: createRetrievalAttemptId(claimed.unitId, input.executionGenerationId, 1) })
}

function rawManifest(input: Parameters<BoundedLiveSlotAdapter["persistArtifact"]>[0], state: SlotState, objectId: string, objectStorageKey: string, at: string): RawObjectManifest {
  return Object.freeze({ objectId, datasetId: input.dataset, providerId: rawTransportProvider(input.dataset), venue: "binance-usdm-futures", symbolOrSubject: input.instrument, windowStart: input.intervalStart, windowEnd: input.intervalEnd, contentHash: state.sourceChecksum, sizeBytes: state.bytes.byteLength, mediaType: state.contentType, compression: input.dataset === "funding" ? "NONE" : "ZIP", retrievedAt: at, providerSnapshotId: GOVERNANCE[input.dataset].providerRegistry, retentionClass: "ARCHIVE", verificationState: "VERIFIED", objectStorageKey, createdAt: at })
}

function buildCandidate(input: Parameters<BoundedLiveSlotAdapter["normalizeAndPersistCandidates"]>[0], row: ArchiveRow | ProviderNativeFundingEvent, ordinal: number, state: SlotState): PopulationCandidate {
  const raw = state.raw!, context = state.population!, governance = GOVERNANCE[input.dataset], canonicalProviderId = governance.providerId
  if (input.dataset === "funding") return createBoundedFundingCandidate(row as ProviderNativeFundingEvent, context.unitId, raw.objectId, raw.createdAt)
  if (input.dataset === "ohlcv") {
    const value = row as BoundedOhlcvRow, sourceObservationId = `${canonicalProviderId}:${input.instrument}:5m:${value.openTime}`
    const payload = Object.freeze({ symbol: input.instrument, resolution: "5m", open: value.open, high: value.high, low: value.low, close: value.close, volume: value.volume, closeTime: value.closeTime })
    const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: governance.parser, candidateOrdinal: String(ordinal) })
    return Object.freeze({ kind: "OHLCV", candidateId, unitId: context.unitId, retrievalAttemptId: context.retrievalAttemptId, rawManifestId: raw.objectId, datasetId: "ohlcv", providerId: canonicalProviderId, providerSnapshotId: governance.providerRegistry, sourceObservationId, sourceObservedAt: value.openTime, effectiveAt: value.openTime, parserVersion: governance.parser, candidateSchemaVersion: governance.schema, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, parserVersion: governance.parser, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt: raw.createdAt })
  }
  if (input.dataset === "open-interest") {
    const value = row as OpenInterestSourceRow, sourceObservationId = `${canonicalProviderId}:${input.instrument}:5m:${value.observedAt}`
    const payload = Object.freeze({ symbol: input.instrument, canonicalInstrumentId: canonicalInstrument(input.instrument), marketType: "USD_M_FUTURES", openInterest: value.openInterest, unit: "PROVIDER_NATIVE" as const, openInterestValue: value.openInterestValue, valueUnit: "PROVIDER_NATIVE_QUOTE_VALUE" as const, window: "5m" as const })
    const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: governance.parser, candidateOrdinal: String(value.sourceOrdinal) })
    return Object.freeze({ kind: "OPEN_INTEREST", candidateId, unitId: context.unitId, retrievalAttemptId: context.retrievalAttemptId, rawManifestId: raw.objectId, datasetId: "open-interest", providerId: canonicalProviderId, providerSnapshotId: governance.providerRegistry, sourceObservationId, sourceObservedAt: value.observedAt, effectiveAt: value.observedAt, parserVersion: governance.parser, candidateSchemaVersion: governance.schema, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, parserVersion: governance.parser, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt: raw.createdAt })
  }
  const built = state.segment!, sourceObservationId = `${input.logicalSlotId}:${built.segmentChecksum}`
  const payload = Object.freeze({ symbol: input.instrument, streamKind: "AGG_TRADE" as const, rawObjectId: raw.objectId, windowStart: input.intervalStart, windowEnd: input.intervalEnd, firstSequence: built.firstAggregateTradeId, lastSequence: built.lastAggregateTradeId, recordCount: built.eventCount, segmentContractVersion: "2" as const, canonicalInstrumentId: canonicalInstrument(input.instrument), sourcePartitionKey: input.logicalSlotId, segmentObjectKey: built.segmentObjectKey, segmentContentChecksum: built.segmentChecksum, segmentByteLength: built.byteLength, columnarFormat: "PARQUET" as const, compressionFormat: "SNAPPY" as const, eventTimeMin: built.eventTimeMinimum, eventTimeMax: built.eventTimeMaximum, eventOrderPolicy: built.eventOrderPolicy, acceptedCount: built.acceptedCount, rejectedCount: built.rejectedCount, duplicateCount: built.duplicateCount })
  const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: governance.parser, candidateOrdinal: "0" })
  return Object.freeze({ kind: "STREAM_MANIFEST", candidateId, unitId: context.unitId, retrievalAttemptId: context.retrievalAttemptId, rawManifestId: raw.objectId, datasetId: "agg-trade", providerId: canonicalProviderId, providerSnapshotId: governance.providerRegistry, sourceObservationId, sourceObservedAt: built.eventTimeMaximum, effectiveAt: input.intervalStart, parserVersion: governance.parser, candidateSchemaVersion: governance.schema, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt: raw.createdAt })
}

function candidateScope(candidate: PopulationCandidate, invocation: Parameters<BoundedLiveSlotAdapter["commit"]>[0], raw: RawObjectManifest, expectedParserVersion: string): readonly string[] {
  const interval = candidate.kind === "STREAM_MANIFEST"
    ? { start: candidate.payload.windowStart, end: candidate.payload.windowEnd, policy: "EXACT" as const }
    : candidate.kind === "OHLCV"
      ? { start: candidate.sourceObservedAt, end: candidate.payload.closeTime, policy: "CONTAINED" as const }
      : candidate.kind === "FUNDING"
        ? { start: candidate.payload.fundingTime, end: null, policy: "CONTAINED" as const }
        : candidate.kind === "OPEN_INTEREST"
          ? { start: candidate.sourceObservedAt, end: null, policy: "CONTAINED" as const }
          : { start: candidate.sourceObservedAt, end: null, policy: "CONTAINED" as const }
  const contractErrors = candidate.parserVersion === expectedParserVersion && invocation.sourceContractId === SOURCE_CONTRACTS[invocation.dataset] ? [] : ["SOURCE_CONTRACT_MISMATCH"]
  return Object.freeze([...contractErrors, ...validateRawObjectScope({ datasetId: invocation.dataset, providerId: candidate.providerId, providerSnapshotId: candidate.providerSnapshotId, instrument: invocation.instrument, sourceContractVersion: invocation.sourceContractId, expectedSourceContractVersion: SOURCE_CONTRACTS[invocation.dataset], intervalStart: interval.start, intervalEnd: interval.end, intervalPolicy: interval.policy, rawObject: raw })])
}

function canonicalFailureClassification(error: unknown): string {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("RAW_OBJECT") || message.includes("SOURCE_CONTRACT")) return "CANONICAL_SCOPE_VALIDATION_FAILED"
  if (message.includes("CONFLICT")) return "CANONICAL_IMMUTABLE_CONFLICT"
  return "CANONICAL_COMMIT_FAILED"
}

function createDatasetAdapter(input: { readonly dataset: RefreshLogicalDataset; readonly storage: ObjectStoragePort; readonly objectRoot: string; readonly d2Client: IsolatedPostgresClient; readonly d2: CanonicalPersistenceAdapter; readonly d3: PopulationPostgresAdapter; readonly canonical: CanonicalCommitPort; readonly refresh: MvpRefreshStore }): BoundedLiveSlotAdapter {
  const states = new Map<string, SlotState>()
  const state = (id: string) => { const value = states.get(id); if (!value) throw new Error("LIVE_SLOT_STATE_MISSING"); return value }
  return Object.freeze({
    dataset: input.dataset,
    sourceContractId: SOURCE_CONTRACTS[input.dataset],
    supportedInstruments: input.dataset === "ohlcv" ? INSTRUMENTS.filter((value) => value !== "BTCUSDT") : INSTRUMENTS,
    async reconcileResume(invocation) {
      const definition = populationDefinition(invocation, new Date().toISOString())
      const unitId = definition.units[0]!.unitId
      const now = new Date().toISOString()
      const resolution = await input.d3.reconcileBoundedAcquisitionResume({ unitId, ownerId: "mvp-live-resume", now, expiresAt: new Date(Date.parse(now) + 300_000).toISOString() })
      if (!resolution) return null
      if (!resolution.rawObjectId || !resolution.retrievalAttempt) return Object.freeze({ stage: resolution.stage as "SOURCE_ACQUISITION" })
      const rawRows = await input.d2Client.sql<Array<Record<string, unknown>>>`SELECT object_id,dataset_id,provider_id,venue,symbol_or_subject,window_start,window_end,content_hash,size_bytes,media_type,compression,retrieved_at,provider_snapshot_id,retention_class,verification_state,object_storage_key,created_at FROM raw.objects WHERE object_id=${resolution.rawObjectId}`
      if (!rawRows[0]) throw new Error("LIVE_RESUME_RAW_OBJECT_MISSING")
      const rawRow = rawRows[0]
      const raw = Object.freeze({ objectId: String(rawRow.object_id), datasetId: String(rawRow.dataset_id), providerId: String(rawRow.provider_id), venue: String(rawRow.venue), symbolOrSubject: String(rawRow.symbol_or_subject), windowStart: String(rawRow.window_start), windowEnd: String(rawRow.window_end), contentHash: String(rawRow.content_hash), sizeBytes: Number(rawRow.size_bytes), mediaType: String(rawRow.media_type), compression: String(rawRow.compression), retrievedAt: String(rawRow.retrieved_at), providerSnapshotId: String(rawRow.provider_snapshot_id), retentionClass: String(rawRow.retention_class), verificationState: String(rawRow.verification_state), objectStorageKey: String(rawRow.object_storage_key), createdAt: String(rawRow.created_at) }) as RawObjectManifest
      const bytes = await readObjectBytes(input.storage, raw.objectStorageKey)
      const checksum = createHash("sha256").update(bytes).digest("hex")
      if (checksum !== raw.contentHash || bytes.byteLength !== raw.sizeBytes) throw new Error("LIVE_RESUME_RETAINED_RAW_CONFLICT")
      const archiveRequest = input.dataset === "funding" ? null : createBoundedArchiveRequest({ dataset: input.dataset as Exclude<RefreshLogicalDataset, "funding">, provider: "binance-vision", instrument: invocation.instrument, eventTimeStart: invocation.intervalStart, eventTimeEnd: invocation.intervalEnd, sourceContractVersion: invocation.sourceContractId, maximumRecordCount: input.dataset === "ohlcv" ? 288 : input.dataset === "open-interest" ? 10_000 : 10_000_000 })
      const retrievalIdentity = `mrret_${canonicalChecksum({ logicalSlotId: invocation.logicalSlotId, sourceChecksum: checksum })}`
      const fundingRequest = input.dataset === "funding" ? createBoundedFundingRequest({ provider: "binance-official-rest-funding-rate", instrument: invocation.instrument, eventTimeStart: invocation.intervalStart, eventTimeEnd: invocation.intervalEnd, maximumEventCount: 1_000, requestedAt: now }) : null
      const rows = fundingRequest ? parseBoundedFundingEvents({ bytes, request: fundingRequest, retrievalIdentity, rawArtifactIdentity: raw.objectId, observedAt: raw.retrievedAt }) : archiveRequest!.dataset === "ohlcv" ? parseBoundedOhlcvArchive(archiveRequest!, bytes).rows : archiveRequest!.dataset === "open-interest" ? parseBoundedOpenInterestArchive(archiveRequest!, bytes).rows : (await parseBoundedAggTradesArchive(archiveRequest!, bytes)).rows
      const observedThrough = fundingRequest ? (rows.at(-1) as ProviderNativeFundingEvent | undefined)?.providerEventTimestamp ?? invocation.intervalStart : archiveRequest!.dataset === "ohlcv" ? (rows.at(-1) as BoundedOhlcvRow).closeTime : archiveRequest!.dataset === "open-interest" ? (rows.at(-1) as OpenInterestSourceRow).observedAt : (rows.at(-1) as Awaited<ReturnType<typeof parseBoundedAggTradesArchive>>["rows"][number]).tradeTime
      const population = Object.freeze({ jobId: resolution.jobId, runId: resolution.runId, unitId: resolution.unitId, leaseId: resolution.lease.leaseId, fencingToken: resolution.lease.fencingToken, retrievalAttemptId: resolution.retrievalAttempt.attemptId })
      const value: SlotState = { bytes, contentType: raw.mediaType, sourceChecksum: checksum, observedThrough, rows, raw, population, candidates: resolution.candidates, resumeStage: resolution.stage as "CANDIDATE_LINEAGE" | "CANONICAL_COMMIT" }
      states.set(invocation.logicalSlotId, value)
      const source = Object.freeze({ status: "AVAILABLE" as const, retrievalIdentity, bytes, sourceChecksum: checksum, contentType: raw.mediaType, observedThrough, limitations: Object.freeze([]) })
      const artifact = Object.freeze({ artifactIdentity: `mra_${canonicalChecksum({ logicalSlotId: invocation.logicalSlotId, rawObjectId: raw.objectId })}`, artifactChecksum: checksum, retainedBytes: 0, status: "DUPLICATE" as const })
      if (resolution.stage === "CANDIDATE_LINEAGE") return Object.freeze({ stage: resolution.stage, source, artifact })
      const candidateChecksum = canonicalChecksum(resolution.candidates.map((candidate) => [candidate.candidateId, candidate.candidateChecksum]))
      return Object.freeze({ stage: "CANONICAL_COMMIT" as const, source, artifact, candidate: Object.freeze({ candidateIdentity: `mrcs_${candidateChecksum}`, candidateChecksum, status: "DUPLICATE" as const, payload: resolution.candidates }) })
    },
    async inspectFinalization(invocation) {
      const request = input.dataset === "funding" ? null : createBoundedArchiveRequest({ dataset: input.dataset as Exclude<RefreshLogicalDataset, "funding">, provider: "binance-vision", instrument: invocation.instrument, eventTimeStart: invocation.intervalStart, eventTimeEnd: invocation.intervalEnd, sourceContractVersion: invocation.sourceContractId, maximumRecordCount: input.dataset === "ohlcv" ? 288 : input.dataset === "open-interest" ? 10_000 : 10_000_000 })
      const fundingRequest = input.dataset === "funding" ? createBoundedFundingRequest({ provider: "binance-official-rest-funding-rate", instrument: invocation.instrument, eventTimeStart: invocation.intervalStart, eventTimeEnd: invocation.intervalEnd, maximumEventCount: 1_000, requestedAt: new Date().toISOString() }) : null
      const response = await fetch(request ? boundedArchiveSourceUrl(request) : createBoundedFundingSourceUrl(fundingRequest!), { cache: "no-store", signal: AbortSignal.timeout(180_000) })
      if (response.status === 404) return Object.freeze({ status: "SOURCE_NOT_FINALIZED" as const, retrievalIdentity: null, bytes: null, sourceChecksum: null, contentType: null, observedThrough: null, limitations: Object.freeze(["SOURCE_NOT_FINALIZED"]) })
      if (!response.ok) return Object.freeze({ status: "INELIGIBLE" as const, retrievalIdentity: null, bytes: null, sourceChecksum: null, contentType: null, observedThrough: null, limitations: Object.freeze([`SOURCE_HTTP_${response.status}`]) })
      const bytes = new Uint8Array(await response.arrayBuffer()), sourceChecksum = createHash("sha256").update(bytes).digest("hex"), observedAt = new Date().toISOString()
      const rows = fundingRequest ? parseBoundedFundingEvents({ bytes, request: fundingRequest, retrievalIdentity: `mrret_${canonicalChecksum({ requestIdentity: fundingRequest.requestIdentity, sourceChecksum })}`, rawArtifactIdentity: `raw_${sourceChecksum}`, observedAt }) : request!.dataset === "ohlcv" ? parseBoundedOhlcvArchive(request!, bytes).rows : request!.dataset === "open-interest" ? parseBoundedOpenInterestArchive(request!, bytes).rows : (await parseBoundedAggTradesArchive(request!, bytes)).rows
      const observedThrough = fundingRequest ? (rows.at(-1) as ProviderNativeFundingEvent | undefined)?.providerEventTimestamp ?? invocation.intervalStart : request!.dataset === "ohlcv" ? (rows.at(-1) as BoundedOhlcvRow).closeTime : request!.dataset === "open-interest" ? (rows.at(-1) as OpenInterestSourceRow).observedAt : (rows.at(-1) as Awaited<ReturnType<typeof parseBoundedAggTradesArchive>>["rows"][number]).tradeTime
      const retrievalIdentity = `mrret_${canonicalChecksum({ logicalSlotId: invocation.logicalSlotId, sourceChecksum })}`
      states.set(invocation.logicalSlotId, { bytes, contentType: response.headers.get("content-type")?.split(";", 1)[0] ?? (fundingRequest ? "application/json" : "application/zip"), sourceChecksum, observedThrough, rows })
      return Object.freeze({ status: "AVAILABLE" as const, retrievalIdentity, bytes, sourceChecksum, contentType: states.get(invocation.logicalSlotId)!.contentType, observedThrough, limitations: Object.freeze([]) })
    },
    async persistArtifact(invocation, source) {
      const value = state(invocation.logicalSlotId), at = new Date().toISOString(), objectStorageKey = `raw/${value.sourceChecksum.slice(0, 2)}/${value.sourceChecksum}.${input.dataset === "funding" ? "json" : "zip"}`
      const stored = await input.storage.putImmutable({ objectStorageKey, contentHash: value.sourceChecksum, mediaType: value.contentType, byteLength: value.bytes.byteLength, content: stream(value.bytes) })
      value.raw = rawManifest(invocation, value, stored.rawObjectId, objectStorageKey, at)
      const registered = await input.d2.registerRawObjectManifest(value.raw)
      if (registered.status === "CONFLICT" || registered.status === "REJECTED") throw new Error("LIVE_RAW_ARTIFACT_CONFLICT")
      value.population = await preparePopulation(invocation, input.d3, at)
      const artifactIdentity = `mra_${canonicalChecksum({ logicalSlotId: invocation.logicalSlotId, rawObjectId: stored.rawObjectId })}`
      const status = await input.refresh.recordArtifact({ unitId: invocation.unitId, artifactId: artifactIdentity, artifactKind: `BOUNDED_${input.dataset.toUpperCase()}_RAW`, contentChecksum: value.sourceChecksum, byteCount: value.bytes.byteLength, lineage: { retrievalIdentity: source.retrievalIdentity, sourceContractVersion: invocation.sourceContractId, rawObjectId: stored.rawObjectId } })
      return Object.freeze({ artifactIdentity, artifactChecksum: value.sourceChecksum, retainedBytes: value.bytes.byteLength, status: status === "INSERTED" ? "CREATED" as const : "DUPLICATE" as const })
    },
    async normalizeAndPersistCandidates(invocation) {
      const value = state(invocation.logicalSlotId)
      if (input.dataset === "agg-trade") value.segment = await buildBoundedAggTradesSegment({ batch: { request: createBoundedArchiveRequest({ dataset: "agg-trade", provider: "binance-vision", instrument: invocation.instrument, eventTimeStart: invocation.intervalStart, eventTimeEnd: invocation.intervalEnd, sourceContractVersion: invocation.sourceContractId, maximumRecordCount: 10_000_000 }), sourceChecksum: value.sourceChecksum, rows: value.rows as Awaited<ReturnType<typeof parseBoundedAggTradesArchive>>["rows"], observedThrough: value.observedThrough, batchIdentity: `mbab_${canonicalChecksum({ logicalSlotId: invocation.logicalSlotId, sourceChecksum: value.sourceChecksum })}` }, rawObjectId: value.raw!.objectId, storage: input.storage, objectRoot: input.objectRoot })
      const rows = input.dataset === "agg-trade" ? [value.rows[0]!] : value.rows
      const candidates = rows.map((row, ordinal) => buildCandidate(invocation, row, ordinal, value))
      const at = new Date().toISOString(), population = value.population!, raw = value.raw!
      try {
        const result = await input.d3.persistBoundedAcquisitionResult({
          retrievalAttempt: { attemptId: population.retrievalAttemptId, unitId: population.unitId, runId: population.runId, providerId: GOVERNANCE[input.dataset].providerId, providerSnapshotId: raw.providerSnapshotId, requestFingerprint: invocation.logicalSlotId, startedAt: raw.createdAt, completedAt: raw.createdAt, outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: value.contentType, rawByteCount: value.bytes.byteLength, rawManifestId: raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null },
          rawObjectChecksum: raw.contentHash,
          candidates,
        })
        if (result.transactionOutcome === "CONFLICT") {
          await input.d3.recordRecoverableLineageFailure({ unitId: population.unitId, leaseId: population.leaseId, ownerId: "mvp-live-resume", fencingToken: population.fencingToken, classification: "RETRIEVAL_CANDIDATE_LINEAGE_CONFLICT", at })
          return Object.freeze({ candidateIdentity: candidates[0]!.candidateId, candidateChecksum: candidates[0]!.candidateChecksum, status: "CONFLICT" as const, payload: candidates })
        }
        value.population = Object.freeze({ ...population, retrievalAttemptId: result.persistedRetrievalAttemptId })
        value.candidates = Object.freeze(candidates.map((candidate) => Object.freeze({ ...candidate, retrievalAttemptId: result.persistedRetrievalAttemptId })) as PopulationCandidate[])
        if (value.resumeStage !== "CANDIDATE_LINEAGE") {
          const rawTransition = await input.d3.transitionUnitIdempotently({ eventId: `live-raw:${raw.objectId}:fence:${population.fencingToken}`, unitId: population.unitId, runId: population.runId, eventType: "STATE_ADVANCED", previousState: "RETRIEVING", nextState: "RAW_PERSISTED", fencingToken: population.fencingToken, actorId: "mvp-live-resume", occurredAt: at, details: {}, leaseId: population.leaseId, ownerId: "mvp-live-resume" })
          if (rawTransition.status === "CONFLICT") throw new Error("LIVE_POPULATION_RAW_EVENT_CONFLICT")
        }
        const candidateTransition = await input.d3.transitionUnitIdempotently({ eventId: `live-candidates:${invocation.logicalSlotId}:fence:${population.fencingToken}`, unitId: population.unitId, runId: population.runId, eventType: "STATE_ADVANCED", previousState: "RAW_PERSISTED", nextState: "CANDIDATES_READY", fencingToken: population.fencingToken, actorId: "mvp-live-resume", occurredAt: at, details: {}, leaseId: population.leaseId, ownerId: "mvp-live-resume" })
        if (candidateTransition.status === "CONFLICT") throw new Error("LIVE_POPULATION_CANDIDATE_EVENT_CONFLICT")
        const candidateChecksum = canonicalChecksum(value.candidates.map((candidate) => [candidate.candidateId, candidate.candidateChecksum]))
        return Object.freeze({ candidateIdentity: `mrcs_${candidateChecksum}`, candidateChecksum, status: result.transactionOutcome, payload: value.candidates })
      } catch (error) {
        await input.d3.recordRecoverableLineageFailure({ unitId: population.unitId, leaseId: population.leaseId, ownerId: "mvp-live-resume", fencingToken: population.fencingToken, classification: "RETRIEVAL_CANDIDATE_LINEAGE_FAILED", at }).catch(() => undefined)
        throw error
      }
    },
    async commit(invocation) {
      const value = state(invocation.logicalSlotId), outputs: Array<{ identity: string; checksum: string }> = [], normalizer = new ProductionNormalizerRegistry(), governance = GOVERNANCE[input.dataset]
      const processingAt = new Date().toISOString(), population = value.population!
      try {
        const processing = await input.d3.transitionUnitIdempotently({ eventId: `live-processing:${invocation.logicalSlotId}:fence:${population.fencingToken}`, unitId: population.unitId, runId: population.runId, eventType: "STATE_ADVANCED", previousState: "CANDIDATES_READY", nextState: "PROCESSING", fencingToken: population.fencingToken, actorId: "mvp-live-resume", occurredAt: processingAt, details: {}, leaseId: population.leaseId, ownerId: "mvp-live-resume" })
        if (processing.status === "CONFLICT") throw new Error("LIVE_POPULATION_PROCESSING_EVENT_CONFLICT")
        let createdCount = 0, duplicateCount = 0, conflictCount = 0
        for (const candidate of value.candidates!) {
          const scopeErrors = candidateScope(candidate, invocation, value.raw!, governance.parser)
          if (scopeErrors.length) throw new Error(`INVALID_CANONICAL_CANDIDATE_SCOPE:${scopeErrors.join(",")}`)
          const command = candidate.kind === "STREAM_MANIFEST" ? buildCanonicalStreamSegmentCommand({ operationType: "INITIAL_VERSION", initiatedAt: candidate.createdAt, sourceDatasetId: "agg-trade", streamKind: "AGG_TRADE", providerId: candidate.providerId, venue: "BINANCE", symbol: invocation.instrument, canonicalInstrumentId: canonicalInstrument(invocation.instrument), sourcePartitionKey: invocation.logicalSlotId, windowStart: candidate.payload.windowStart, windowEnd: candidate.payload.windowEnd, firstSequence: candidate.payload.firstSequence, lastSequence: candidate.payload.lastSequence, recordCount: candidate.payload.recordCount, segmentObjectKey: candidate.payload.segmentObjectKey, segmentContentChecksum: candidate.payload.segmentContentChecksum, columnarFormat: "PARQUET", compressionFormat: "SNAPPY", segmentByteLength: candidate.payload.segmentByteLength, eventTimeMin: candidate.payload.eventTimeMin, eventTimeMax: candidate.payload.eventTimeMax, validationStatus: "VALIDATED", eventOrderPolicy: AGG_TRADES_SEGMENT_ORDER_POLICY, governance: { datasetRegistrySnapshotId: governance.datasetRegistry, providerRegistrySnapshotId: governance.providerRegistry, providerCertificationSnapshotId: governance.certification, policyVersionId: governance.policy, schemaVersion: governance.schema, normalizationVersion: AGG_TRADES_SEGMENT_NORMALIZER_VERSION }, sourceRawObject: value.raw!, predecessor: null }) : normalizer.normalize({ candidate: candidate as Exclude<PopulationCandidate, { kind: "STREAM_MANIFEST" }>, datasetRegistrySnapshotId: governance.datasetRegistry, providerRegistrySnapshotId: governance.providerRegistry, providerCertificationSnapshotId: governance.certification, policyVersionId: governance.policy, schemaVersion: governance.schema, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: value.raw!.objectId, rawObject: value.raw!, sourceContractVersion: invocation.sourceContractId, expectedSourceContractVersion: SOURCE_CONTRACTS[invocation.dataset] })
          const result = await input.canonical.execute(command)
          if (result.status === "SUCCESS") { createdCount++; outputs.push({ identity: result.fact.canonicalRecordId, checksum: command.fact.checksum }) }
          else if (result.status === "DUPLICATE") { duplicateCount++; outputs.push({ identity: result.canonicalRecordId, checksum: result.checksum }) }
          else conflictCount++
        }
        value.commitOutputs = Object.freeze(outputs)
        return Object.freeze({ status: conflictCount ? "CONFLICT" as const : createdCount ? "CREATED" as const : "DUPLICATE" as const, outputs: value.commitOutputs, createdCount, duplicateCount, conflictCount })
      } catch (error) {
        const failedAt = new Date().toISOString()
        await input.d3.recordCanonicalCommitFailure({ unitId: population.unitId, leaseId: population.leaseId, ownerId: "mvp-live-resume", fencingToken: population.fencingToken, classification: canonicalFailureClassification(error), at: failedAt })
        throw error
      }
    },
    async validate(invocation) {
      const value = state(invocation.logicalSlotId)
      if (!value.commitOutputs?.length) throw new Error("LIVE_CANONICAL_ATTRIBUTION_MISSING")
      if (input.dataset === "ohlcv" && value.rows.length !== 288) throw new Error("LIVE_OHLCV_COUNT_INVALID")
      await input.d3.releaseLease(value.population!.unitId, value.population!.leaseId, "mvp-live-resume", value.population!.fencingToken, new Date().toISOString(), "COMPLETED")
      await input.d3.completeRun(value.population!.runId, "SUCCEEDED", new Date().toISOString())
      states.delete(invocation.logicalSlotId)
      return Object.freeze([])
    },
    async recordIdentityMismatch(invocation, classification) {
      const value = states.get(invocation.logicalSlotId)
      if (!value?.population) return
      await input.d3.recordCanonicalCommitFailure({ unitId: value.population.unitId, leaseId: value.population.leaseId, ownerId: "mvp-live-resume", fencingToken: value.population.fencingToken, classification, at: new Date().toISOString() })
      states.delete(invocation.logicalSlotId)
    },
  })
}

function createWatermarkAudit(store: MvpRefreshStore): LiveWatermarkAuditPort {
  return Object.freeze({
    async append(input) {
      const value = sanitizedIdentity(input.scope === "DATASET" ? "mrdw" : "mrcw", input)
      const status = await store.appendEvent(null, "live_resume_watermark", value.identity, input.scope, null, "VALIDATED", { dataset: input.dataset, through: input.through, inputIdentities: input.inputIdentities, inputChecksum: input.inputChecksum })
      return Object.freeze({ status: status ? "CREATED" as const : "DUPLICATE" as const, ...value })
    },
  })
}

function toConsumerProjection(value: MvpProjectionVersion): ConsumerProjection { return Object.freeze({ projectionId: value.projectionId, projectionVersionId: value.projectionVersionId, projectionKind: value.projectionKind, subjectId: value.subjectId, eventTimeStart: value.eventTimeStart, eventTimeEnd: value.eventTimeEnd, knowledgeTimeCutoff: value.knowledgeTimeCutoff, payload: value.structuredPayload, completeness: value.completeness, limitations: value.limitations, lifecycleState: value.lifecycleState, effectiveExposure: "CONSUMER_VISIBLE", projectionChecksum: value.projectionChecksum }) }

function createDownstreamExecutor(input: { readonly d2: IsolatedPostgresClient; readonly d3: D3PostgresClient; readonly objectRoot: string; readonly refresh: MvpRefreshStore; readonly consistency: ConsistencyPostgresRuntime; readonly evidence: ConsistencyPostgresRuntime; readonly projection: ConsistencyPostgresRuntime }): LiveDownstreamExecutor {
  let windows: readonly MvpEvidenceWindowData[] = Object.freeze([]), projections: readonly MvpProjectionVersion[] = Object.freeze([])
  const corpus = (slots: readonly LiveResumeSlotResult[]) => Object.freeze({ corpusId: `mvp-refresh-window:${canonicalChecksum(slots.map((slot) => slot.logicalSlotId))}`, corpusChecksum: canonicalChecksum(slots.map((slot) => [slot.logicalSlotId, slot.candidateChecksum])) })
  const committed = (window: MvpEvidenceWindowData) => Object.freeze(window.resultInputs.map((value) => Object.freeze({ identity: value.canonicalRecordId, checksum: value.checksum })))
  return Object.freeze({
    async execute(value) {
      if (value.slots.length !== 24 || !value.upstream.length) throw new Error("LIVE_DOWNSTREAM_INPUT_INCOMPLETE")
      if (value.stage === "coverage") {
        windows = await readMvpEvidenceWindows({ d2: input.d2, objectRoot: input.objectRoot, eventTimeStart: value.intervalStart, eventTimeEnd: value.intervalEnd, instruments: INSTRUMENTS })
        if (windows.length !== 6 || windows.some((window) => window.measurement.completeness !== "COMPLETE")) throw new Error("LIVE_BOUNDED_COVERAGE_INCOMPLETE")
        const outputs = windows.map((window) => sanitizedIdentity("mrl_coverage", { instrument: window.measurement.instrument, start: value.intervalStart, end: value.intervalEnd, coverage: window.measurement.coverage }))
        for (const output of outputs) await input.refresh.appendEvent(null, "live_resume_coverage", output.identity, "BOUNDED_COVERAGE_VALIDATED", null, "COMPLETE", { checksum: output.checksum })
        return Object.freeze({ identities: Object.freeze(outputs.map((output) => output.identity)), checksum: canonicalChecksum(outputs) })
      }
      if (!windows.length) windows = await readMvpEvidenceWindows({ d2: input.d2, objectRoot: input.objectRoot, eventTimeStart: value.intervalStart, eventTimeEnd: value.intervalEnd, instruments: INSTRUMENTS })
      const sourceCorpus = corpus(value.slots)
      if (value.stage === "consistency") {
        const results = await Promise.all(windows.map((window) => persistMvpConsistencyWindow({ corpus: sourceCorpus, data: window, worker: input.consistency, contract: { instrument: window.measurement.instrument, eventTimeStart: value.intervalStart, eventTimeEnd: value.intervalEnd, committedInputIdentities: committed(window), modelVersion: "mvp-bounded-consistency/1.0.0", modelChecksum: canonicalChecksum({ model: "mvp-bounded-consistency/1.0.0" }) } })))
        if (results.some((result) => result.status === "CONFLICT" || result.status === "INELIGIBLE")) throw new Error("LIVE_BOUNDED_CONSISTENCY_INELIGIBLE")
        const identities = results.flatMap((result) => result.results.map((item) => item.resultId))
        return Object.freeze({ identities: Object.freeze(identities), checksum: canonicalChecksum(results.map((result) => [result.runId, result.status, result.results.map((item) => item.checksum)])) })
      }
      if (value.stage === "evidence") {
        const results = await Promise.all(windows.map((window) => persistMvpEvidenceWindow({ corpus: sourceCorpus, data: window, worker: input.consistency, assembler: input.evidence, contract: { instrument: window.measurement.instrument, eventTimeStart: value.intervalStart, eventTimeEnd: value.intervalEnd, committedInputIdentities: committed(window), modelVersion: "mvp-bounded-evidence/1.0.0", modelChecksum: canonicalChecksum({ model: "mvp-bounded-evidence/1.0.0" }) } })))
        if (results.some((result) => result.status === "CONFLICT" || result.status === "INELIGIBLE" || !result.packet)) throw new Error("LIVE_BOUNDED_EVIDENCE_INELIGIBLE")
        return Object.freeze({ identities: Object.freeze(results.map((result) => result.packet!.packetVersionId)), checksum: canonicalChecksum(results.map((result) => [result.packet!.packetVersionId, result.packet!.packetChecksum])) })
      }
      if (value.stage === "projections") {
        const evidenceInputs = await loadMvpProjectionEvidenceInputs({ corpus: sourceCorpus, d4: input.evidence, d2: input.d2, d3: input.d3, objectRoot: input.objectRoot, eventTimeStart: value.intervalStart, eventTimeEnd: value.intervalEnd, instruments: INSTRUMENTS })
        if (evidenceInputs.length !== 6) throw new Error("LIVE_BOUNDED_PROJECTION_INPUTS_INCOMPLETE")
        const store = new MvpProjectionStore(input.projection), kinds = MVP_PROJECTION_DEFINITIONS.map((definition) => definition.projectionKind)
        const persisted = await Promise.all(evidenceInputs.map((evidence) => persistBoundedMvpProjections({ evidence, store, request: { instrument: evidence.assessment.instrument, eventTimeStart: value.intervalStart, eventTimeEnd: value.intervalEnd, evidenceIdentity: evidence.packetVersionId, evidenceChecksum: evidence.packetChecksum, requestedProjectionKinds: kinds, modelVersion: "mvp-bounded-projection/1.0.0", modelChecksum: canonicalChecksum(MVP_PROJECTION_DEFINITIONS), schemaVersion: "1.0.0" } })))
        if (persisted.some((result) => result.status === "CONFLICT" || result.status === "INELIGIBLE")) throw new Error("LIVE_BOUNDED_PROJECTION_INELIGIBLE")
        projections = Object.freeze(persisted.flatMap((result) => result.projections))
        return Object.freeze({ identities: Object.freeze(projections.map((projection) => projection.projectionVersionId)), checksum: canonicalChecksum(projections.map((projection) => [projection.projectionVersionId, projection.projectionChecksum])) })
      }
      if (!projections.length) throw new Error("LIVE_REPLAY_PROJECTION_INPUT_MISSING")
      const replaySources = projections.filter((projection) => projection.projectionKind === "ReplayTimelineProjection")
      const models = await Promise.all(replaySources.map((projection) => materializeMvpReplaySequence(toConsumerProjection(projection))))
      if (models.length !== 6 || models.some((model) => model.sampleCounts.price !== 288 || model.sampleCounts.openInterest !== 288 || model.sampleCounts.flow !== 48)) throw new Error("LIVE_BOUNDED_REPLAY_INELIGIBLE")
      return Object.freeze({ identities: Object.freeze(models.map((model) => model.sourceProjectionVersionId)), checksum: canonicalChecksum(models.map((model) => [model.sourceProjectionVersionId, model.modelChecksum])) })
    },
  })
}

function createCandidateExecutor(service: LocalInactiveCandidateAssemblyService): LiveCandidateExecutor {
  let candidate: { corpusId: string; checksum: string; comparisonChecksum: string } | null = null
  return Object.freeze({
    async assemble(input) {
      const baseline = await service.activeBaseline()
      const additions: ServingCorpusMember[] = input.upstream.map((item, index) => Object.freeze({ memberKind: "RELEASE_MANIFEST" as const, memberId: item.identity, memberChecksum: item.checksum, canonicalSortKey: `TARGET_WINDOW:${String(index).padStart(4, "0")}:${item.identity}`, inheritedSourceCorpusId: null, schemaVersion: "mvp-live-resume/1.0.0", metadata: Object.freeze({ targetWindow: true }) }))
      const members = canonicalizeServingCorpusMembers([...baseline.members, ...additions])
      const corpusChecksum = computeCandidateServingChecksum({ governedThrough: input.intervalEnd, schemaVersion: "mvp-serving/1.0.0", members })
      const corpusId = `mvp-serving-candidate:${corpusChecksum}`
      const result = await service.assemble({ candidate: { corpusId, sourceCorpusId: baseline.corpusId, sourceCorpusChecksum: baseline.servingChecksum, governedThrough: input.intervalEnd, schemaVersion: "mvp-serving/1.0.0", generatedAt: new Date().toISOString(), members, limitations: Object.freeze(["INACTIVE_LOCAL_CANDIDATE"]) }, expectedActiveCorpusId: baseline.corpusId, expectedActiveChecksum: baseline.servingChecksum })
      candidate = { corpusId, checksum: result.servingChecksum, comparisonChecksum: result.comparison.checksum }
      return stageOutput("mrl_candidate", { corpusId, checksum: result.servingChecksum, status: result.status, exposureUnchanged: result.exposureUnchanged })
    },
    async persistManifest(input) {
      if (!candidate) throw new Error("LIVE_CANDIDATE_ASSEMBLY_REQUIRED")
      return stageOutput("mrl_manifest", { candidate, upstream: input.upstream })
    },
    async compare(input) {
      if (!candidate) throw new Error("LIVE_CANDIDATE_ASSEMBLY_REQUIRED")
      return stageOutput("mrl_comparison", { candidate, upstream: input.upstream, exposure: "INTERNAL_ONLY" })
    },
  })
}

function authoritativeResult(slot: RefreshSlotResumePlanEntry, authority: Awaited<ReturnType<ControlledOhlcvRecoveryStore["readAuthoritiesForWindow"]>>[number]): LiveResumeSlotResult {
  if (slot.dataset !== "ohlcv" || slot.instrument !== "BTCUSDT" || authority.logicalSlotId !== slot.logicalSlotId) throw new Error("LIVE_AUTHORITATIVE_SLOT_MISMATCH")
  const checksum = authority.canonicalFactSetDigest
  return Object.freeze({ logicalSlotId: slot.logicalSlotId, executionGenerationId: "AUTHORITATIVE_RECOVERY", dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, unitId: authority.authoritativeUnitId, sourceContractId: authority.sourceContractId, sourceContractVersion: authority.sourceContractVersion, providerBinding: authority.provider, retrievalIdentity: authority.retrievalId, rawArtifactIdentity: authority.artifactId, rawArtifactChecksum: checksum, candidateIdentity: authority.candidateSetId, candidateChecksum: checksum, canonicalCommitResult: "DUPLICATE", canonicalFactIdentities: Object.freeze([{ identity: authority.commitSetId, checksum }]), validationStatus: "PASSED", limitations: Object.freeze([]), durationMs: 0, retainedBytes: 0 })
}

export async function createProcessLiveResumeBindings(input: ProcessLiveResumeBootstrapInput): Promise<LiveResumeLocalBindingSet> {
  const scope = new ResourceScope()
  try {
    const start = input.intervalStart ?? "2026-07-15T00:00:00.000Z", end = input.intervalEnd ?? "2026-07-16T00:00:00.000Z"
    exactDay(start, end)
    const plannerIdentity = input.plannerIdentity ?? "preflight-plan"
    const plannerChecksum = input.plannerChecksum ?? canonicalChecksum({ plannerIdentity, start, end })

    const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-live-resume-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-live-resume-d3" } }, input.environment)
    scope.add({ close: () => integrated.shutdown() })
    const { d2, d3 } = integrated
    const d4Environment = { D4_ISOLATED_POSTGRES_URL: input.environment.D4_ISOLATED_POSTGRES_URL, D2_CANONICAL_POSTGRES_URL: input.environment.D2_CANONICAL_POSTGRES_URL, D3_POPULATION_POSTGRES_URL: input.environment.D3_POPULATION_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: input.environment.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: input.environment.D3_ISOLATED_POSTGRES_URL, MVP_REFRESH_ISOLATED_POSTGRES_URL: input.environment.MVP_REFRESH_ISOLATED_POSTGRES_URL, MVP_SERVING_ISOLATED_POSTGRES_URL: input.environment.MVP_SERVING_ISOLATED_POSTGRES_URL, DATABASE_URL: input.environment.DATABASE_URL }
    const d4 = new ConsistencyPostgresRuntime({ connectionString: required(input.environment, "D4_ISOLATED_POSTGRES_URL"), roleIntent: "MIGRATION_OWNER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-live-resume-d4", environment: d4Environment })
    await d4.connect(); scope.add({ close: () => d4.shutdown() })
    const consistency = new ConsistencyPostgresRuntime({ connectionString: required(input.environment, "D4_ISOLATED_POSTGRES_URL"), roleIntent: "CONSISTENCY_WORKER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-live-resume-consistency", environment: d4Environment })
    await consistency.connect(); scope.add({ close: () => consistency.shutdown() })
    const evidence = new ConsistencyPostgresRuntime({ connectionString: required(input.environment, "D4_ISOLATED_POSTGRES_URL"), roleIntent: "EVIDENCE_ASSEMBLER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-live-resume-evidence", environment: d4Environment })
    await evidence.connect(); scope.add({ close: () => evidence.shutdown() })
    const projection = new ConsistencyPostgresRuntime({ connectionString: required(input.environment, "D4_ISOLATED_POSTGRES_URL"), roleIntent: "PROJECTION_BUILDER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-live-resume-projection", environment: d4Environment })
    await projection.connect(); scope.add({ close: () => projection.shutdown() })
    const refresh = new MvpRefreshPostgresClient(required(input.environment, "MVP_REFRESH_ISOLATED_POSTGRES_URL"), input.environment); await refresh.verify(); scope.add({ close: () => refresh.shutdown() })
    const serving = new MvpServingPostgresClient(required(input.environment, "MVP_SERVING_ISOLATED_POSTGRES_URL"), "PUBLISHER", input.environment, "LOCAL_ISOLATED")
    await serving.verify(); scope.add({ close: () => serving.shutdown() })
    const objectRoot = required(input.environment, "D3_BACKFILL_OBJECT_ROOT")
    const storage = await createFilesystemObjectStorage({ root: objectRoot, repositoryRoot: process.cwd(), createRoot: false })

    const d2Adapter = createCanonicalPersistenceAdapter(d2)
    const d3Adapter = createPopulationPostgresAdapter(d3)
    const canonical = createD3ToD2CanonicalCommitPort(d2Adapter)

    if (input.mode === "PREFLIGHT" || input.mode === "CERTIFICATION") {
      await expectRollback(() => d2.transaction(async (sql) => rollbackProbe((statement) => sql.unsafe(statement))))
      await expectRollback(() => d3.transaction(async (sql) => rollbackProbe((statement) => sql.unsafe(statement))))
      await expectRollback(() => d4.transaction(async (sql) => rollbackProbe((statement) => sql.unsafe(statement))))
      await expectRollback(() => refresh.transaction(async (sql) => rollbackProbe((statement) => sql.unsafe(statement))))
      await expectRollback(() => serving.transaction(async (sql) => rollbackProbe((statement) => sql.unsafe(statement))))
      await objectStorageProbe(storage, objectRoot)
      await boundedRawObjectProbe(d2, start, end)
      await boundedLineageProbe(d3Adapter, d3, start, end)
    }

    const refreshStore = new MvpRefreshStore(refresh), recovery = new ControlledOhlcvRecoveryStore(refresh), control = new PostgresLiveResumeCoordinatorControlPlane(refresh), execution = new PostgresLiveResumeExecutionStore(refresh)
    const authorities = await recovery.readAuthoritiesForWindow(start, end)
    if (authorities.length !== 1) throw new Error("LIVE_AUTHORITATIVE_RECOVERY_REQUIRED")
    const authority = authorities[0]!
    const candidateService = new LocalInactiveCandidateAssemblyService(serving)
    const adapterInput = (dataset: RefreshLogicalDataset) => ({ dataset, storage, objectRoot, d2Client: d2, d2: d2Adapter, d3: d3Adapter, canonical, refresh: refreshStore })
    const executorPorts = createLiveExecutorPortSet({ ohlcv: createDatasetAdapter(adapterInput("ohlcv")), "open-interest": createDatasetAdapter(adapterInput("open-interest")), funding: createDatasetAdapter(adapterInput("funding")), "agg-trade": createDatasetAdapter(adapterInput("agg-trade")) })
    const ports = composeConcreteLiveResumePorts({
      targets: { classify: async () => ({ refreshLocal: true, truthPlaneLocal: true, servingLocal: true, objectStorageLocal: true, servingPublisher: true, managedOrProductionTarget: false }) },
      execution,
      lease: control,
      checkpoints: control,
      authoritativeOhlcv: { reuse: async (slot) => authoritativeResult(slot, authority) },
      executorPorts,
      watermarkAudit: createWatermarkAudit(refreshStore),
      downstreamExecutor: createDownstreamExecutor({ d2, d3, objectRoot, refresh: refreshStore, consistency, evidence, projection }),
      candidateExecutor: createCandidateExecutor(candidateService),
      plannerIdentity, plannerChecksum, intervalStart: start, intervalEnd: end, allowedDatasets: DATASETS, allowedInstruments: INSTRUMENTS,
    })
    return Object.freeze({ ports, capabilities: input.capabilities, close: () => scope.close() })
  } catch (error) {
    await scope.close()
    throw error
  }
}
