import { createHash } from "node:crypto"
import { mkdir, readFile, statfs, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { extractFirstCsvFromZip } from "@/lib/historical-data/binanceVisionClient"
import { createCanonicalPersistenceAdapter } from "@/lib/data-platform/persistence/postgres"
import type { RawObjectManifest } from "@/lib/data-platform/persistence"
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
  createBinanceVisionOhlcvPartition,
  createD3ToD2CanonicalCommitPort,
  createFilesystemObjectStorage,
  createIntegratedBackfillClientsFromEnvironment,
  createOhlcvExecutionSnapshot,
  createOhlcvPartitionId,
  D3_PHASE3_MANIFEST,
  instrumentForSymbol,
  OHLCV_FINAL_ELIGIBLE_DAY,
  type OhlcvAvailabilityBoundary,
  type OhlcvExecutionPartition,
  type OhlcvExecutionSnapshot,
  type OhlcvPartitionProgress,
  ProductionNormalizerRegistry,
  PRODUCTION_NORMALIZER_VERSION,
} from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"

type Command = "enumerate" | "status" | "run" | "resume" | "stop" | "retry-failed" | "retry-gaps" | "reconcile" | "validate-samples"
type ParsedRow = Readonly<{ openTime: string; closeTime: string; open: string; high: string; low: string; close: string; volume: string; sourceTimestamp: string }>

const SNAPSHOT_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-ohlcv-execution-snapshot.json")
const PROGRESS_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-ohlcv-progress.json")
const DATASET_REGISTRY_ID = "d3-phase3-dataset-registry-v1"
const PROVIDER_REGISTRY_ID = "d3-phase3-binance-archive-provider-v1"
const PROVIDER_CERTIFICATION_ID = "d3-phase3-binance-archive-ohlcv-certification-v1"
const POLICY_ID = "d3-phase3-ohlcv-canary-policy-v1"
const PARSER_VERSION = "binance-vision-ohlcv-csv-v1"
const SCHEMA_VERSION = "1"
const WORKER_PREFIX = "d3-phase3-ohlcv-full-worker"
const CANARY_BYTES = 13_010
const LEASE_MS = 2 * 60 * 60 * 1000
const GLOBAL_CONCURRENCY = 4
const PROVIDER_CONCURRENCY = 2

function isoNow(): string { return new Date().toISOString() }
function arg(name: string): string | null { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? null : null }
function positiveInt(name: string, fallback: number): number { const value = arg(name); if (value === null) return fallback; const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`ARGUMENT_INVALID:${name}`); return parsed }
function stopPath(snapshotId: string): string { return path.join(process.env.D3_BACKFILL_OBJECT_ROOT!, "_control", `${snapshotId.replace(/[^a-zA-Z0-9._-]/g, "_")}.stop`) }
function stream(buffer: Buffer): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { yield buffer } } }

function decimal(value: string, field: string): string {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error(`SOURCE_${field}_INVALID`)
  return value
}

function sourceTime(value: string, field: string): string {
  if (!/^\d+$/.test(value)) throw new Error(`SOURCE_${field}_INVALID`)
  const raw = BigInt(value)
  const numeric = Number(value.length > 13 ? raw / BigInt(1000) : raw)
  if (!Number.isSafeInteger(numeric)) throw new Error(`SOURCE_${field}_UNSAFE`)
  return new Date(numeric).toISOString()
}

