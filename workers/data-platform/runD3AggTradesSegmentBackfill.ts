import { createHash } from "node:crypto"
import { access, mkdir, readFile, statfs, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { RawObjectManifest } from "@/lib/data-platform/persistence"
import { buildCanonicalStreamSegmentCommand, createCanonicalPersistenceAdapter } from "@/lib/data-platform/persistence/postgres"
import { createCandidateId, createJobRequestIdentity, createPopulationJobId, createRetrievalAttemptId, createWatermarkEligibility, expandPopulationUnits, type PopulationCandidate, type PopulationJob, type PopulationJobRequest } from "@/lib/data-platform/population"
import {
  AGG_TRADES_REMAINING_DATASET_STORAGE_BYTES,
  AGG_TRADES_SEGMENT_CANARY_DAY,
  AGG_TRADES_SEGMENT_CANARY_SYMBOL,
  AGG_TRADES_SEGMENT_JOB_PROFILE,
  AGG_TRADES_SEGMENT_NORMALIZER_VERSION,
  AGG_TRADES_SEGMENT_ORDER_POLICY,
  AGG_TRADES_SEGMENT_SCHEMA_ID,
  AGG_TRADES_SEGMENT_SCHEMA_VERSION,
  buildAggTradesSegment,
  createAggTradesSegmentCanaryMeasurement,
  createAggTradesSegmentExecutionSnapshot,
  createAggTradesSegmentReadPort,
  createFilesystemObjectStorage,
  createIntegratedBackfillClientsFromEnvironment,
  D3_PHASE3_MANIFEST,
  evaluateAggTradesSegmentCapacity,
  iterateBinanceVisionAggTradesZip,
  normalizeAggTradesSegmentDecimal,
  verifyAggTradesSegmentExecutionSnapshot,
  type AggTradesExecutionSnapshot,
  type AggTradesSegmentBuildResult,
  type AggTradesSegmentExecutionPartition,
  type AggTradesSegmentExecutionSnapshot,
} from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"

type Command = "canary" | "canary-rerun" | "freeze" | "run" | "resume" | "status" | "stop" | "retry-failed" | "retry-gaps" | "reconcile" | "validate-samples"
type Clients = Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>
type Storage = Awaited<ReturnType<typeof createFilesystemObjectStorage>>
const INVENTORY_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-aggtrades-execution-snapshot.json")
const SNAPSHOT_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-aggtrades-segment-snapshot.json")
const PROGRESS_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-aggtrades-segment-progress.json")
const MEASUREMENT_PATH = path.join(process.env.D3_BACKFILL_OBJECT_ROOT ?? "", "_control", "agg-trades-segment-canary.json")
const DATASET_REGISTRY_ID = "d3-phase3-agg-trade-segment-dataset-v2"
const PROVIDER_REGISTRY_ID = "d3-phase3-binance-vision-agg-trade-provider-v1"
const PROVIDER_CERTIFICATION_ID = "d3-phase3-binance-vision-agg-trade-segment-certification-v2"
const POLICY_ID = "d3-phase3-agg-trade-segment-policy-v2"
const PARSER_VERSION = "binance-vision-agg-trades-segment-v2"
const WORKER_ID = "d3-phase3-agg-trade-segment-worker-1"
const LEASE_MS = 2 * 60 * 60 * 1000
const ADDITIONAL_ARTIFACT_GROWTH_BYTES = 301_508_633

function now() { return new Date().toISOString() }
function arg(name: string) { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1] ?? null }
function chunks(buffer: Buffer): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { for (let offset = 0; offset < buffer.length; offset += 1024 * 1024) yield buffer.subarray(offset, Math.min(offset + 1024 * 1024, buffer.length)) } } }
function stopPath(snapshotId: string) { return path.join(process.env.D3_BACKFILL_OBJECT_ROOT!, "_control", `${snapshotId.replace(/[^a-zA-Z0-9._-]/g, "_")}.stop`) }

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(180_000), headers: { accept: "application/zip,application/octet-stream,*/*", "user-agent": "QuantTerminal-D3-AggTrades-Segment/1.0" } })
  if (!response.ok) throw new Error(`AGG_TRADES_SEGMENT_SOURCE_HTTP_${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function inventory(): Promise<AggTradesExecutionSnapshot> {
  const value = JSON.parse(await readFile(INVENTORY_PATH, "utf8")) as AggTradesExecutionSnapshot
  const { snapshotId, snapshotChecksum, ...content } = value
  if (snapshotId !== `agg-trades-execution:${snapshotChecksum}` || canonicalChecksum(content) !== snapshotChecksum) throw new Error("AGG_TRADES_ROW_INVENTORY_INVALID")
  return value
}
async function snapshot(): Promise<AggTradesSegmentExecutionSnapshot> { const value = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8")) as AggTradesSegmentExecutionSnapshot; if (!verifyAggTradesSegmentExecutionSnapshot(value)) throw new Error("AGG_TRADES_SEGMENT_SNAPSHOT_INVALID"); return value }

async function ensureGovernance(d2: ReturnType<typeof createCanonicalPersistenceAdapter>) {
  const effectiveAt = "2026-07-12T00:00:00.000Z"
  const results = await Promise.all([
    d2.registerRegistrySnapshot({ snapshotId: DATASET_REGISTRY_ID, registryVersion: "2.0.0", contentChecksum: canonicalChecksum({ datasetId: "agg-trade", representation: "canonical-stream-segment" }), canonicalContent: { datasetId: "agg-trade", representation: "canonical-stream-segment", schema: AGG_TRADES_SEGMENT_SCHEMA_VERSION }, effectiveAt, createdAt: effectiveAt }),
    d2.registerProviderSnapshot({ snapshotId: PROVIDER_REGISTRY_ID, providerId: "binance-public-archive", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ source: "BINANCE_VISION_USDM_DAILY_AGGTRADES" }), canonicalContent: { source: "BINANCE_VISION_USDM_DAILY_AGGTRADES" }, effectiveAt, createdAt: effectiveAt }),
    d2.registerProviderSnapshot({ snapshotId: PROVIDER_CERTIFICATION_ID, providerId: "binance-public-archive", registrationVersion: "2.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ representation: "PARQUET_SNAPPY", cutoff: effectiveAt }), canonicalContent: { representation: "PARQUET_SNAPPY", cutoff: effectiveAt }, effectiveAt, createdAt: effectiveAt }),
    d2.registerPolicyVersion({ policyVersionId: POLICY_ID, datasetId: "agg-trade", policyVersion: "2.0.0", contentChecksum: canonicalChecksum({ source: "BINANCE_VISION_USDM_DAILY_AGGTRADES", target: "CANONICAL_STREAM_SEGMENT", order: AGG_TRADES_SEGMENT_ORDER_POLICY }), canonicalContent: { source: "BINANCE_VISION_USDM_DAILY_AGGTRADES", target: "CANONICAL_STREAM_SEGMENT", order: AGG_TRADES_SEGMENT_ORDER_POLICY }, effectiveAt, createdAt: effectiveAt }),
  ])
  if (results.some((result) => result.status === "CONFLICT" || result.status === "REJECTED")) throw new Error("AGG_TRADES_SEGMENT_GOVERNANCE_FAILED")
}

function requestFor(snapshotId: string, partition: AggTradesSegmentExecutionPartition, at: string): { request: PopulationJobRequest; job: PopulationJob } {
  const dimensions = Object.freeze({ venue: "BINANCE", subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: "daily-parquet-segment", partitionKey: partition.partitionId })
  const base = { profile: AGG_TRADES_SEGMENT_JOB_PROFILE, datasetId: partition.datasetId, providerId: partition.providerId, dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: `${snapshotId}:${partition.partitionId}`, intentionalRerunIdentity: "segment-storage-v2", requestedAt: at, requestedBy: WORKER_ID })
  const jobId = createPopulationJobId(requestIdentity, request.occurrenceIdentity, request.intentionalRerunIdentity)
  return { request, job: Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt: at, updatedAt: at }) }
}

async function acquireRaw(storage: Storage, partition: AggTradesSegmentExecutionPartition, buffer: Buffer): Promise<RawObjectManifest> {
  const contentHash = createHash("sha256").update(buffer).digest("hex")
  const objectStorageKey = `raw/${contentHash.slice(0, 2)}/${contentHash}.zip`
  const reference = await storage.putImmutable({ objectStorageKey, contentHash, mediaType: "application/zip", byteLength: buffer.byteLength, content: chunks(buffer) })
  const at = now()
  return Object.freeze({ objectId: reference.rawObjectId, datasetId: "agg-trade", providerId: partition.providerId, venue: "BINANCE", symbolOrSubject: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, contentHash, sizeBytes: buffer.byteLength, mediaType: "application/zip", compression: "ZIP", retrievedAt: at, providerSnapshotId: PROVIDER_REGISTRY_ID, retentionClass: "ARCHIVE", verificationState: "VERIFIED", objectStorageKey, createdAt: at })
}

function candidate(partition: AggTradesSegmentExecutionPartition, built: AggTradesSegmentBuildResult, unitId: string, attemptId: string, raw: RawObjectManifest, at: string): Extract<PopulationCandidate, { kind: "STREAM_MANIFEST" }> {
  const sourceObservationId = `${partition.partitionId}:${built.segmentChecksum}`
  const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, candidateOrdinal: "0" })
  const payload = Object.freeze({ symbol: partition.providerSymbol, streamKind: "AGG_TRADE" as const, rawObjectId: raw.objectId, windowStart: partition.windowStart, windowEnd: partition.windowEnd, firstSequence: built.firstAggregateTradeId, lastSequence: built.lastAggregateTradeId, recordCount: built.eventCount, segmentContractVersion: "2" as const, canonicalInstrumentId: partition.canonicalInstrumentId, sourcePartitionKey: partition.partitionId, segmentObjectKey: built.segmentObjectKey, segmentContentChecksum: built.segmentChecksum, segmentByteLength: built.byteLength, columnarFormat: "PARQUET" as const, compressionFormat: "SNAPPY" as const, eventTimeMin: built.eventTimeMinimum, eventTimeMax: built.eventTimeMaximum, eventOrderPolicy: built.eventOrderPolicy, acceptedCount: built.acceptedCount, rejectedCount: built.rejectedCount, duplicateCount: built.duplicateCount })
  return Object.freeze({ kind: "STREAM_MANIFEST", candidateId, unitId, retrievalAttemptId: attemptId, rawManifestId: raw.objectId, datasetId: "agg-trade", providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, sourceObservationId, sourceObservedAt: built.eventTimeMaximum, effectiveAt: partition.windowStart, parserVersion: PARSER_VERSION, candidateSchemaVersion: AGG_TRADES_SEGMENT_SCHEMA_VERSION, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt: at })
}

async function completed(clients: Clients): Promise<Record<string, string>> {
  const rows = await clients.d3.sql<Array<{ partition_key: string; unit_id: string }>>`SELECT u.partition_key,u.unit_id FROM control.population_units u WHERE u.profile_id=${AGG_TRADES_SEGMENT_JOB_PROFILE.profileId} AND u.profile_version=${AGG_TRADES_SEGMENT_JOB_PROFILE.profileVersion} AND u.current_state='COMPLETED' AND EXISTS(SELECT 1 FROM control.population_outcomes o WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')) AND EXISTS(SELECT 1 FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') AND EXISTS(SELECT 1 FROM control.population_checkpoints p WHERE p.unit_id=u.unit_id AND p.checkpoint_type='CANONICAL_BOUNDARY')`
  const map: Record<string, string> = {}; for (const row of rows) map[row.partition_key] = row.unit_id; return map
}

async function buildSegmentArtifacts(clients: Clients, storage: Storage, partition: AggTradesSegmentExecutionPartition, buffer: Buffer, unitId: string, attemptId: string) {
  const d2 = createCanonicalPersistenceAdapter(clients.d2); await ensureGovernance(d2)
  const raw = await acquireRaw(storage, partition, buffer)
  const beforeMemory = process.memoryUsage().rss; const started = Date.now()
  const segment = await buildAggTradesSegment({ identity: { datasetId: "agg-trade", providerId: "binance-public-archive", venue: "binance-usdm-futures", marketType: "perpetual-futures", canonicalInstrumentId: partition.canonicalInstrumentId, providerSymbol: partition.providerSymbol, partitionStart: partition.windowStart, partitionEnd: partition.windowEnd, rawObjectId: raw.objectId, rawObjectChecksum: raw.contentHash, schemaId: AGG_TRADES_SEGMENT_SCHEMA_ID, schemaVersion: AGG_TRADES_SEGMENT_SCHEMA_VERSION, normalizerVersion: AGG_TRADES_SEGMENT_NORMALIZER_VERSION, eventOrderPolicy: AGG_TRADES_SEGMENT_ORDER_POLICY }, rows: iterateBinanceVisionAggTradesZip(buffer), storage, objectRoot: process.env.D3_BACKFILL_OBJECT_ROOT! })
  const value = candidate(partition, segment, unitId, attemptId, raw, now())
  const command = buildCanonicalStreamSegmentCommand({ operationType: "INITIAL_VERSION", initiatedAt: value.createdAt, sourceDatasetId: "agg-trade", streamKind: "AGG_TRADE", providerId: partition.providerId, venue: "BINANCE", symbol: partition.providerSymbol, canonicalInstrumentId: partition.canonicalInstrumentId, sourcePartitionKey: partition.partitionId, windowStart: partition.windowStart, windowEnd: partition.windowEnd, firstSequence: segment.firstAggregateTradeId, lastSequence: segment.lastAggregateTradeId, recordCount: segment.eventCount, segmentObjectKey: segment.segmentObjectKey, segmentContentChecksum: segment.segmentChecksum, columnarFormat: "PARQUET", compressionFormat: "SNAPPY", segmentByteLength: segment.byteLength, eventTimeMin: segment.eventTimeMinimum, eventTimeMax: segment.eventTimeMaximum, validationStatus: "VALIDATED", eventOrderPolicy: segment.eventOrderPolicy, governance: { datasetRegistrySnapshotId: DATASET_REGISTRY_ID, providerRegistrySnapshotId: PROVIDER_REGISTRY_ID, providerCertificationSnapshotId: PROVIDER_CERTIFICATION_ID, policyVersionId: POLICY_ID, schemaVersion: AGG_TRADES_SEGMENT_SCHEMA_VERSION, normalizationVersion: AGG_TRADES_SEGMENT_NORMALIZER_VERSION }, sourceRawObject: raw, predecessor: null })
  const rawRegistration = await d2.registerRawObjectManifest(raw)
  if (rawRegistration.status === "CONFLICT" || rawRegistration.status === "REJECTED") throw new Error(`AGG_TRADES_SEGMENT_RAW_${rawRegistration.status}`)
  return { raw, segment, value, command, elapsedMs: Date.now() - started, rssDeltaBytes: Math.max(0, process.memoryUsage().rss - beforeMemory) }
}

async function executePartition(snapshotId: string, clients: Clients, partition: AggTradesSegmentExecutionPartition) {
  if ((await completed(clients))[partition.partitionId]) return { status: "SKIPPED_ALREADY_COMPLETE" as const, partitionId: partition.partitionId }
  const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false })
  const d2 = createCanonicalPersistenceAdapter(clients.d2); await ensureGovernance(d2)
  const d3 = createPopulationPostgresAdapter(clients.d3); const at = now(); const builtRequest = requestFor(snapshotId, partition, at)
  const created = await d3.createJob(builtRequest.request)
  let runId: string
  if (created.status === "CREATED") {
    const run = await d3.createRun(created.jobId, 1, at); runId = run.runId
    const units = expandPopulationUnits(builtRequest.job, [{ profileId: AGG_TRADES_SEGMENT_JOB_PROFILE.profileId, profileVersion: AGG_TRADES_SEGMENT_JOB_PROFILE.profileVersion, datasetId: "agg-trade", providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, policyVersionId: POLICY_ID, venue: "BINANCE", subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: "daily-parquet-segment", partitionKey: partition.partitionId, requestFingerprint: builtRequest.request.requestIdentity, requestParameters: { snapshotId, partitionId: partition.partitionId }, required: true }], at)
    if (await d3.expandUnits(units) !== 1) throw new Error("SEGMENT_UNIT_EXPANSION_FAILED")
  } else {
    const retry = await clients.d3.sql<Array<{ run_id: string }>>`SELECT run_id FROM control.population_units WHERE job_id=${created.jobId} AND partition_key=${partition.partitionId} AND current_state='RETRYABLE' ORDER BY updated_at DESC LIMIT 1`
    if (!retry[0]) throw new Error("SEGMENT_DUPLICATE_JOB_NOT_RETRYABLE")
    runId = retry[0].run_id
  }
  const lease = await d3.claimUnit(WORKER_ID, runId, now(), new Date(Date.now() + LEASE_MS).toISOString()); if (!lease) throw new Error("SEGMENT_UNIT_CLAIM_FAILED")
  const buffer = await download(partition.sourceObject)
  await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "RETRIEVING", `segment-retrieving:${partition.partitionId}`, now())
  const attemptId = createRetrievalAttemptId(lease.unitId, runId, 1)
  const committed = await buildSegmentArtifacts(clients, storage, partition, buffer, lease.unitId, attemptId)
  await d3.appendRetrievalAttempt({ attemptId, unitId: lease.unitId, runId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, requestFingerprint: builtRequest.request.requestIdentity, startedAt: at, completedAt: now(), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: "application/zip", rawByteCount: buffer.byteLength, rawManifestId: committed.raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null })
  await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "RAW_PERSISTED", `segment-raw:${partition.partitionId}`, now())
  const persisted = await d3.persistCandidate(committed.value); if (persisted.status === "CONFLICT") throw new Error("SEGMENT_CANDIDATE_CONFLICT")
  await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "CANDIDATES_READY", `segment-candidate:${partition.partitionId}`, now()); await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "PROCESSING", `segment-processing:${partition.partitionId}`, now())
  const submissionId = `submission:${committed.value.candidateId}`; const outcomeId = `outcome:${committed.value.candidateId}`
  await d3.createSubmission(submissionId, committed.value.candidateId, committed.command.idempotencyKey, now())
  const result = await d2.executeCanonicalCommit(committed.command)
  if (result.status !== "SUCCESS" && result.status !== "DUPLICATE") throw new Error(`AGG_TRADES_SEGMENT_COMMIT_${result.status}`)
  const outcome = await d3.recordIntermediateD2Result({ jobId: created.jobId, runId, unitId: lease.unitId, candidateId: committed.value.candidateId, retrievalAttemptId: attemptId, rawManifestId: committed.raw.objectId, submissionId, leaseId: lease.leaseId, ownerId: WORKER_ID, fencingToken: lease.fencingToken, result, outcomeId, createdAt: now() })
  const decision = createWatermarkEligibility({ decisionId: `watermark:${lease.unitId}`, unitId: lease.unitId, datasetId: "agg-trade", providerId: partition.providerId, dimensions: builtRequest.request.dimensions, outcomeIds: [outcomeId], requiredUnitPolicyId: "required-agg-trade-segment", blockingReasons: [], policyVersionId: POLICY_ID, createdAt: now(), outcome })
  await d3.finalizeSegment({ leaseId: lease.leaseId, ownerId: WORKER_ID, fencingToken: lease.fencingToken, outcomeId, decision, checkpoint: { checkpointId: `checkpoint:canonical:${lease.unitId}:${lease.fencingToken}`, jobId: created.jobId, runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "COMPLETED", rawManifestId: committed.raw.objectId, candidateCursor: committed.value.candidateId, canonicalSubmissionId: submissionId, lastOutcomeId: outcomeId, createdAt: now() }, completedAt: now() })
  await d3.completeRun(runId, "SUCCEEDED", now()); await d3.aggregateJob(created.jobId, now())
  return { status: result.status, partitionId: partition.partitionId, downloadedBytes: buffer.byteLength, sourceChecksum: committed.raw.contentHash, sourceRawObjectId: committed.raw.objectId, segment: committed.segment, canonicalSegmentId: committed.command.fact.identity.canonicalRecordId, canonicalSegmentVersion: committed.command.targetRecordVersion, elapsedMs: committed.elapsedMs, rssDeltaBytes: committed.rssDeltaBytes }
}

async function releaseFailedLease(clients: Clients, cause: unknown) {
  const rows = await clients.d3.sql<Array<{ unit_id: string; lease_id: string; fencing_token: number; run_id: string; job_id: string; current_state: string }>>`SELECT u.unit_id,l.lease_id,l.fencing_token::int,u.run_id,u.job_id,u.current_state FROM control.population_units u JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.profile_id=${AGG_TRADES_SEGMENT_JOB_PROFILE.profileId} AND l.owner_id=${WORKER_ID} AND l.released_at IS NULL`
  const d3 = createPopulationPostgresAdapter(clients.d3); const message = cause instanceof Error ? cause.message : "UNKNOWN"; const gap = message.includes("HTTP_404")
  for (const row of rows) {
    const at = now()
    if (!["RETRYABLE","FAILED","QUARANTINED","CANCELLED","COMPLETED"].includes(row.current_state)) await d3.advanceUnit(row.unit_id,row.lease_id,WORKER_ID,row.fencing_token,"RETRYABLE",`segment-failed:${row.unit_id}:${row.fencing_token}`,at)
    await d3.scheduleRetry({ retryEventId: `retry:${canonicalChecksum([row.unit_id,row.fencing_token,message])}`, jobId: row.job_id, runId: row.run_id, unitId: row.unit_id, candidateId: null, classificationId: gap ? "GAP_SOURCE_MISSING" : "FAILED_RETRYABLE", policyId: "retry.historical-source", policyVersion: "UNAVAILABLE", retryAfter: null, createdAt: at })
    await d3.releaseLease(row.unit_id,row.lease_id,WORKER_ID,row.fencing_token,now(),"FAILED")
  }
}

async function freeze(clients: Clients) {
  const rowInventory = await inventory(); const measurement = createAggTradesSegmentCanaryMeasurement(JSON.parse(await readFile(MEASUREMENT_PATH, "utf8")))
  const value = createAggTradesSegmentExecutionSnapshot({ inventory: rowInventory, canaryMeasurement: measurement, completedByPartitionId: await completed(clients) })
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; if ((await snapshot()).snapshotChecksum !== value.snapshotChecksum) throw new Error("SEGMENT_SNAPSHOT_CONFLICT") })
  return value
}

async function status(value: AggTradesSegmentExecutionSnapshot, clients: Clients) {
  const done = await completed(clients); const fs = await statfs(process.env.D3_BACKFILL_OBJECT_ROOT!)
  const capacity = evaluateAggTradesSegmentCapacity({ snapshot: value, postgresFreeBytes: Number(arg("--postgres-free-bytes") ?? "0"), artifactFreeBytes: Number(fs.bavail) * Number(fs.bsize), additionalArtifactGrowthBytes: ADDITIONAL_ARTIFACT_GROWTH_BYTES, additionalPostgresGrowthBytes: AGG_TRADES_REMAINING_DATASET_STORAGE_BYTES })
  const persisted = await clients.d2.sql<Array<{ manifests: number; lineage: number; manifest_bytes: number }>>`SELECT (SELECT count(*)::int FROM canonical.stream_manifests WHERE segment_contract_version='2' AND source_dataset_id='agg-trade') manifests,(SELECT count(*)::int FROM repository.lineage_edges e JOIN canonical.stream_manifests m ON m.canonical_record_id=e.destination_node_id AND m.record_version::text=e.destination_node_version WHERE m.segment_contract_version='2' AND m.source_dataset_id='agg-trade') lineage,(SELECT pg_total_relation_size('canonical.stream_manifests')::bigint) manifest_bytes`
  const result = { schemaVersion: "1.0.0", snapshotId: value.snapshotId, generatedAt: now(), totalPartitions: value.completePartitionCount, completePartitions: Object.keys(done).length, pendingPartitions: value.completePartitionCount - Object.keys(done).length, active: 0, capacity, persisted: persisted[0] }
  await writeFile(PROGRESS_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8"); return result
}

async function main() {
  const command = process.argv[2] as Command | undefined
  if (!command || !["canary","canary-rerun","freeze","run","resume","status","stop","retry-failed","retry-gaps","reconcile","validate-samples"].includes(command)) throw new Error("Usage: runD3AggTradesSegmentBackfill.ts <canary|canary-rerun|freeze|run|resume|status|stop|retry-failed|retry-gaps|reconcile|validate-samples>")
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d3-agg-segment-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "d3-agg-segment-d3" } })
  try {
    const rowInventory = await inventory(); const canarySource = rowInventory.partitions.find((item) => item.providerSymbol === AGG_TRADES_SEGMENT_CANARY_SYMBOL && item.sourceDay === AGG_TRADES_SEGMENT_CANARY_DAY); if (!canarySource) throw new Error("SEGMENT_CANARY_PARTITION_MISSING")
    const canaryPartition: AggTradesSegmentExecutionPartition = { ...canarySource, partitionId: `agg-trade-segment:${canarySource.canonicalInstrumentId}:daily-parquet:${canarySource.sourceDay}`, sourceInventoryPartitionId: canarySource.partitionId, inventorySnapshotId: rowInventory.snapshotId, inventorySnapshotChecksum: rowInventory.snapshotChecksum, unitIdentity: `agg-trade-segment-unit:${canonicalChecksum([rowInventory.parentManifestId,canarySource.canonicalInstrumentId,canarySource.sourceDay])}` }
    if (command === "canary") { const result = await executePartition(`segment-canary:${rowInventory.snapshotId}`, clients, canaryPartition); if (result.status === "SKIPPED_ALREADY_COMPLETE") throw new Error("SEGMENT_CANARY_ALREADY_COMPLETE_USE_RERUN"); await mkdir(path.dirname(MEASUREMENT_PATH), { recursive: true }); await writeFile(MEASUREMENT_PATH, JSON.stringify({ providerSymbol: AGG_TRADES_SEGMENT_CANARY_SYMBOL, sourceDay: AGG_TRADES_SEGMENT_CANARY_DAY, sourceInventoryPartitionId: canarySource.partitionId, sourceRawObjectId: result.sourceRawObjectId, sourceChecksum: result.sourceChecksum, sourceBytes: result.downloadedBytes, segmentId: result.canonicalSegmentId, segmentVersion: String(result.canonicalSegmentVersion), segmentChecksum: result.segment.segmentChecksum, segmentBytes: result.segment.byteLength, eventCount: result.segment.eventCount }, null, 2)); console.log(JSON.stringify(result)); return }
    if (command === "canary-rerun") { const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false }); const buffer = await download(canaryPartition.sourceObject); const built = await buildSegmentArtifacts(clients, storage, canaryPartition, buffer, "canary-rerun-no-unit", "canary-rerun-no-attempt"); const result = await createCanonicalPersistenceAdapter(clients.d2).executeCanonicalCommit(built.command); if (result.status !== "DUPLICATE") throw new Error(`SEGMENT_RERUN_NOT_DUPLICATE:${result.status}`); console.log(JSON.stringify({ status: "DUPLICATE", segment: built.segment, canonicalSegmentId: built.command.fact.identity.canonicalRecordId })); return }
    if (command === "freeze") { console.log(JSON.stringify(await freeze(clients))); return }
    const value = await snapshot()
    if (command === "status") { console.log(JSON.stringify(await status(value, clients))); return }
    if (command === "stop") { await mkdir(path.dirname(stopPath(value.snapshotId)), { recursive: true }); await writeFile(stopPath(value.snapshotId), `${now()}\n`); console.log(JSON.stringify({ status: "STOP_REQUESTED" })); return }
    if (command === "reconcile") { const progress = await status(value, clients); const invalid = await clients.d3.sql<Array<{ partition_key: string }>>`SELECT partition_key FROM control.population_units WHERE profile_id=${AGG_TRADES_SEGMENT_JOB_PROFILE.profileId} AND current_state='COMPLETED' AND (current_checkpoint_id IS NULL OR active_lease_id IS NOT NULL)`; console.log(JSON.stringify({ consistent: invalid.length === 0, reasonCodes: invalid.length ? ["SEGMENT_COMPLETION_INVALID"] : [], affectedPartitions: invalid.map((row) => row.partition_key), progress })); return }
    if (command === "validate-samples") { const measurement = value.canaryMeasurement; const manifest = await clients.d2.sql<Array<{ segment_object_key: string; segment_content_checksum: string; record_count: number }>>`SELECT segment_object_key,segment_content_checksum,record_count::int FROM canonical.stream_manifests WHERE canonical_record_id=${measurement.segmentId} AND record_version=${Number(measurement.segmentVersion)}`; if (!manifest[0]) throw new Error("SEGMENT_CANARY_MANIFEST_MISSING"); const port = createAggTradesSegmentReadPort({ objectRoot: process.env.D3_BACKFILL_OBJECT_ROOT! }); const positions = [0, Math.floor(manifest[0].record_count / 2), manifest[0].record_count - 1]; const segmentSamples = []; for (const offset of positions) segmentSamples.push((await port.readPage({ objectKey: manifest[0].segment_object_key, expectedChecksum: manifest[0].segment_content_checksum, offset, limit: 1 })).events[0]); const sourceBuffer = await download(canaryPartition.sourceObject); const sourceSamples = []; for await (const row of iterateBinanceVisionAggTradesZip(sourceBuffer)) if (positions.includes(row.sourceOrdinal)) sourceSamples.push(row); const comparisons = segmentSamples.map((segment, index) => { const source = sourceSamples[index]; return { position: ["BEGINNING","MIDDLE","END"][index], consistent: Boolean(segment && source) && segment.aggregate_trade_id === source.aggregateTradeId && segment.first_trade_id === source.firstTradeId && segment.last_trade_id === source.lastTradeId && segment.event_time_utc === source.tradeTime && segment.provider_timestamp === source.sourceTimestamp && segment.price === normalizeAggTradesSegmentDecimal(source.price) && segment.quantity === normalizeAggTradesSegmentDecimal(source.quantity) && segment.buyer_is_maker === source.buyerIsMaker, source, segment } }); if (comparisons.some((item) => !item.consistent)) throw new Error("SEGMENT_SOURCE_COMPARISON_FAILED"); console.log(JSON.stringify({ consistent: true, sourceChecksum: createHash("sha256").update(sourceBuffer).digest("hex"), comparisons })); return }
    await unlink(stopPath(value.snapshotId)).catch(() => undefined)
    const postgresFreeBytes = Number(arg("--postgres-free-bytes") ?? "0"); const capacity = (await status(value, clients)).capacity as { status: string }; if (postgresFreeBytes <= 0 || capacity.status !== "PASS") throw new Error("SEGMENT_CAPACITY_NOT_APPROVED")
    const done = await completed(clients); const symbol = arg("--instrument")?.toUpperCase(); const from = arg("--from"); const to = arg("--to"); const max = Number(arg("--max-partitions") ?? Number.MAX_SAFE_INTEGER); if (!Number.isSafeInteger(max) || max < 1) throw new Error("SEGMENT_MAX_PARTITIONS_INVALID")
    const retryRows = command === "retry-failed" ? await clients.d3.sql<Array<{ partition_key: string }>>`SELECT partition_key FROM control.population_units WHERE profile_id=${AGG_TRADES_SEGMENT_JOB_PROFILE.profileId} AND current_state IN ('RETRYABLE','FAILED')` : command === "retry-gaps" ? await clients.d3.sql<Array<{ partition_key: string }>>`SELECT DISTINCT u.partition_key FROM control.population_units u JOIN control.retry_events r ON r.unit_id=u.unit_id WHERE u.profile_id=${AGG_TRADES_SEGMENT_JOB_PROFILE.profileId} AND r.classification_id='GAP_SOURCE_MISSING'` : []
    const retryKeys = new Set(retryRows.map((row) => row.partition_key))
    const selected = value.partitions.filter((item) => !done[item.partitionId] && (!symbol || item.providerSymbol === symbol) && (!from || item.sourceDay >= from) && (!to || item.sourceDay <= to) && (!(command === "retry-failed" || command === "retry-gaps") || retryKeys.has(item.partitionId))).slice(0, max)
    let attempted = 0; for (const partition of selected) { if (await access(stopPath(value.snapshotId)).then(() => true).catch(() => false)) break; try { console.log(JSON.stringify(await executePartition(value.snapshotId, clients, partition))) } catch (error) { await releaseFailedLease(clients,error); console.log(JSON.stringify({ status: "FAILED_RETRYABLE", partitionId: partition.partitionId, reason: error instanceof Error ? error.message : "UNKNOWN" })) }; attempted += 1 }
    console.log(JSON.stringify({ status: "SAFE_BOUNDARY", attempted, remaining: value.completePartitionCount - Object.keys(await completed(clients)).length }))
  } finally { await clients.shutdown() }
}

main().catch((error) => { console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" })); process.exitCode = 1 })
