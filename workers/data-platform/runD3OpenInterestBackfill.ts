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
  createD3ToD2CanonicalCommitPort,
  createFilesystemObjectStorage,
  createIntegratedBackfillClientsFromEnvironment,
  createOpenInterestExecutionSnapshot,
  createOpenInterestPartitionId,
  D3_PHASE3_MANIFEST,
  instrumentForSymbol,
  OPEN_INTEREST_FROZEN_CUTOFF,
  parseBinanceVisionOpenInterestSource,
  ProductionNormalizerRegistry,
  PRODUCTION_NORMALIZER_VERSION,
  type OpenInterestAvailabilityBoundary,
  type OpenInterestExecutionPartition,
  type OpenInterestExecutionSnapshot,
  type OpenInterestPartitionProgress,
  type OpenInterestSourceRow,
} from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"

type Command = "enumerate" | "status" | "run" | "resume" | "stop" | "retry-failed" | "retry-gaps" | "reconcile" | "validate-samples"
type Clients = Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>
type Storage = Awaited<ReturnType<typeof createFilesystemObjectStorage>>

const SNAPSHOT_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-oi-execution-snapshot.json")
const PROGRESS_PATH = path.join(process.cwd(), "docs", "project", "d3-phase-3-oi-progress.json")
const DATASET_REGISTRY_ID = "d3-phase3-open-interest-dataset-registry-v1"
const PROVIDER_REGISTRY_ID = "d3-phase3-binance-vision-open-interest-provider-v1"
const PROVIDER_CERTIFICATION_ID = "d3-phase3-binance-vision-open-interest-certification-v1"
const POLICY_ID = "d3-phase3-open-interest-policy-v1"
const PARSER_VERSION = "binance-vision-open-interest-metrics-csv-v1"
const SCHEMA_VERSION = "1"
const WORKER_PREFIX = "d3-phase3-open-interest-full-worker"
const LEASE_MS = 2 * 60 * 60 * 1000

function isoNow(): string { return new Date().toISOString() }
function arg(name: string): string | null { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] ?? null : null }
function positiveInt(name: string, fallback: number): number { const raw = arg(name); if (raw === null) return fallback; const parsed = Number(raw); if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`ARGUMENT_INVALID:${name}`); return parsed }
function stopPath(snapshotId: string): string { return path.join(process.env.D3_BACKFILL_OBJECT_ROOT!, "_control", `${snapshotId.replace(/[^a-zA-Z0-9._-]/g, "_")}.stop`) }
function stream(buffer: Buffer): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { yield buffer } } }

function xmlDecode(value: string): string { return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'") }

async function listSourceArchives(symbol: string): Promise<readonly { readonly day: string; readonly size: number }[]> {
  const prefix = `data/futures/um/daily/metrics/${symbol}/`
  const archives: { day: string; size: number }[] = []
  let continuation: string | null = null
  do {
    const url = new URL("https://s3-ap-northeast-1.amazonaws.com/data.binance.vision")
    url.searchParams.set("list-type", "2"); url.searchParams.set("prefix", prefix); url.searchParams.set("max-keys", "1000")
    if (continuation) url.searchParams.set("continuation-token", continuation)
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "user-agent": "QuantTerminal-D3-OpenInterest-Discovery/1.0" } })
    if (!response.ok) throw new Error(`OPEN_INTEREST_DISCOVERY_FAILED:${symbol}:HTTP_${response.status}`)
    const xml = await response.text()
    for (const match of xml.matchAll(/<Contents>\s*<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>\s*<StorageClass>/g)) {
      const key = xmlDecode(match[1])
      const day = new RegExp(`${symbol}-metrics-(\\d{4}-\\d{2}-\\d{2})\\.zip$`).exec(key)?.[1]
      if (day && `${day}T00:00:00.000Z` < OPEN_INTEREST_FROZEN_CUTOFF) archives.push({ day, size: Number(match[2]) })
    }
    continuation = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null
    if (continuation) continuation = xmlDecode(continuation)
  } while (continuation)
  archives.sort((left, right) => left.day.localeCompare(right.day))
  if (!archives.length) throw new Error(`OPEN_INTEREST_SOURCE_INVENTORY_EMPTY:${symbol}`)
  const first = Date.parse(`${archives[0].day}T00:00:00.000Z`)
  for (let index = 0; index < archives.length; index += 1) {
    const expected = new Date(first + index * 86_400_000).toISOString().slice(0, 10)
    if (archives[index].day !== expected) throw new Error(`OPEN_INTEREST_SOURCE_INVENTORY_GAP:${symbol}:${expected}`)
  }
  if (archives.at(-1)?.day !== "2026-07-11") throw new Error(`OPEN_INTEREST_FINAL_ARCHIVE_UNVERIFIED:${symbol}`)
  return Object.freeze(archives.map((archive) => Object.freeze(archive)))
}