export function parseOhlcvCsv(csv: string): { readonly rows: readonly ParsedRow[]; readonly rejected: Readonly<Record<string, number>> } {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  if (lines[0]?.toLowerCase().startsWith("open_time,")) lines.shift()
  const rows: ParsedRow[] = []
  const rejected: Record<string, number> = {}
  for (const line of lines) {
    try {
      const columns = line.split(",")
      if (columns.length < 11) throw new Error("SOURCE_COLUMN_COUNT_INVALID")
      const openTime = sourceTime(columns[0], "OPEN_TIME")
      const closeTime = sourceTime(columns[6], "CLOSE_TIME")
      const openMs = Date.parse(openTime); const closeMs = Date.parse(closeTime)
      if (openMs % 300_000 !== 0 || closeMs !== openMs + 299_999) throw new Error("SOURCE_INTERVAL_BOUNDARY_INVALID")
      const open = decimal(columns[1], "OPEN"); const high = decimal(columns[2], "HIGH"); const low = decimal(columns[3], "LOW"); const close = decimal(columns[4], "CLOSE"); const volume = decimal(columns[5], "VOLUME")
      if (Number(high) < Math.max(Number(open), Number(close)) || Number(low) > Math.min(Number(open), Number(close)) || Number(volume) < 0) throw new Error("SOURCE_OHLCV_SEMANTICS_INVALID")
      rows.push(Object.freeze({ openTime, closeTime, open, high, low, close, volume, sourceTimestamp: columns[0] }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : "SOURCE_ROW_INVALID"
      rejected[reason] = (rejected[reason] ?? 0) + 1
    }
  }
  return Object.freeze({ rows: Object.freeze(rows), rejected: Object.freeze(rejected) })
}

async function download(partition: OhlcvExecutionPartition): Promise<{ readonly status: "AVAILABLE"; readonly buffer: Buffer } | { readonly status: "MISSING" } | { readonly status: "RETRYABLE"; readonly reason: string }> {
  try {
    const response = await fetch(partition.sourceObject, { cache: "no-store", signal: AbortSignal.timeout(60_000), headers: { accept: "application/zip,application/octet-stream,*/*", "user-agent": "QuantTerminal-D3-OHLCV-Backfill/1.0" } })
    if (response.status === 404) return { status: "MISSING" }
    if (response.status === 429 || response.status >= 500) return { status: "RETRYABLE", reason: `HTTP_${response.status}` }
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`)
    return { status: "AVAILABLE", buffer: Buffer.from(await response.arrayBuffer()) }
  } catch (error) {
    return { status: "RETRYABLE", reason: error instanceof Error ? error.message : "NETWORK_FAILURE" }
  }
}

function candidate(partition: OhlcvExecutionPartition, row: ParsedRow, ordinal: number, unitId: string, retrievalAttemptId: string, raw: RawObjectManifest, createdAt: string): Extract<PopulationCandidate, { readonly kind: "OHLCV" }> {
  const sourceObservationId = `${partition.providerId}:${partition.providerSymbol}:${partition.resolution}:${row.openTime}`
  const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, candidateOrdinal: String(ordinal) })
  const payload = Object.freeze({ symbol: partition.providerSymbol, resolution: partition.resolution, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, closeTime: row.closeTime })
  return Object.freeze({ kind: "OHLCV", candidateId, unitId, retrievalAttemptId, rawManifestId: raw.objectId, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, sourceObservationId, sourceObservedAt: row.openTime, effectiveAt: row.openTime, parserVersion: PARSER_VERSION, candidateSchemaVersion: SCHEMA_VERSION, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt })
}

function buildRequest(snapshot: OhlcvExecutionSnapshot, partition: OhlcvExecutionPartition, at: string, intentionalRerunIdentity: string | null = null): { readonly request: PopulationJobRequest; readonly job: PopulationJob } {
  const profile: PopulationJobProfile = Object.freeze({ profileId: "d3-phase3-ohlcv-full-history", profileVersion: "1.0.0", kind: "BACKFILL", requiredDimensions: ["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const, rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "retry.historical-source", retryPolicyVersion: "UNAVAILABLE", watermarkPolicyId: "coverage.ohlcv.partition", watermarkPolicyVersion: "1.0.0" })
  const dimensions = Object.freeze({ venue: partition.venue, subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: partition.resolution, partitionKey: `${partition.providerSymbol}:5m:${partition.utcDay}` })
  const base = { profile, datasetId: partition.datasetId, providerId: partition.providerId, dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: `${snapshot.snapshotId}:${partition.partitionId}`, intentionalRerunIdentity, requestedAt: at, requestedBy: "d3-phase3-ohlcv-full-history" })
  const jobId = createPopulationJobId(request.requestIdentity, request.occurrenceIdentity, request.intentionalRerunIdentity)
  return { request, job: Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt: at, updatedAt: at }) }
}

async function readSnapshot(): Promise<OhlcvExecutionSnapshot> {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8")) as OhlcvExecutionSnapshot
  const { snapshotId, snapshotChecksum, ...content } = snapshot
  if (snapshotId !== `ohlcv-execution:${snapshotChecksum}` || canonicalChecksum(content) !== snapshotChecksum || snapshot.parentManifestId !== D3_PHASE3_MANIFEST.manifestId || snapshot.parentManifestChecksum !== D3_PHASE3_MANIFEST.manifestChecksum) throw new Error("OHLCV_EXECUTION_SNAPSHOT_INVALID")
  return Object.freeze(snapshot)
}

async function discoverBoundary(symbol: string, activationTimestamp: string): Promise<OhlcvAvailabilityBoundary> {
  const prefix = `data/futures/um/daily/klines/${symbol}/5m/`
  const indexUrl = `https://s3-ap-northeast-1.amazonaws.com/data.binance.vision?list-type=2&max-keys=100&prefix=${encodeURIComponent(prefix)}`
  try {
    const response = await fetch(indexUrl, { signal: AbortSignal.timeout(30_000), headers: { "user-agent": "QuantTerminal-D3-OHLCV-Discovery/1.0" } })
    if (response.ok) {
      const xml = await response.text()
      const matches = [...xml.matchAll(new RegExp(`${symbol}-5m-(\\d{4}-\\d{2}-\\d{2})\\.zip<`, "g"))].map((match) => match[1]).sort()
      if (matches[0]) {
        const probe = createBinanceVisionOhlcvPartition({ symbol, resolution: "5m", day: matches[0] })
        const head = await fetch(probe.sourceUrl, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(20_000) })
        if (head.ok) return Object.freeze({ canonicalInstrumentId: instrumentForSymbol(D3_PHASE3_MANIFEST.instruments, symbol).canonicalInstrumentId, providerSymbol: symbol, activationTimestamp, earliestVerifiedSourceDay: matches[0], finalEligibleDay: OHLCV_FINAL_ELIGIBLE_DAY, discoveryMethod: "BINANCE_VISION_S3_PREFIX_AND_HEAD", discoveryEvidence: `${prefix}${symbol}-5m-${matches[0]}.zip; HEAD ${head.status}`, unavailableBefore: `${matches[0]}T00:00:00.000Z` })
      }
    }
  } catch { /* bounded activation-window fallback */ }
  const activationDay = activationTimestamp.slice(0, 10)
  const start = Date.parse(`${activationDay}T00:00:00.000Z`)
  for (let offset = 0; offset < 45; offset += 1) {
    const day = new Date(start + offset * 86_400_000).toISOString().slice(0, 10)
    const probe = createBinanceVisionOhlcvPartition({ symbol, resolution: "5m", day })
    const response = await fetch(probe.sourceUrl, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(20_000) })
    if (response.ok) return Object.freeze({ canonicalInstrumentId: instrumentForSymbol(D3_PHASE3_MANIFEST.instruments, symbol).canonicalInstrumentId, providerSymbol: symbol, activationTimestamp, earliestVerifiedSourceDay: day, finalEligibleDay: OHLCV_FINAL_ELIGIBLE_DAY, discoveryMethod: "ACTIVATION_WINDOW_HEAD", discoveryEvidence: `${symbol}-5m-${day}.zip; HEAD ${response.status}`, unavailableBefore: `${day}T00:00:00.000Z` })
    if (response.status !== 404) throw new Error(`OHLCV_DISCOVERY_FAILED:${symbol}:HTTP_${response.status}`)
  }
  throw new Error(`OHLCV_EARLIEST_AVAILABILITY_UNVERIFIED:${symbol}`)
}

async function completedPartitionMap(d2: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>["d2"], d3: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>["d3"]): Promise<Readonly<Record<string, string>>> {
  const units = await d3.sql<Array<{ partition_key: string; unit_id: string; outcomes: number; coverage: number }>>`SELECT u.partition_key,u.unit_id,(SELECT count(*)::int FROM control.population_outcomes o WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')) outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') coverage FROM control.population_units u WHERE u.dataset_id='ohlcv' AND u.provider_id='binance-public-archive' AND u.current_state='COMPLETED'`
  const facts = await d2.sql<Array<{ symbol: string; utc_day: string; facts: number; lineage: number }>>`SELECT o.symbol,to_char(o.open_time AT TIME ZONE 'UTC','YYYY-MM-DD') AS utc_day,count(*)::int facts,count(*) FILTER (WHERE EXISTS(SELECT 1 FROM repository.lineage_edges e WHERE e.destination_node_id=o.canonical_record_id AND e.destination_node_version=o.record_version::text))::int lineage FROM canonical.ohlcv o WHERE o.provider_id='binance-public-archive' AND o.resolution='5m' GROUP BY o.symbol,to_char(o.open_time AT TIME ZONE 'UTC','YYYY-MM-DD')`
  const factsByKey = new Map(facts.map((row) => [`${row.symbol}:5m:${row.utc_day}`, row]))
  const completed: Record<string, string> = {}
  for (const unit of units) {
    const [symbol, resolution, day] = unit.partition_key.split(":")
    if (resolution !== "5m" || !day || unit.outcomes < 1 || unit.coverage !== 1) continue
    const instrument = instrumentForSymbol(D3_PHASE3_MANIFEST.instruments, symbol)
    const fact = factsByKey.get(unit.partition_key)
    if (fact?.facts === unit.outcomes && fact.lineage === fact.facts) completed[createOhlcvPartitionId(instrument.canonicalInstrumentId, day)] = unit.unit_id
  }
  return Object.freeze(completed)
}

async function enumerate(snapshotClients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<void> {
  const availability: OhlcvAvailabilityBoundary[] = []
  for (let index = 0; index < D3_PHASE3_MANIFEST.instruments.length; index += PROVIDER_CONCURRENCY) {
    const group = D3_PHASE3_MANIFEST.instruments.slice(index, index + PROVIDER_CONCURRENCY)
    availability.push(...await Promise.all(group.map((instrument) => discoverBoundary(instrument.providerSymbol, instrument.activatedAt))))
  }
  const completed = await completedPartitionMap(snapshotClients.d2, snapshotClients.d3)
  const snapshot = createOhlcvExecutionSnapshot({ manifest: D3_PHASE3_MANIFEST, availability, completedByPartitionId: completed, measuredCanaryCompressedBytes: CANARY_BYTES, globalConcurrency: GLOBAL_CONCURRENCY, providerDownloadConcurrency: PROVIDER_CONCURRENCY })
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error
    const existing = await readSnapshot()
    if (existing.snapshotChecksum !== snapshot.snapshotChecksum) throw new Error("OHLCV_EXECUTION_SNAPSHOT_ALREADY_EXISTS_WITH_DIFFERENT_SCOPE")
  })
  console.log(JSON.stringify({ status: "ENUMERATED", snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.snapshotChecksum, instruments: snapshot.instruments, partitions: snapshot.completePartitionCount, alreadyCompleted: snapshot.alreadyCompletedPartitionCount, pending: snapshot.pendingPartitionCount, estimatedRows: snapshot.estimatedRowCount, estimatedBytes: snapshot.estimatedCompressedSourceBytes }))
}

