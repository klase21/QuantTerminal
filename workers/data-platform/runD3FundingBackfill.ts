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
  createBinanceVisionFundingPartition,
  createBinanceOfficialFundingTailPartition,
  createD3ToD2CanonicalCommitPort,
  createFilesystemObjectStorage,
  createIntegratedBackfillClientsFromEnvironment,
  createFundingExecutionSnapshot,
  createFundingPartitionId,
  D3_PHASE3_MANIFEST,
  instrumentForSymbol,
  FUNDING_ARCHIVE_FINAL_MONTH,
  FUNDING_FROZEN_CUTOFF,
  type FundingAvailabilityBoundary,
  type FundingExecutionPartition,
  type FundingExecutionSnapshot,
  type FundingPartitionProgress,
  ProductionNormalizerRegistry,
  PRODUCTION_NORMALIZER_VERSION,
} from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"

type Command = "enumerate" | "status" | "run" | "resume" | "stop" | "retry-failed" | "retry-gaps" | "reconcile" | "validate-samples"
type ParsedRow = Readonly<{ fundingTime: string; fundingRate: string; fundingIntervalHours: number; sourceTimestamp: string }>

const SNAPSHOT_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-funding-execution-snapshot.json")
const PROGRESS_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-funding-progress.json")
const DATASET_REGISTRY_ID = "d3-phase3-funding-dataset-registry-v1"
const POLICY_ID = "d3-phase3-funding-policy-v1"
const PARSER_VERSION = "binance-vision-funding-csv-v1"
const SCHEMA_VERSION = "1"
const WORKER_PREFIX = "d3-phase3-funding-full-worker"
const CANARY_BYTES = 825
const MEASURED_ARCHIVE_BYTES = 399_061
const LEASE_MS = 2 * 60 * 60 * 1000
const PROVIDER_CONCURRENCY = 1

function isoNow(): string { return new Date().toISOString() }
function arg(name: string): string | null { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? null : null }
function positiveInt(name: string, fallback: number): number { const value = arg(name); if (value === null) return fallback; const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`ARGUMENT_INVALID:${name}`); return parsed }
function stopPath(snapshotId: string): string { return path.join(process.env.D3_BACKFILL_OBJECT_ROOT!, "_control", `${snapshotId.replace(/[^a-zA-Z0-9._-]/g, "_")}.stop`) }
function stream(buffer: Buffer): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { yield buffer } } }
function providerRegistryId(partition: FundingExecutionPartition): string { return `d3-phase3-${partition.providerId}-provider-v1` }
function providerCertificationId(partition: FundingExecutionPartition): string { return `d3-phase3-${partition.providerId}-funding-certification-v1` }

function decimal(value: string, field: string): string {
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return value
  const match = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(value)
  if (!match) throw new Error(`SOURCE_${field}_INVALID`)
  const sign = match[1]
  const digits = `${match[2]}${match[3] ?? ""}`
  const decimalIndex = match[2].length + Number(match[4])
  const expanded = decimalIndex <= 0 ? `0.${"0".repeat(-decimalIndex)}${digits}` : decimalIndex >= digits.length ? `${digits}${"0".repeat(decimalIndex - digits.length)}` : `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`
  const normalized = expanded.includes(".") ? expanded.replace(/0+$/, "").replace(/\.$/, "") : expanded
  return `${sign}${normalized}`
}

function sourceTime(value: string, field: string): string {
  if (!/^\d+$/.test(value)) throw new Error(`SOURCE_${field}_INVALID`)
  const raw = BigInt(value)
  const numeric = Number(value.length > 13 ? raw / BigInt(1000) : raw)
  if (!Number.isSafeInteger(numeric)) throw new Error(`SOURCE_${field}_UNSAFE`)
  return new Date(numeric).toISOString()
}