async function download(partition: OpenInterestExecutionPartition): Promise<{ readonly status: "AVAILABLE"; readonly buffer: Buffer } | { readonly status: "MISSING" } | { readonly status: "RETRYABLE"; readonly reason: string }> {
  try {
    const response = await fetch(partition.sourceObject, { cache: "no-store", signal: AbortSignal.timeout(60_000), headers: { accept: "application/zip,application/octet-stream,*/*", "user-agent": "QuantTerminal-D3-OpenInterest-Backfill/1.0" } })
    if (response.status === 404) return { status: "MISSING" }
    if (response.status === 429 || response.status >= 500) return { status: "RETRYABLE", reason: `HTTP_${response.status}` }
    if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`)
    return { status: "AVAILABLE", buffer: Buffer.from(await response.arrayBuffer()) }
  } catch (error) { return { status: "RETRYABLE", reason: error instanceof Error ? error.message : "NETWORK_FAILURE" } }
}

async function discoverBoundary(symbol: string, activationTimestamp: string): Promise<{ readonly boundary: OpenInterestAvailabilityBoundary; readonly sizes: Readonly<Record<string, number>> }> {
  const instrument = instrumentForSymbol(D3_PHASE3_MANIFEST.instruments, symbol)
  const archives = await listSourceArchives(symbol)
  const firstDay = archives[0].day
  const firstPartition: OpenInterestExecutionPartition = { partitionId: "discovery", parentManifestId: D3_PHASE3_MANIFEST.manifestId, parentManifestChecksum: D3_PHASE3_MANIFEST.manifestChecksum, datasetId: "open-interest", providerId: "binance-vision", sourceKind: "BINANCE_VISION_DAILY_METRICS", venue: "BINANCE", marketType: "USD_M_FUTURES", canonicalInstrumentId: instrument.canonicalInstrumentId, providerSymbol: symbol, cadence: "5m", sourceDay: firstDay, windowStart: `${firstDay}T00:00:00.000Z`, windowEnd: new Date(Date.parse(`${firstDay}T00:00:00.000Z`) + 86_400_000).toISOString(), sourceObject: `https://data.binance.vision/data/futures/um/daily/metrics/${symbol}/${symbol}-metrics-${firstDay}.zip`, expectedUniqueObservations: 288, sourceByteCount: archives[0].size, unitIdentity: "discovery", initialState: "PENDING", retryState: "NOT_ATTEMPTED", existingCompletionReference: null, expectedTerminalClassification: "POPULATED_OR_EXPLICIT_SOURCE_CLASSIFICATION" }
  const firstSource = await download(firstPartition)
  if (firstSource.status !== "AVAILABLE") throw new Error(`OPEN_INTEREST_EARLIEST_ARCHIVE_UNAVAILABLE:${symbol}`)
  const firstParsed = parseBinanceVisionOpenInterestSource(extractFirstCsvFromZip(firstSource.buffer), symbol)
  if (!firstParsed.rows[0] || Object.keys(firstParsed.rejected).length) throw new Error(`OPEN_INTEREST_EARLIEST_ARCHIVE_INVALID:${symbol}`)
  const latestDay = archives.at(-1)!.day
  const latestSource = await fetch(`https://data.binance.vision/data/futures/um/daily/metrics/${symbol}/${symbol}-metrics-${latestDay}.zip`, { signal: AbortSignal.timeout(30_000) })
  if (!latestSource.ok) throw new Error(`OPEN_INTEREST_LATEST_ARCHIVE_UNAVAILABLE:${symbol}`)
  const latestParsed = parseBinanceVisionOpenInterestSource(extractFirstCsvFromZip(Buffer.from(await latestSource.arrayBuffer())), symbol)
  const final = latestParsed.rows.filter((row) => row.observedAt < OPEN_INTEREST_FROZEN_CUTOFF).at(-1)
  if (!final || Object.keys(latestParsed.rejected).length) throw new Error(`OPEN_INTEREST_LATEST_ARCHIVE_INVALID:${symbol}`)
  const sizes: Record<string, number> = {}
  for (const archive of archives) sizes[createOpenInterestPartitionId(instrument.canonicalInstrumentId, archive.day)] = archive.size
  const boundary: OpenInterestAvailabilityBoundary = Object.freeze({ canonicalInstrumentId: instrument.canonicalInstrumentId, providerSymbol: symbol, activationTimestamp, earliestVerifiedArchiveDay: firstDay, latestVerifiedArchiveDay: "2026-07-11", earliestVerifiedObservationTime: firstParsed.rows[0].observedAt, finalEligibleObservationTime: final.observedAt, verifiedArchiveCount: archives.length, verifiedSourceBytes: archives.reduce((sum, archive) => sum + archive.size, 0), discoveryMethod: "BINANCE_VISION_S3_COMPLETE_PREFIX_INVENTORY", discoveryEvidence: `${archives.length} contiguous provider objects from ${firstDay} through 2026-07-11; first and final archives parsed` })
  return { boundary, sizes: Object.freeze(sizes) }
}

function candidate(partition: OpenInterestExecutionPartition, row: OpenInterestSourceRow, unitId: string, retrievalAttemptId: string, raw: RawObjectManifest, createdAt: string): Extract<PopulationCandidate, { readonly kind: "OPEN_INTEREST" }> {
  const sourceObservationId = `${partition.providerId}:${partition.providerSymbol}:${partition.cadence}:${row.observedAt}`
  const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, candidateOrdinal: String(row.sourceOrdinal) })
  const payload = Object.freeze({ symbol: partition.providerSymbol, canonicalInstrumentId: partition.canonicalInstrumentId, marketType: partition.marketType, openInterest: row.openInterest, unit: "PROVIDER_NATIVE" as const, openInterestValue: row.openInterestValue, valueUnit: "PROVIDER_NATIVE_QUOTE_VALUE" as const, window: "5m" as const })
  return Object.freeze({ kind: "OPEN_INTEREST", candidateId, unitId, retrievalAttemptId, rawManifestId: raw.objectId, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, sourceObservationId, sourceObservedAt: row.observedAt, effectiveAt: row.observedAt, parserVersion: PARSER_VERSION, candidateSchemaVersion: SCHEMA_VERSION, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt })
}

function buildRequest(snapshot: OpenInterestExecutionSnapshot, partition: OpenInterestExecutionPartition, at: string): { readonly request: PopulationJobRequest; readonly job: PopulationJob } {
  const profile: PopulationJobProfile = Object.freeze({ profileId: "d3-phase3-open-interest-full-history", profileVersion: "1.0.0", kind: "BACKFILL", requiredDimensions: ["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const, rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "retry.historical-source", retryPolicyVersion: "UNAVAILABLE", watermarkPolicyId: "coverage.open-interest.partition", watermarkPolicyVersion: "1.0.0" })
  const dimensions = Object.freeze({ venue: partition.venue, subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: partition.cadence, partitionKey: partition.partitionId })
  const base = { profile, datasetId: partition.datasetId, providerId: partition.providerId, dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: `${snapshot.snapshotId}:${partition.partitionId}`, intentionalRerunIdentity: null, requestedAt: at, requestedBy: "d3-phase3-open-interest-full-history" })
  const jobId = createPopulationJobId(requestIdentity, request.occurrenceIdentity, null)
  return { request, job: Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt: at, updatedAt: at }) }
}

