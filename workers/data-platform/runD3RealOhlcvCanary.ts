import { createHash } from "node:crypto"

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
  D3_PHASE3_MANIFEST,
  ProductionNormalizerRegistry,
  PRODUCTION_NORMALIZER_VERSION,
} from "@/lib/data-platform/population/backfill"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"

type Mode = "first" | "rerun" | "inspect"
type ParsedRow = Readonly<{ openTime: string; closeTime: string; open: string; high: string; low: string; close: string; volume: string; sourceTimestamp: string }>

const DATASET_REGISTRY_ID = "d3-phase3-dataset-registry-v1"
const PROVIDER_REGISTRY_ID = "d3-phase3-binance-archive-provider-v1"
const PROVIDER_CERTIFICATION_ID = "d3-phase3-binance-archive-ohlcv-certification-v1"
const POLICY_ID = "d3-phase3-ohlcv-canary-policy-v1"
const PARSER_VERSION = "binance-vision-ohlcv-csv-v1"
const SCHEMA_VERSION = "1"
const WORKER_ID = "d3-phase3-ohlcv-canary-worker"
const partition = createBinanceVisionOhlcvPartition({ symbol: "BTCUSDT", resolution: "5m", day: "2026-07-11" })

function isoNow(): string { return new Date().toISOString() }
function decimal(value: string, field: string): string {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error(`SOURCE_${field}_INVALID`)
  return value
}
function sourceTime(value: string, field: string): string {
  if (!/^\d+$/.test(value)) throw new Error(`SOURCE_${field}_INVALID`)
  const raw = BigInt(value)
  const milliseconds = value.length > 13 ? raw / BigInt(1000) : raw
  const numeric = Number(milliseconds)
  if (!Number.isSafeInteger(numeric)) throw new Error(`SOURCE_${field}_UNSAFE`)
  return new Date(numeric).toISOString()
}

function parseCsv(csv: string): { readonly rows: readonly ParsedRow[]; readonly rejected: Readonly<Record<string, number>> } {
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

function stream(buffer: Buffer): AsyncIterable<Uint8Array> { return { async *[Symbol.asyncIterator]() { yield buffer } } }
async function readArtifact(storage: Awaited<ReturnType<typeof createFilesystemObjectStorage>>, key: string): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of storage.read(key)) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