export function parseFundingCsv(csv: string): { readonly rows: readonly ParsedRow[]; readonly rejected: Readonly<Record<string, number>> } {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  if (lines.shift() !== "calc_time,funding_interval_hours,last_funding_rate") throw new Error("SOURCE_FUNDING_SCHEMA_UNSUPPORTED")
  const rows: ParsedRow[] = []
  const rejected: Record<string, number> = {}
  for (const line of lines) {
    try {
      const columns = line.split(",")
      if (columns.length !== 3) throw new Error("SOURCE_COLUMN_COUNT_INVALID")
      const fundingTime = sourceTime(columns[0], "FUNDING_TIME")
      const fundingIntervalHours = Number(columns[1])
      if (!Number.isInteger(fundingIntervalHours) || fundingIntervalHours <= 0) throw new Error("SOURCE_FUNDING_INTERVAL_INVALID")
      rows.push(Object.freeze({ fundingTime, fundingIntervalHours, fundingRate: decimal(columns[2], "FUNDING_RATE"), sourceTimestamp: columns[0] }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : "SOURCE_ROW_INVALID"
      rejected[reason] = (rejected[reason] ?? 0) + 1
    }
  }
  return Object.freeze({ rows: Object.freeze(rows), rejected: Object.freeze(rejected) })
}

export function parseFundingRestJson(json: string, expectedSymbol: string): { readonly rows: readonly ParsedRow[]; readonly rejected: Readonly<Record<string, number>> } {
  const value: unknown = JSON.parse(json)
  if (!Array.isArray(value)) throw new Error("SOURCE_FUNDING_REST_SCHEMA_UNSUPPORTED")
  const rows: ParsedRow[] = []
  const rejected: Record<string, number> = {}
  for (const item of value) {
    try {
      if (!item || typeof item !== "object") throw new Error("SOURCE_ROW_INVALID")
      const source = item as Record<string, unknown>
      if (source.symbol !== expectedSymbol || !Number.isSafeInteger(source.fundingTime) || typeof source.fundingRate !== "string") throw new Error("SOURCE_FUNDING_REST_ROW_INVALID")
      const sourceTimestamp = String(source.fundingTime)
      rows.push(Object.freeze({ fundingTime: sourceTime(sourceTimestamp, "FUNDING_TIME"), fundingIntervalHours: 8, fundingRate: decimal(source.fundingRate, "FUNDING_RATE"), sourceTimestamp }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : "SOURCE_ROW_INVALID"
      rejected[reason] = (rejected[reason] ?? 0) + 1
    }
  }
  return Object.freeze({ rows: Object.freeze(rows), rejected: Object.freeze(rejected) })
}

async function download(partition: FundingExecutionPartition): Promise<{ readonly status: "AVAILABLE"; readonly buffer: Buffer } | { readonly status: "MISSING" } | { readonly status: "RETRYABLE"; readonly reason: string }> {
  try {
    const response = await fetch(partition.sourceObject, { cache: "no-store", signal: AbortSignal.timeout(60_000), headers: { accept: "application/zip,application/octet-stream,*/*", "user-agent": "QuantTerminal-D3-FUNDING-Backfill/1.0" } })
    if (response.status === 404) return { status: "MISSING" }
    if (response.status === 429 || response.status >= 500) return { status: "RETRYABLE", reason: `HTTP_${response.status}` }
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`)
    return { status: "AVAILABLE", buffer: Buffer.from(await response.arrayBuffer()) }
  } catch (error) {
    return { status: "RETRYABLE", reason: error instanceof Error ? error.message : "NETWORK_FAILURE" }
  }
}

function candidate(partition: FundingExecutionPartition, row: ParsedRow, ordinal: number, unitId: string, retrievalAttemptId: string, raw: RawObjectManifest, createdAt: string): Extract<PopulationCandidate, { readonly kind: "FUNDING" }> {
  const sourceObservationId = `${partition.providerId}:${partition.providerSymbol}:${partition.cadence}:${row.fundingTime}`
  const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, candidateOrdinal: String(ordinal) })
  const payload = Object.freeze({ symbol: partition.providerSymbol, canonicalInstrumentId: partition.canonicalInstrumentId, marketType: partition.marketType, fundingRate: row.fundingRate, fundingTime: row.fundingTime, fundingIntervalHours: row.fundingIntervalHours })
  return Object.freeze({ kind: "FUNDING", candidateId, unitId, retrievalAttemptId, rawManifestId: raw.objectId, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: providerRegistryId(partition), sourceObservationId, sourceObservedAt: row.fundingTime, effectiveAt: row.fundingTime, parserVersion: PARSER_VERSION, candidateSchemaVersion: SCHEMA_VERSION, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt })
}

function buildRequest(snapshot: FundingExecutionSnapshot, partition: FundingExecutionPartition, at: string, intentionalRerunIdentity: string | null = null): { readonly request: PopulationJobRequest; readonly job: PopulationJob } {
  const profile: PopulationJobProfile = Object.freeze({ profileId: "d3-phase3-funding-full-history", profileVersion: "1.0.0", kind: "BACKFILL", requiredDimensions: ["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const, rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "retry.historical-source", retryPolicyVersion: "UNAVAILABLE", watermarkPolicyId: "coverage.funding.partition", watermarkPolicyVersion: "1.0.0" })
  const dimensions = Object.freeze({ venue: partition.venue, subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: partition.cadence, partitionKey: partition.partitionId })
  const base = { profile, datasetId: partition.datasetId, providerId: partition.providerId, dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: `${snapshot.snapshotId}:${partition.partitionId}`, intentionalRerunIdentity, requestedAt: at, requestedBy: "d3-phase3-funding-full-history" })
  const jobId = createPopulationJobId(request.requestIdentity, request.occurrenceIdentity, request.intentionalRerunIdentity)
  return { request, job: Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt: at, updatedAt: at }) }
}

async function readSnapshot(): Promise<FundingExecutionSnapshot> {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8")) as FundingExecutionSnapshot
  const { snapshotId, snapshotChecksum, ...content } = snapshot
  if (snapshotId !== `funding-execution:${snapshotChecksum}` || canonicalChecksum(content) !== snapshotChecksum || snapshot.parentManifestId !== D3_PHASE3_MANIFEST.manifestId || snapshot.parentManifestChecksum !== D3_PHASE3_MANIFEST.manifestChecksum) throw new Error("FUNDING_EXECUTION_SNAPSHOT_INVALID")
  return Object.freeze(snapshot)
}

async function discoverBoundary(symbol: string, activationTimestamp: string): Promise<FundingAvailabilityBoundary> {
  const prefix = `data/futures/um/monthly/fundingRate/${symbol}/`
  const indexUrl = `https://s3-ap-northeast-1.amazonaws.com/data.binance.vision?list-type=2&prefix=${encodeURIComponent(prefix)}`
  const response = await fetch(indexUrl, { signal: AbortSignal.timeout(30_000), headers: { "user-agent": "QuantTerminal-D3-Funding-Discovery/1.0" } })
  if (!response.ok) throw new Error(`FUNDING_DISCOVERY_FAILED:${symbol}:HTTP_${response.status}`)
  const xml = await response.text()
  const months = [...xml.matchAll(new RegExp(`${symbol}-fundingRate-(\\d{4}-\\d{2})\\.zip<`, "g"))].map((match) => match[1]).sort()
  if (!months[0] || months.at(-1) !== FUNDING_ARCHIVE_FINAL_MONTH) throw new Error(`FUNDING_ARCHIVE_RANGE_UNVERIFIED:${symbol}`)
  const firstPartition = createBinanceVisionFundingPartition({ symbol, month: months[0] })
  const firstResponse = await fetch(firstPartition.sourceUrl, { cache: "no-store", signal: AbortSignal.timeout(30_000) })
  if (!firstResponse.ok) throw new Error(`FUNDING_EARLIEST_ARCHIVE_UNAVAILABLE:${symbol}:HTTP_${firstResponse.status}`)
  const firstCsv = extractFirstCsvFromZip(Buffer.from(await firstResponse.arrayBuffer()))
  const firstRows = parseFundingCsv(firstCsv).rows
  if (!firstRows[0]) throw new Error(`FUNDING_EARLIEST_ARCHIVE_EMPTY:${symbol}`)
  const tail = createBinanceOfficialFundingTailPartition({ symbol, windowStart: "2026-07-01T00:00:00.000Z", windowEnd: FUNDING_FROZEN_CUTOFF })
  const tailResponse = await fetch(tail.sourceUrl, { cache: "no-store", signal: AbortSignal.timeout(30_000) })
  if (!tailResponse.ok) throw new Error(`FUNDING_REST_TAIL_UNAVAILABLE:${symbol}:HTTP_${tailResponse.status}`)
  const tailRows = parseFundingRestJson(await tailResponse.text(), symbol).rows
  const final = tailRows.at(-1)
  if (!final || final.fundingTime >= FUNDING_FROZEN_CUTOFF) throw new Error(`FUNDING_REST_TAIL_INVALID:${symbol}`)
  const earliestEligibleEventTime = new Date(Math.max(Date.parse(firstRows[0].fundingTime), Date.parse(activationTimestamp))).toISOString()
  return Object.freeze({ canonicalInstrumentId: instrumentForSymbol(D3_PHASE3_MANIFEST.instruments, symbol).canonicalInstrumentId, providerSymbol: symbol, activationTimestamp, earliestVerifiedArchiveMonth: months[0], latestVerifiedArchiveMonth: FUNDING_ARCHIVE_FINAL_MONTH, earliestVerifiedEventTime: earliestEligibleEventTime, finalEligibleEventTime: final.fundingTime, discoveryMethod: "BINANCE_VISION_S3_PREFIX_AND_REST_QUERY", discoveryEvidence: `${prefix}${symbol}-fundingRate-${months[0]}.zip through ${FUNDING_ARCHIVE_FINAL_MONTH}; REST ${tailRows.length} finalized tail events; activation floor enforced`, unavailableBefore: earliestEligibleEventTime })
}

async function completedPartitionMap(d2: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>["d2"], d3: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>["d3"]): Promise<Readonly<Record<string, string>>> {
  const units = await d3.sql<Array<{ partition_key: string; unit_id: string; outcomes: number; coverage: number }>>`SELECT u.partition_key,u.unit_id,(SELECT count(*)::int FROM control.population_outcomes o WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')) outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') coverage FROM control.population_units u WHERE u.dataset_id='funding' AND u.current_state='COMPLETED'`
  const completed: Record<string, string> = {}
  for (const unit of units) {
    if (!unit.partition_key.startsWith("funding:") || unit.outcomes < 1 || unit.coverage !== 1) continue
    const outcomes = await d3.sql<Array<{ canonical_record_id: string; record_version: number }>>`SELECT s.canonical_record_id,s.record_version FROM population.canonical_submissions s JOIN population.candidates c ON c.candidate_id=s.candidate_id WHERE c.unit_id=${unit.unit_id} AND s.result_status IN ('SUCCESS','DUPLICATE')`
    let verified = outcomes.length === unit.outcomes
    for (const outcome of outcomes) {
      const facts = await d2.sql<Array<{ facts: number; lineage: number }>>`SELECT count(*)::int facts,count(*) FILTER (WHERE EXISTS(SELECT 1 FROM repository.lineage_edges e WHERE e.destination_node_id=f.canonical_record_id AND e.destination_node_version=f.record_version::text))::int lineage FROM canonical.funding f WHERE f.canonical_record_id=${outcome.canonical_record_id} AND f.record_version=${outcome.record_version}`
      if (facts[0]?.facts !== 1 || facts[0].lineage !== 1) { verified = false; break }
    }
    if (verified) completed[unit.partition_key] = unit.unit_id
  }
  return Object.freeze(completed)
}

async function enumerate(snapshotClients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<void> {
  const availability: FundingAvailabilityBoundary[] = []
  for (let index = 0; index < D3_PHASE3_MANIFEST.instruments.length; index += PROVIDER_CONCURRENCY) {
    const group = D3_PHASE3_MANIFEST.instruments.slice(index, index + PROVIDER_CONCURRENCY)
    availability.push(...await Promise.all(group.map((instrument) => discoverBoundary(instrument.providerSymbol, instrument.activatedAt))))
  }
  const completed = await completedPartitionMap(snapshotClients.d2, snapshotClients.d3)
  const snapshot = createFundingExecutionSnapshot({ manifest: D3_PHASE3_MANIFEST, availability, completedByPartitionId: completed, measuredCanaryCompressedBytes: CANARY_BYTES, measuredArchiveBytes: MEASURED_ARCHIVE_BYTES })
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error
    const existing = await readSnapshot()
    if (existing.snapshotChecksum !== snapshot.snapshotChecksum) throw new Error("FUNDING_EXECUTION_SNAPSHOT_ALREADY_EXISTS_WITH_DIFFERENT_SCOPE")
  })
  console.log(JSON.stringify({ status: "ENUMERATED", snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.snapshotChecksum, instruments: snapshot.instruments, partitions: snapshot.completePartitionCount, archivePartitions: snapshot.archivePartitionCount, restTailPartitions: snapshot.restTailPartitionCount, alreadyCompleted: snapshot.alreadyCompletedPartitionCount, pending: snapshot.pendingPartitionCount, estimatedEvents: snapshot.estimatedEventCount, estimatedBytes: snapshot.estimatedSourceBytes }))
}

async function acquire(storage: Awaited<ReturnType<typeof createFilesystemObjectStorage>>, partition: FundingExecutionPartition, buffer: Buffer): Promise<{ readonly raw: RawObjectManifest; readonly buffer: Buffer }> {
  const contentHash = createHash("sha256").update(buffer).digest("hex")
  const extension = partition.sourceKind === "BINANCE_VISION_MONTHLY" ? "zip" : "json"
  const mediaType = partition.sourceKind === "BINANCE_VISION_MONTHLY" ? "application/zip" : "application/json"
  const compression = partition.sourceKind === "BINANCE_VISION_MONTHLY" ? "ZIP" as const : "NONE" as const
  const objectStorageKey = `raw/${contentHash.slice(0, 2)}/${contentHash}.${extension}`
  const reference = await storage.putImmutable({ objectStorageKey, contentHash, mediaType, byteLength: buffer.byteLength, content: stream(buffer) })
  const chunks: Buffer[] = []
  for await (const chunk of storage.read(objectStorageKey)) chunks.push(Buffer.from(chunk))
  const at = isoNow()
  return { buffer: Buffer.concat(chunks), raw: Object.freeze({ objectId: reference.rawObjectId, datasetId: partition.datasetId, providerId: partition.providerId, venue: partition.venue, symbolOrSubject: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, contentHash, sizeBytes: buffer.byteLength, mediaType, compression, retrievedAt: at, providerSnapshotId: providerRegistryId(partition), retentionClass: "ARCHIVE", verificationState: reference.verificationState, objectStorageKey, createdAt: at }) }
}

async function ensureGovernance(partition: FundingExecutionPartition, d2Adapter: ReturnType<typeof createCanonicalPersistenceAdapter>): Promise<void> {
  const effectiveAt = "2026-07-12T00:00:00.000Z"
  const sourceScope = partition.sourceKind === "BINANCE_VISION_MONTHLY" ? "BINANCE_VISION_MONTHLY_FUNDING" : "BINANCE_OFFICIAL_REST_FUNDING_TAIL"
  const results = await Promise.all([
    d2Adapter.registerRegistrySnapshot({ snapshotId: DATASET_REGISTRY_ID, registryVersion: "1.0.0", contentChecksum: canonicalChecksum({ datasetId: "funding", cadence: "EVENT_8H", canonicalFields: "instrument,market,eventTime,rate,interval" }), canonicalContent: { datasetId: "funding", cadence: "EVENT_8H", canonicalFields: "instrument,market,eventTime,rate,interval" }, effectiveAt, createdAt: effectiveAt }),
    d2Adapter.registerProviderSnapshot({ snapshotId: providerRegistryId(partition), providerId: partition.providerId, registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ providerId: partition.providerId, scope: sourceScope }), canonicalContent: { providerId: partition.providerId, scope: sourceScope, limitation: "USD_M_FUTURES_FUNDING_ONLY" }, effectiveAt, createdAt: effectiveAt }),
    d2Adapter.registerProviderSnapshot({ snapshotId: providerCertificationId(partition), providerId: partition.providerId, registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ providerId: partition.providerId, certification: sourceScope }), canonicalContent: { providerId: partition.providerId, certification: sourceScope, limitation: "FROZEN_CUTOFF_2026_07_12" }, effectiveAt, createdAt: effectiveAt }),
    d2Adapter.registerPolicyVersion({ policyVersionId: POLICY_ID, datasetId: "funding", policyVersion: "1.0.0", contentChecksum: canonicalChecksum({ datasetId: "funding", sourceSelection: "VISION_COMPLETE_MONTHS_THEN_OFFICIAL_REST_TAIL", cadence: "EVENT_8H", normalizationVersion: PRODUCTION_NORMALIZER_VERSION }), canonicalContent: { datasetId: "funding", sourceSelection: "VISION_COMPLETE_MONTHS_THEN_OFFICIAL_REST_TAIL", cadence: "EVENT_8H", normalizationVersion: PRODUCTION_NORMALIZER_VERSION }, effectiveAt, createdAt: effectiveAt }),
  ])
  if (results.some((result) => result.status === "CONFLICT" || result.status === "REJECTED")) throw new Error(`FUNDING_GOVERNANCE_BINDING_FAILED:${JSON.stringify(results)}`)
}

