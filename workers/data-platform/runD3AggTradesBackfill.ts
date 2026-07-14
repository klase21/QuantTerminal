import { createHash } from "node:crypto"
import { access, mkdir, readFile, statfs, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { CanonicalFactReference, RawObjectManifest } from "@/lib/data-platform/persistence"
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
  type PopulationOutcome,
} from "@/lib/data-platform/population"
import {
  AGG_TRADES_FROZEN_CUTOFF,
  createAggTradesExecutionSnapshot,
  createAggTradesPartitionId,
  createD3ToD2CanonicalCommitPort,
  createFilesystemObjectStorage,
  createIntegratedBackfillClientsFromEnvironment,
  D3_PHASE3_MANIFEST,
  evaluateAggTradesCapacity,
  instrumentForSymbol,
  inspectBinanceVisionAggTradesZip,
  iterateBinanceVisionAggTradesZip,
  ProductionNormalizerRegistry,
  PRODUCTION_NORMALIZER_VERSION,
  type AggTradesArchiveInventoryItem,
  type AggTradesAvailabilityBoundary,
  type AggTradesExecutionPartition,
  type AggTradesExecutionSnapshot,
  type AggTradesSizeSample,
  type AggTradeSourceRow,
} from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"

type Command = "enumerate" | "canary" | "run" | "resume" | "status" | "stop" | "retry-failed" | "retry-gaps" | "reconcile" | "validate-samples"
type Clients = Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>
type Storage = Awaited<ReturnType<typeof createFilesystemObjectStorage>>

const SNAPSHOT_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-aggtrades-execution-snapshot.json")
const PROGRESS_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-aggtrades-progress.json")
const DATASET_REGISTRY_ID = "d3-phase3-agg-trade-dataset-registry-v1"
const PROVIDER_REGISTRY_ID = "d3-phase3-binance-vision-agg-trade-provider-v1"
const PROVIDER_CERTIFICATION_ID = "d3-phase3-binance-vision-agg-trade-certification-v1"
const POLICY_ID = "d3-phase3-agg-trade-policy-v1"
const PARSER_VERSION = "binance-vision-agg-trades-csv-v2"
const SCHEMA_VERSION = "1"
const WORKER_ID = "d3-phase3-agg-trade-canary-worker-1"
const LEASE_MS = 2 * 60 * 60 * 1000
const CANARY_SYMBOL = "XRPUSDT"
const CANARY_DAY = "2020-01-06"

function now(): string { return new Date().toISOString() }
function arg(name: string): string | null { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1] ?? null }
function stream(buffer: Buffer): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { yield buffer } } }
function xmlDecode(value: string): string { return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'") }
function stopPath(snapshotId: string): string { return path.join(process.env.D3_BACKFILL_OBJECT_ROOT!, "_control", `${snapshotId.replace(/[^a-zA-Z0-9._-]/g, "_")}.stop`) }

async function listArchives(symbol: string): Promise<readonly AggTradesArchiveInventoryItem[]> {
  const prefix = `data/futures/um/daily/aggTrades/${symbol}/`
  const archives: AggTradesArchiveInventoryItem[] = []
  let continuation: string | null = null
  do {
    const url = new URL("https://s3-ap-northeast-1.amazonaws.com/data.binance.vision")
    url.searchParams.set("list-type", "2"); url.searchParams.set("prefix", prefix); url.searchParams.set("max-keys", "1000")
    if (continuation) url.searchParams.set("continuation-token", continuation)
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { "user-agent": "QuantTerminal-D3-AggTrades-Discovery/1.0" } })
    if (!response.ok) throw new Error(`AGG_TRADES_DISCOVERY_FAILED:${symbol}:HTTP_${response.status}`)
    const xml = await response.text()
    for (const match of xml.matchAll(/<Contents>\s*<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>\s*<StorageClass>/g)) {
      const key = xmlDecode(match[1])
      const day = new RegExp(`${symbol}-aggTrades-(\\d{4}-\\d{2}-\\d{2})\\.zip$`).exec(key)?.[1]
      if (day && `${day}T00:00:00.000Z` < AGG_TRADES_FROZEN_CUTOFF) archives.push(Object.freeze({ day, compressedBytes: Number(match[2]) }))
    }
    const next = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1]
    continuation = next ? xmlDecode(next) : null
  } while (continuation)
  archives.sort((left, right) => left.day.localeCompare(right.day))
  if (!archives.length || archives.at(-1)?.day !== "2026-07-11") throw new Error(`AGG_TRADES_INVENTORY_INCOMPLETE:${symbol}`)
  const first = Date.parse(`${archives[0].day}T00:00:00.000Z`)
  for (let index = 0; index < archives.length; index += 1) {
    const expected = new Date(first + index * 86_400_000).toISOString().slice(0, 10)
    if (archives[index].day !== expected) throw new Error(`AGG_TRADES_INVENTORY_GAP:${symbol}:${expected}`)
  }
  return Object.freeze(archives)
}

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(120_000), headers: { accept: "application/zip,application/octet-stream,*/*", "user-agent": "QuantTerminal-D3-AggTrades/1.0" } })
  if (!response.ok) throw new Error(`AGG_TRADES_SOURCE_HTTP_${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function inspectArchive(symbol: string, archive: AggTradesArchiveInventoryItem): Promise<AggTradesSizeSample> {
  const url = `https://data.binance.vision/data/futures/um/daily/aggTrades/${symbol}/${symbol}-aggTrades-${archive.day}.zip`
  const buffer = await download(url)
  let records = 0
  const metadata = await inspectBinanceVisionAggTradesZip(buffer)
  try { for await (const _row of iterateBinanceVisionAggTradesZip(buffer)) records += 1 }
  catch (error) { throw new Error(`AGG_TRADES_SAMPLE_INVALID:${symbol}:${archive.day}:${error instanceof Error ? error.message : "UNKNOWN"}`) }
  return Object.freeze({ day: archive.day, compressedBytes: buffer.byteLength, uncompressedBytes: metadata.uncompressedBytes, records, headerPresent: metadata.headerPresent })
}