async function acquire(storage: Awaited<ReturnType<typeof createFilesystemObjectStorage>>, partition: OhlcvExecutionPartition, buffer: Buffer): Promise<{ readonly raw: RawObjectManifest; readonly buffer: Buffer }> {
  const contentHash = createHash("sha256").update(buffer).digest("hex")
  const objectStorageKey = `raw/${contentHash.slice(0, 2)}/${contentHash}.zip`
  const reference = await storage.putImmutable({ objectStorageKey, contentHash, mediaType: "application/zip", byteLength: buffer.byteLength, content: stream(buffer) })
  const chunks: Buffer[] = []
  for await (const chunk of storage.read(objectStorageKey)) chunks.push(Buffer.from(chunk))
  const at = isoNow()
  return { buffer: Buffer.concat(chunks), raw: Object.freeze({ objectId: reference.rawObjectId, datasetId: partition.datasetId, providerId: partition.providerId, venue: partition.venue, symbolOrSubject: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, contentHash, sizeBytes: buffer.byteLength, mediaType: "application/zip", compression: "ZIP", retrievedAt: at, providerSnapshotId: PROVIDER_REGISTRY_ID, retentionClass: "ARCHIVE", verificationState: reference.verificationState, objectStorageKey, createdAt: at }) }
}

function pendingProgress(partitionId: string): OhlcvPartitionProgress {
  return Object.freeze({ partitionId, classification: "PENDING", reasonCodes: [], jobId: null, runId: null, unitId: null, rawObjectId: null, downloadedBytes: 0, parsedRows: 0, acceptedCandidates: 0, rejectedCandidates: 0, canonicalFactsCreated: 0, canonicalFactsReused: 0, conflicts: 0, updatedAt: isoNow() })
}