function pendingProgress(partitionId: string): FundingPartitionProgress {
  return Object.freeze({ partitionId, classification: "PENDING", reasonCodes: [], jobId: null, runId: null, unitId: null, rawObjectId: null, downloadedBytes: 0, parsedEvents: 0, acceptedCandidates: 0, rejectedCandidates: 0, canonicalFactsCreated: 0, canonicalFactsReused: 0, conflicts: 0, updatedAt: isoNow() })
}

async function failActivePartitionLease(clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>, partition: FundingExecutionPartition, workerId: string, reason: string): Promise<void> {
  const rows = await clients.d3.sql<Array<{ unit_id: string; lease_id: string; fencing_token: number; run_id: string; job_id: string }>>`SELECT u.unit_id,l.lease_id,l.fencing_token,r.run_id,j.job_id FROM control.population_units u JOIN control.population_jobs j ON j.job_id=u.job_id JOIN control.population_runs r ON r.job_id=j.job_id JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.partition_key=${partition.partitionId} AND l.owner_id=${workerId} AND l.released_at IS NULL ORDER BY l.acquired_at DESC LIMIT 1`
  const row = rows[0]
  if (!row) return
  const d3Adapter = createPopulationPostgresAdapter(clients.d3)
  const at = isoNow()
  await d3Adapter.advanceUnit(row.unit_id, row.lease_id, workerId, Number(row.fencing_token), "RETRYABLE", `funding-retryable:${partition.partitionId}:${row.fencing_token}:${canonicalChecksum(reason).slice(0, 16)}`, at)
  await d3Adapter.releaseLease(row.unit_id, row.lease_id, workerId, Number(row.fencing_token), at, "FAILED")
  await d3Adapter.scheduleRetry({ retryEventId: `retry:${partition.partitionId}:${row.fencing_token}:${canonicalChecksum(reason).slice(0, 16)}`, jobId: row.job_id, runId: row.run_id, unitId: row.unit_id, candidateId: null, classificationId: "FUNDING_RUNTIME_FAILURE", policyId: "d3-phase3-funding-retry-v1", policyVersion: "1.0.0", retryAfter: at, createdAt: at })
  await d3Adapter.aggregateJob(row.job_id, at)
}