async function download(): Promise<Buffer> {
  const response = await fetch(partition.sourceUrl, { cache: "no-store", signal: AbortSignal.timeout(60_000), headers: { accept: "application/zip,application/octet-stream,*/*", "user-agent": "QuantTerminal-D3-Canary/1.0" } })
  if (!response.ok) throw new Error(`CANARY_SOURCE_HTTP_${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

function candidate(row: ParsedRow, ordinal: number, unitId: string, retrievalAttemptId: string, raw: RawObjectManifest, createdAt: string): Extract<PopulationCandidate, { readonly kind: "OHLCV" }> {
  const sourceObservationId = `${partition.providerId}:${partition.providerSymbol}:${partition.resolution}:${row.openTime}`
  const candidateId = createCandidateId({ rawManifestId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, candidateOrdinal: String(ordinal) })
  const payload = Object.freeze({ symbol: partition.providerSymbol, resolution: partition.resolution, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, closeTime: row.closeTime })
  return Object.freeze({ kind: "OHLCV", candidateId, unitId, retrievalAttemptId, rawManifestId: raw.objectId, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, sourceObservationId, sourceObservedAt: row.openTime, effectiveAt: row.openTime, parserVersion: PARSER_VERSION, candidateSchemaVersion: SCHEMA_VERSION, payload, candidateChecksum: canonicalChecksum({ rawObjectId: raw.objectId, sourceObservationId, parserVersion: PARSER_VERSION, payload }), validationStatus: "ELIGIBLE", qualityEligibility: "ELIGIBLE", normalizationEligibility: "ELIGIBLE", createdAt })
}

async function counts(d2: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>["d2"], d3: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>["d3"]) {
  const [d2Rows, d3Rows] = await Promise.all([
    d2.sql<Array<Record<string, number>>>`SELECT (SELECT count(*)::int FROM raw.objects WHERE dataset_id='ohlcv' AND provider_id=${partition.providerId}) raw_objects,(SELECT count(*)::int FROM canonical.ohlcv WHERE symbol=${partition.providerSymbol} AND resolution=${partition.resolution} AND open_time>=${partition.windowStart} AND open_time<${partition.windowEnd}) canonical_facts,(SELECT count(*)::int FROM repository.lineage_edges e JOIN canonical.ohlcv o ON o.canonical_record_id=e.destination_node_id AND o.record_version::text=e.destination_node_version WHERE o.symbol=${partition.providerSymbol} AND o.resolution=${partition.resolution} AND o.open_time>=${partition.windowStart} AND o.open_time<${partition.windowEnd}) lineage,(SELECT count(*)::int FROM repository.record_versions rv JOIN canonical.ohlcv o ON o.canonical_record_id=rv.canonical_record_id AND o.record_version=rv.record_version WHERE o.symbol=${partition.providerSymbol} AND o.resolution=${partition.resolution} AND o.open_time>=${partition.windowStart} AND o.open_time<${partition.windowEnd} AND rv.current_publication_state='PENDING') pending_publication,(SELECT count(*)::int FROM quarantine.conflicts) conflicts`,
    d3.sql<Array<Record<string, number>>>`SELECT (SELECT count(*)::int FROM control.population_jobs WHERE dataset_id='ohlcv' AND provider_id=${partition.providerId}) jobs,(SELECT count(*)::int FROM control.population_runs r JOIN control.population_jobs j ON j.job_id=r.job_id WHERE j.dataset_id='ohlcv' AND j.provider_id=${partition.providerId}) runs,(SELECT count(*)::int FROM control.population_units WHERE dataset_id='ohlcv' AND provider_id=${partition.providerId}) units,(SELECT count(*)::int FROM control.retrieval_attempts WHERE provider_id=${partition.providerId}) retrievals,(SELECT count(*)::int FROM population.candidates WHERE dataset_id='ohlcv' AND provider_id=${partition.providerId}) candidates,(SELECT count(*)::int FROM population.canonical_submissions s JOIN population.candidates c ON c.candidate_id=s.candidate_id WHERE c.dataset_id='ohlcv' AND c.provider_id=${partition.providerId}) submissions,(SELECT count(*)::int FROM control.population_outcomes o JOIN population.candidates c ON c.candidate_id=o.candidate_id WHERE c.dataset_id='ohlcv' AND c.provider_id=${partition.providerId}) outcomes,(SELECT count(*)::int FROM coverage.watermark_eligibility_decisions WHERE dataset_id='ohlcv' AND provider_id=${partition.providerId}) coverage,(SELECT count(*)::int FROM control.population_checkpoints p JOIN control.population_units u ON u.unit_id=p.unit_id WHERE u.dataset_id='ohlcv' AND u.provider_id=${partition.providerId}) checkpoints`,
  ])
  return Object.freeze({ ...d2Rows[0], ...d3Rows[0] })
}

async function seedGovernance(adapter: ReturnType<typeof createCanonicalPersistenceAdapter>) {
  const effectiveAt = partition.windowEnd
  const inputs = [
    adapter.registerRegistrySnapshot({ snapshotId: DATASET_REGISTRY_ID, registryVersion: "1.0.0", contentChecksum: canonicalChecksum({ datasetId: "ohlcv", schemaVersion: SCHEMA_VERSION }), canonicalContent: { datasetId: "ohlcv", schemaVersion: SCHEMA_VERSION, purpose: "D3_PHASE3_CANARY" }, effectiveAt, createdAt: effectiveAt }),
    adapter.registerProviderSnapshot({ snapshotId: PROVIDER_REGISTRY_ID, providerId: partition.providerId, registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ providerId: partition.providerId, scope: "BINANCE_VISION_OHLCV_ARCHIVE" }), canonicalContent: { providerId: partition.providerId, scope: "BINANCE_VISION_OHLCV_ARCHIVE", limitation: "OHLCV_ONLY" }, effectiveAt, createdAt: effectiveAt }),
    adapter.registerProviderSnapshot({ snapshotId: PROVIDER_CERTIFICATION_ID, providerId: partition.providerId, registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", contentChecksum: canonicalChecksum({ providerId: partition.providerId, certification: "OHLCV_CANARY" }), canonicalContent: { providerId: partition.providerId, certification: "OHLCV_CANARY", limitation: "ONE_PARTITION" }, effectiveAt, createdAt: effectiveAt }),
    adapter.registerPolicyVersion({ policyVersionId: POLICY_ID, datasetId: "ohlcv", policyVersion: "1.0.0", contentChecksum: canonicalChecksum({ datasetId: "ohlcv", source: partition.providerId, resolution: "5m", normalizationVersion: PRODUCTION_NORMALIZER_VERSION }), canonicalContent: { datasetId: "ohlcv", source: partition.providerId, resolution: "5m", normalizationVersion: PRODUCTION_NORMALIZER_VERSION }, effectiveAt, createdAt: effectiveAt }),
  ]
  const results = await Promise.all(inputs)
  if (results.some((result) => result.status === "CONFLICT" || result.status === "REJECTED")) throw new Error(`CANARY_GOVERNANCE_BINDING_FAILED:${JSON.stringify(results)}`)
}

function buildRequest(at: string): { readonly request: PopulationJobRequest; readonly job: PopulationJob } {
  const profile: PopulationJobProfile = Object.freeze({ profileId: "d3-phase3-real-ohlcv-canary", profileVersion: "1.0.0", kind: "BACKFILL", requiredDimensions: ["venue", "subjectOrSymbol", "windowStart", "windowEnd", "resolution", "partitionKey"] as const, rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "retry.historical-source", retryPolicyVersion: "UNAVAILABLE", watermarkPolicyId: "coverage.ohlcv.partition", watermarkPolicyVersion: "1.0.0" })
  const dimensions = Object.freeze({ venue: partition.venue, subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: partition.resolution, partitionKey: `BTCUSDT:5m:2026-07-11` })
  const base = { profile, datasetId: partition.datasetId, providerId: partition.providerId, dimensions }
  const requestIdentity = createJobRequestIdentity(base)
  const request: PopulationJobRequest = Object.freeze({ ...base, requestIdentity, occurrenceIdentity: `${D3_PHASE3_MANIFEST.manifestId}:${dimensions.partitionKey}`, intentionalRerunIdentity: null, requestedAt: at, requestedBy: "d3-phase3-canary" })
  const jobId = createPopulationJobId(request.requestIdentity, request.occurrenceIdentity, request.intentionalRerunIdentity)
  return { request, job: Object.freeze({ jobId, request, currentState: "QUEUED", currentEventId: `population-event:job-created:${jobId}`, createdAt: at, updatedAt: at }) }
}

async function acquire(storage: Awaited<ReturnType<typeof createFilesystemObjectStorage>>): Promise<{ readonly buffer: Buffer; readonly raw: RawObjectManifest }> {
  const buffer = await download()
  const contentHash = createHash("sha256").update(buffer).digest("hex")
  const objectStorageKey = `raw/${contentHash.slice(0, 2)}/${contentHash}.zip`
  const reference = await storage.putImmutable({ objectStorageKey, contentHash, mediaType: partition.mediaType, byteLength: buffer.byteLength, content: stream(buffer) })
  const at = isoNow()
  const raw: RawObjectManifest = Object.freeze({ objectId: reference.rawObjectId, datasetId: partition.datasetId, providerId: partition.providerId, venue: partition.venue, symbolOrSubject: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, contentHash, sizeBytes: buffer.byteLength, mediaType: partition.mediaType, compression: partition.compression, retrievedAt: at, providerSnapshotId: PROVIDER_REGISTRY_ID, retentionClass: "ARCHIVE", verificationState: reference.verificationState, objectStorageKey, createdAt: at })
  return { buffer: await readArtifact(storage, objectStorageKey), raw }
}

async function samples(d2: Awaited<ReturnType<typeof createIntegratedBackfillClientsFromEnvironment>>["d2"], rows: readonly ParsedRow[], candidates: readonly Extract<PopulationCandidate, { readonly kind: "OHLCV" }>[]) {
  const indexes = [0, Math.floor(rows.length / 2), rows.length - 1]
  return Promise.all(indexes.map(async (index) => {
    const source = rows[index]; const expectedCandidate = candidates[index]
    const found = await d2.sql<Array<{ open_time: Date; close_time: Date; open: string; high: string; low: string; close: string; volume: string; canonical_record_id: string; record_version: number; provider_id: string; symbol: string; resolution: string; lineage: number }>>`SELECT o.open_time,o.close_time,o.open::text,o.high::text,o.low::text,o.close::text,o.volume::text,o.canonical_record_id,o.record_version,o.provider_id,o.symbol,o.resolution,(SELECT count(*)::int FROM repository.lineage_edges e WHERE e.destination_node_id=o.canonical_record_id AND e.destination_node_version=o.record_version::text) lineage FROM canonical.ohlcv o WHERE o.symbol=${partition.providerSymbol} AND o.resolution=${partition.resolution} AND o.open_time=${source.openTime}`
    if (!found[0]) throw new Error(`CANARY_SAMPLE_MISSING:${source.openTime}`)
    return Object.freeze({ position: index === 0 ? "BEGINNING" : index === rows.length - 1 ? "END" : "MIDDLE", source, candidateId: expectedCandidate.candidateId, canonical: { ...found[0], open_time: found[0].open_time.toISOString(), close_time: found[0].close_time.toISOString() }, matches: found[0].open_time.toISOString() === source.openTime && found[0].close_time.toISOString() === source.closeTime && found[0].open === source.open && found[0].high === source.high && found[0].low === source.low && found[0].close === source.close && found[0].volume === source.volume && found[0].provider_id === partition.providerId && found[0].symbol === partition.providerSymbol && found[0].resolution === partition.resolution && found[0].lineage === 1 })
  }))
}

async function main() {
  const mode = process.argv[2] as Mode | undefined
  if (mode !== "first" && mode !== "rerun" && mode !== "inspect") throw new Error("Usage: runD3RealOhlcvCanary.ts <first|rerun|inspect>")
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "d3-real-ohlcv-canary-d2" }, d3: { roleIntent: "WORKER", maxConnections: 2, applicationName: "d3-real-ohlcv-canary-d3" } })
  try {
    const d2Adapter = createCanonicalPersistenceAdapter(clients.d2)
    const d3Adapter = createPopulationPostgresAdapter(clients.d3)
    const commitPort = createD3ToD2CanonicalCommitPort(d2Adapter)
    const storage = await createFilesystemObjectStorage({ root: process.env.D3_BACKFILL_OBJECT_ROOT!, repositoryRoot: process.cwd(), createRoot: false })
    if (mode === "inspect") { console.log(JSON.stringify({ status: "INSPECTED", counts: await counts(clients.d2, clients.d3) })); return }
    await seedGovernance(d2Adapter)
    const before = await counts(clients.d2, clients.d3)
    const acquired = await acquire(storage)
    const rawRegistration = await d2Adapter.registerRawObjectManifest(acquired.raw)
    if (rawRegistration.status === "CONFLICT" || rawRegistration.status === "REJECTED") throw new Error(`CANARY_RAW_REGISTRATION_FAILED:${rawRegistration.status}`)
    const parsed = parseCsv(extractFirstCsvFromZip(acquired.buffer))
    if (parsed.rows.length === 0 || Object.keys(parsed.rejected).length > 0) throw new Error(`CANARY_SOURCE_VALIDATION_FAILED:${JSON.stringify(parsed.rejected)}`)
    const requestAt = isoNow(); const built = buildRequest(requestAt)
    const retrievalAttemptId = createRetrievalAttemptId(createPopulationUnitIdForCanary(built.job), `population-run-v1:${createHash("sha256").update(JSON.stringify([built.job.jobId, "1"])).digest("hex")}`, 1)

    if (mode === "rerun") {
      const existing = await clients.d3.sql<Array<{ unit_id: string; run_id: string; retrieval_attempt_id: string }>>`SELECT u.unit_id,r.run_id,a.attempt_id retrieval_attempt_id FROM control.population_units u JOIN control.population_runs r ON r.job_id=u.job_id JOIN control.retrieval_attempts a ON a.unit_id=u.unit_id WHERE u.dataset_id='ohlcv' AND u.provider_id=${partition.providerId} AND u.partition_key='BTCUSDT:5m:2026-07-11' ORDER BY r.attempt_number LIMIT 1`
      if (!existing[0]) throw new Error("CANARY_RERUN_BASELINE_MISSING")
      const createdAt = isoNow(); const rerunCandidates = parsed.rows.map((row, index) => candidate(row, index, existing[0].unit_id, existing[0].retrieval_attempt_id, acquired.raw, createdAt))
      let candidateDuplicates = 0; let factDuplicates = 0; let submissionDuplicates = 0
      const normalizer = new ProductionNormalizerRegistry()
      for (const value of rerunCandidates) {
        if ((await d3Adapter.persistCandidate(value)).status === "DUPLICATE") candidateDuplicates += 1
        const command = normalizer.normalize({ candidate: value, datasetRegistrySnapshotId: DATASET_REGISTRY_ID, providerRegistrySnapshotId: PROVIDER_REGISTRY_ID, providerCertificationSnapshotId: PROVIDER_CERTIFICATION_ID, policyVersionId: POLICY_ID, schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: acquired.raw.objectId, rawObject: acquired.raw })
        if ((await commitPort.execute(command)).status === "DUPLICATE") factDuplicates += 1
        if ((await d3Adapter.createSubmission(`submission:${value.candidateId}`, value.candidateId, command.idempotencyKey, createdAt)) === "DUPLICATE") submissionDuplicates += 1
      }
      const after = await counts(clients.d2, clients.d3)
      if (JSON.stringify(before) !== JSON.stringify(after) || candidateDuplicates !== parsed.rows.length || factDuplicates !== parsed.rows.length || submissionDuplicates !== parsed.rows.length) throw new Error(`CANARY_RERUN_IDEMPOTENCY_FAILED:${JSON.stringify({ before, after, candidateDuplicates, factDuplicates, submissionDuplicates })}`)
      console.log(JSON.stringify({ status: "RERUN_DUPLICATE", sourceUrl: partition.sourceUrl, downloadedBytes: acquired.buffer.byteLength, contentHash: acquired.raw.contentHash, parsedRows: parsed.rows.length, rejected: parsed.rejected, rawRegistration: rawRegistration.status, candidateDuplicates, factDuplicates, submissionDuplicates, before, after, samples: await samples(clients.d2, parsed.rows, rerunCandidates) }))
      return
    }

    const created = await d3Adapter.createJob(built.request)
    if (created.status !== "CREATED") throw new Error("CANARY_JOB_ALREADY_EXISTS")
    const run = await d3Adapter.createRun(created.jobId, 1, requestAt)
    const units = expandPopulationUnits(built.job, [{ profileId: built.request.profile.profileId, profileVersion: built.request.profile.profileVersion, datasetId: partition.datasetId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, policyVersionId: POLICY_ID, venue: partition.venue, subjectOrSymbol: partition.providerSymbol, windowStart: partition.windowStart, windowEnd: partition.windowEnd, resolution: partition.resolution, partitionKey: "BTCUSDT:5m:2026-07-11", requestFingerprint: built.request.requestIdentity, requestParameters: { manifestId: D3_PHASE3_MANIFEST.manifestId, sourceObject: "BTCUSDT-5m-2026-07-11.zip" }, required: true }], requestAt)
    if (await d3Adapter.expandUnits(units) !== 1) throw new Error("CANARY_UNIT_EXPANSION_FAILED")
    const lease = await d3Adapter.claimUnit(WORKER_ID, run.runId, isoNow(), new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())
    if (!lease || lease.unitId !== units[0].unitId) throw new Error("CANARY_UNIT_CLAIM_FAILED")
    await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "RETRIEVING", "canary-retrieving", isoNow())
    const actualRetrievalId = createRetrievalAttemptId(lease.unitId, run.runId, 1)
    await d3Adapter.appendRetrievalAttempt({ attemptId: actualRetrievalId, unitId: lease.unitId, runId: run.runId, providerId: partition.providerId, providerSnapshotId: PROVIDER_REGISTRY_ID, requestFingerprint: built.request.requestIdentity, startedAt: requestAt, completedAt: isoNow(), outcome: "SUCCESS", statusCode: 200, retryAfter: null, responseMediaType: partition.mediaType, rawByteCount: acquired.buffer.byteLength, rawManifestId: acquired.raw.objectId, errorClass: null, errorCode: null, retryClassificationId: null })
    await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "RAW_PERSISTED", "canary-raw-persisted", isoNow())
    await d3Adapter.checkpoint({ checkpointId: `checkpoint:raw:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "RAW_BOUNDARY", completedStage: "RAW_PERSISTED", rawManifestId: acquired.raw.objectId, candidateCursor: null, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, WORKER_ID)
    const createdAt = isoNow(); const candidates = parsed.rows.map((row, index) => candidate(row, index, lease.unitId, actualRetrievalId, acquired.raw, createdAt))
    for (const value of candidates) {
      if ((await d3Adapter.persistCandidate(value)).status !== "CREATED") throw new Error(`CANARY_CANDIDATE_NOT_CREATED:${value.candidateId}`)
      await d3Adapter.appendValidation({ validationRunId: `validation:${value.candidateId}`, candidateId: value.candidateId, retrievalAttemptId: actualRetrievalId, layer: "STRUCTURAL", ruleId: "d3-phase3-ohlcv-source-structure", ruleVersion: "1.0.0", outcome: "PASSED", blocking: false, failureRouting: null, policyVersionId: POLICY_ID, diagnostics: { interval: "5m", source: "binance-vision", columns: 11 }, createdAt })
    }
    await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "CANDIDATES_READY", "canary-candidates-ready", isoNow())
    await d3Adapter.checkpoint({ checkpointId: `checkpoint:candidate:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANDIDATE_BOUNDARY", completedStage: "CANDIDATES_READY", rawManifestId: acquired.raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: null, lastOutcomeId: null, createdAt: isoNow() }, lease.leaseId, WORKER_ID)
    await d3Adapter.advanceUnit(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, "PROCESSING", "canary-processing", isoNow())
    const normalizer = new ProductionNormalizerRegistry(); const outcomes = []
    let lastSubmission = ""; let lastOutcome = ""
    for (const value of candidates) {
      const command = normalizer.normalize({ candidate: value, datasetRegistrySnapshotId: DATASET_REGISTRY_ID, providerRegistrySnapshotId: PROVIDER_REGISTRY_ID, providerCertificationSnapshotId: PROVIDER_CERTIFICATION_ID, policyVersionId: POLICY_ID, schemaVersion: SCHEMA_VERSION, normalizationVersion: PRODUCTION_NORMALIZER_VERSION, rawManifestId: acquired.raw.objectId, rawObject: acquired.raw })
      const submissionId = `submission:${value.candidateId}`; const outcomeId = `outcome:${value.candidateId}`
      if (await d3Adapter.createSubmission(submissionId, value.candidateId, command.idempotencyKey, isoNow()) !== "CREATED") throw new Error("CANARY_SUBMISSION_NOT_CREATED")
      const result = await commitPort.execute(command)
      if (result.status !== "SUCCESS") throw new Error(`CANARY_D2_COMMIT_FAILED:${result.status}`)
      outcomes.push(await d3Adapter.recordD2Result({ jobId: created.jobId, runId: run.runId, unitId: lease.unitId, candidateId: value.candidateId, retrievalAttemptId: actualRetrievalId, rawManifestId: acquired.raw.objectId, submissionId, leaseId: lease.leaseId, ownerId: WORKER_ID, fencingToken: lease.fencingToken, result, outcomeId, createdAt: isoNow() }))
      lastSubmission = submissionId; lastOutcome = outcomeId
    }
    const watermark = createWatermarkEligibility({ decisionId: `watermark:${lease.unitId}`, unitId: lease.unitId, datasetId: partition.datasetId, providerId: partition.providerId, dimensions: built.request.dimensions, outcomeIds: outcomes.map((outcome) => outcome.outcomeId), requiredUnitPolicyId: "required-ohlcv-canary", blockingReasons: [], policyVersionId: POLICY_ID, createdAt: isoNow(), outcome: outcomes.at(-1)! })
    await d3Adapter.writeWatermarkDecision(watermark)
    await d3Adapter.checkpoint({ checkpointId: `checkpoint:canonical:${lease.unitId}`, jobId: created.jobId, runId: run.runId, unitId: lease.unitId, fencingToken: lease.fencingToken, checkpointType: "CANONICAL_BOUNDARY", completedStage: "COMPLETED", rawManifestId: acquired.raw.objectId, candidateCursor: candidates.at(-1)!.candidateId, canonicalSubmissionId: lastSubmission, lastOutcomeId: lastOutcome, createdAt: isoNow() }, lease.leaseId, WORKER_ID)
    await d3Adapter.releaseLease(lease.unitId, lease.leaseId, WORKER_ID, lease.fencingToken, isoNow(), "COMPLETED")
    await d3Adapter.completeRun(run.runId, "SUCCEEDED", isoNow()); await d3Adapter.aggregateJob(created.jobId, isoNow())
    const reconciliation = { job: await d3Adapter.reconcileJob(created.jobId), run: await d3Adapter.reconcileRun(run.runId), unit: await d3Adapter.reconcileUnit(lease.unitId), lineageAcyclic: await d2Adapter.verifyLineageAcyclic() }
    if (!reconciliation.job.consistent || !reconciliation.run.consistent || !reconciliation.unit.consistent || !reconciliation.lineageAcyclic) throw new Error(`CANARY_RECONCILIATION_FAILED:${JSON.stringify(reconciliation)}`)
    const after = await counts(clients.d2, clients.d3)
    console.log(JSON.stringify({ status: "SUCCESS", sourceUrl: partition.sourceUrl, downloadedBytes: acquired.buffer.byteLength, contentHash: acquired.raw.contentHash, rawObjectId: acquired.raw.objectId, objectStorageKey: acquired.raw.objectStorageKey, parsedRows: parsed.rows.length, rejected: parsed.rejected, rawRegistration: rawRegistration.status, before, after, reconciliation, samples: await samples(clients.d2, parsed.rows, candidates) }))
  } finally { await clients.shutdown() }
}

function createPopulationUnitIdForCanary(job: PopulationJob): string {
  return `population-unit-v1:${createHash("sha256").update(JSON.stringify([job.request.profile.profileId, job.request.profile.profileVersion, partition.datasetId, partition.providerId, partition.venue, partition.providerSymbol, partition.windowStart, partition.windowEnd, partition.resolution, "BTCUSDT:5m:2026-07-11"])).digest("hex")}`
}

main().catch((error) => { console.error(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" })); process.exitCode = 1 })
