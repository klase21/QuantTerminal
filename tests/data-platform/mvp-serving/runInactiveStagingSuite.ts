import assert from "node:assert/strict"
import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createMvpProjection, type MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import {
  MVP_INACTIVE_SERVING_STAGE_COUNTS,
  MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION,
  MVP_INACTIVE_SERVING_STAGE_WRITE_ORDER,
  MvpServingPostgresClient,
  computeInactiveServingCandidateId,
  createInactiveServingCandidateSelection,
  createServingEvidenceSummary,
  createServingReplaySnapshot,
  discoverMvpServingMigrations,
  prepareInactiveServingCandidate,
  verifyServingEvidenceSummary,
  type InactiveServingCandidateInput,
  type ServingCorpusMember,
} from "@/lib/data-platform/mvp-serving"
import type { ReplaySequenceModel } from "@/lib/replay-sequence"

const START = "2026-07-15T00:00:00.000Z", END = "2026-07-16T00:00:00.000Z"
const SYMBOLS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])

function dependency(seed: string) { return Object.freeze([{ dependencyType: "EVIDENCE_PACKET" as const, dependencyId: `packet:${seed}`, dependencyVersion: `packet-version:${seed}`, dependencyChecksum: canonicalChecksum(`packet:${seed}`) }]) }
function projection(kind: MvpProjectionVersion["projectionKind"], subjectId: string, payload: Record<string, unknown> = {}) {
  return createMvpProjection({ kind, subjectId, eventTimeStart: START, eventTimeEnd: END, knowledgeTimeCutoff: END, payload, dependencies: dependency(`${kind}:${subjectId}`) })
}

function replayModel(source: MvpProjectionVersion): ReplaySequenceModel {
  const base = { status: "AVAILABLE" as const, modelVersion: "mvp-replay-sequence/1.0.0" as const, instrument: source.subjectId, eventTimeStart: START, eventTimeEnd: END, sourceProjectionVersionId: source.projectionVersionId, sourceProjectionChecksum: source.projectionChecksum, marketState: "NEUTRAL", evidencePacketId: `packet:${source.subjectId}`, price: Object.freeze([]), openInterest: Object.freeze([]), funding: Object.freeze([]), flow: Object.freeze([]), sequence: Object.freeze([]), sampleCounts: Object.freeze({ price: 288, openInterest: 288, funding: 3, flow: 48 }), limitations: Object.freeze([]) }
  return Object.freeze({ ...base, modelChecksum: canonicalChecksum(base) })
}

function fixture(): InactiveServingCandidateInput {
  const research = SYMBOLS.map((symbol) => projection("ResearchEvidenceProjection", symbol, { packetId: `packet:${symbol}`, packetVersionId: `packet-version:${symbol}`, conclusion: "NEUTRAL", confidence: {}, coverage: {}, verifiedFacts: {}, interpretation: {}, supportingEvidence: [], counterEvidence: [] }))
  const replaySources = SYMBOLS.map((symbol) => projection("ReplayTimelineProjection", symbol))
  const aggregate = [projection("DashboardMarketStateProjection", "MVP_SIX_INSTRUMENTS"), projection("ScannerCandidateProjection", "MVP_SIX_INSTRUMENTS")]
  const instrument = SYMBOLS.flatMap((symbol) => [projection("TradeDecisionContextProjection", symbol), projection("InstrumentMarketSummaryProjection", symbol), projection("SourceLineageSummaryProjection", symbol), projection("EventAnnotationProjection", symbol), ...["ohlcv", "openInterest", "funding", "aggTrades"].map((dataset) => projection("CoverageDataStatusProjection", `${symbol}:${dataset}`))])
  const projections = Object.freeze([...research, ...replaySources, ...instrument, ...aggregate])
  return Object.freeze({ schemaVersion: MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION, replaySourceCorpusId: `mvp-replay-source:${canonicalChecksum("replay-source")}`, replaySourceCorpusChecksum: canonicalChecksum("replay-source"), commonWatermarkId: `mvp8e-common-watermark:${END}`, commonWatermarkValue: END, commonWatermarkChecksum: canonicalChecksum("watermark"), projections, evidenceSummaries: Object.freeze(research.map(createServingEvidenceSummary)), replaySnapshots: Object.freeze(replaySources.map((value) => createServingReplaySnapshot(value, replayModel(value)))) })
}