async function processPartition(
  snapshot: FundingExecutionSnapshot,
  partition: FundingExecutionPartition,
  clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>,
  storage: Awaited<ReturnType<typeof createFilesystemObjectStorage>>,
  workerId: string,
  retryKind: "FAILED" | "GAP" | null = null,
): Promise<FundingPartitionProgress> {
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  if (completed[partition.partitionId]) return Object.freeze({ ...pendingProgress(partition.partitionId), classification: "SKIPPED_ALREADY_COMPLETE", unitId: completed[partition.partitionId], reasonCodes: ["AUTHORITATIVE_COMPLETION_RECONCILED"] })
  const d2Adapter = createCanonicalPersistenceAdapter(clients.d2)
  const d3Adapter = createPopulationPostgresAdapter(clients.d3)
  const commitPort = createD3ToD2CanonicalCommitPort(d2Adapter)
  await ensureGovernance(partition, d2Adapter)
  const at = isoNow()
  const resumable = await clients.d3.sql<Array<{ unit_id: string; job_id: string; run_id: string }>>`SELECT u.unit_id,u.job_id,r.run_id FROM control.population_units u JOIN control.population_runs r ON r.job_id=u.job_id WHERE u.partition_key=${partition.partitionId} AND u.dataset_id='funding' AND u.current_state='RETRYABLE' AND r.current_state='RUNNING' ORDER BY r.attempt_number DESC LIMIT 1`
  if (resumable[0]) {
    const built = buildRequest(snapshot, partition, at)
    const lease = await d3Adapter.claimUnit(workerId, resumable[0].run_id, isoNow(), new Date(Date.now() + LEASE_MS).toISOString())
    if (!lease || lease.unitId !== resumable[0].unit_id) throw new Error(`FUNDING_UNIT_RESUME_CLAIM_FAILED:${partition.partitionId}`)
    return processClaimedPartition(snapshot, partition, clients, storage, workerId, built, { jobId: resumable[0].job_id }, { runId: resumable[0].run_id }, lease)
  }
  const retryRows = retryKind ? await clients.d3.sql<Array<{ count: number }>>`SELECT count(*)::int count FROM control.population_jobs WHERE occurrence_identity=${`${snapshot.snapshotId}:${partition.partitionId}`} AND intentional_rerun_identity IS NOT NULL` : []
  const intentionalRerunIdentity = retryKind ? `${retryKind.toLowerCase()}-retry:${partition.partitionId}:${(retryRows[0]?.count ?? 0) + 1}` : null
  let built = buildRequest(snapshot, partition, at, intentionalRerunIdentity)
  let created = await d3Adapter.createJob(built.request)
  if (created.status !== "CREATED") {
    const existingUnits = await clients.d3.sql<Array<{ count: number }>>`SELECT count(*)::int count FROM control.population_units WHERE job_id=${created.jobId}`
    if ((existingUnits[0]?.count ?? 0) !== 0) return Object.freeze({ ...pendingProgress(partition.partitionId), classification: "BLOCKED", jobId: created.jobId, reasonCodes: ["EXISTING_NONTERMINAL_OR_UNRECONCILED_JOB"] })
    const reruns = await clients.d3.sql<Array<{ count: number }>>`SELECT count(*)::int count FROM control.population_jobs WHERE occurrence_identity=${`${snapshot.snapshotId}:${partition.partitionId}`} AND intentional_rerun_identity LIKE 'pre-unit-retry:%'`
    built = buildRequest(snapshot, partition, at, `pre-unit-retry:${partition.partitionId}:${(reruns[0]?.count ?? 0) + 1}`)
    created = await d3Adapter.createJob(built.request)
    if (created.status !== "CREATED") return Object.freeze({ ...pendingProgress(partition.partitionId), classification: "BLOCKED", jobId: created.jobId, reasonCodes: ["PRE_UNIT_RETRY_NOT_CREATED"] })
  }
  const run = await d3Adapter.createRun(created.jobId, 1, at)
  const units = expandPopulationUnits(built.job, [{ profileId: built.request.profile.profileId, profileVersion: built.request.profile.profileVersion, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: providerRegistryId(partition), policyVersionId: POLICY_ID, venue: partition.venue, subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: partition.cadence, partitionKey: partition.partitionId, requestFingerprint: built.request.requestIdentity, requestParameters: { snapshotId: snapshot.snapshotId, manifestId: snapshot.parentManifestId, partitionId: partition.partitionId, sourceKind: partition.sourceKind, sourceObject: path.basename(new URL(partition.sourceObject).pathname) }, required: true }], at)
  if (await d3Adapter.expandUnits(units) !== 1) throw new Error(`FUNDING_UNIT_EXPANSION_FAILED:${partition.partitionId}`)
  const lease = await d3Adapter.claimUnit(workerId, run.runId, isoNow(), new Date(Date.now() + LEASE_MS).toISOString())
  if (!lease || lease.unitId !== units[0].unitId) throw new Error(`FUNDING_UNIT_CLAIM_FAILED:${partition.partitionId}`)
  return processClaimedPartition(snapshot, partition, clients, storage, workerId, built, created, run, lease)
}