async function ensureGovernance(d2Adapter: ReturnType<typeof createCanonicalPersistenceAdapter>): Promise<void> {
  const effectiveAt = OPEN_INTEREST_FROZEN_CUTOFF
  const results = await Promise.all([
    d2Adapter.registerRegistrySnapshot({ snapshotId: DATASET_REGISTRY_ID, registryVersion: "1.0.0", contentChecksum: canonicalChecksum({ datasetId: "open-interest", cadence: "5m", fields: "instrument,market,quantity,quantityUnit,notionalValue,valueUnit,observationTime" }), canonicalContent: { datasetId: "open-interest", cadence: "5m", fields: "instrument,market,quantity,quantityUnit,notionalValue,valueUnit,observationTime" }, effectiveAt, createdAt: effectiveAt }),
    d2Adapter.registerProviderSnapshot({ snapshotId: PROVIDER_REGISTRY_ID, providerId: "binance-vision", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ providerId: "binance-vision", scope: "USD_M_FUTURES_DAILY_METRICS_OPEN_INTEREST" }), canonicalContent: { providerId: "binance-vision", scope: "USD_M_FUTURES_DAILY_METRICS_OPEN_INTEREST", limitation: "FROZEN_ARCHIVE_ONLY" }, effectiveAt, createdAt: effectiveAt }),
    d2Adapter.registerProviderSnapshot({ snapshotId: PROVIDER_CERTIFICATION_ID, providerId: "binance-vision", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ providerId: "binance-vision", certification: "OPEN_INTEREST_THROUGH_2026_07_11" }), canonicalContent: { providerId: "binance-vision", certification: "OPEN_INTEREST_THROUGH_2026_07_11", limitation: "PROVIDER_NATIVE_UNITS" }, effectiveAt, createdAt: effectiveAt }),
    d2Adapter.registerPolicyVersion({ policyVersionId: POLICY_ID, datasetId: "open-interest", policyVersion: "1.0.0", contentChecksum: canonicalChecksum({ source: "BINANCE_VISION_DAILY_METRICS_ONLY", cadence: "5m", duplicates: "REJECT_EXACT_DUPLICATE_SOURCE_OBSERVATIONS", cutoff: OPEN_INTEREST_FROZEN_CUTOFF, normalizationVersion: PRODUCTION_NORMALIZER_VERSION }), canonicalContent: { source: "BINANCE_VISION_DAILY_METRICS_ONLY", cadence: "5m", duplicates: "REJECT_EXACT_DUPLICATE_SOURCE_OBSERVATIONS", cutoff: OPEN_INTEREST_FROZEN_CUTOFF, normalizationVersion: PRODUCTION_NORMALIZER_VERSION }, effectiveAt, createdAt: effectiveAt }),
  ])
  if (results.some((result) => result.status === "CONFLICT" || result.status === "REJECTED")) throw new Error("OPEN_INTEREST_GOVERNANCE_BINDING_FAILED")
}

async function readSnapshot(): Promise<OpenInterestExecutionSnapshot> {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8")) as OpenInterestExecutionSnapshot
  const { snapshotId, snapshotChecksum, ...content } = snapshot
  if (snapshotId !== `open-interest-execution:${snapshotChecksum}` || canonicalChecksum(content) !== snapshotChecksum || snapshot.parentManifestId !== D3_PHASE3_MANIFEST.manifestId || snapshot.parentManifestChecksum !== D3_PHASE3_MANIFEST.manifestChecksum) throw new Error("OPEN_INTEREST_EXECUTION_SNAPSHOT_INVALID")
  return Object.freeze(snapshot)
}

async function completedPartitionMap(clients: Clients): Promise<Readonly<Record<string, string>>> {
  const units = await clients.d3.sql<Array<{ partition_key: string; unit_id: string; outcomes: number; coverage: number }>>`SELECT u.partition_key,u.unit_id,(SELECT count(*)::int FROM control.population_outcomes o WHERE o.unit_id=u.unit_id AND o.outcome_kind IN ('COMMITTED','DUPLICATE')) outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') coverage FROM control.population_units u WHERE u.dataset_id='open-interest' AND u.current_state='COMPLETED'`
  const completed: Record<string, string> = {}
  for (const unit of units) {
    if (!unit.partition_key.startsWith("open-interest:") || unit.outcomes < 1 || unit.coverage !== 1) continue
    const links = await clients.d3.sql<Array<{ canonical_record_id: string; record_version: number }>>`SELECT s.canonical_record_id,s.record_version FROM population.canonical_submissions s JOIN population.candidates c ON c.candidate_id=s.candidate_id WHERE c.unit_id=${unit.unit_id} AND s.result_status IN ('SUCCESS','DUPLICATE')`
    if (links.length !== unit.outcomes) continue
    let verified = 0
    for (const link of links) {
      const rows = await clients.d2.sql<Array<{ canonical_record_id: string }>>`SELECT f.canonical_record_id FROM canonical.open_interest f WHERE f.canonical_record_id=${link.canonical_record_id} AND f.record_version=${link.record_version} AND EXISTS(SELECT 1 FROM repository.lineage_edges e WHERE e.destination_node_id=f.canonical_record_id AND e.destination_node_version=f.record_version::text)`
      if (rows.length === 1) verified += 1
    }
    if (verified === links.length) completed[unit.partition_key] = unit.unit_id
  }
  return Object.freeze(completed)
}

async function enumerate(clients: Clients): Promise<void> {
  const availability: OpenInterestAvailabilityBoundary[] = []
  const sourceBytesByPartitionId: Record<string, number> = {}
  for (const instrument of D3_PHASE3_MANIFEST.instruments) {
    const discovered = await discoverBoundary(instrument.providerSymbol, instrument.activatedAt)
    availability.push(discovered.boundary); Object.assign(sourceBytesByPartitionId, discovered.sizes)
  }
  const snapshot = createOpenInterestExecutionSnapshot({ manifest: D3_PHASE3_MANIFEST, availability, sourceBytesByPartitionId, completedByPartitionId: await completedPartitionMap(clients) })
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; if ((await readSnapshot()).snapshotChecksum !== snapshot.snapshotChecksum) throw new Error("OPEN_INTEREST_EXECUTION_SNAPSHOT_SCOPE_CONFLICT") })
  console.log(JSON.stringify({ status: "ENUMERATED", snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.snapshotChecksum, instruments: snapshot.instruments, partitions: snapshot.completePartitionCount, pending: snapshot.pendingPartitionCount, expectedObservations: snapshot.expectedObservationCount, sourceBytes: snapshot.measuredSourceBytes }))
}

async function acquire(storage: Storage, partition: OpenInterestExecutionPartition, buffer: Buffer): Promise<{ readonly raw: RawObjectManifest; readonly buffer: Buffer }> {
  const contentHash = createHash("sha256").update(buffer).digest("hex")
  const objectStorageKey = `raw/${contentHash.slice(0, 2)}/${contentHash}.zip`
  const reference = await storage.putImmutable({ objectStorageKey, contentHash, mediaType: "application/zip", byteLength: buffer.byteLength, content: stream(buffer) })
  const chunks: Buffer[] = []; for await (const chunk of storage.read(objectStorageKey)) chunks.push(Buffer.from(chunk))
  const at = isoNow()
  return { buffer: Buffer.concat(chunks), raw: Object.freeze({ objectId: reference.rawObjectId, datasetId: partition.datasetId, providerId: partition.providerId, venue: partition.venue, symbolOrSubject: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, contentHash, sizeBytes: buffer.byteLength, mediaType: "application/zip", compression: "ZIP", retrievedAt: at, providerSnapshotId: PROVIDER_REGISTRY_ID, retentionClass: "ARCHIVE", verificationState: reference.verificationState, objectStorageKey, createdAt: at }) }
}