async function processPartition(
  snapshot: OhlcvExecutionSnapshot,
  partition: OhlcvExecutionPartition,
  clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>,
  storage: Awaited<ReturnType<typeof createFilesystemObjectStorage>>,
  workerId: string,
  retryKind: "FAILED" | "GAP" | null = null,
): Promise<OhlcvPartitionProgress> {
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  if (completed[partition.partitionId]) return Object.freeze({ ...pendingProgress(partition.partitionId), classification: "SKIPPED_ALREADY_COMPLETE", unitId: completed[partition.partitionId], reasonCodes: ["AUTHORITATIVE_COMPLETION_RECONCILED"] })
  const d2Adapter = createCanonicalPersistenceAdapter(clients.d2)
  const d3Adapter = createPopulationPostgresAdapter(clients.d3)
  const commitPort = createD3ToD2CanonicalCommitPort(d2Adapter)
  const at = isoNow()
  const retryRows = retryKind ? await clients.d3.sql<Array<{ count: number }>>`SELECT count(*)::int count FROM control.population_jobs WHERE occurrence_identity=${`${snapshot.snapshotId}:${partition.partitionId}`} AND intentional_rerun_identity IS NOT NULL` : []
  const intentionalRerunIdentity = retryKind ? `${retryKind.toLowerCase()}-retry:${partition.partitionId}:${(retryRows[0]?.count ?? 0) + 1}` : null
  const built = buildRequest(snapshot, partition, at, intentionalRerunIdentity)
  const created = await d3Adapter.createJob(built.request)
  if (created.status !== "CREATED") return Object.freeze({ ...pendingProgress(partition.partitionId), classification: "BLOCKED", jobId: created.jobId, reasonCodes: ["EXISTING_NONTERMINAL_OR_UNRECONCILED_JOB"] })
  const run = await d3Adapter.createRun(created.jobId, 1, at)
  const units = expandPopulationUnits(built.job, [{ profileId: built.request.profile.profileId, profileVersion: built.request.profile.profileVersion, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, policyVersionId: POLICY_ID, venue: partition.venue, subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: partition.resolution, partitionKey: `${partition.providerSymbol}:5m:${partition.utcDay}`, requestFingerprint: built.request.requestIdentity, requestParameters: { snapshotId: snapshot.snapshotId, manifestId: snapshot.parentManifestId, partitionId: partition.partitionId, sourceObject: path.basename(partition.sourceObject) }, required: true }], at)
  if (await d3Adapter.expandUnits(units) !== 1) throw new Error(`OHLCV_UNIT_EXPANSION_FAILED:${partition.partitionId}`)
  const lease = await d3Adapter.claimUnit(workerId, run.runId, isoNow(), new Date(Date.now() + LEASE_MS).toISOString())
  if (!lease || lease.unitId !== units[0].unitId) throw new Error(`OHLCV_UNIT_CLAIM_FAILED:${partition.partitionId}`)
  const progress = { ...pendingProgress(partition.partitionId), classification: "ACTIVE" as const, jobId: created.jobId, runId: run.runId, unitId: lease.unitId }
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "RETRIEVING", `ohlcv-retrieving:${partition.partitionId}`, isoNow())
  const retrievalAttemptId = createRetrievalAttemptId(lease.unitId, run.runId, 1)
  const source = await download(partition)
  if (source.status !== "AVAILABLE") {
    const gap = source.status === "MISSING"
    await d3Adapter.appendRetrievalAttempt({ attemptId: retrievalAttemptId, unitId: lease.unitId, runId: run.runId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, requestFingerprint: built.request.requestIdentity, startedAt: at, completedAt: isoNow(), outcome: gap ? "PERMANENT_FAILURE" : "RETRYABLE_FAILURE", statusCode: gap ? 404 : null, retryAfter: null, responseMediaType: null, rawByteCount: null, rawManifestId: null, errorClass: "SOURCE", errorCode: gap ? "GAP_SOURCE_MISSING" : source.reason, retryClassificationId: gap ? null : "SOURCE_RETRYABLE" })
    await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, gap ? "FAILED" : "RETRYABLE", `${gap ? "gap-source-missing" : "source-retryable"}:${partition.partitionId}`, isoNow())
    await d3Adapter.releaseLease(lease.unitId, lease.leaseId, workerId, lease.fencingToken, isoNow(), "FAILED")
    await d3Adapter.completeRun(run.runId, gap ? "FAILED" : "PARTIAL", isoNow()); await d3Adapter.aggregateJob(created.jobId, isoNow())
    return Object.freeze({ ...progress, classification: gap ? "GAP_SOURCE_MISSING" : "FAILED_RETRYABLE", reasonCodes: [gap ? "HTTP_404_AFTER_VERIFIED_AVAILABILITY" : source.reason], updatedAt: isoNow() })
  }
  const acquired = await acquire(storage, partition, source.buffer)
  const rawRegistration = await d2Adapter.registerRawObjectManifest(acquired.raw)
  if (rawRegistration.status === "CONFLICT" || rawRegistration.status === "REJECTED") throw new Error(`OHLCV_RAW_REGISTRATION_FAILED:${rawRegistration.status}`)
  await d3Adapter.appendRetrievalAttempt({ attemptId: retrievalAttemptId, unitId: lease.unitId, runId: run.runId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, requestFingerprint: built.request.requestIdentity, startedAt: at, completedAt: isoNow(), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: "application/zip", rawByteCount: acquired.buffer.byteLength, rawManifestId: acquired.raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null })
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "RAW_PERSISTED", `ohlcv-raw:${partition.partitionId}`, isoNow())
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:raw:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "RAW_BOUNDARY", completedStage: "RAW_PERSISTED", rawManifestId: acquired.raw.objectId, candidateCursor: null, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, workerId)
  const parsed = parseOhlcvCsv(extractFirstCsvFromZip(acquired.buffer))
  if (parsed.rows.length === 0 || Object.keys(parsed.rejected).length > 0) throw new Error(`OHLCV_SOURCE_VALIDATION_FAILED:${partition.partitionId}:${JSON.stringify(parsed.rejected)}`)
  const createdAt = isoNow(); const candidates = parsed.rows.map((row, index) => candidate(partition, row, index, lease.unitId, retrievalAttemptId, acquired.raw, createdAt))
  for (const value of candidates) {
    const persisted = await d3Adapter.persistCandidate(value)
    if (persisted.status === "CONFLICT") throw new Error(`OHLCV_CANDIDATE_CONFLICT:${value.candidateId}`)
    if (persisted.status === "CREATED") await d3Adapter.appendValidation({ validationRunId: `validation:${value.candidateId}`, candidateId: value.candidateId, retrievalAttemptId, layer: "STRUCTURAL", ruleId: "d3-phase3-ohlcv-source-structure", ruleVersion: "1.0.0", outcome: "PASSED", blocking: false, failureRouting: null, policyVersionId: POLICY_ID, diagnostics: { interval: "5m", source: "binance-vision", columns: 11 }, createdAt })
  }
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "CANDIDATES_READY", `ohlcv-candidates:${partition.partitionId}`, isoNow())
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:candidate:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANDIDATE_BOUNDARY", completedStage: "CANDIDATES_READY", rawManifestId: acquired.raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, workerId)
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "PROCESSING", `ohlcv-processing:${partition.partitionId}`, isoNow())
  const normalizer = new ProductionNormalizerRegistry(); const outcomes = []
  let createdFacts = 0; let reusedFacts = 0; let conflicts = 0; let lastSubmission = ""; let lastOutcome = ""
  for (const value of candidates) {
    const command = normalizer.normalize({ candidate: value, datasetRegistrySnapshotId: DATASET_REGISTRY_ID, providerRegistrySnapshotId: PROVIDER_REGISTRY_ID, providerCertificationSnapshotId: PROVIDER_CERTIFICATION_ID, policyVersionId: POLICY_ID, schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: acquired.raw.objectId, rawObject: acquired.raw })
    const submissionId = `submission:${value.candidateId}`; const outcomeId = `outcome:${value.candidateId}`
    await d3Adapter.createSubmission(submissionId, value.candidateId, command.idempotencyKey, isoNow())
    const result = await commitPort.execute(command)
    if (result.status === "SUCCESS") createdFacts += 1
    else if (result.status === "DUPLICATE") reusedFacts += 1
    else if (result.status === "CONFLICT") conflicts += 1
    else throw new Error(`OHLCV_D2_COMMIT_FAILED:${partition.partitionId}:${result.status}`)
    const existingOutcome = await clients.d3.sql`SELECT 1 FROM control.population_outcomes WHERE outcome_id=${outcomeId}`
    if (!existingOutcome.length) outcomes.push(await d3Adapter.recordD2Result({ jobId: created.jobId, runId: run.runId, unitId: lease.unitId, candidateId: value.candidateId, retrievalAttemptId, rawManifestId: acquired.raw.objectId, submissionId, leaseId: lease.leaseId, ownerId: workerId, fencingToken: lease.fencingToken, result, outcomeId, createdAt: isoNow() }))
    lastSubmission = submissionId; lastOutcome = outcomeId
  }
  if (conflicts > 0) throw new Error(`OHLCV_CANONICAL_CONFLICT:${partition.partitionId}:${conflicts}`)
  const allOutcomes = await clients.d3.sql<Array<{ outcome_id: string }>>`SELECT outcome_id FROM control.population_outcomes WHERE unit_id=${lease.unitId} ORDER BY outcome_id`
  const watermark = createWatermarkEligibility({ decisionId: `watermark:${lease.unitId}`, unitId: lease.unitId, datasetId: partition.datasetId, providerId: partition.providerId, dimensions: built.request.dimensions, outcomeIds: allOutcomes.map((outcome) => outcome.outcome_id), requiredUnitPolicyId: "required-ohlcv-full-history", blockingReasons: [], policyVersionId: POLICY_ID, createdAt: isoNow(), outcome: outcomes.at(-1) ?? { kind: "DUPLICATE", outcomeId: lastOutcome, candidateId: candidates.at(-1)!.candidateId, canonicalRecordId: "reconciled", recordVersion: 1, createdAt: isoNow() } })
  const existingWatermark = await clients.d3.sql`SELECT 1 FROM coverage.watermark_eligibility_decisions WHERE decision_id=${watermark.decisionId}`
  if (!existingWatermark.length) await d3Adapter.writeWatermarkDecision(watermark)
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:canonical:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "COMPLETED", rawManifestId: acquired.raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: lastSubmission, lastOutcomeId: lastOutcome, createdAt: isoNow() }, lease.leaseId, workerId)
  await d3Adapter.releaseLease(lease.unitId, lease.leaseId, workerId, lease.fencingToken, isoNow(), "COMPLETED")
  await d3Adapter.completeRun(run.runId, "SUCCEEDED", isoNow()); await d3Adapter.aggregateJob(created.jobId, isoNow())
  const reconciliation = await d3Adapter.reconcileUnit(lease.unitId)
  if (!reconciliation.consistent || !await d2Adapter.verifyLineageAcyclic()) throw new Error(`OHLCV_PARTITION_RECONCILIATION_FAILED:${partition.partitionId}`)
  return Object.freeze({ ...progress, classification: "POPULATED", rawObjectId: acquired.raw.objectId, downloadedBytes: acquired.buffer.byteLength, parsedRows: parsed.rows.length, acceptedCandidates: candidates.length, rejectedCandidates: 0, canonicalFactsCreated: createdFacts, canonicalFactsReused: reusedFacts, conflicts, updatedAt: isoNow() })
}