async function completedPartitionMap(clients: Clients): Promise<Readonly<Record<string, string>>> {
  const units = await clients.d3.sql<Array<{ partition_key: string; unit_id: string; window_start: Date; window_end: Date; subject_or_symbol: string; outcomes: number; coverage: number }>>`SELECT u.partition_key,u.unit_id,u.window_start,u.window_end,u.subject_or_symbol,(SELECT count(*)::int FROM control.population_outcomes o WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')) outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') coverage FROM control.population_units u WHERE u.dataset_id='agg-trade' AND u.current_state='COMPLETED'`
  const completed: Record<string, string> = {}
  for (const unit of units) {
    if (!unit.partition_key.startsWith("agg-trade:") || unit.coverage !== 1 || unit.outcomes < 1) continue
    const facts = await clients.d2.sql<Array<{ count: number; lineage: number }>>`SELECT count(DISTINCT f.fact_id)::int count,count(DISTINCT e.edge_id)::int lineage FROM canonical.agg_trades f LEFT JOIN repository.lineage_edges e ON e.destination_node_id=f.canonical_record_id AND e.destination_node_version=f.record_version::text WHERE f.provider_id='binance-public-archive' AND f.symbol=${unit.subject_or_symbol} AND f.trade_time>=${unit.window_start.toISOString()} AND f.trade_time<${unit.window_end.toISOString()}`
    if (facts[0]?.count === unit.outcomes && facts[0]?.lineage === unit.outcomes) completed[unit.partition_key] = unit.unit_id
  }
  return Object.freeze(completed)
}

async function enumerate(clients: Clients): Promise<void> {
  const availability: AggTradesAvailabilityBoundary[] = []
  for (const instrument of D3_PHASE3_MANIFEST.instruments) {
    const archives = await listArchives(instrument.providerSymbol)
    const sampleIndexes = [0, Math.floor((archives.length - 1) / 2), archives.length - 1]
    const samples: AggTradesSizeSample[] = []
    for (const index of sampleIndexes) samples.push(await inspectArchive(instrument.providerSymbol, archives[index]))
    const ratios = samples.map((sample) => sample.records / sample.compressedBytes)
    const averageRatio = ratios.reduce((sum, value) => sum + value, 0) / ratios.length
    const maximumRatio = Math.max(...ratios)
    const compressedSourceBytes = archives.reduce((sum, item) => sum + item.compressedBytes, 0)
    availability.push(Object.freeze({ canonicalInstrumentId: instrument.canonicalInstrumentId, providerSymbol: instrument.providerSymbol, activationTimestamp: instrument.activatedAt, earliestVerifiedArchiveDay: archives[0].day, latestVerifiedArchiveDay: "2026-07-11", archiveCount: archives.length, compressedSourceBytes, archives, sizeSamples: Object.freeze(samples), estimatedRecords: Math.round(compressedSourceBytes * averageRatio), conservativeRecords: Math.round(compressedSourceBytes * maximumRatio), discoveryMethod: "BINANCE_VISION_S3_COMPLETE_PREFIX_INVENTORY" }))
  }
  const snapshot = createAggTradesExecutionSnapshot({ manifest: D3_PHASE3_MANIFEST, availability, completedByPartitionId: await completedPartitionMap(clients) })
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; const existing = await readSnapshot(); if (existing.snapshotChecksum !== snapshot.snapshotChecksum) throw new Error("AGG_TRADES_SNAPSHOT_CONFLICT") })
  console.log(JSON.stringify({ status: "ENUMERATED", snapshotId: snapshot.snapshotId, partitions: snapshot.completePartitionCount, compressedBytes: snapshot.measuredCompressedSourceBytes, estimatedRecords: snapshot.estimatedRecords, conservativeRecords: snapshot.conservativeRecords }))
}