function changedMember(member: ServingCorpusMember): ServingCorpusMember { return Object.freeze({ ...member, memberChecksum: canonicalChecksum(`${member.memberChecksum}:changed`) }) }

async function main() {
  const input = fixture(), plan = prepareInactiveServingCandidate(input), reversed = prepareInactiveServingCandidate({ ...input, projections: [...input.projections].reverse(), evidenceSummaries: [...input.evidenceSummaries].reverse(), replaySnapshots: [...input.replaySnapshots].reverse() })
  assert.deepEqual(plan.counts, MVP_INACTIVE_SERVING_STAGE_COUNTS)
  assert.equal(plan.members.length, 74)
  assert.equal(plan.projections.length, 62)
  assert.equal(plan.evidenceSummaries.length, 6)
  assert.equal(plan.replaySnapshots.length, 6)
  assert.equal(plan.candidateId, reversed.candidateId)
  assert.equal(plan.memberSetChecksum, reversed.memberSetChecksum)
  assert.deepEqual(MVP_INACTIVE_SERVING_STAGE_WRITE_ORDER, ["PROJECTION_PAYLOADS", "EVIDENCE_PAYLOADS", "REPLAY_PAYLOADS", "MEMBERS", "MANIFEST", "READBACK"])
  assert.equal(plan.manifest.lifecycle, "WITHHELD")
  assert.equal(plan.manifest.exposure, "INTERNAL_ONLY")
  assert.equal(plan.manifest.exposureEligibility, "INELIGIBLE")
  assert.equal(plan.commonWatermarkValue, END)
  assert.ok(input.evidenceSummaries.every(verifyServingEvidenceSummary))
  assert.match(plan.verifiedSourceCorpusId, /^mvp8i-verified-source:[0-9a-f]{64}$/)
  assert.equal(JSON.stringify({ candidateId: plan.candidateId, manifest: plan.manifest, members: plan.members }).includes("mvp8e-candidate:"), false)
  assert.ok(plan.members.every((member) => member.inheritedSourceCorpusId === plan.verifiedSourceCorpusId))

  const identity = (overrides: Partial<Parameters<typeof computeInactiveServingCandidateId>[0]> = {}) => computeInactiveServingCandidateId({ schemaVersion: plan.schemaVersion, verifiedSourceCorpusId: plan.verifiedSourceCorpusId, verifiedSourceCorpusChecksum: plan.verifiedSourceCorpusChecksum, bindings: { commonWatermarkId: plan.commonWatermarkId, commonWatermarkValue: plan.commonWatermarkValue, commonWatermarkChecksum: plan.commonWatermarkChecksum }, counts: plan.counts, members: plan.members, ...overrides })
  assert.notEqual(identity({ bindings: { commonWatermarkId: `${plan.commonWatermarkId}:other`, commonWatermarkValue: plan.commonWatermarkValue, commonWatermarkChecksum: plan.commonWatermarkChecksum } }), plan.candidateId)
  assert.notEqual(identity({ bindings: { commonWatermarkId: plan.commonWatermarkId, commonWatermarkValue: plan.commonWatermarkValue, commonWatermarkChecksum: canonicalChecksum("other-watermark") } }), plan.candidateId)
  assert.notEqual(identity({ schemaVersion: "mvp-inactive-serving-stage/2.0.0" }), plan.candidateId)
  assert.notEqual(identity({ counts: { ...plan.counts, projections: 63, members: 75 } }), plan.candidateId)
  assert.notEqual(identity({ members: [changedMember(plan.members[0]!), ...plan.members.slice(1)] }), plan.candidateId)
  assert.notEqual(prepareInactiveServingCandidate({ ...input, replaySourceCorpusChecksum: canonicalChecksum("different-replay-source") }).candidateId, plan.candidateId)

  assert.throws(() => prepareInactiveServingCandidate(null as unknown as InactiveServingCandidateInput), /MVP8I_INPUT_MALFORMED/)
  assert.throws(() => prepareInactiveServingCandidate({ ...input, schemaVersion: "unknown" as typeof input.schemaVersion }), /MVP8I_SCHEMA_VERSION_UNKNOWN/)
  assert.throws(() => prepareInactiveServingCandidate({ ...input, projections: input.projections.slice(0, 61) }), /MVP8I_PAYLOAD_COUNTS_INVALID/)
  assert.throws(() => prepareInactiveServingCandidate({ ...input, projections: [{ ...input.projections[0]!, projectionChecksum: "0".repeat(64) }, ...input.projections.slice(1)] }), /MVP8I_PROJECTION_CHECKSUM_MISMATCH/)
  assert.throws(() => prepareInactiveServingCandidate({ ...input, evidenceSummaries: [{ ...input.evidenceSummaries[0]!, summaryChecksum: "0".repeat(64) }, ...input.evidenceSummaries.slice(1)] }), /MVP8I_EVIDENCE_CHECKSUM_MISMATCH/)
  assert.throws(() => prepareInactiveServingCandidate({ ...input, replaySnapshots: [{ ...input.replaySnapshots[0]!, snapshotChecksum: "0".repeat(64) }, ...input.replaySnapshots.slice(1)] }), /MVP8I_REPLAY_CHECKSUM_MISMATCH/)
  assert.throws(() => computeInactiveServingCandidateId({ schemaVersion: plan.schemaVersion, verifiedSourceCorpusId: plan.verifiedSourceCorpusId, verifiedSourceCorpusChecksum: plan.verifiedSourceCorpusChecksum, bindings: plan, counts: plan.counts, members: [{ ...plan.members[0]!, memberKind: "UNKNOWN" as ServingCorpusMember["memberKind"] }, ...plan.members.slice(1)] }), /SERVING_CANDIDATE_MEMBER_KIND_INVALID/)

  const disposableDatabase = "quantterminal_mvp8l_canary_unit1", disposablePort = "55431", disposableTarget = `local-postgres:127.0.0.1:${disposablePort}/${disposableDatabase}`
  const disposableEnvironment = Object.freeze({ MVP_PUBLICATION_TARGET_MODE: "LOCAL_DISPOSABLE_CERTIFICATION", MVP_LOCAL_DISPOSABLE_HOST: "127.0.0.1", MVP_LOCAL_DISPOSABLE_PORT: disposablePort, MVP_LOCAL_DISPOSABLE_DATABASE: disposableDatabase, MVP_LOCAL_DISPOSABLE_TARGET_ID: disposableTarget })
  const disposableUrl = (role: string, port = disposablePort, database = disposableDatabase, host = "127.0.0.1") => `postgresql://${role}@${host}:${port}/${database}`
  assert.doesNotThrow(() => new MvpServingPostgresClient(disposableUrl("qt_inactive_writer"), "PUBLISHER", disposableEnvironment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: disposableDatabase, role: "qt_inactive_writer" }))
  assert.throws(() => new MvpServingPostgresClient(disposableUrl("qt_inactive_writer"), "PUBLISHER", { ...disposableEnvironment, MVP_PUBLICATION_TARGET_MODE: undefined }, "LOCAL_DISPOSABLE_CERTIFICATION", { database: disposableDatabase, role: "qt_inactive_writer" }), /MVP8L_DISPOSABLE_MODE_REQUIRED/)
  assert.doesNotThrow(() => new MvpServingPostgresClient("postgresql://qt_prod_inactive_copy_writer@127.0.0.1:55431/quantterminal_mvp8p_canary_unit1", "PUBLISHER", { ...disposableEnvironment, MVP_PUBLICATION_TARGET_MODE: "PRODUCTION_INACTIVE_COPY_CERTIFICATION", MVP_LOCAL_DISPOSABLE_DATABASE: "quantterminal_mvp8p_canary_unit1", MVP_LOCAL_DISPOSABLE_TARGET_ID: "local-postgres:127.0.0.1:55431/quantterminal_mvp8p_canary_unit1" }, "LOCAL_DISPOSABLE_CERTIFICATION", { database: "quantterminal_mvp8p_canary_unit1", role: "qt_prod_inactive_copy_writer" }))
  assert.throws(() => new MvpServingPostgresClient(disposableUrl("qt_inactive_writer", "55432"), "PUBLISHER", disposableEnvironment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: disposableDatabase, role: "qt_inactive_writer" }), /MVP8L_DISPOSABLE_PORT_MISMATCH/)
  assert.throws(() => new MvpServingPostgresClient(disposableUrl("qt_inactive_writer", disposablePort, "arbitrary"), "PUBLISHER", disposableEnvironment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: "arbitrary", role: "qt_inactive_writer" }), /MVP8L_DISPOSABLE_DATABASE_MISMATCH/)
  assert.throws(() => new MvpServingPostgresClient(disposableUrl("qt_inactive_writer", disposablePort, disposableDatabase, "127.0.0.2"), "PUBLISHER", disposableEnvironment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: disposableDatabase, role: "qt_inactive_writer" }), /MVP8L_LOOPBACK_HOST_REQUIRED/)
  assert.throws(() => new MvpServingPostgresClient(disposableUrl("qt_inactive_writer"), "PUBLISHER", { ...disposableEnvironment, MVP8J_SOURCE_READER_URL: disposableUrl("qt_inactive_writer") }, "LOCAL_DISPOSABLE_CERTIFICATION", { database: disposableDatabase, role: "qt_inactive_writer" }), /MVP8L_MATCHES_MVP8J_SOURCE_READER_URL/)

  const selection = createInactiveServingCandidateSelection(Object.freeze({ candidateId: plan.candidateId, servingChecksum: plan.servingChecksum, lifecycle: "WITHHELD", exposure: "INTERNAL_ONLY", exposureCount: 0, commonWatermarkId: plan.commonWatermarkId, commonWatermarkValue: plan.commonWatermarkValue, commonWatermarkChecksum: plan.commonWatermarkChecksum, memberSetChecksum: plan.memberSetChecksum, manifestChecksum: plan.manifestChecksum, counts: plan.counts, projections: plan.projections, evidenceSummaries: plan.evidenceSummaries, replaySnapshots: plan.replaySnapshots }))
  const [dashboard, scanner, trades, replayReads] = await Promise.all([selection.dashboard(), selection.scanner(), Promise.all(SYMBOLS.map((symbol) => selection.tradeDecisionContext(symbol))), Promise.all(SYMBOLS.map((symbol) => selection.replay(symbol)))])
  assert.equal(dashboard.projections.length, 43)
  assert.equal(scanner.projections.length, 31)
  assert.deepEqual(trades.map((value) => value.projections.length), [8, 8, 8, 8, 8, 8])
  assert.deepEqual(replayReads.map((value) => value.snapshot.instrument).sort(), [...SYMBOLS].sort())
  assert.deepEqual(replayReads.map((value) => value.projections.length), [8, 8, 8, 8, 8, 8])

  const migrations = await discoverMvpServingMigrations()
  assert.equal(migrations.length, 5)
  assert.equal(migrations[3]?.filename, "004_inactive_serving_staging_bindings.sql")
  assert.match(migrations[3]?.sql ?? "", /common_watermark_id/)
  assert.match(migrations[3]?.sql ?? "", /member_set_checksum/)
  assert.equal(migrations[4]?.filename, "005_guarded_serving_cutover_control.sql")
  assert.match(migrations[4]?.sql ?? "", /cutover_authorization_consumption/)
  process.stdout.write(JSON.stringify({ status: "PASS", candidateId: plan.candidateId, counts: plan.counts, deterministic: true, failClosed: true }))
}

void main().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.stack ?? error.message : "MVP8I_INACTIVE_STAGING_SUITE_FAILED"); process.exitCode = 1 })