async function status(snapshot: OhlcvExecutionSnapshot, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>, recent: readonly OhlcvPartitionProgress[] = []): Promise<Record<string, unknown>> {
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  const states = await clients.d3.sql<Array<{ current_state: string; count: number }>>`SELECT current_state::text,count(*)::int count FROM control.population_units WHERE profile_id='d3-phase3-ohlcv-full-history' GROUP BY current_state`
  const totals = await clients.d2.sql<Array<{ facts: number; raw_objects: number; artifact_bytes: number; lineage: number; publication: number }>>`SELECT (SELECT count(*)::int FROM canonical.ohlcv WHERE provider_id='binance-public-archive' AND resolution='5m') facts,(SELECT count(*)::int FROM raw.objects WHERE dataset_id='ohlcv' AND provider_id='binance-public-archive') raw_objects,(SELECT COALESCE(sum(size_bytes),0)::int FROM raw.objects WHERE dataset_id='ohlcv' AND provider_id='binance-public-archive') artifact_bytes,(SELECT count(*)::int FROM repository.lineage_edges e JOIN canonical.ohlcv o ON o.canonical_record_id=e.destination_node_id AND o.record_version::text=e.destination_node_version WHERE o.provider_id='binance-public-archive' AND o.resolution='5m') lineage,(SELECT count(*)::int FROM repository.record_versions rv JOIN canonical.ohlcv o ON o.canonical_record_id=rv.canonical_record_id AND o.record_version=rv.record_version WHERE o.provider_id='binance-public-archive' AND o.resolution='5m' AND rv.current_publication_state='PENDING') publication`
  const d3Totals = await clients.d3.sql<Array<{ retrievals: number; downloaded_bytes: number; candidates: number; submissions: number; outcomes: number; coverage: number; checkpoints: number; retries: number; conflicts: number; active: number }>>`SELECT (SELECT count(*)::int FROM control.retrieval_attempts WHERE provider_id='binance-public-archive') retrievals,(SELECT COALESCE(sum(raw_byte_count),0)::int FROM control.retrieval_attempts WHERE provider_id='binance-public-archive') downloaded_bytes,(SELECT count(*)::int FROM population.candidates WHERE dataset_id='ohlcv' AND provider_id='binance-public-archive') candidates,(SELECT count(*)::int FROM population.canonical_submissions s JOIN population.candidates c ON c.candidate_id=s.candidate_id WHERE c.dataset_id='ohlcv' AND c.provider_id='binance-public-archive') submissions,(SELECT count(*)::int FROM control.population_outcomes o JOIN population.candidates c ON c.candidate_id=o.candidate_id WHERE c.dataset_id='ohlcv' AND c.provider_id='binance-public-archive') outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions WHERE dataset_id='ohlcv' AND provider_id='binance-public-archive') coverage,(SELECT count(*)::int FROM control.population_checkpoints p JOIN control.population_units u ON u.unit_id=p.unit_id WHERE u.dataset_id='ohlcv' AND u.provider_id='binance-public-archive') checkpoints,(SELECT count(*)::int FROM control.retry_events r JOIN control.population_units u ON u.unit_id=r.unit_id WHERE u.dataset_id='ohlcv' AND u.provider_id='binance-public-archive') retries,(SELECT count(*)::int FROM population.candidate_conflicts) conflicts,(SELECT count(*)::int FROM control.population_leases WHERE released_at IS NULL AND expires_at>now()) active`
  const timing = await clients.d3.sql<Array<{ started_at: Date | null; completed_at: Date | null; completed: number }>>`SELECT min(r.started_at) started_at,max(r.completed_at) completed_at,count(*) FILTER (WHERE u.current_state='COMPLETED')::int completed FROM control.population_runs r JOIN control.population_jobs j ON j.job_id=r.job_id JOIN control.population_units u ON u.job_id=j.job_id WHERE j.profile_id='d3-phase3-ohlcv-full-history'`
  const failures = await clients.d3.sql<Array<{ gaps: number; retryable: number; exhausted: number; quarantined: number }>>`SELECT count(DISTINCT unit_id) FILTER (WHERE event_id LIKE 'gap-source-missing:%')::int gaps,count(DISTINCT unit_id) FILTER (WHERE event_id LIKE 'source-retryable:%')::int retryable,(SELECT count(*)::int FROM control.population_units WHERE profile_id='d3-phase3-ohlcv-full-history' AND current_state='FAILED') exhausted,(SELECT count(*)::int FROM control.population_units WHERE profile_id='d3-phase3-ohlcv-full-history' AND current_state='QUARANTINED') quarantined FROM control.population_unit_events`
  const [d2RelationSizes, d3RelationSizes] = await Promise.all([
    clients.d2.sql<Array<{ bytes: string }>>`SELECT sum(pg_total_relation_size(format('%I.%I',schemaname,tablename)::regclass))::text bytes FROM pg_tables WHERE (schemaname,tablename) IN (('canonical','ohlcv'),('repository','envelopes'),('repository','record_versions'),('repository','publication_decisions'),('repository','lineage_edges'),('control','canonical_commits'),('control','outbox'),('raw','objects'))`,
    clients.d3.sql<Array<{ bytes: string }>>`SELECT sum(pg_total_relation_size(format('%I.%I',schemaname,tablename)::regclass))::text bytes FROM pg_tables WHERE (schemaname,tablename) IN (('population','candidates'),('population','canonical_submissions'),('control','population_outcomes'),('quality','candidate_validation_results'))`,
  ])
  const filesystem = await statfs(process.env.D3_BACKFILL_OBJECT_ROOT!)
  const measuredRelationBytes = Number(d2RelationSizes[0]?.bytes ?? 0) + Number(d3RelationSizes[0]?.bytes ?? 0)
  const estimatedPostgresBytes = totals[0].facts > 0 ? Math.ceil(measuredRelationBytes / totals[0].facts * snapshot.estimatedCanonicalFactCount) : null
  const complete = Object.keys(completed).length
  const elapsedMs = timing[0]?.started_at ? Math.max(1, Date.now() - timing[0].started_at.getTime()) : 0
  const partitionsPerHour = elapsedMs > 0 ? timing[0].completed / (elapsedMs / 3_600_000) : 0
  const estimatedRemainingMs = partitionsPerHour > 0 ? (snapshot.completePartitionCount - complete) / partitionsPerHour * 3_600_000 : null
  const perInstrument = snapshot.instruments.map((instrument) => { const partitions = snapshot.partitions.filter((partition) => partition.providerSymbol === instrument.providerSymbol); const completeForInstrument = partitions.filter((partition) => completed[partition.partitionId]).length; return { providerSymbol: instrument.providerSymbol, earliestSourceDay: instrument.earliestVerifiedSourceDay, finalEligibleDay: instrument.finalEligibleDay, expectedPartitions: partitions.length, completedPartitions: completeForInstrument, remainingPartitions: partitions.length - completeForInstrument } })
  const progress = { schemaVersion: "1.0.0", snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.snapshotChecksum, generatedAt: isoNow(), totalPartitions: snapshot.completePartitionCount, completePartitions: complete, pendingPartitions: snapshot.completePartitionCount - complete, activeLeases: d3Totals[0].active, classifications: { populated: Math.max(0, complete - snapshot.alreadyCompletedPartitionCount), skippedAlreadyComplete: snapshot.alreadyCompletedPartitionCount, emptyConfirmed: 0, sourceUnavailable: 0, notApplicable: 0, gaps: failures[0].gaps, retryableFailures: failures[0].retryable, exhaustedFailures: failures[0].exhausted, conflicts: d3Totals[0].conflicts, blocked: failures[0].quarantined }, unitStates: Object.fromEntries(states.map((state) => [state.current_state, state.count])), perInstrument, throughput: { startedAt: timing[0]?.started_at?.toISOString() ?? null, lastCompletedAt: timing[0]?.completed_at?.toISOString() ?? null, elapsedMs, completedFullHistoryPartitions: timing[0]?.completed ?? 0, partitionsPerHour, estimatedRemainingMs }, capacity: { availableArtifactBytes: filesystem.bavail * filesystem.bsize, estimatedCompressedSourceBytes: snapshot.estimatedCompressedSourceBytes, measuredCanaryRelationBytes: measuredRelationBytes, estimatedPostgresBytes }, persisted: { ...totals[0], ...d3Totals[0] }, recent }
  await writeFile(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`, "utf8")
  return progress
}

async function run(snapshot: OhlcvExecutionSnapshot, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>, command: Command): Promise<void> {
  const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false })
  const maxPartitions = positiveInt("--max-partitions", 4)
  const symbol = arg("--instrument")?.toUpperCase() ?? null
  const from = arg("--from"); const to = arg("--to")
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  let selected = snapshot.partitions.filter((partition) => !completed[partition.partitionId] && (!symbol || partition.providerSymbol === symbol) && (!from || partition.utcDay >= from) && (!to || partition.utcDay <= to))
  if (command === "retry-failed" || command === "retry-gaps") {
    const failed = command === "retry-gaps"
      ? await clients.d3.sql<Array<{ partition_key: string }>>`SELECT DISTINCT u.partition_key FROM control.population_units u JOIN control.population_unit_events e ON e.unit_id=u.unit_id WHERE u.profile_id='d3-phase3-ohlcv-full-history' AND e.event_id LIKE 'gap-source-missing:%'`
      : await clients.d3.sql<Array<{ partition_key: string }>>`SELECT DISTINCT u.partition_key FROM control.population_units u WHERE u.profile_id='d3-phase3-ohlcv-full-history' AND u.current_state IN ('FAILED','QUARANTINED') AND NOT EXISTS(SELECT 1 FROM control.population_unit_events e WHERE e.unit_id=u.unit_id AND e.event_id LIKE 'gap-source-missing:%')`
    const keys = new Set(failed.map((row) => row.partition_key))
    selected = selected.filter((partition) => keys.has(`${partition.providerSymbol}:5m:${partition.utcDay}`))
  }
  selected = selected.slice(0, maxPartitions)
  if (selected.length === 0) { console.log(JSON.stringify({ status: "NO_ELIGIBLE_PARTITIONS", progress: await status(snapshot, clients) })); return }
  await unlink(stopPath(snapshot.snapshotId)).catch(() => undefined)
  const results: OhlcvPartitionProgress[] = []
  let next = 0
  const workers = Array.from({ length: Math.min(PROVIDER_CONCURRENCY, selected.length) }, (_, index) => (async () => {
    for (;;) {
      if (await readFile(stopPath(snapshot.snapshotId), "utf8").then(() => true).catch(() => false)) return
      const partition = selected[next++]
      if (!partition) return
      try { results.push(await processPartition(snapshot, partition, clients, storage, `${WORKER_PREFIX}-${index + 1}`, command === "retry-gaps" ? "GAP" : command === "retry-failed" ? "FAILED" : null)) }
      catch (error) { results.push(Object.freeze({ ...pendingProgress(partition.partitionId), classification: "BLOCKED", reasonCodes: [error instanceof Error ? error.message : "UNKNOWN"], updatedAt: isoNow() })) }
    }
  })())
  await Promise.all(workers)
  const progress = await status(snapshot, clients, results.sort((a, b) => a.partitionId.localeCompare(b.partitionId)))
  console.log(JSON.stringify({ status: "SAFE_BOUNDARY_REACHED", attempted: results.length, results, progress }))
}

async function reconcile(snapshot: OhlcvExecutionSnapshot, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<void> {
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  const invalid = await clients.d3.sql<Array<{ partition_key: string }>>`SELECT u.partition_key FROM control.population_units u WHERE u.dataset_id='ohlcv' AND u.provider_id='binance-public-archive' AND u.current_state='COMPLETED' AND (NOT EXISTS(SELECT 1 FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') OR NOT EXISTS(SELECT 1 FROM control.population_checkpoints p WHERE p.unit_id=u.unit_id AND p.checkpoint_type='CANONICAL_BOUNDARY')) ORDER BY u.partition_key`
  const active = await clients.d3.sql<Array<{ unit_id: string }>>`SELECT unit_id FROM control.population_leases WHERE released_at IS NULL AND expires_at>now()`
  const result = { consistent: invalid.length === 0, reasonCodes: invalid.length ? ["COMPLETED_UNIT_MISSING_COVERAGE_OR_CHECKPOINT"] : [], affectedPartitions: invalid.map((row) => row.partition_key), completePartitions: Object.keys(completed).length, incompletePartitions: snapshot.completePartitionCount - Object.keys(completed).length, activeLeases: active.length, executionComplete: Object.keys(completed).length === snapshot.completePartitionCount }
  console.log(JSON.stringify(result))
}

async function validateSamples(snapshot: OhlcvExecutionSnapshot, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<void> {
  const results = []
  for (const instrument of snapshot.instruments) {
    const first = Date.parse(`${instrument.earliestVerifiedSourceDay}T00:00:00.000Z`)
    const last = Date.parse(`${instrument.finalEligibleDay}T00:00:00.000Z`)
    const middle = new Date(first + Math.floor((last - first) / (2 * 86_400_000)) * 86_400_000).toISOString().slice(0, 10)
    for (const [range, day] of [["EARLIEST", instrument.earliestVerifiedSourceDay], ["MIDDLE", middle], ["LATEST", instrument.finalEligibleDay]] as const) {
      const partition = snapshot.partitions.find((item) => item.providerSymbol === instrument.providerSymbol && item.utcDay === day)
      if (!partition) throw new Error(`OHLCV_SAMPLE_PARTITION_MISSING:${instrument.providerSymbol}:${day}`)
      const source = await download(partition)
      if (source.status !== "AVAILABLE") throw new Error(`OHLCV_SAMPLE_SOURCE_UNAVAILABLE:${partition.partitionId}:${source.status}`)
      const contentHash = createHash("sha256").update(source.buffer).digest("hex")
      const parsed = parseOhlcvCsv(extractFirstCsvFromZip(source.buffer))
      const indexes = [0, Math.floor(parsed.rows.length / 2), parsed.rows.length - 1]
      let matched = 0
      for (const index of indexes) {
        const row = parsed.rows[index]
        const canonical = await clients.d2.sql<Array<{ open_time: Date; close_time: Date; open: string; high: string; low: string; close: string; volume: string; canonical_record_id: string; record_version: number; raw_object_id: string; content_hash: string; lineage: number }>>`SELECT o.open_time,o.close_time,o.open::text,o.high::text,o.low::text,o.close::text,o.volume::text,o.canonical_record_id,o.record_version,r.object_id raw_object_id,r.content_hash,(SELECT count(*)::int FROM repository.lineage_edges le WHERE le.destination_node_id=o.canonical_record_id AND le.destination_node_version=o.record_version::text) lineage FROM canonical.ohlcv o JOIN repository.lineage_edges e ON e.destination_node_id=o.canonical_record_id AND e.destination_node_version=o.record_version::text JOIN raw.objects r ON r.object_id=e.source_node_id WHERE o.symbol=${instrument.providerSymbol} AND o.resolution='5m' AND o.open_time=${row.openTime} LIMIT 1`
        if (!canonical[0]) continue
        const candidateId = createCandidateId({ rawManifestId: canonical[0].raw_object_id, sourceObservationId: `${partition.providerId}:${partition.providerSymbol}:${partition.resolution}:${row.openTime}`, parserVersion: PARSER_VERSION, candidateOrdinal: String(index) })
        const candidateExists = await clients.d3.sql`SELECT 1 FROM population.candidates WHERE candidate_id=${candidateId}`
        if (canonical[0].open_time.toISOString() === row.openTime && canonical[0].close_time.toISOString() === row.closeTime && canonical[0].open === row.open && canonical[0].high === row.high && canonical[0].low === row.low && canonical[0].close === row.close && canonical[0].volume === row.volume && canonical[0].content_hash === contentHash && canonical[0].lineage === 1 && candidateExists.length === 1) matched += 1
      }
      results.push({ providerSymbol: instrument.providerSymbol, range, day, sourceChecksum: contentHash, parsedRows: parsed.rows.length, samplesChecked: indexes.length, samplesMatched: matched, passed: matched === indexes.length })
    }
  }
  console.log(JSON.stringify({ status: results.every((result) => result.passed) ? "PASS" : "FAIL", results }))
}

async function main() {
  const command = process.argv[2] as Command | undefined
  if (!command || !["enumerate", "status", "run", "resume", "stop", "retry-failed", "retry-gaps", "reconcile", "validate-samples"].includes(command)) throw new Error("Usage: runD3OhlcvBackfill.ts <enumerate|status|run|resume|stop|retry-failed|retry-gaps|reconcile|validate-samples>")
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 4, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d3-ohlcv-full-history-d2" }, d3: { roleIntent: "WORKER", maxConnections: 4, applicationName: "d3-ohlcv-full-history-d3" } })
  try {
    if (command === "enumerate") { await enumerate(clients); return }
    const snapshot = await readSnapshot()
    if (command === "stop") { await mkdir(path.dirname(stopPath(snapshot.snapshotId)), { recursive: true }); await writeFile(stopPath(snapshot.snapshotId), `${isoNow()}\n`, { encoding: "utf8", flag: "w" }); console.log(JSON.stringify({ status: "STOP_REQUESTED", boundary: "AFTER_CURRENT_PARTITIONS" })); return }
    if (command === "status") { console.log(JSON.stringify(await status(snapshot, clients))); return }
    if (command === "reconcile") { await reconcile(snapshot, clients); return }
    if (command === "validate-samples") { await validateSamples(snapshot, clients); return }
    await run(snapshot, clients, command)
  } finally { await clients.shutdown() }
}

main().catch((error) => { console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" })); process.exitCode = 1 })