function pendingProgress(partitionId: string): OpenInterestPartitionProgress { return Object.freeze({ partitionId, classification: "PENDING", reasonCodes: [], jobId: null, runId: null, unitId: null, rawObjectId: null, downloadedBytes: 0, parsedObservations: 0, acceptedCandidates: 0, rejectedCandidates: 0, sourceDuplicateRows: 0, canonicalFactsCreated: 0, canonicalFactsReused: 0, conflicts: 0, updatedAt: isoNow() }) }

async function failActiveLease(clients: Clients, partition: OpenInterestExecutionPartition, workerId: string, reason: string): Promise<void> {
  const rows = await clients.d3.sql<Array<{ unit_id: string; lease_id: string; fencing_token: number; run_id: string; job_id: string }>>`SELECT u.unit_id,l.lease_id,l.fencing_token,r.run_id,j.job_id FROM control.population_units u JOIN control.population_jobs j ON j.job_id=u.job_id JOIN control.population_runs r ON r.job_id=j.job_id JOIN control.population_leases l ON l.lease_id=u.active_lease_id WHERE u.partition_key=${partition.partitionId} AND l.owner_id=${workerId} AND l.released_at IS NULL ORDER BY l.acquired_at DESC LIMIT 1`
  const row = rows[0]; if (!row) return
  const adapter = createPopulationPostgresAdapter(clients.d3); const at = isoNow(); const reasonHash = canonicalChecksum(reason).slice(0, 16)
  await adapter.advanceUnit(row.unit_id, row.lease_id, workerId, Number(row.fencing_token), "RETRYABLE", `open-interest-retryable:${partition.partitionId}:${row.fencing_token}:${reasonHash}`, at)
  await adapter.releaseLease(row.unit_id, row.lease_id, workerId, Number(row.fencing_token), at, "FAILED")
  await adapter.scheduleRetry({ retryEventId: `retry:${partition.partitionId}:${row.fencing_token}:${reasonHash}`, jobId: row.job_id, runId: row.run_id, unitId: row.unit_id, candidateId: null, classificationId: "OPEN_INTEREST_RUNTIME_FAILURE", policyId: "d3-phase3-open-interest-retry-v1", policyVersion: "1.0.0", retryAfter: at, createdAt: at })
  await adapter.aggregateJob(row.job_id, at)
}

async function processPartition(snapshot: OpenInterestExecutionSnapshot, partition: OpenInterestExecutionPartition, clients: Clients, storage: Storage, workerId: string): Promise<OpenInterestPartitionProgress> {
  const completed = await completedPartitionMap(clients)
  if (completed[partition.partitionId]) return Object.freeze({ ...pendingProgress(partition.partitionId), classification: "SKIPPED_ALREADY_COMPLETE", unitId: completed[partition.partitionId], reasonCodes: ["AUTHORITATIVE_COMPLETION_RECONCILED"] })
  const d2Adapter = createCanonicalPersistenceAdapter(clients.d2); const d3Adapter = createPopulationPostgresAdapter(clients.d3)
  await ensureGovernance(d2Adapter)
  const at = isoNow(); const built = buildRequest(snapshot, partition, at)
  const resumable = await clients.d3.sql<Array<{ unit_id: string; job_id: string; run_id: string }>>`SELECT u.unit_id,u.job_id,r.run_id FROM control.population_units u JOIN control.population_runs r ON r.job_id=u.job_id WHERE u.partition_key=${partition.partitionId} AND u.dataset_id='open-interest' AND u.current_state='RETRYABLE' AND r.current_state='RUNNING' ORDER BY r.attempt_number DESC LIMIT 1`
  if (resumable[0]) {
    const lease = await d3Adapter.claimUnit(workerId, resumable[0].run_id, isoNow(), new Date(Date.now() + LEASE_MS).toISOString())
    if (!lease || lease.unitId !== resumable[0].unit_id) throw new Error(`OPEN_INTEREST_RESUME_CLAIM_FAILED:${partition.partitionId}`)
    return processClaimed(snapshot, partition, clients, storage, workerId, built, resumable[0].job_id, resumable[0].run_id, lease)
  }
  const created = await d3Adapter.createJob(built.request)
  if (created.status !== "CREATED") return Object.freeze({ ...pendingProgress(partition.partitionId), classification: "BLOCKED", jobId: created.jobId, reasonCodes: ["EXISTING_NONTERMINAL_OR_UNRECONCILED_JOB"] })
  const run = await d3Adapter.createRun(created.jobId, 1, at)
  const units = expandPopulationUnits(built.job, [{ profileId: built.request.profile.profileId, profileVersion: built.request.profile.profileVersion, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, policyVersionId: POLICY_ID, venue: partition.venue, subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: partition.cadence, partitionKey: partition.partitionId, requestFingerprint: built.request.requestIdentity, requestParameters: { snapshotId: snapshot.snapshotId, manifestId: snapshot.parentManifestId, partitionId: partition.partitionId, sourceKind: partition.sourceKind, sourceObject: path.basename(new URL(partition.sourceObject).pathname) }, required: true }], at)
  if (await d3Adapter.expandUnits(units) !== 1) throw new Error(`OPEN_INTEREST_UNIT_EXPANSION_FAILED:${partition.partitionId}`)
  const lease = await d3Adapter.claimUnit(workerId, run.runId, isoNow(), new Date(Date.now() + LEASE_MS).toISOString())
  if (!lease || lease.unitId !== units[0].unitId) throw new Error(`OPEN_INTEREST_UNIT_CLAIM_FAILED:${partition.partitionId}`)
  return processClaimed(snapshot, partition, clients, storage, workerId, built, created.jobId, run.runId, lease)
}