async function readSnapshot(): Promise<AggTradesExecutionSnapshot> {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8")) as AggTradesExecutionSnapshot
  const { snapshotId, snapshotChecksum, ...content } = snapshot
  if (snapshotId !== `agg-trades-execution:${snapshotChecksum}` || canonicalChecksum(content) !== snapshotChecksum || snapshot.parentManifestId !== D3_PHASE3_MANIFEST.manifestId || snapshot.parentManifestChecksum !== D3_PHASE3_MANIFEST.manifestChecksum) throw new Error("AGG_TRADES_SNAPSHOT_INVALID")
  return Object.freeze(snapshot)
}

async function ensureGovernance(d2: ReturnType<typeof createCanonicalPersistenceAdapter>): Promise<void> {
  const effectiveAt = AGG_TRADES_FROZEN_CUTOFF
  const results = await Promise.all([
    d2.registerRegistrySnapshot({ snapshotId: DATASET_REGISTRY_ID, registryVersion: "1.0.0", contentChecksum: canonicalChecksum({ datasetId: "agg-trade", fields: "provider-native-per-record" }), canonicalContent: { datasetId: "agg-trade", fields: "aggregateTradeId,price,quantity,firstTradeId,lastTradeId,tradeTime,buyerIsMaker" }, effectiveAt, createdAt: effectiveAt }),
    d2.registerProviderSnapshot({ snapshotId: PROVIDER_REGISTRY_ID, providerId: "binance-public-archive", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ source: "BINANCE_VISION_USDM_DAILY_AGGTRADES" }), canonicalContent: { source: "BINANCE_VISION_USDM_DAILY_AGGTRADES", limitation: "FROZEN_ARCHIVE_ONLY" }, effectiveAt, createdAt: effectiveAt }),
    d2.registerProviderSnapshot({ snapshotId: PROVIDER_CERTIFICATION_ID, providerId: "binance-public-archive", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ certification: "AGG_TRADES_THROUGH_2026_07_11" }), canonicalContent: { certification: "AGG_TRADES_THROUGH_2026_07_11", limitation: "CAPACITY_GATE_REQUIRED" }, effectiveAt, createdAt: effectiveAt }),
    d2.registerPolicyVersion({ policyVersionId: POLICY_ID, datasetId: "agg-trade", policyVersion: "1.0.0", contentChecksum: canonicalChecksum({ source: "BINANCE_VISION_USDM_DAILY_AGGTRADES_ONLY", identity: "provider+venue+symbol+aggregateTradeId", cutoff: AGG_TRADES_FROZEN_CUTOFF }), canonicalContent: { source: "BINANCE_VISION_USDM_DAILY_AGGTRADES_ONLY", identity: "provider+venue+symbol+aggregateTradeId", cutoff: AGG_TRADES_FROZEN_CUTOFF }, effectiveAt, createdAt: effectiveAt }),
  ])
  if (results.some((result) => result.status === "CONFLICT" || result.status === "REJECTED")) throw new Error("AGG_TRADES_GOVERNANCE_FAILED")
}

function buildRequest(snapshot: AggTradesExecutionSnapshot, partition: AggTradesExecutionPartition, at: string): { readonly request: PopulationJobRequest; readonly job: PopulationJob } {
  const profile: PopulationJobProfile = Object.freeze({ profileId: "d3-phase3-agg-trade", profileVersion: "1.0.0", kind: "BACKFILL", requiredDimensions: ["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const, rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "retry.historical-source", retryPolicyVersion: "UNAVAILABLE", watermarkPolicyId: "coverage.agg-trade.partition", watermarkPolicyVersion: "1.0.0" })
  const dimensions = Object.freeze({ venue: "BINANCE", subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: "tick", partitionKey: partition.partitionId })
  const base = { profile, datasetId: partition.datasetId, providerId: partition.providerId, dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: `${snapshot.snapshotId}:${partition.partitionId}`, intentionalRerunIdentity: null, requestedAt: at, requestedBy: "d3-phase3-agg-trade-worker" })
  const jobId = createPopulationJobId(requestIdentity, request.occurrenceIdentity, null)
  return { request, job: Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt: at, updatedAt: at }) }
}

function candidate(partition: AggTradesExecutionPartition, row: AggTradeSourceRow, unitId: string, retrievalAttemptId: string, raw: RawObjectManifest, createdAt: string): Extract<PopulationCandidate, { readonly kind: "AGG_TRADE" }> {
  const sourceObservationId = `${partition.providerId}:${partition.providerSymbol}:${row.aggregateTradeId}`
  const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, candidateOrdinal: row.aggregateTradeId })
  const payload = Object.freeze({ symbol: partition.providerSymbol, canonicalInstrumentId: partition.canonicalInstrumentId, marketType: "USD_M_FUTURES" as const, aggregateTradeId: row.aggregateTradeId, price: row.price, quantity: row.quantity, firstTradeId: row.firstTradeId, lastTradeId: row.lastTradeId, tradeTime: row.tradeTime, sourceTimestamp: row.sourceTimestamp, buyerIsMaker: row.buyerIsMaker })
  return Object.freeze({ kind: "AGG_TRADE", candidateId, unitId, retrievalAttemptId, rawManifestId: raw.objectId, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, sourceObservationId, sourceObservedAt: row.tradeTime, effectiveAt: row.tradeTime, parserVersion: PARSER_VERSION, candidateSchemaVersion: SCHEMA_VERSION, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt })
}

