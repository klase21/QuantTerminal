import {
  MvpServingPostgresClient,
  PostgresMvpInactiveServingReadPort,
  copyInactiveCandidateToServingTarget,
  publishInactiveCandidateToSeparateTarget,
  type MvpServingTargetKind,
} from "@/lib/data-platform/mvp-serving"

const CANDIDATE_ID = "mvp8i-candidate:fa295d3b749fd45d8c5172c5b5568463a4e645f9a0312d2d7945c4840753dc57"
const MEMBER_SET_CHECKSUM = "021b8ad9ea4710060dd5ab380174ade2a54ac1e57fa5a229affe6807e62a527e"
const WATERMARK = "2026-07-16T00:00:00.000Z"
const NEON_TARGET = "neon:soft-cell-16396854/br-flat-grass-ao9rtnyr/neondb"
const PRODUCTION_TARGET = "neon:soft-cell-16396854/br-royal-block-aop70mzq/neondb"
const SYMBOLS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])

function required(name: string): string { const value = process.env[name]; if (!value) throw new Error(`MVP8L_ENV_REQUIRED:${name}`); return value }
function identity(raw: string) { const url = new URL(raw); return { database: decodeURIComponent(url.pathname.slice(1)), role: decodeURIComponent(url.username), host: url.hostname, port: url.port } }

function sourceClient() {
  const url = required("MVP8L_SOURCE_READER_URL"), expected = identity(url)
  const kind: MvpServingTargetKind = ["localhost", "127.0.0.1", "::1"].includes(expected.host) ? "LOCAL_ISOLATED" : "MANAGED_POSTGRES"
  return new MvpServingPostgresClient(url, "READER", process.env, kind, { database: expected.database, role: expected.role })
}

function targetKind(): MvpServingTargetKind { return ["LOCAL_DISPOSABLE_CERTIFICATION", "PRODUCTION_INACTIVE_COPY_CERTIFICATION"].includes(process.env.MVP_PUBLICATION_TARGET_MODE ?? "") ? "LOCAL_DISPOSABLE_CERTIFICATION" : "MANAGED_POSTGRES" }
function targetClient(intent: "PUBLISHER" | "READER") {
  const url = required(intent === "PUBLISHER" ? "MVP_INACTIVE_WRITER_URL" : "MVP_INACTIVE_READER_URL"), expected = identity(url)
  return new MvpServingPostgresClient(url, intent, process.env, targetKind(), { database: expected.database, role: expected.role })
}

async function loadSource() {
  const client = sourceClient()
  try {
    await client.verify()
    const state = await client.sql.unsafe<Array<{ readonly value: string }>>("SELECT current_setting('transaction_read_only') value")
    if (state[0]?.value !== "on") throw new Error("MVP8L_SOURCE_NOT_READ_ONLY")
    const port = new PostgresMvpInactiveServingReadPort(client), input = await port.exportCandidateInput(CANDIDATE_ID), selection = await port.selectCandidate(CANDIDATE_ID)
    const review = selection.review
    if (review.memberSetChecksum !== MEMBER_SET_CHECKSUM || review.commonWatermarkValue !== WATERMARK || review.counts.projections !== 62 || review.counts.evidenceSummaries !== 6 || review.counts.replaySnapshots !== 6 || review.counts.members !== 74 || review.lifecycle !== "WITHHELD" || review.exposure !== "INTERNAL_ONLY" || review.exposureCount !== 0) throw new Error("MVP8L_APPROVED_SOURCE_INVALID")
    return Object.freeze({ input, review })
  } finally { await client.shutdown() }
}

async function publish() {
  const targetId = required("MVP_INACTIVE_TARGET_ID")
  const productionCopy = process.env.MVP_PUBLICATION_TARGET_MODE === "PRODUCTION_INACTIVE_COPY"
  if (targetKind() === "MANAGED_POSTGRES" && targetId !== (productionCopy ? PRODUCTION_TARGET : NEON_TARGET)) throw new Error("MVP8L_NEON_TARGET_MISMATCH")
  const source = await loadSource(), writer = targetClient("PUBLISHER"), reader = targetClient("READER")
  try {
    await Promise.all([writer.verify(), reader.verify()])
    const sourceIdentity = identity(required("MVP8L_SOURCE_READER_URL")), destinationIdentity = identity(required("MVP_INACTIVE_WRITER_URL"))
    if (sourceIdentity.host === destinationIdentity.host && sourceIdentity.port === destinationIdentity.port && sourceIdentity.database === destinationIdentity.database) throw new Error("MVP8L_SOURCE_DESTINATION_ALIAS_REJECTED")
    if (productionCopy) {
      const outcome = await copyInactiveCandidateToServingTarget(writer, reader, source.input, { targetId, expectedTargetId: PRODUCTION_TARGET, sourceTargetId: NEON_TARGET, expectedActiveExposureId: required("MVP8P_EXPECTED_ACTIVE_EXPOSURE_ID"), expectedActiveCorpusId: required("MVP8P_EXPECTED_ACTIVE_CORPUS_ID"), requestId: required("MVP8P_REQUEST_ID"), operatorId: required("MVP8P_OPERATOR_ID"), copyReason: required("MVP8P_COPY_REASON"), dryRun: process.env.MVP8P_DRY_RUN === "true" })
      if (!outcome.review) return { status: outcome.status, candidateId: outcome.candidateId, receiptId: outcome.receiptId, exposureFingerprint: outcome.exposureFingerprint, dryRun: true }
      return { status: outcome.status, candidateId: outcome.review.candidateId, counts: outcome.review.counts, lifecycle: outcome.review.lifecycle, exposure: outcome.review.exposure, exposureCount: outcome.review.exposureCount, memberSetChecksum: outcome.review.memberSetChecksum, manifestChecksum: outcome.review.manifestChecksum, exposureFingerprint: outcome.exposureFingerprint, receiptId: outcome.receiptId }
    }
    const outcome = await publishInactiveCandidateToSeparateTarget(writer, reader, source.input, { targetId, expectedTargetId: targetId })
    return { status: outcome.status, candidateId: outcome.review.candidateId, counts: outcome.review.counts, lifecycle: outcome.review.lifecycle, exposure: outcome.review.exposure, exposureCount: outcome.review.exposureCount, memberSetChecksum: outcome.review.memberSetChecksum, manifestChecksum: outcome.review.manifestChecksum, exposureFingerprint: outcome.exposureFingerprint }
  } finally { await Promise.allSettled([writer.shutdown(), reader.shutdown()]) }
}