async function processClaimed(snapshot: OpenInterestExecutionSnapshot, partition: OpenInterestExecutionPartition, clients: Clients, storage: Storage, workerId: string, built: ReturnType<typeof buildRequest>, jobId: string, runId: string, lease: { readonly unitId: string; readonly leaseId: string; readonly fencingToken: number }): Promise<OpenInterestPartitionProgress> {
  const d2Adapter = createCanonicalPersistenceAdapter(clients.d2); const d3Adapter = createPopulationPostgresAdapter(clients.d3); const commitPort = createD3ToD2CanonicalCommitPort(d2Adapter); const at = isoNow()
  const progress = { ...pendingProgress(partition.partitionId), classification: "ACTIVE" as const, jobId, runId, unitId: lease.unitId }
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "RETRIEVING", `open-interest-retrieving:${partition.partitionId}:${lease.fencingToken}`, isoNow())
  const retrievalAttemptId = createRetrievalAttemptId(lease.unitId, runId, 1)
  const source = await download(partition)
  if (source.status !== "AVAILABLE") {
    const gap = source.status === "MISSING"; const completedAt = isoNow()
    await d3Adapter.appendRetrievalAttempt({ attemptId: retrievalAttemptId, unitId: lease.unitId, runId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, requestFingerprint: built.request.requestIdentity, startedAt: at, completedAt, outcome: gap ? "PERMANENT_FAILURE" : "RETRYABLE_FAILURE", statusCode: gap ? 404 : null, retryAfter: null, responseMediaType: null, rawByteCount: null, rawManifestId: null, errorClass: "SOURCE", errorCode: gap ? "GAP_SOURCE_MISSING" : source.reason, retryClassificationId: gap ? null : "SOURCE_RETRYABLE" })
    await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, gap ? "FAILED" : "RETRYABLE", `${gap ? "gap-source-missing" : "source-retryable"}:${partition.partitionId}:${lease.fencingToken}`, completedAt)
    await d3Adapter.releaseLease(lease.unitId, lease.leaseId, workerId, lease.fencingToken, isoNow(), "FAILED"); await d3Adapter.completeRun(runId, gap ? "FAILED" : "PARTIAL", isoNow()); await d3Adapter.aggregateJob(jobId, isoNow())
    return Object.freeze({ ...progress, classification: gap ? "GAP_SOURCE_MISSING" : "FAILED_RETRYABLE", reasonCodes: [gap ? "HTTP_404_AFTER_VERIFIED_AVAILABILITY" : source.reason], updatedAt: isoNow() })
  }
  const acquired = await acquire(storage, partition, source.buffer)
  const rawRegistration = await d2Adapter.registerRawObjectManifest(acquired.raw)
  if (rawRegistration.status === "CONFLICT" || rawRegistration.status === "REJECTED") throw new Error(`OPEN_INTEREST_RAW_REGISTRATION_FAILED:${rawRegistration.status}`)
  await d3Adapter.appendRetrievalAttempt({ attemptId: retrievalAttemptId, unitId: lease.unitId, runId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, requestFingerprint: built.request.requestIdentity, startedAt: at, completedAt: isoNow(), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: acquired.raw.mediaType, rawByteCount: acquired.buffer.byteLength, rawManifestId: acquired.raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null })
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "RAW_PERSISTED", `open-interest-raw:${partition.partitionId}:${lease.fencingToken}`, isoNow())
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:raw:${lease.unitId}:${lease.fencingToken}`, jobId, runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "RAW_BOUNDARY", completedStage: "RAW_PERSISTED", rawManifestId: acquired.raw.objectId, candidateCursor: null, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, workerId)
  const sourceParsed = parseBinanceVisionOpenInterestSource(extractFirstCsvFromZip(acquired.buffer), partition.providerSymbol)
  const rows = sourceParsed.rows.filter((row) => row.observedAt < snapshot.frozenCutoffUtc)
  if (Object.keys(sourceParsed.rejected).length || rows.length === 0) throw new Error(`OPEN_INTEREST_SOURCE_VALIDATION_FAILED:${partition.partitionId}:${JSON.stringify(sourceParsed.rejected)}`)
  if (rows.length !== partition.expectedUniqueObservations) {
    await d3Adapter.appendValidation({ validationRunId: `validation:cadence:${lease.unitId}:${lease.fencingToken}`, candidateId: null, retrievalAttemptId, layer: "STRUCTURAL", ruleId: "d3-phase3-open-interest-source-cadence", ruleVersion: "1.0.0", outcome: "FAILED", blocking: true, failureRouting: "PERMANENT", policyVersionId: POLICY_ID, diagnostics: { expectedUniqueObservations: partition.expectedUniqueObservations, actualUniqueObservations: rows.length, duplicateRows: sourceParsed.exactDuplicateRows }, createdAt: isoNow() })
    await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "FAILED", `gap-source-missing:${partition.partitionId}:${lease.fencingToken}`, isoNow()); await d3Adapter.releaseLease(lease.unitId, lease.leaseId, workerId, lease.fencingToken, isoNow(), "FAILED"); await d3Adapter.completeRun(runId, "FAILED", isoNow()); await d3Adapter.aggregateJob(jobId, isoNow())
    return Object.freeze({ ...progress, classification: "GAP_SOURCE_MISSING", rawObjectId: acquired.raw.objectId, downloadedBytes: acquired.buffer.byteLength, parsedObservations: rows.length, rejectedCandidates: Math.max(0, partition.expectedUniqueObservations - rows.length), sourceDuplicateRows: sourceParsed.exactDuplicateRows, reasonCodes: ["SOURCE_CADENCE_INCOMPLETE"], updatedAt: isoNow() })
  }
  if (sourceParsed.exactDuplicateRows > 0) await d3Adapter.appendValidation({ validationRunId: `validation:duplicates:${lease.unitId}:${lease.fencingToken}`, candidateId: null, retrievalAttemptId, layer: "STRUCTURAL", ruleId: "d3-phase3-open-interest-exact-source-duplicate", ruleVersion: "1.0.0", outcome: "FAILED", blocking: false, failureRouting: "POLICY_REJECTED", policyVersionId: POLICY_ID, diagnostics: { rejectedExactDuplicateRows: sourceParsed.exactDuplicateRows, retainedUniqueObservations: rows.length }, createdAt: isoNow() })
  const createdAt = isoNow(); const candidates = rows.map((row) => candidate(partition, row, lease.unitId, retrievalAttemptId, acquired.raw, createdAt))
  for (const value of candidates) {
    const persisted = await d3Adapter.persistCandidate(value)
    if (persisted.status === "CONFLICT") throw new Error(`OPEN_INTEREST_CANDIDATE_CONFLICT:${value.candidateId}`)
    if (persisted.status === "CREATED") await d3Adapter.appendValidation({ validationRunId: `validation:${value.candidateId}`, candidateId: value.candidateId, retrievalAttemptId, layer: "STRUCTURAL", ruleId: "d3-phase3-open-interest-source-structure", ruleVersion: "1.0.0", outcome: "PASSED", blocking: false, failureRouting: null, policyVersionId: POLICY_ID, diagnostics: { cadence: partition.cadence, quantityUnit: value.payload.unit, valueUnit: value.payload.valueUnit }, createdAt })
  }
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "CANDIDATES_READY", `open-interest-candidates:${partition.partitionId}:${lease.fencingToken}`, isoNow())
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:candidate:${lease.unitId}:${lease.fencingToken}`, jobId, runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANDIDATE_BOUNDARY", completedStage: "CANDIDATES_READY", rawManifestId: acquired.raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, workerId)
  await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, workerId, lease.fencingToken, "PROCESSING", `open-interest-processing:${partition.partitionId}:${lease.fencingToken}`, isoNow())
  const normalizer = new ProductionNormalizerRegistry(); const outcomes = []; let createdFacts = 0; let reusedFacts = 0; let conflicts = 0; let lastSubmission = ""; let lastOutcome = ""
  for (const value of candidates) {
    const command = normalizer.normalize({ candidate: value, datasetRegistrySnapshotId: DATASET_REGISTRY_ID, providerRegistrySnapshotId: PROVIDER_REGISTRY_ID, providerCertificationSnapshotId: PROVIDER_CERTIFICATION_ID, policyVersionId: POLICY_ID, schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: acquired.raw.objectId, rawObject: acquired.raw })
    const submissionId = `submission:${value.candidateId}`; const outcomeId = `outcome:${value.candidateId}`
    await d3Adapter.createSubmission(submissionId, value.candidateId, command.idempotencyKey, isoNow())
    const result = await commitPort.execute(command)
    if (result.status === "SUCCESS") createdFacts += 1; else if (result.status === "DUPLICATE") reusedFacts += 1; else if (result.status === "CONFLICT") conflicts += 1; else throw new Error(`OPEN_INTEREST_D2_COMMIT_FAILED:${partition.partitionId}:${result.status}`)
    const existingOutcome = await clients.d3.sql`SELECT 1 FROM control.population_outcomes WHERE outcome_id=${outcomeId}`
    if (!existingOutcome.length) outcomes.push(await d3Adapter.recordD2Result({ jobId, runId, unitId: lease.unitId, candidateId: value.candidateId, retrievalAttemptId, rawManifestId: acquired.raw.objectId, submissionId, leaseId: lease.leaseId, ownerId: workerId, fencingToken: lease.fencingToken, result, outcomeId, createdAt: isoNow() }))
    lastSubmission = submissionId; lastOutcome = outcomeId
  }
  if (conflicts) throw new Error(`OPEN_INTEREST_CANONICAL_CONFLICT:${partition.partitionId}:${conflicts}`)
  const allOutcomes = await clients.d3.sql<Array<{ outcome_id: string }>>`SELECT outcome_id FROM control.population_outcomes WHERE unit_id=${lease.unitId} ORDER BY outcome_id`
  const watermark = createWatermarkEligibility({ decisionId: `watermark:${lease.unitId}`, unitId: lease.unitId, datasetId: partition.datasetId, providerId: partition.providerId, dimensions: built.request.dimensions, outcomeIds: allOutcomes.map((outcome) => outcome.outcome_id), requiredUnitPolicyId: "required-open-interest-full-history", blockingReasons: [], policyVersionId: POLICY_ID, createdAt: isoNow(), outcome: outcomes.at(-1) ?? { kind: "DUPLICATE", outcomeId: lastOutcome, candidateId: candidates.at(-1)!.candidateId, canonicalRecordId: "reconciled", recordVersion: 1, createdAt: isoNow() } })
  if (!(await clients.d3.sql`SELECT 1 FROM coverage.watermark_eligibility_decisions WHERE decision_id=${watermark.decisionId}`).length) await d3Adapter.writeWatermarkDecision(watermark)
  await d3Adapter.checkpoint({ checkpointId: `checkpoint:canonical:${lease.unitId}:${lease.fencingToken}`, jobId, runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "COMPLETED", rawManifestId: acquired.raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: lastSubmission, lastOutcomeId: lastOutcome, createdAt: isoNow() }, lease.leaseId, workerId)
  await d3Adapter.releaseLease(lease.unitId, lease.leaseId, workerId, lease.fencingToken, isoNow(), "COMPLETED"); await d3Adapter.completeRun(runId, "SUCCEEDED", isoNow()); await d3Adapter.aggregateJob(jobId, isoNow())
  if (!(await d3Adapter.reconcileUnit(lease.unitId)).consistent || !await d2Adapter.verifyLineageAcyclic()) throw new Error(`OPEN_INTEREST_PARTITION_RECONCILIATION_FAILED:${partition.partitionId}`)
  return Object.freeze({ ...progress, classification: "POPULATED", rawObjectId: acquired.raw.objectId, downloadedBytes: acquired.buffer.byteLength, parsedObservations: rows.length, acceptedCandidates: candidates.length, rejectedCandidates: sourceParsed.exactDuplicateRows, sourceDuplicateRows: sourceParsed.exactDuplicateRows, canonicalFactsCreated: createdFacts, canonicalFactsReused: reusedFacts, conflicts, updatedAt: isoNow() })
}

