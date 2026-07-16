import { createHash } from "node:crypto"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createIsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"
import {
  MvpRefreshStore,
  auditNonRetainedProviderPayload,
  compareStableOhlcvFactSets,
  computeStableOhlcvDigests,
  createBoundedArchiveRequest,
  createMvpRefreshClientFromEnvironment,
  parseBoundedOhlcvArchive,
  type RefreshUnitAttemptAudit,
  type StableOhlcvFact,
} from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"

function requiredEnvironment(name: "D2_ISOLATED_POSTGRES_URL" | "D3_ISOLATED_POSTGRES_URL"): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name}_REQUIRED`)
  return value
}

function localClient(name: "D2_ISOLATED_POSTGRES_URL" | "D3_ISOLATED_POSTGRES_URL") {
  return createIsolatedPostgresClient({ connectionString: requiredEnvironment(name), roleIntent: "READ_ONLY", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-canonical-output-equivalence-audit" })
}

function checkpointValue(checkpoint: Readonly<Record<string, unknown>>, key: string): string | null {
  return typeof checkpoint[key] === "string" ? checkpoint[key] : null
}

function stableD2Fact(row: Record<string, unknown>): StableOhlcvFact {
  return Object.freeze({
    canonicalFactIdentity: String(row.fact_id), dataset: "ohlcv", instrument: String(row.symbol), eventTimestamp: new Date(String(row.open_time)).toISOString(), interval: String(row.resolution),
    open: String(row.open), high: String(row.high), low: String(row.low), close: String(row.close), volume: String(row.volume), provider: String(row.provider_id),
    sourceEventIdentity: String(row.business_identity), canonicalVersion: Number(row.record_version), supersedesIdentity: row.supersedes_identity ? String(row.supersedes_identity) : null,
    immutablePayloadChecksum: String(row.checksum),
  })
}

function stableProviderFact(row: { readonly openTime: string; readonly open: string; readonly high: string; readonly low: string; readonly close: string; readonly volume: string }): StableOhlcvFact {
  return Object.freeze({ canonicalFactIdentity: `provider:BTCUSDT:${row.openTime}`, dataset: "ohlcv", instrument: "BTCUSDT", eventTimestamp: row.openTime, interval: "5m", open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, provider: "binance-vision", sourceEventIdentity: row.openTime, canonicalVersion: null, supersedesIdentity: null, immutablePayloadChecksum: null })
}

function attemptInventory(attempt: RefreshUnitAttemptAudit, metadata: Record<string, unknown> | undefined, d3Candidates: readonly Record<string, unknown>[]): object {
  const recordedDigest = checkpointValue(attempt.checkpoint, "factDigest")
  const reconstructed = attempt.state === "COMMITTED" ? canonicalChecksum({ unit: attempt.unitId, stage: "COMMITTED" }) : null
  return Object.freeze({
    runId: attempt.runId, unitId: attempt.unitId, logicalSlot: "binance-vision:ohlcv:BTCUSDT:2026-07-15:5m", state: attempt.state, stateEvents: attempt.events,
    retrievalIdentities: Object.freeze(attempt.artifacts.map((value) => value.retrievalIdentity).filter(Boolean)), artifactIdentities: Object.freeze(attempt.artifacts.map((value) => value.artifactId)),
    artifactChecksums: Object.freeze([...attempt.artifacts.map((value) => value.checksum), checkpointValue(attempt.checkpoint, "artifactChecksum")].filter(Boolean)),
    d3CandidateIdentities: Object.freeze(d3Candidates.map((value) => String(value.candidate_id))), canonicalCommitIdentities: Object.freeze([]), canonicalFactIdentities: Object.freeze([]),
    recordedFactDigest: recordedDigest, recordedDigestReconstructed: recordedDigest !== null && recordedDigest === reconstructed,
    parserVersion: null, normalizationVersion: null, modelVersion: null, sourceContractVersion: null,
    refreshCandidateId: metadata?.candidate_id ?? null, refreshCandidateChecksum: metadata?.candidate_checksum ?? null,
    checkpointKeys: Object.freeze(Object.keys(attempt.checkpoint).sort()), lease: attempt.lease,
    provenance: "CONTRACT_PROVENANCE_UNRECORDED", canonicalFacts: "UNATTRIBUTABLE_NO_COMMIT_OR_LINEAGE_IDENTITY",
  })
}

async function providerComparison(): Promise<object> {
  const request = createBoundedArchiveRequest({ dataset: "ohlcv", provider: "binance-vision", instrument: "BTCUSDT", eventTimeStart: START, eventTimeEnd: END, sourceContractVersion: "mvp-bounded-ohlcv/1.0.0", maximumRecordCount: 1_000 })
  const response = await fetch((await import("@/lib/data-platform/mvp-refresh/boundedAdapters")).boundedArchiveSourceUrl(request), { cache: "no-store" })
  if (!response.ok) return Object.freeze({ classification: "PROVIDER_COMPARISON_INCONCLUSIVE", sourceStatus: `HTTP_${response.status}`, retainedPayload: false })
  const result = await auditNonRetainedProviderPayload(async () => new Uint8Array(await response.arrayBuffer()), (bytes) => {
    const rawSha256 = createHash("sha256").update(bytes).digest("hex")
    const batch = parseBoundedOhlcvArchive(request, bytes), facts = batch.rows.map(stableProviderFact)
    return Object.freeze({ rawSha256, parsed: computeStableOhlcvDigests(facts), stableFacts: facts })
  })
  return Object.freeze({ classification: "PROVIDER_COMPARISON_INCONCLUSIVE", sourceStatus: "HTTP_SUCCESS", ...result.audit, retainedPayload: result.retainedPayload })
}

async function main(): Promise<void> {
  const refresh = createMvpRefreshClientFromEnvironment(), d2 = localClient("D2_ISOLATED_POSTGRES_URL"), d3 = localClient("D3_ISOLATED_POSTGRES_URL")
  try {
    await refresh.verify()
    const targets = await Promise.all([d2.sql.unsafe<Array<{ database_ok: boolean }>>("SELECT current_database()='quantterminal_d2_isolated' database_ok"), d3.sql.unsafe<Array<{ database_ok: boolean }>>("SELECT current_database()='quantterminal_d3_isolated' database_ok")])
    if (!targets[0][0]?.database_ok || !targets[1][0]?.database_ok) throw new Error("CANONICAL_AUDIT_TARGET_MISMATCH")
    const attempts = await new MvpRefreshStore(refresh).auditUnitsForWindow(START, END)
    const unitIds = attempts.map((attempt) => attempt.unitId), runIds = attempts.map((attempt) => attempt.runId)
    const metadata = await refresh.sql.unsafe<Array<Record<string, unknown>>>("SELECT r.run_id,r.checksum run_checksum,p.active_corpus_id,p.checksum plan_checksum,c.candidate_id,c.checksum candidate_checksum FROM refresh_control.refresh_run r JOIN refresh_control.refresh_plan p ON p.plan_id=r.plan_id LEFT JOIN refresh_control.refresh_candidate c ON c.run_id=r.run_id WHERE r.run_id=ANY($1::text[]) ORDER BY r.run_id", [runIds])
    const d2Relations = await d2.sql.unsafe<Array<{ ohlcv: boolean; record_versions: boolean; raw_objects: boolean }>>("SELECT to_regclass('canonical.ohlcv') IS NOT NULL ohlcv,to_regclass('repository.record_versions') IS NOT NULL record_versions,to_regclass('raw.objects') IS NOT NULL raw_objects")
    const d3Relations = await d3.sql.unsafe<Array<{ candidates: boolean; raw_objects: boolean }>>("SELECT to_regclass('population.candidates') IS NOT NULL candidates,to_regclass('raw.objects') IS NOT NULL raw_objects")
    const d3Candidates = d3Relations[0]?.candidates ? await d3.sql.unsafe<Array<Record<string, unknown>>>("SELECT unit_id,candidate_id,retrieval_attempt_id,raw_manifest_id,parser_version,candidate_schema_version,candidate_checksum FROM population.candidates WHERE unit_id=ANY($1::text[]) ORDER BY unit_id,candidate_id", [unitIds]) : []
    const d2Rows = d2Relations[0]?.ohlcv && d2Relations[0]?.record_versions ? await d2.sql.unsafe<Array<Record<string, unknown>>>("SELECT o.fact_id,o.canonical_record_id,o.business_identity,o.record_version,o.provider_id,o.symbol,o.resolution,o.open_time::text,o.close_time::text,o.open::text,o.high::text,o.low::text,o.close::text,o.volume::text,o.schema_version,o.normalization_version,o.checksum,prev.version_id supersedes_identity FROM canonical.ohlcv o LEFT JOIN repository.record_versions prev ON prev.canonical_record_id=o.canonical_record_id AND prev.record_version=o.record_version-1 WHERE o.symbol='BTCUSDT' AND o.resolution='5m' AND o.open_time >= $1 AND o.open_time < $2 ORDER BY o.open_time,o.fact_id", [START, END]) : []
    const acquiredChecksum = attempts.find((attempt) => attempt.state === "ACQUIRED")?.checkpoint.artifactChecksum
    const objectLinks = typeof acquiredChecksum === "string" ? await Promise.all([d2Relations[0]?.raw_objects ? d2.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM raw.objects WHERE content_hash=$1", [acquiredChecksum]) : Promise.resolve([{ count: 0 }]), d3Relations[0]?.raw_objects ? d3.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM raw.objects WHERE content_hash=$1", [acquiredChecksum]) : Promise.resolve([{ count: 0 }])]) : [[{ count: 0 }], [{ count: 0 }]]
    const inventory = attempts.map((attempt) => attemptInventory(attempt, metadata.find((row) => row.run_id === attempt.runId), d3Candidates.filter((row) => row.unit_id === attempt.unitId)))
    const committed = attempts.filter((attempt) => attempt.state === "COMMITTED")
    const pairwise = committed.flatMap((left, index) => committed.slice(index + 1).map((right) => ({ leftUnitId: left.unitId, rightUnitId: right.unitId, ...compareStableOhlcvFactSets(null, null) })))
    const provider = await providerComparison()
    const providerFacts = "stableFacts" in provider && Array.isArray(provider.stableFacts) ? provider.stableFacts as StableOhlcvFact[] : null
    const d2Facts = d2Rows.map(stableD2Fact)
    const providerVsD2 = compareStableOhlcvFactSets(d2Facts, providerFacts)
    const safeProvider = { ...provider } as Record<string, unknown>
    delete safeProvider.stableFacts
    console.log(JSON.stringify({
      targetWindow: { start: START, end: END }, targetVerification: { refresh: true, d2: true, d3: true }, inventory,
      lineage: { d2CanonicalOhlcvRelationPresent: d2Relations[0]?.ohlcv ?? false, d2RecordVersionsRelationPresent: d2Relations[0]?.record_versions ?? false, d3CandidateRelationPresent: d3Relations[0]?.candidates ?? false, d3CandidateRows: d3Candidates.length, attemptCanonicalCommitIdentities: 0, attemptCanonicalFactIdentities: 0, refreshArtifactRows: attempts.reduce((sum, attempt) => sum + attempt.artifacts.length, 0) },
      unattributedD2Facts: { digests: computeStableOhlcvDigests(d2Facts), schemaVersions: [...new Set(d2Rows.map((row) => String(row.schema_version)))].sort(), normalizationVersions: [...new Set(d2Rows.map((row) => String(row.normalization_version)))].sort() },
      attemptDigests: committed.map((attempt) => ({ unitId: attempt.unitId, recordedFactDigest: checkpointValue(attempt.checkpoint, "factDigest"), independentDigest: null, factCount: null, reason: "NO_ATTRIBUTABLE_CANONICAL_FACT_IDENTITIES" })),
      pairwise, recordedFactDigestAudit: "DIGEST_INCLUDED_ATTEMPT_METADATA", sourceContractProvenance: "CONTRACT_PROVENANCE_UNRECORDED",
      providerComparison: { ...safeProvider, comparisonToUnattributedD2: providerVsD2.classification, comparisonToAttempts: "PROVIDER_COMPARISON_INCONCLUSIVE" },
      acquiredAttempt: { classification: (objectLinks[0][0]?.count ?? 0) + (objectLinks[1][0]?.count ?? 0) === 0 ? "ORPHANED_NO_EVIDENCE" : "PARTIAL_EVIDENCE_ONLY", matchingObjectRows: (objectLinks[0][0]?.count ?? 0) + (objectLinks[1][0]?.count ?? 0) },
      finalSlotClassification: "INSUFFICIENT_EVIDENCE_TO_RESOLVE", authoritativeSelectionEligible: false,
      mutations: { refreshWrites: 0, d2Writes: 0, d3Writes: 0, retainedProviderObjects: 0, externalSystemWrites: 0 },
    }, null, 2))
  } finally {
    await Promise.allSettled([refresh.shutdown(), d2.shutdown(), d3.shutdown()])
  }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_CANONICAL_OUTPUT_AUDIT_FAILED"); process.exitCode = 1 })