async function review() {
  const reader = targetClient("READER")
  try {
    await reader.verify()
    const state = await reader.sql.unsafe<Array<{ readonly value: string }>>("SELECT current_setting('transaction_read_only') value")
    if (state[0]?.value !== "on") throw new Error("MVP8L_REVIEW_NOT_READ_ONLY")
    const selection = await new PostgresMvpInactiveServingReadPort(reader).selectCandidate(CANDIDATE_ID)
    const [dashboard, scanner, trades, replays, counts] = await Promise.all([
      selection.dashboard(), selection.scanner(), Promise.all(SYMBOLS.map((symbol) => selection.tradeDecisionContext(symbol))), Promise.all(SYMBOLS.map((symbol) => selection.replay(symbol))),
      reader.sql.unsafe<Array<{ projections: number; evidence: number; replay: number; members: number; manifests: number; candidate_exposures: number; total_exposures: number }>>("SELECT (SELECT count(*) FROM serving.serving_projection WHERE serving_corpus_id=$1)::int projections,(SELECT count(*) FROM serving.serving_evidence_summary WHERE serving_corpus_id=$1)::int evidence,(SELECT count(*) FROM serving.serving_replay_sequence WHERE serving_corpus_id=$1)::int replay,(SELECT count(*) FROM serving.serving_corpus_member WHERE corpus_id=$1)::int members,(SELECT count(*) FROM serving.serving_candidate_manifest WHERE corpus_id=$1)::int manifests,(SELECT count(*) FROM serving.serving_exposure WHERE corpus_id=$1)::int candidate_exposures,(SELECT count(*) FROM serving.serving_exposure)::int total_exposures", [CANDIDATE_ID]),
    ])
    if (dashboard.projections.length !== 43 || scanner.projections.length !== 31 || trades.some((value) => value.projections.length !== 8) || replays.some((value) => value.projections.length !== 8) || counts[0]?.projections !== 62 || counts[0]?.evidence !== 6 || counts[0]?.replay !== 6 || counts[0]?.members !== 74 || counts[0]?.manifests !== 1 || counts[0]?.candidate_exposures !== 0) throw new Error("MVP8L_READBACK_FAILED")
    return { status: "REVIEWED", candidateId: selection.review.candidateId, counts: counts[0], lifecycle: selection.review.lifecycle, exposure: selection.review.exposure, commonWatermarkValue: selection.review.commonWatermarkValue, memberSetChecksum: selection.review.memberSetChecksum, manifestChecksum: selection.review.manifestChecksum, smoke: { dashboard: 43, scanner: 31, trade: trades.map((value, index) => [SYMBOLS[index], value.projections.length]), replay: replays.map((value) => [value.snapshot.instrument, value.projections.length]) } }
  } finally { await reader.shutdown() }
}

async function main() {
  const command = process.argv[2]
  const result = command === "source-audit" ? ((source: Awaited<ReturnType<typeof loadSource>>) => ({ status: "VERIFIED", candidateId: source.review.candidateId, counts: source.review.counts, lifecycle: source.review.lifecycle, exposure: source.review.exposure, exposureCount: source.review.exposureCount, commonWatermarkValue: source.review.commonWatermarkValue, memberSetChecksum: source.review.memberSetChecksum, manifestChecksum: source.review.manifestChecksum }))(await loadSource()) : command === "publish" ? await publish() : command === "review" ? await review() : (() => { throw new Error("Usage: runMvpInactivePublication.ts <source-audit|publish|review>") })()
  process.stdout.write(JSON.stringify(result, null, 2))
}

void main().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.message : "MVP8L_INACTIVE_PUBLICATION_FAILED"); process.exitCode = 1 })