async function processClaimedPartition(
  snapshot: FundingExecutionSnapshot,
  partition: FundingExecutionPartition,
  clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>,
  storage: Awaited<ReturnType<typeof createFilesystemObjectStorage>>,
  workerId: string,
  built: ReturnType<typeof buildRequest>,
  created: { readonly jobId: string },
  run: { readonly runId: string },
  lease: { readonly unitId: string; readonly leaseId: string; readonly fencingToken: number },
): Promise<FundingPartitionProgress> {
  const d2Adapter = createCanonicalPersistenceAdapter(clients.d2)
  const d3Adapter = createPopulationPostgresAdapter(clients.d3)
  const commitPort = createD3ToD2CanonicalCommitPort(d2Adapter)
  const at = isoNow()
  const progress = { ...pendingProgress(partition.partitionId), classification: "ACTIVE" as const, jobId: created.jobId, runId: run.runId, unitId: lease.unitId }
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "RETRIEVING", `funding-retrieving:${partition.partitionId}:${lease.fencingToken}`, isoNow())
  const retrievalAttemptId = createRetrievalAttemptId(lease.unitId, run.runId, 1)
  const source = await download(partition)
  if (source.status !== "AVAILABLE") {
    const gap = source.status === "MISSING"
    await d3Adapter.appendRetrievalAttempt({ attemptId: retrievalAttemptId, unitId: lease.unitId, runId: run.runId, providerId: partition.providerId, providerSnapshotId: providerRegistryId(partition), requestFingerprint: built.request.requestIdentity, startedAt: at, completedAt: isoNow(), outcome: gap ? "PERMANENT_FAILURE" : "RETRYABLE_FAILURE", statusCode: gap ? 404 : null, retryAfter: null, responseMediaType: null, rawByteCount: null, rawManifestId: null, errorClass: "SOURCE", errorCode: gap ? "GAP_SOURCE_MISSING" : source.reason, retryClassificationId: gap ? null : "SOURCE_RETRYABLE" })
    await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, gap ? "FAILED" : "RETRYABLE", `${gap ? "gap-source-missing" : "source-retryable"}:${partition.partitionId}`, isoNow())
    await d3Adapter.releaseLease(lease.unitId, lease.leaseId, workerId, lease.fencingToken, isoNow(), "FAILED")
    await d3Adapter.completeRun(run.runId, gap ? "FAILED" : "PARTIAL", isoNow()); await d3Adapter.aggregateJob(created.jobId, isoNow())
    return Object.freeze({ ...progress, classification: gap ? "GAP_SOURCE_MISSING" : "FAILED_RETRYABLE", reasonCodes: [gap ? "HTTP_404_AFTER_VERIFIED_AVAILABILITY" : source.reason], updatedAt: isoNow() })
  }
  const acquired = await acquire(storage, partition, source.buffer)
  const rawRegistration = await d2Adapter.registerRawObjectManifest(acquired.raw)
  if (rawRegistration.status === "CONFLICT" || rawRegistration.status === "REJECTED") throw new Error(`FUNDING_RAW_REGISTRATION_FAILED:${rawRegistration.status}`)
  await d3Adapter.appendRetrievalAttempt({ attemptId: retrievalAttemptId, unitId: lease.unitId, runId: run.runId, providerId: partition.providerId, providerSnapshotId: providerRegistryId(partition), requestFingerprint: built.request.requestIdentity, startedAt: at, completedAt: isoNow(), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: acquired.raw.mediaType, rawByteCount: acquired.buffer.byteLength, rawManifestId: acquired.raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null })
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "RAW_PERSISTED", `funding-raw:${partition.partitionId}:${lease.fencingToken}`, isoNow())
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:raw:${lease.unitId}:${lease.fencingToken}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "RAW_BOUNDARY", completedStage: "RAW_PERSISTED", rawManifestId: acquired.raw.objectId, candidateCursor: null, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, workerId)
  const sourceParsed = partition.sourceKind === "BINANCE_VISION_MONTHLY"
    ? parseFundingCsv(extractFirstCsvFromZip(acquired.buffer))
    : parseFundingRestJson(acquired.buffer.toString("utf8"), partition.providerSymbol)
  const parsed = Object.freeze({ rows: Object.freeze(sourceParsed.rows.filter((row) => row.fundingTime >= partition.earliestEligibleEventTime && row.fundingTime <= partition.finalEligibleEventTime && row.fundingTime < snapshot.frozenCutoffUtc)), rejected: sourceParsed.rejected })
  if (parsed.rows.length === 0 || Object.keys(parsed.rejected).length > 0) throw new Error(`FUNDING_SOURCE_VALIDATION_FAILED:${partition.partitionId}:${JSON.stringify(parsed.rejected)}`)
  const createdAt = isoNow(); const candidates = parsed.rows.map((row, index) => candidate(partition, row, index, lease.unitId, retrievalAttemptId, acquired.raw, createdAt))
  for (const value of candidates) {
    const persisted = await d3Adapter.persistCandidate(value)
    if (persisted.status === "CONFLICT") throw new Error(`FUNDING_CANDIDATE_CONFLICT:${value.candidateId}`)
    if (persisted.status === "CREATED") await d3Adapter.appendValidation({ validationRunId: `validation:${value.candidateId}`, candidateId: value.candidateId, retrievalAttemptId, layer: "STRUCTURAL", ruleId: "d3-phase3-funding-source-structure", ruleVersion: "1.0.0", outcome: "PASSED", blocking: false, failureRouting: null, policyVersionId: POLICY_ID, diagnostics: { cadence: partition.cadence, sourceKind: partition.sourceKind, fundingIntervalHours: value.payload.fundingIntervalHours }, createdAt })
  }
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "CANDIDATES_READY", `funding-candidates:${partition.partitionId}:${lease.fencingToken}`, isoNow())
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:candidate:${lease.unitId}:${lease.fencingToken}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANDIDATE_BOUNDARY", completedStage: "CANDIDATES_READY", rawManifestId: acquired.raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, workerId)
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "PROCESSING", `funding-processing:${partition.partitionId}:${lease.fencingToken}`, isoNow())
  const normalizer = new ProductionNormalizerRegistry(); const outcomes = []
  let createdFacts = 0; let reusedFacts = 0; let conflicts = 0; let lastSubmission = ""; let lastOutcome = ""
  for (const value of candidates) {
    const command = normalizer.normalize({ candidate: value, datasetRegistrySnapshotId: DATASET_REGISTRY_ID, providerRegistrySnapshotId: providerRegistryId(partition), providerCertificationSnapshotId: providerCertificationId(partition), policyVersionId: POLICY_ID, schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: acquired.raw.objectId, rawObject: acquired.raw })
    const submissionId = `submission:${value.candidateId}`; const outcomeId = `outcome:${value.candidateId}`
    await d3Adapter.createSubmission(submissionId, value.candidateId, command.idempotencyKey, isoNow())
    const result = await commitPort.execute(command)
    if (result.status === "SUCCESS") createdFacts += 1
    else if (result.status === "DUPLICATE") reusedFacts += 1
    else if (result.status === "CONFLICT") conflicts += 1
    else throw new Error(`FUNDING_D2_COMMIT_FAILED:${partition.partitionId}:${result.status}`)
    const existingOutcome = await clients.d3.sql`SELECT 1 FROM control.population_outcomes WHERE outcome_id=${outcomeId}`
    if (!existingOutcome.length) outcomes.push(await d3Adapter.recordD2Result({ jobId: created.jobId, runId: run.runId, unitId: lease.unitId, candidateId: value.candidateId, retrievalAttemptId, rawManifestId: acquired.raw.objectId, submissionId, leaseId: lease.leaseId, ownerId: workerId, fencingToken: lease.fencingToken, result, outcomeId, createdAt: isoNow() }))
    lastSubmission = submissionId; lastOutcome = outcomeId
  }
  if (conflicts > 0) throw new Error(`FUNDING_CANONICAL_CONFLICT:${partition.partitionId}:${conflicts}`)
  const allOutcomes = await clients.d3.sql<Array<{ outcome_id: string }>>`SELECT outcome_id FROM control.population_outcomes WHERE unit_id=${lease.unitId} ORDER BY outcome_id`
  const watermark = createWatermarkEligibility({ decisionId: `watermark:${lease.unitId}`, unitId: lease.unitId, datasetId: partition.datasetId, providerId: partition.providerId, dimensions: built.request.dimensions, outcomeIds: allOutcomes.map((outcome) => outcome.outcome_id), requiredUnitPolicyId: "required-funding-full-history", blockingReasons: [], policyVersionId: POLICY_ID, createdAt: isoNow(), outcome: outcomes.at(-1) ?? { kind: "DUPLICATE", outcomeId: lastOutcome, candidateId: candidates.at(-1)!.candidateId, canonicalRecordId: "reconciled", recordVersion: 1, createdAt: isoNow() } })
  const existingWatermark = await clients.d3.sql`SELECT 1 FROM coverage.watermark_eligibility_decisions WHERE decision_id=${watermark.decisionId}`
  if (!existingWatermark.length) await d3Adapter.writeWatermarkDecision(watermark)
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:canonical:${lease.unitId}:${lease.fencingToken}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "COMPLETED", rawManifestId: acquired.raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: lastSubmission, lastOutcomeId: lastOutcome, createdAt: isoNow() }, lease.leaseId, workerId)
  await d3Adapter.releaseLease(lease.unitId, lease.leaseId, workerId, lease.fencingToken, isoNow(), "COMPLETED")
  await d3Adapter.completeRun(run.runId, "SUCCEEDED", isoNow()); await d3Adapter.aggregateJob(created.jobId, isoNow())
  const reconciliation = await d3Adapter.reconcileUnit(lease.unitId)
  if (!reconciliation.consistent || !await d2Adapter.verifyLineageAcyclic()) throw new Error(`FUNDING_PARTITION_RECONCILIATION_FAILED:${partition.partitionId}`)
  return Object.freeze({ ...progress, classification: "POPULATED", rawObjectId: acquired.raw.objectId, downloadedBytes: acquired.buffer.byteLength, parsedEvents: parsed.rows.length, acceptedCandidates: candidates.length, rejectedCandidates: 0, canonicalFactsCreated: createdFacts, canonicalFactsReused: reusedFacts, conflicts, updatedAt: isoNow() })
}