async function status(snapshot: OpenInterestExecutionSnapshot, clients: Clients, recent: readonly OpenInterestPartitionProgress[] = []): Promise<Record<string, unknown>> {
  const completed = await completedPartitionMap(clients)
  const states = await clients.d3.sql<Array<{ current_state: string; count: number }>>`SELECT current_state::text,count(*)::int count FROM control.population_units WHERE dataset_id='open-interest' GROUP BY current_state`
  const d2 = await clients.d2.sql<Array<{ facts: number; raw_objects: number; artifact_bytes: number; lineage: number; publication: number }>>`SELECT (SELECT count(*)::int FROM canonical.open_interest WHERE provider_id='binance-vision') facts,(SELECT count(*)::int FROM raw.objects WHERE dataset_id='open-interest' AND provider_id='binance-vision') raw_objects,(SELECT COALESCE(sum(size_bytes),0)::int FROM raw.objects WHERE dataset_id='open-interest' AND provider_id='binance-vision') artifact_bytes,(SELECT count(*)::int FROM repository.lineage_edges e JOIN canonical.open_interest f ON f.canonical_record_id=e.destination_node_id AND f.record_version::text=e.destination_node_version WHERE f.provider_id='binance-vision') lineage,(SELECT count(*)::int FROM repository.record_versions rv JOIN canonical.open_interest f ON f.canonical_record_id=rv.canonical_record_id AND f.record_version=rv.record_version WHERE f.provider_id='binance-vision' AND rv.current_publication_state='PENDING') publication`
  const d3 = await clients.d3.sql<Array<{ retrievals: number; downloaded_bytes: number; candidates: number; submissions: number; outcomes: number; coverage: number; checkpoints: number; retries: number; conflicts: number; active: number; rejected_duplicates: number }>>`SELECT (SELECT count(*)::int FROM control.retrieval_attempts WHERE provider_id='binance-vision' AND EXISTS(SELECT 1 FROM control.population_units u WHERE u.unit_id=control.retrieval_attempts.unit_id AND u.dataset_id='open-interest')) retrievals,(SELECT COALESCE(sum(raw_byte_count),0)::int FROM control.retrieval_attempts a JOIN control.population_units u ON u.unit_id=a.unit_id WHERE u.dataset_id='open-interest') downloaded_bytes,(SELECT count(*)::int FROM population.candidates WHERE dataset_id='open-interest') candidates,(SELECT count(*)::int FROM population.canonical_submissions s JOIN population.candidates c ON c.candidate_id=s.candidate_id WHERE c.dataset_id='open-interest') submissions,(SELECT count(*)::int FROM control.population_outcomes o JOIN population.candidates c ON c.candidate_id=o.candidate_id WHERE c.dataset_id='open-interest') outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions WHERE dataset_id='open-interest') coverage,(SELECT count(*)::int FROM control.population_checkpoints p JOIN control.population_units u ON u.unit_id=p.unit_id WHERE u.dataset_id='open-interest') checkpoints,(SELECT count(*)::int FROM control.retry_events r JOIN control.population_units u ON u.unit_id=r.unit_id WHERE u.dataset_id='open-interest') retries,(SELECT count(*)::int FROM population.candidate_conflicts q JOIN population.candidates c ON c.candidate_id=q.candidate_id WHERE c.dataset_id='open-interest') conflicts,(SELECT count(*)::int FROM control.population_leases l JOIN control.population_units u ON u.unit_id=l.unit_id WHERE u.dataset_id='open-interest' AND l.released_at IS NULL AND l.expires_at>now()) active,(SELECT COALESCE(sum((diagnostics->>'rejectedExactDuplicateRows')::int),0)::int FROM quality.candidate_validation_results WHERE rule_id='d3-phase3-open-interest-exact-source-duplicate') rejected_duplicates`
  const timing = await clients.d3.sql<Array<{ started_at: Date | null; completed_at: Date | null; completed: number }>>`SELECT min(r.started_at) started_at,max(r.completed_at) completed_at,count(DISTINCT u.unit_id) FILTER(WHERE u.current_state='COMPLETED')::int completed FROM control.population_runs r JOIN control.population_jobs j ON j.job_id=r.job_id JOIN control.population_units u ON u.job_id=j.job_id WHERE j.dataset_id='open-interest'`
  const complete = Object.keys(completed).length; const elapsedMs = timing[0]?.started_at ? Math.max(1, Date.now() - timing[0].started_at.getTime()) : 0; const partitionsPerHour = elapsedMs ? timing[0].completed / (elapsedMs / 3_600_000) : 0
  const perInstrument = snapshot.instruments.map((instrument) => { const partitions = snapshot.partitions.filter((partition) => partition.providerSymbol === instrument.providerSymbol); const done = partitions.filter((partition) => completed[partition.partitionId]).length; return { providerSymbol: instrument.providerSymbol, earliestArchiveDay: instrument.earliestVerifiedArchiveDay, finalEligibleObservationTime: instrument.finalEligibleObservationTime, expectedPartitions: partitions.length, completedPartitions: done, remainingPartitions: partitions.length - done } })
  const fs = await statfs(process.env.D3_BACKFILL_OBJECT_ROOT!)
  const progress = { schemaVersion: "1.0.0", snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.snapshotChecksum, generatedAt: isoNow(), totalPartitions: snapshot.completePartitionCount, completePartitions: complete, pendingPartitions: snapshot.completePartitionCount - complete, activeLeases: d3[0].active, classifications: { populated: complete, skippedAlreadyComplete: snapshot.alreadyCompletedPartitionCount, emptyConfirmed: 0, sourceUnavailable: 0, notApplicable: 0, gaps: Number(states.find((state) => state.current_state === "FAILED")?.count ?? 0), retryableFailures: Number(states.find((state) => state.current_state === "RETRYABLE")?.count ?? 0), exhaustedFailures: 0, conflicts: d3[0].conflicts, blocked: Number(states.find((state) => state.current_state === "QUARANTINED")?.count ?? 0) }, unitStates: Object.fromEntries(states.map((state) => [state.current_state, state.count])), perInstrument, throughput: { startedAt: timing[0]?.started_at?.toISOString() ?? null, lastCompletedAt: timing[0]?.completed_at?.toISOString() ?? null, elapsedMs, completedPartitions: timing[0]?.completed ?? 0, partitionsPerHour, estimatedRemainingMs: partitionsPerHour > 0 ? (snapshot.completePartitionCount - complete) / partitionsPerHour * 3_600_000 : null }, capacity: { availableArtifactBytes: fs.bavail * fs.bsize, snapshotSourceBytes: snapshot.measuredSourceBytes, expectedObservations: snapshot.expectedObservationCount }, persisted: { ...d2[0], ...d3[0] }, recent }
  await writeFile(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`, "utf8")
  return progress
}

async function run(snapshot: OpenInterestExecutionSnapshot, clients: Clients, command: Command): Promise<void> {
  const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false })
  const completed = await completedPartitionMap(clients); const symbol = arg("--instrument")?.toUpperCase() ?? null; const from = arg("--from"); const to = arg("--to"); const maxPartitions = positiveInt("--max-partitions", 1)
  let selected = snapshot.partitions.filter((partition) => !completed[partition.partitionId] && (!symbol || partition.providerSymbol === symbol) && (!from || partition.windowStart >= from) && (!to || partition.windowEnd <= to))
  if (command === "retry-failed" || command === "retry-gaps") {
    const failed = await clients.d3.sql<Array<{ partition_key: string }>>`SELECT partition_key FROM control.population_units WHERE dataset_id='open-interest' AND current_state IN ('FAILED','RETRYABLE')`
    const keys = new Set(failed.map((row) => row.partition_key)); selected = selected.filter((partition) => keys.has(partition.partitionId))
  }
  selected = selected.slice(0, maxPartitions)
  if (!selected.length) { console.log(JSON.stringify({ status: "NO_ELIGIBLE_PARTITIONS", progress: await status(snapshot, clients) })); return }
  await unlink(stopPath(snapshot.snapshotId)).catch(() => undefined)
  const results: OpenInterestPartitionProgress[] = []
  for (const partition of selected) {
    if (await readFile(stopPath(snapshot.snapshotId), "utf8").then(() => true).catch(() => false)) break
    const workerId = `${WORKER_PREFIX}-1`
    try { results.push(await processPartition(snapshot, partition, clients, storage, workerId)) }
    catch (error) { const reason = error instanceof Error ? error.message : "UNKNOWN"; await failActiveLease(clients, partition, workerId, reason); results.push(Object.freeze({ ...pendingProgress(partition.partitionId), classification: "BLOCKED", reasonCodes: [reason], updatedAt: isoNow() })) }
  }
  console.log(JSON.stringify({ status: "SAFE_BOUNDARY_REACHED", attempted: results.length, results, progress: await status(snapshot, clients, results) }))
}

async function reconcile(snapshot: OpenInterestExecutionSnapshot, clients: Clients): Promise<void> {
  const completed = await completedPartitionMap(clients)
  const invalid = await clients.d3.sql<Array<{ partition_key: string }>>`SELECT u.partition_key FROM control.population_units u WHERE u.dataset_id='open-interest' AND u.current_state='COMPLETED' AND (NOT EXISTS(SELECT 1 FROM coverage.watermark_eligibility_decisions w WHERE w.unit_id=u.unit_id AND w.eligibility_result='ELIGIBLE') OR NOT EXISTS(SELECT 1 FROM control.population_checkpoints p WHERE p.unit_id=u.unit_id AND p.checkpoint_type='CANONICAL_BOUNDARY')) ORDER BY u.partition_key`
  const active = await clients.d3.sql<Array<{ unit_id: string }>>`SELECT l.unit_id FROM control.population_leases l JOIN control.population_units u ON u.unit_id=l.unit_id WHERE u.dataset_id='open-interest' AND l.released_at IS NULL AND l.expires_at>now()`
  console.log(JSON.stringify({ consistent: invalid.length === 0, reasonCodes: invalid.length ? ["COMPLETED_UNIT_MISSING_COVERAGE_OR_CHECKPOINT"] : [], affectedPartitions: invalid.map((row) => row.partition_key), completePartitions: Object.keys(completed).length, incompletePartitions: snapshot.completePartitionCount - Object.keys(completed).length, activeLeases: active.length, executionComplete: Object.keys(completed).length === snapshot.completePartitionCount }))
}

async function validateSamples(snapshot: OpenInterestExecutionSnapshot, clients: Clients): Promise<void> {
  const completed = await completedPartitionMap(clients); const results = []
  for (const partition of snapshot.partitions.filter((item) => completed[item.partitionId])) {
    const source = await download(partition)
    if (source.status !== "AVAILABLE") throw new Error(`OPEN_INTEREST_SAMPLE_SOURCE_UNAVAILABLE:${partition.partitionId}`)
    const checksum = createHash("sha256").update(source.buffer).digest("hex")
    const parsed = parseBinanceVisionOpenInterestSource(extractFirstCsvFromZip(source.buffer), partition.providerSymbol)
    const rows = parsed.rows.filter((row) => row.observedAt < snapshot.frozenCutoffUtc)
    const indexes = [0, Math.floor(rows.length / 2), rows.length - 1]
    const samples = []
    let matched = 0
    for (const index of indexes) {
      const row = rows[index]
      const canonical = await clients.d2.sql<Array<{ open_interest: string; open_interest_value: string; unit: string; value_unit: string; observation_window: string; canonical_instrument_id: string; market_type: string; content_hash: string; lineage: number }>>`SELECT f.open_interest::text,f.open_interest_value::text,f.unit,f.value_unit,f.observation_window,f.canonical_instrument_id,f.market_type,r.content_hash,(SELECT count(*)::int FROM repository.lineage_edges le WHERE le.destination_node_id=f.canonical_record_id AND le.destination_node_version=f.record_version::text) lineage FROM canonical.open_interest f JOIN repository.lineage_edges e ON e.destination_node_id=f.canonical_record_id AND e.destination_node_version=f.record_version::text JOIN raw.objects r ON r.object_id=e.source_node_id WHERE f.symbol=${partition.providerSymbol} AND f.provider_id=${partition.providerId} AND f.observed_at=${row.observedAt} LIMIT 1`
      const found = canonical[0]
      const passed = Boolean(found && found.open_interest === row.openInterest && found.open_interest_value === row.openInterestValue && found.unit === "PROVIDER_NATIVE" && found.value_unit === "PROVIDER_NATIVE_QUOTE_VALUE" && found.observation_window === "5m" && found.canonical_instrument_id === partition.canonicalInstrumentId && found.market_type === partition.marketType && found.content_hash === checksum && found.lineage === 1)
      if (passed) matched += 1
      samples.push({ position: index === 0 ? "BEGINNING" : index === rows.length - 1 ? "END" : "MIDDLE", observedAt: row.observedAt, sourceOpenInterest: row.openInterest, canonicalOpenInterest: found?.open_interest ?? null, sourceOpenInterestValue: row.openInterestValue, canonicalOpenInterestValue: found?.open_interest_value ?? null, cadence: found?.observation_window ?? null, canonicalInstrumentId: found?.canonical_instrument_id ?? null, lineageEdges: found?.lineage ?? 0, passed })
    }
    results.push({ partitionId: partition.partitionId, providerSymbol: partition.providerSymbol, sourceChecksum: checksum, parsedUniqueObservations: rows.length, exactDuplicateSourceRows: parsed.exactDuplicateRows, samplesChecked: 3, samplesMatched: matched, samples, passed: matched === 3 })
  }
  console.log(JSON.stringify({ status: results.every((result) => result.passed) ? "PASS" : "FAIL", results }))
}

async function main() {
  const command = process.argv[2] as Command | undefined
  if (!command || !["enumerate", "status", "run", "resume", "stop", "retry-failed", "retry-gaps", "reconcile", "validate-samples"].includes(command)) throw new Error("Usage: runD3OpenInterestBackfill.ts <enumerate|status|run|resume|stop|retry-failed|retry-gaps|reconcile|validate-samples>")
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d3-open-interest-full-history-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "d3-open-interest-full-history-d3" } })
  try {
    if (command === "enumerate") { await enumerate(clients); return }
    const snapshot = await readSnapshot()
    if (command === "stop") { await mkdir(path.dirname(stopPath(snapshot.snapshotId)), { recursive: true }); await writeFile(stopPath(snapshot.snapshotId), `${isoNow()}\n`, { encoding: "utf8", flag: "w" }); console.log(JSON.stringify({ status: "STOP_REQUESTED", boundary: "AFTER_CURRENT_PARTITION" })); return }
    if (command === "status") { console.log(JSON.stringify(await status(snapshot, clients))); return }
    if (command === "reconcile") { await reconcile(snapshot, clients); return }
    if (command === "validate-samples") { await validateSamples(snapshot, clients); return }
    await run(snapshot, clients, command)
  } finally { await clients.shutdown() }
}

main().catch((error) => { console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" })); process.exitCode = 1 })