async function acquire(storage: Storage, partition: AggTradesExecutionPartition, buffer: Buffer): Promise<RawObjectManifest> {
  const contentHash = createHash("sha256").update(buffer).digest("hex")
  const objectStorageKey = `raw/${contentHash.slice(0, 2)}/${contentHash}.zip`
  const reference = await storage.putImmutable({ objectStorageKey, contentHash, mediaType: "application/zip", byteLength: buffer.byteLength, content: stream(buffer) })
  const at = now()
  return Object.freeze({ objectId: reference.rawObjectId, datasetId: partition.datasetId, providerId: partition.providerId, venue: "BINANCE", symbolOrSubject: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, contentHash, sizeBytes: buffer.byteLength, mediaType: "application/zip", compression: "ZIP", retrievedAt: at, providerSnapshotId: PROVIDER_REGISTRY_ID, retentionClass: "ARCHIVE", verificationState: reference.verificationState, objectStorageKey, createdAt: at })
}

async function runPartition(snapshot: AggTradesExecutionSnapshot, clients: Clients, partition: AggTradesExecutionPartition): Promise<void> {
  const completed = await completedPartitionMap(clients)
  if (completed[partition.partitionId]) { console.log(JSON.stringify({ status: "SKIPPED_ALREADY_COMPLETE", partitionId: partition.partitionId, unitId: completed[partition.partitionId], progress: await status(snapshot, clients) })); return }
  const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false })
  const d2 = createCanonicalPersistenceAdapter(clients.d2); const d3 = createPopulationPostgresAdapter(clients.d3); const port = createD3ToD2CanonicalCommitPort(d2)
  await ensureGovernance(d2)
  const at = now(); const built = buildRequest(snapshot, partition, at); const created = await d3.createJob(built.request)
  if (created.status !== "CREATED") throw new Error(`AGG_TRADES_CANARY_JOB_NOT_CREATED:${created.status}`)
  const run = await d3.createRun(created.jobId, 1, at)
  const units = expandPopulationUnits(built.job, [{ profileId: built.request.profile.profileId, profileVersion: built.request.profile.profileVersion, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, policyVersionId: POLICY_ID, venue: "BINANCE", subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: "tick", partitionKey: partition.partitionId, requestFingerprint: built.request.requestIdentity, requestParameters: { snapshotId: snapshot.snapshotId, partitionId: partition.partitionId }, required: true }], at)
  if (await d3.expandUnits(units) !== 1) throw new Error("AGG_TRADES_UNIT_EXPANSION_FAILED")
  const lease = await d3.claimUnit(WORKER_ID, run.runId, now(), new Date(Date.now() + LEASE_MS).toISOString())
  if (!lease) throw new Error("AGG_TRADES_UNIT_CLAIM_FAILED")
  const buffer = await download(partition.sourceObject)
  await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "RETRIEVING", `agg-trade-retrieving:${partition.partitionId}`, now())
  const raw = await acquire(storage, partition, buffer); const rawRegistration = await d2.registerRawObjectManifest(raw)
  if (rawRegistration.status === "CONFLICT" || rawRegistration.status === "REJECTED") throw new Error(`AGG_TRADES_RAW_FAILED:${rawRegistration.status}`)
  const retrievalAttemptId = createRetrievalAttemptId(lease.unitId, run.runId, 1)
  await d3.appendRetrievalAttempt({ attemptId: retrievalAttemptId, unitId: lease.unitId, runId: run.runId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, requestFingerprint: built.request.requestIdentity, startedAt: at, completedAt: now(), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: raw.mediaType, rawByteCount: buffer.byteLength, rawManifestId: raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null })
  await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "RAW_PERSISTED", `agg-trade-raw:${partition.partitionId}`, now())
  await d3.checkpoint({ checkpointId: `checkpoint:raw:${lease.unitId}:${lease.fencingToken}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "RAW_BOUNDARY", completedStage: "RAW_PERSISTED", rawManifestId: raw.objectId, candidateCursor: null, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: now() }, lease.leaseId, WORKER_ID)
  let sourceRecords = 0
  for await (const _row of iterateBinanceVisionAggTradesZip(buffer)) sourceRecords += 1
  await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "CANDIDATES_READY", `agg-trade-candidates:${partition.partitionId}`, now())
  await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "PROCESSING", `agg-trade-processing:${partition.partitionId}`, now())
  const normalizer = new ProductionNormalizerRegistry()
  let records = 0; let createdFacts = 0; let reusedFacts = 0; let conflicts = 0; let first: AggTradeSourceRow | null = null; let middle: AggTradeSourceRow | null = null; let last: AggTradeSourceRow | null = null; let lastCandidate = ""; let lastSubmission = ""; let lastOutcome = ""; let lastPopulationOutcome: PopulationOutcome | null = null
  for await (const row of iterateBinanceVisionAggTradesZip(buffer)) {
    first ??= row; last = row; records += 1; if (records === Math.floor(sourceRecords / 2) + 1) middle = row
    const value = candidate(partition, row, lease.unitId, retrievalAttemptId, raw, at)
    const persisted = await d3.persistCandidate(value); if (persisted.status === "CONFLICT") throw new Error(`AGG_TRADES_CANDIDATE_CONFLICT:${value.candidateId}`)
    const command = normalizer.normalize({ candidate: value, datasetRegistrySnapshotId: DATASET_REGISTRY_ID, providerRegistrySnapshotId: PROVIDER_REGISTRY_ID, providerCertificationSnapshotId: PROVIDER_CERTIFICATION_ID, policyVersionId: POLICY_ID, schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: raw.objectId, rawObject: raw })
    const submissionId = `submission:${value.candidateId}`; const outcomeId = `outcome:${value.candidateId}`
    await d3.createSubmission(submissionId, value.candidateId, command.idempotencyKey, now())
    const result = await port.execute(command)
    if (result.status === "SUCCESS") createdFacts += 1; else if (result.status === "DUPLICATE") reusedFacts += 1; else if (result.status === "CONFLICT") conflicts += 1; else throw new Error(`AGG_TRADES_COMMIT_FAILED:${result.status}`)
    if (!(await clients.d3.sql`SELECT 1 FROM control.population_outcomes WHERE outcome_id=${outcomeId}`).length) lastPopulationOutcome = await d3.recordIntermediateD2Result({ jobId: created.jobId, runId: run.runId, unitId: lease.unitId, candidateId: value.candidateId, retrievalAttemptId, rawManifestId: raw.objectId, submissionId, leaseId: lease.leaseId, ownerId: WORKER_ID, fencingToken: lease.fencingToken, result, outcomeId, createdAt: now() })
    lastCandidate = value.candidateId; lastSubmission = submissionId; lastOutcome = outcomeId
    if (records % 5_000 === 0) {
      await d3.checkpoint({ checkpointId: `checkpoint:candidate:${lease.unitId}:${records}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANDIDATE_BOUNDARY", completedStage: "PROCESSING", rawManifestId: raw.objectId, candidateCursor: value.candidateId, canonicalSubmissionId: submissionId, lastOutcomeId: outcomeId, createdAt: now() }, lease.leaseId, WORKER_ID)
      await d3.heartbeat(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, now(), new Date(Date.now() + LEASE_MS).toISOString())
      console.log(JSON.stringify({ event: "PARTITION_PROGRESS", partitionId: partition.partitionId, records, createdFacts, reusedFacts, conflicts }))
    }
  }
  if (!first || !last || !lastPopulationOutcome || conflicts) throw new Error("AGG_TRADES_CANARY_VALIDATION_FAILED")
  middle ??= first
  await d3.appendValidation({ validationRunId: `validation:${lease.unitId}`, candidateId: null, retrievalAttemptId, layer: "STRUCTURAL", ruleId: "d3-phase3-agg-trade-source", ruleVersion: "1.0.0", outcome: "PASSED", blocking: false, failureRouting: null, policyVersionId: POLICY_ID, diagnostics: { records, firstAggregateTradeId: first.aggregateTradeId, lastAggregateTradeId: last.aggregateTradeId }, createdAt: now() })
  const outcomes = await clients.d3.sql<Array<{ outcome_id: string }>>`SELECT outcome_id FROM control.population_outcomes WHERE unit_id=${lease.unitId} ORDER BY outcome_id`
  const watermark = createWatermarkEligibility({ decisionId: `watermark:${lease.unitId}`, unitId: lease.unitId, datasetId: partition.datasetId, providerId: partition.providerId, dimensions: built.request.dimensions, outcomeIds: outcomes.map((item) => item.outcome_id), requiredUnitPolicyId: "required-agg-trade-canary", blockingReasons: [], policyVersionId: POLICY_ID, createdAt: now(), outcome: lastPopulationOutcome })
  await d3.writeWatermarkDecision(watermark)
  await d3.checkpoint({ checkpointId: `checkpoint:canonical:${lease.unitId}:${lease.fencingToken}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "PROCESSING", rawManifestId: raw.objectId, candidateCursor: lastCandidate, canonicalSubmissionId: lastSubmission, lastOutcomeId: lastOutcome, createdAt: now() }, lease.leaseId, WORKER_ID)
  await d3.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "COMPLETED", `agg-trade-completed:${partition.partitionId}`, now())
  await d3.releaseLease(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, now(), "COMPLETED"); await d3.completeRun(run.runId, "SUCCEEDED", now()); await d3.aggregateJob(created.jobId, now())
  const samples = [first, middle, last]
  console.log(JSON.stringify({ status: "CANARY_POPULATED", partitionId: partition.partitionId, downloadedBytes: buffer.byteLength, sourceChecksum: createHash("sha256").update(buffer).digest("hex"), records, createdFacts, reusedFacts, conflicts, rawObjectId: raw.objectId, samples: samples.map((row) => ({ aggregateTradeId: row.aggregateTradeId, firstTradeId: row.firstTradeId, lastTradeId: row.lastTradeId, tradeTime: row.tradeTime, price: row.price, quantity: row.quantity, buyerIsMaker: row.buyerIsMaker })), progress: await status(snapshot, clients) }))
}

async function releaseFailedPartitionLease(clients: Clients): Promise<void> {
  const active = await clients.d3.sql<Array<{ unit_id: string; lease_id: string; fencing_token: number; current_state: string }>>`SELECT u.unit_id,l.lease_id,l.fencing_token::int,u.current_state FROM control.population_units u JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.dataset_id='agg-trade' AND l.owner_id=${WORKER_ID} AND l.released_at IS NULL AND l.expires_at>now()`
  const d3 = createPopulationPostgresAdapter(clients.d3)
  for (const lease of active) {
    const at = now()
    const terminal = lease.current_state === "CANDIDATES_READY" ? "FAILED" : "RETRYABLE"
    await d3.advanceUnit(lease.unit_id, lease.lease_id, WORKER_ID, lease.fencing_token, terminal, `agg-trade-partition-failed:${lease.unit_id}:${lease.fencing_token}`, at)
    await d3.releaseLease(lease.unit_id, lease.lease_id, WORKER_ID, lease.fencing_token, now(), "FAILED")
  }
}

async function status(snapshot: AggTradesExecutionSnapshot, clients: Clients): Promise<Record<string, unknown>> {
  const completed = await completedPartitionMap(clients)
  const d2 = await clients.d2.sql<Array<{ facts: number; raw_objects: number; bytes: number; lineage: number }>>`SELECT (SELECT count(*)::int FROM canonical.agg_trades) facts,(SELECT count(*)::int FROM raw.objects WHERE dataset_id='agg-trade') raw_objects,(SELECT COALESCE(sum(size_bytes),0)::bigint FROM raw.objects WHERE dataset_id='agg-trade') bytes,(SELECT count(*)::int FROM repository.lineage_edges e JOIN canonical.agg_trades f ON f.canonical_record_id=e.destination_node_id AND f.record_version::text=e.destination_node_version) lineage`
  const d3 = await clients.d3.sql<Array<{ units: number; candidates: number; outcomes: number; coverage: number; checkpoints: number; active: number }>>`SELECT (SELECT count(*)::int FROM control.population_units WHERE dataset_id='agg-trade') units,(SELECT count(*)::int FROM population.candidates WHERE dataset_id='agg-trade') candidates,(SELECT count(*)::int FROM control.population_outcomes o JOIN population.candidates c ON c.candidate_id=o.candidate_id WHERE c.dataset_id='agg-trade') outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions WHERE dataset_id='agg-trade') coverage,(SELECT count(*)::int FROM control.population_checkpoints p JOIN control.population_units u ON u.unit_id=p.unit_id WHERE u.dataset_id='agg-trade') checkpoints,(SELECT count(*)::int FROM control.population_leases l JOIN control.population_units u ON u.unit_id=l.unit_id WHERE u.dataset_id='agg-trade' AND l.released_at IS NULL AND l.expires_at>now()) active`
  const fs = await statfs(process.env.D3_BACKFILL_OBJECT_ROOT!)
  const postgresFreeBytes = Number(arg("--postgres-free-bytes") ?? "0")
  const capacity = postgresFreeBytes > 0 ? evaluateAggTradesCapacity({ snapshot, postgresFreeBytes, artifactFreeBytes: fs.bavail * fs.bsize }) : { status: "BLOCKED" as const, reasonCodes: ["POSTGRES_FREE_CAPACITY_UNVERIFIED"], requiredPostgresBytes: snapshot.conservativeCanonicalStorageBytes + snapshot.remainingDatasetStorageBytes, requiredArtifactBytes: snapshot.measuredCompressedSourceBytes }
  const result = { schemaVersion: "1.0.0", snapshotId: snapshot.snapshotId, generatedAt: now(), totalPartitions: snapshot.completePartitionCount, completePartitions: Object.keys(completed).length, pendingPartitions: snapshot.completePartitionCount - Object.keys(completed).length, capacity, persisted: { ...d2[0], ...d3[0] } }
  await writeFile(PROGRESS_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8")
  return result
}

async function reconcile(snapshot: AggTradesExecutionSnapshot, clients: Clients): Promise<void> {
  const completed = await completedPartitionMap(clients)
  const invalid = await clients.d3.sql<Array<{ partition_key: string }>>`SELECT u.partition_key FROM control.population_units u WHERE u.dataset_id='agg-trade' AND u.current_state='COMPLETED' AND (NOT EXISTS(SELECT 1 FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') OR NOT EXISTS(SELECT 1 FROM control.population_checkpoints p WHERE p.unit_id=u.unit_id AND p.checkpoint_type='CANONICAL_BOUNDARY'))`
  console.log(JSON.stringify({ consistent: invalid.length === 0, reasonCodes: invalid.length ? ["COMPLETED_UNIT_INVALID"] : [], affectedPartitions: invalid.map((item) => item.partition_key), completePartitions: Object.keys(completed).length, incompletePartitions: snapshot.completePartitionCount - Object.keys(completed).length, executionComplete: Object.keys(completed).length === snapshot.completePartitionCount }))
}

async function validateSamples(snapshot: AggTradesExecutionSnapshot, clients: Clients): Promise<void> {
  const partition = snapshot.partitions.find((item) => item.providerSymbol === CANARY_SYMBOL && item.sourceDay === CANARY_DAY)
  if (!partition) throw new Error("AGG_TRADES_CANARY_PARTITION_MISSING")
  const buffer = await download(partition.sourceObject)
  const source: AggTradeSourceRow[] = []
  let count = 0
  for await (const row of iterateBinanceVisionAggTradesZip(buffer)) {
    if (count === 0 || count === 12_449 || count === 24_897) source.push(row)
    count += 1
  }
  if (count !== 24_898 || source.length !== 3) throw new Error("AGG_TRADES_SAMPLE_SOURCE_COUNT_MISMATCH")
  const ids = source.map((row) => row.aggregateTradeId)
  const facts = await clients.d2.sql<Array<{ aggregate_trade_id: string; first_trade_id: string; last_trade_id: string; trade_time: Date; source_timestamp: string; price: string; quantity: string; buyer_is_maker: boolean; canonical_record_id: string; record_version: number; raw_object_id: string; lineage_edge_id: string }>>`SELECT f.aggregate_trade_id::text,f.first_trade_id::text,f.last_trade_id::text,f.trade_time,f.source_timestamp::text,f.price::text,f.quantity::text,f.buyer_is_maker,f.canonical_record_id,f.record_version,e.source_node_id raw_object_id,e.edge_id lineage_edge_id FROM canonical.agg_trades f JOIN repository.lineage_edges e ON e.destination_node_id=f.canonical_record_id AND e.destination_node_version=f.record_version::text WHERE f.provider_id='binance-public-archive' AND f.symbol=${CANARY_SYMBOL} AND f.aggregate_trade_id IN ${clients.d2.sql(ids)} ORDER BY f.trade_time,f.aggregate_trade_id`
  const candidates = await clients.d3.sql<Array<{ source_observation_id: string; candidate_id: string }>>`SELECT source_observation_id,candidate_id FROM population.candidates WHERE dataset_id='agg-trade' AND source_observation_id IN ${clients.d3.sql(ids.map((id) => `binance-public-archive:${CANARY_SYMBOL}:${id}`))} ORDER BY source_observation_id`
  const byId = new Map(facts.map((fact) => [fact.aggregate_trade_id, fact]))
  const candidateBySource = new Map(candidates.map((item) => [item.source_observation_id, item.candidate_id]))
  const comparisons = source.map((row) => {
    const fact = byId.get(row.aggregateTradeId)
    const sourceObservationId = `binance-public-archive:${CANARY_SYMBOL}:${row.aggregateTradeId}`
    const consistent = Boolean(fact) && fact!.first_trade_id === row.firstTradeId && fact!.last_trade_id === row.lastTradeId && fact!.trade_time.toISOString() === row.tradeTime && fact!.source_timestamp === row.sourceTimestamp && Number(fact!.price) === Number(row.price) && Number(fact!.quantity) === Number(row.quantity) && fact!.buyer_is_maker === row.buyerIsMaker && Boolean(candidateBySource.get(sourceObservationId)) && Boolean(fact!.lineage_edge_id)
    return Object.freeze({ position: row.sourceOrdinal === 0 ? "BEGINNING" : row.sourceOrdinal === 12_449 ? "MIDDLE" : "END", consistent, source: row, canonical: fact ?? null, candidateId: candidateBySource.get(sourceObservationId) ?? null })
  })
  if (comparisons.some((comparison) => !comparison.consistent)) throw new Error("AGG_TRADES_SOURCE_CANONICAL_MISMATCH")
  console.log(JSON.stringify({ consistent: true, sourceChecksum: createHash("sha256").update(buffer).digest("hex"), downloadedBytes: buffer.byteLength, comparisons }))
}

async function runPartitions(snapshot: AggTradesExecutionSnapshot, clients: Clients, command: Command): Promise<void> {
  const postgresFreeBytes = Number(arg("--postgres-free-bytes") ?? "0")
  const fs = await statfs(process.env.D3_BACKFILL_OBJECT_ROOT!)
  const capacity = postgresFreeBytes > 0
    ? evaluateAggTradesCapacity({ snapshot, postgresFreeBytes, artifactFreeBytes: fs.bavail * fs.bsize })
    : { status: "BLOCKED" as const, reasonCodes: ["POSTGRES_FREE_CAPACITY_UNVERIFIED"], requiredPostgresBytes: snapshot.conservativeCanonicalStorageBytes + snapshot.remainingDatasetStorageBytes, requiredArtifactBytes: snapshot.measuredCompressedSourceBytes }
  if (capacity.status === "BLOCKED") {
    console.log(JSON.stringify({ status: "BLOCKED_CAPACITY", command, capacity, attempted: 0 }))
    process.exitCode = 2
    return
  }
  const completed = await completedPartitionMap(clients)
  const symbol = arg("--instrument")?.toUpperCase() ?? null
  const from = arg("--from") ?? null
  const to = arg("--to") ?? null
  const requestedMax = Number(arg("--max-partitions") ?? Number.MAX_SAFE_INTEGER)
  if (!Number.isInteger(requestedMax) || requestedMax <= 0) throw new Error("AGG_TRADES_MAX_PARTITIONS_INVALID")
  const retryRows = command === "retry-failed"
    ? await clients.d3.sql<Array<{ partition_key: string }>>`SELECT partition_key FROM control.population_units WHERE dataset_id='agg-trade' AND current_state IN ('RETRYABLE','FAILED') ORDER BY partition_key`
    : command === "retry-gaps"
      ? await clients.d3.sql<Array<{ partition_key: string }>>`SELECT DISTINCT u.partition_key FROM control.population_units u JOIN control.retry_events r ON r.unit_id=u.unit_id WHERE u.dataset_id='agg-trade' AND r.classification_id LIKE 'GAP_%' ORDER BY u.partition_key`
      : []
  const retryKeys = new Set(retryRows.map((row) => row.partition_key))
  const selected = snapshot.partitions.filter((partition) => !completed[partition.partitionId]
    && (!symbol || partition.providerSymbol === symbol)
    && (!from || partition.sourceDay >= from)
    && (!to || partition.sourceDay <= to)
    && (!(command === "retry-failed" || command === "retry-gaps") || retryKeys.has(partition.partitionId)))
    .slice(0, requestedMax)
  let attempted = 0
  for (const partition of selected) {
    if (await access(stopPath(snapshot.snapshotId)).then(() => true).catch(() => false)) break
    try { await runPartition(snapshot, clients, partition) }
    catch (error) { await releaseFailedPartitionLease(clients); throw error }
    attempted += 1
  }
  console.log(JSON.stringify({ status: attempted === selected.length ? "EXECUTION_BOUNDARY_REACHED" : "STOPPED", command, attempted, selected: selected.length, remaining: snapshot.completePartitionCount - Object.keys(await completedPartitionMap(clients)).length }))
}

async function main() {
  const command = process.argv[2] as Command | undefined
  if (!command || !["enumerate", "canary", "run", "resume", "status", "stop", "retry-failed", "retry-gaps", "reconcile", "validate-samples"].includes(command)) throw new Error("Usage: runD3AggTradesBackfill.ts <enumerate|canary|run|resume|status|stop|retry-failed|retry-gaps|reconcile|validate-samples>")
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d3-agg-trades-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "d3-agg-trades-d3" } })
  try {
    if (command === "enumerate") { await enumerate(clients); return }
    const snapshot = await readSnapshot()
    if (command === "canary") {
      const partition = snapshot.partitions.find((item) => item.providerSymbol === CANARY_SYMBOL && item.sourceDay === CANARY_DAY)
      if (!partition) throw new Error("AGG_TRADES_CANARY_PARTITION_MISSING")
      try { await runPartition(snapshot, clients, partition) }
      catch (error) { await releaseFailedPartitionLease(clients); throw error }
      return
    }
    if (command === "status") { console.log(JSON.stringify(await status(snapshot, clients))); return }
    if (command === "reconcile") { await reconcile(snapshot, clients); return }
    if (command === "validate-samples") { await validateSamples(snapshot, clients); return }
    if (command === "stop") { await mkdir(path.dirname(stopPath(snapshot.snapshotId)), { recursive: true }); await writeFile(stopPath(snapshot.snapshotId), `${now()}\n`, "utf8"); console.log(JSON.stringify({ status: "STOP_REQUESTED" })); return }
    await unlink(stopPath(snapshot.snapshotId)).catch(() => undefined)
    await runPartitions(snapshot, clients, command)
  } finally { await clients.shutdown() }
}

main().catch((error) => { console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" })); process.exitCode = 1 })