async function status(snapshot: FundingExecutionSnapshot, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>, recent: readonly FundingPartitionProgress[] = []): Promise<Record<string, unknown>> {
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  const states = await clients.d3.sql<Array<{ current_state: string; count: number }>>`SELECT current_state::text,count(*)::int count FROM control.population_units WHERE profile_id='d3-phase3-funding-full-history' GROUP BY current_state`
  const totals = await clients.d2.sql<Array<{ facts: number; raw_objects: number; artifact_bytes: number; lineage: number; publication: number }>>`SELECT (SELECT count(*)::int FROM canonical.funding WHERE provider_id IN ('binance-vision','binance-official-rest-funding-rate')) facts,(SELECT count(*)::int FROM raw.objects WHERE dataset_id='funding' AND provider_id IN ('binance-vision','binance-official-rest-funding-rate')) raw_objects,(SELECT COALESCE(sum(size_bytes),0)::int FROM raw.objects WHERE dataset_id='funding' AND provider_id IN ('binance-vision','binance-official-rest-funding-rate')) artifact_bytes,(SELECT count(*)::int FROM repository.lineage_edges e JOIN canonical.funding f ON f.canonical_record_id=e.destination_node_id AND f.record_version::text=e.destination_node_version WHERE f.provider_id IN ('binance-vision','binance-official-rest-funding-rate')) lineage,(SELECT count(*)::int FROM repository.record_versions rv JOIN canonical.funding f ON f.canonical_record_id=rv.canonical_record_id AND f.record_version=rv.record_version WHERE f.provider_id IN ('binance-vision','binance-official-rest-funding-rate') AND rv.current_publication_state='PENDING') publication`
  const d3Totals = await clients.d3.sql<Array<{ retrievals: number; downloaded_bytes: number; candidates: number; submissions: number; outcomes: number; coverage: number; checkpoints: number; retries: number; conflicts: number; active: number }>>`SELECT (SELECT count(*)::int FROM control.retrieval_attempts WHERE provider_id IN ('binance-vision','binance-official-rest-funding-rate')) retrievals,(SELECT COALESCE(sum(raw_byte_count),0)::int FROM control.retrieval_attempts WHERE provider_id IN ('binance-vision','binance-official-rest-funding-rate')) downloaded_bytes,(SELECT count(*)::int FROM population.candidates WHERE dataset_id='funding') candidates,(SELECT count(*)::int FROM population.canonical_submissions s JOIN population.candidates c ON c.candidate_id=s.candidate_id WHERE c.dataset_id='funding') submissions,(SELECT count(*)::int FROM control.population_outcomes o JOIN population.candidates c ON c.candidate_id=o.candidate_id WHERE c.dataset_id='funding') outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions WHERE dataset_id='funding') coverage,(SELECT count(*)::int FROM control.population_checkpoints p JOIN control.population_units u ON u.unit_id=p.unit_id WHERE u.dataset_id='funding') checkpoints,(SELECT count(*)::int FROM control.retry_events r JOIN control.population_units u ON u.unit_id=r.unit_id WHERE u.dataset_id='funding') retries,(SELECT count(*)::int FROM population.candidate_conflicts q JOIN population.candidates c ON c.candidate_id=q.candidate_id WHERE c.dataset_id='funding') conflicts,(SELECT count(*)::int FROM control.population_leases l JOIN control.population_units u ON u.unit_id=l.unit_id WHERE u.dataset_id='funding' AND l.released_at IS NULL AND l.expires_at>now()) active`
  const timing = await clients.d3.sql<Array<{ started_at: Date | null; completed_at: Date | null; completed: number }>>`SELECT min(r.started_at) started_at,max(r.completed_at) completed_at,count(DISTINCT u.unit_id) FILTER (WHERE u.current_state='COMPLETED')::int completed FROM control.population_runs r JOIN control.population_jobs j ON j.job_id=r.job_id JOIN control.population_units u ON u.job_id=j.job_id WHERE j.profile_id='d3-phase3-funding-full-history'`
  const failures = await clients.d3.sql<Array<{ gaps: number; retryable: number; exhausted: number; quarantined: number }>>`SELECT count(DISTINCT unit_id) FILTER (WHERE event_id LIKE 'gap-source-missing:%')::int gaps,count(DISTINCT unit_id) FILTER (WHERE event_id LIKE 'source-retryable:%')::int retryable,(SELECT count(*)::int FROM control.population_units WHERE profile_id='d3-phase3-funding-full-history' AND current_state='FAILED') exhausted,(SELECT count(*)::int FROM control.population_units WHERE profile_id='d3-phase3-funding-full-history' AND current_state='QUARANTINED') quarantined FROM control.population_unit_events`
  const [d2RelationSizes, d3RelationSizes] = await Promise.all([
    clients.d2.sql<Array<{ bytes: string }>>`SELECT sum(pg_total_relation_size(format('%I.%I',schemaname,tablename)::regclass))::text bytes FROM pg_tables WHERE (schemaname,tablename) IN (('canonical','funding'),('repository','envelopes'),('repository','record_versions'),('repository','publication_decisions'),('repository','lineage_edges'),('control','canonical_commits'),('control','outbox'),('raw','objects'))`,
    clients.d3.sql<Array<{ bytes: string }>>`SELECT sum(pg_total_relation_size(format('%I.%I',schemaname,tablename)::regclass))::text bytes FROM pg_tables WHERE (schemaname,tablename) IN (('population','candidates'),('population','canonical_submissions'),('control','population_outcomes'),('quality','candidate_validation_results'))`,
  ])
  const filesystem = await statfs(process.env.D3_BACKFILL_OBJECT_ROOT!)
  const measuredRelationBytes = Number(d2RelationSizes[0]?.bytes ?? 0) + Number(d3RelationSizes[0]?.bytes ?? 0)
  const estimatedPostgresBytes = null
  const complete = Object.keys(completed).length
  const elapsedMs = timing[0]?.started_at ? Math.max(1, Date.now() - timing[0].started_at.getTime()) : 0
  const partitionsPerHour = elapsedMs > 0 ? timing[0].completed / (elapsedMs / 3_600_000) : 0
  const estimatedRemainingMs = partitionsPerHour > 0 ? (snapshot.completePartitionCount - complete) / partitionsPerHour * 3_600_000 : null
  const perInstrument = snapshot.instruments.map((instrument) => { const partitions = snapshot.partitions.filter((partition) => partition.providerSymbol === instrument.providerSymbol); const completeForInstrument = partitions.filter((partition) => completed[partition.partitionId]).length; return { providerSymbol: instrument.providerSymbol, earliestArchiveMonth: instrument.earliestVerifiedArchiveMonth, finalEligibleEventTime: instrument.finalEligibleEventTime, expectedPartitions: partitions.length, completedPartitions: completeForInstrument, remainingPartitions: partitions.length - completeForInstrument } })
  const progress = { schemaVersion: "1.0.0", snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.snapshotChecksum, generatedAt: isoNow(), totalPartitions: snapshot.completePartitionCount, completePartitions: complete, pendingPartitions: snapshot.completePartitionCount - complete, activeLeases: d3Totals[0].active, classifications: { populated: Math.max(0, complete - snapshot.alreadyCompletedPartitionCount), skippedAlreadyComplete: snapshot.alreadyCompletedPartitionCount, emptyConfirmed: 0, sourceUnavailable: 0, notApplicable: 0, gaps: failures[0].gaps, retryableFailures: failures[0].retryable, exhaustedFailures: failures[0].exhausted, conflicts: d3Totals[0].conflicts, blocked: failures[0].quarantined }, unitStates: Object.fromEntries(states.map((state) => [state.current_state, state.count])), perInstrument, throughput: { startedAt: timing[0]?.started_at?.toISOString() ?? null, lastCompletedAt: timing[0]?.completed_at?.toISOString() ?? null, elapsedMs, completedFullHistoryPartitions: timing[0]?.completed ?? 0, partitionsPerHour, estimatedRemainingMs }, capacity: { availableArtifactBytes: filesystem.bavail * filesystem.bsize, estimatedSourceBytes: snapshot.estimatedSourceBytes, measuredRelationBytes, estimatedPostgresBytes }, persisted: { ...totals[0], ...d3Totals[0] }, recent }
  await writeFile(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`, "utf8")
  return progress
}

async function run(snapshot: FundingExecutionSnapshot, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>, command: Command): Promise<void> {
  const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false })
  const maxPartitions = positiveInt("--max-partitions", 1)
  const symbol = arg("--instrument")?.toUpperCase() ?? null
  const from = arg("--from"); const to = arg("--to")
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  let selected = snapshot.partitions.filter((partition) => !completed[partition.partitionId] && (!symbol || partition.providerSymbol === symbol) && (!from || partition.windowStart >= from) && (!to || partition.windowEnd <= to))
  if (command === "retry-failed" || command === "retry-gaps") {
    const failed = command === "retry-gaps"
      ? await clients.d3.sql<Array<{ partition_key: string }>>`SELECT DISTINCT u.partition_key FROM control.population_units u JOIN control.population_unit_events e ON e.unit_id=u.unit_id WHERE u.profile_id='d3-phase3-funding-full-history' AND e.event_id LIKE 'gap-source-missing:%'`
      : await clients.d3.sql<Array<{ partition_key: string }>>`SELECT DISTINCT u.partition_key FROM control.population_units u WHERE u.profile_id='d3-phase3-funding-full-history' AND u.current_state IN ('FAILED','QUARANTINED') AND NOT EXISTS(SELECT 1 FROM control.population_unit_events e WHERE e.unit_id=u.unit_id AND e.event_id LIKE 'gap-source-missing:%')`
    const keys = new Set(failed.map((row) => row.partition_key))
    selected = selected.filter((partition) => keys.has(partition.partitionId))
  }
  selected = selected.slice(0, maxPartitions)
  if (selected.length === 0) { console.log(JSON.stringify({ status: "NO_ELIGIBLE_PARTITIONS", progress: await status(snapshot, clients) })); return }
  await unlink(stopPath(snapshot.snapshotId)).catch(() => undefined)
  const results: FundingPartitionProgress[] = []
  let next = 0
  const workers = Array.from({ length: Math.min(PROVIDER_CONCURRENCY, selected.length) }, (_, index) => (async () => {
    for (;;) {
      if (await readFile(stopPath(snapshot.snapshotId), "utf8").then(() => true).catch(() => false)) return
      const partition = selected[next++]
      if (!partition) return
      try { results.push(await processPartition(snapshot, partition, clients, storage, `${WORKER_PREFIX}-${index + 1}`, command === "retry-gaps" ? "GAP" : command === "retry-failed" ? "FAILED" : null)) }
      catch (error) {
        const reason = error instanceof Error ? error.message : "UNKNOWN"
        await failActivePartitionLease(clients, partition, `${WORKER_PREFIX}-${index + 1}`, reason)
        results.push(Object.freeze({ ...pendingProgress(partition.partitionId), classification: "BLOCKED", reasonCodes: [reason], updatedAt: isoNow() }))
      }
    }
  })())
  await Promise.all(workers)
  const progress = await status(snapshot, clients, results.sort((a, b) => a.partitionId.localeCompare(b.partitionId)))
  console.log(JSON.stringify({ status: "SAFE_BOUNDARY_REACHED", attempted: results.length, results, progress }))
}

async function reconcile(snapshot: FundingExecutionSnapshot, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<void> {
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  const invalid = await clients.d3.sql<Array<{ partition_key: string }>>`SELECT u.partition_key FROM control.population_units u WHERE u.dataset_id='funding' AND u.current_state='COMPLETED' AND (NOT EXISTS(SELECT 1 FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') OR NOT EXISTS(SELECT 1 FROM control.population_checkpoints p WHERE p.unit_id=u.unit_id AND p.checkpoint_type='CANONICAL_BOUNDARY')) ORDER BY u.partition_key`
  const active = await clients.d3.sql<Array<{ unit_id: string }>>`SELECT l.unit_id FROM control.population_leases l JOIN control.population_units u ON u.unit_id=l.unit_id WHERE u.dataset_id='funding' AND l.released_at IS NULL AND l.expires_at>now()`
  const result = { consistent: invalid.length === 0, reasonCodes: invalid.length ? ["COMPLETED_UNIT_MISSING_COVERAGE_OR_CHECKPOINT"] : [], affectedPartitions: invalid.map((row) => row.partition_key), completePartitions: Object.keys(completed).length, incompletePartitions: snapshot.completePartitionCount - Object.keys(completed).length, activeLeases: active.length, executionComplete: Object.keys(completed).length === snapshot.completePartitionCount }
  console.log(JSON.stringify(result))
}

async function validateSamples(snapshot: FundingExecutionSnapshot, clients: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>): Promise<void> {
  const completed = await completedPartitionMap(clients.d2, clients.d3)
  const results = []
  for (const partition of snapshot.partitions.filter((item) => completed[item.partitionId])) {
    const source = await download(partition)
    if (source.status !== "AVAILABLE") throw new Error(`FUNDING_SAMPLE_SOURCE_UNAVAILABLE:${partition.partitionId}:${source.status}`)
    const contentHash = createHash("sha256").update(source.buffer).digest("hex")
    const sourceParsed = partition.sourceKind === "BINANCE_VISION_MONTHLY" ? parseFundingCsv(extractFirstCsvFromZip(source.buffer)) : parseFundingRestJson(source.buffer.toString("utf8"), partition.providerSymbol)
    const parsed = { ...sourceParsed, rows: sourceParsed.rows.filter((row) => row.fundingTime >= partition.earliestEligibleEventTime && row.fundingTime <= partition.finalEligibleEventTime && row.fundingTime < snapshot.frozenCutoffUtc) }
    const indexes = [0, Math.floor(parsed.rows.length / 2), parsed.rows.length - 1]
    let matched = 0
    for (const index of indexes) {
      const row = parsed.rows[index]
      const canonical = await clients.d2.sql<Array<{ funding_time: Date; funding_rate: string; funding_interval_hours: number; canonical_instrument_id: string; market_type: string; canonical_record_id: string; record_version: number; raw_object_id: string; content_hash: string; lineage: number }>>`SELECT f.funding_time,f.funding_rate::text,f.funding_interval_hours,f.canonical_instrument_id,f.market_type,f.canonical_record_id,f.record_version,r.object_id raw_object_id,r.content_hash,(SELECT count(*)::int FROM repository.lineage_edges le WHERE le.destination_node_id=f.canonical_record_id AND le.destination_node_version=f.record_version::text) lineage FROM canonical.funding f JOIN repository.lineage_edges e ON e.destination_node_id=f.canonical_record_id AND e.destination_node_version=f.record_version::text JOIN raw.objects r ON r.object_id=e.source_node_id WHERE f.symbol=${partition.providerSymbol} AND f.provider_id=${partition.providerId} AND f.funding_time=${row.fundingTime} LIMIT 1`
      if (!canonical[0]) continue
      const candidateId = createCandidateId({ rawManifestId: canonical[0].raw_object_id, sourceObservationId: `${partition.providerId}:${partition.providerSymbol}:${partition.cadence}:${row.fundingTime}`, parserVersion: PARSER_VERSION, candidateOrdinal: String(index) })
      const candidateExists = await clients.d3.sql`SELECT 1 FROM population.candidates WHERE candidate_id=${candidateId}`
      if (canonical[0].funding_time.toISOString() === row.fundingTime && canonical[0].funding_rate === row.fundingRate && canonical[0].funding_interval_hours === row.fundingIntervalHours && canonical[0].canonical_instrument_id === partition.canonicalInstrumentId && canonical[0].market_type === partition.marketType && canonical[0].content_hash === contentHash && canonical[0].lineage === 1 && candidateExists.length === 1) matched += 1
    }
    results.push({ partitionId: partition.partitionId, providerSymbol: partition.providerSymbol, sourceKind: partition.sourceKind, sourceChecksum: contentHash, parsedEvents: parsed.rows.length, samplesChecked: indexes.length, samplesMatched: matched, passed: matched === indexes.length })
  }
  console.log(JSON.stringify({ status: results.every((result) => result.passed) ? "PASS" : "FAIL", results }))
}

async function main() {
  const command = process.argv[2] as Command | undefined
  if (!command || !["enumerate", "status", "run", "resume", "stop", "retry-failed", "retry-gaps", "reconcile", "validate-samples"].includes(command)) throw new Error("Usage: runD3FundingBackfill.ts <enumerate|status|run|resume|stop|retry-failed|retry-gaps|reconcile|validate-samples>")
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d3-funding-full-history-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "d3-funding-full-history-d3" } })
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
