import { createMvpProjectionExposureDecision, type MvpProjectionExposureDecision } from "@/lib/data-platform/consistency-evidence/postgres"
import { buildMvpNavigationHref, MvpConsumerFacadeError, MvpConsumerProjectionFacade, MVP_CONSUMER_INSTRUMENTS, type MvpConsumerProjectionSource } from "@/lib/data-platform/consumer-projections"
import { createMvpProjection, type MvpProjectionKind, type MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"

const corpus = { id: "mvp-projection-corpus:" + "a".repeat(64), checksum: "a".repeat(64) }
const dependency = [{ dependencyType: "EVIDENCE_PACKET" as const, dependencyId: "packet", dependencyVersion: "1", dependencyChecksum: "b".repeat(64) }]
function projection(kind: MvpProjectionKind, subjectId: string, payload: Record<string, unknown> = {}): MvpProjectionVersion { return createMvpProjection({ kind, subjectId, eventTimeStart: "2026-07-11T00:00:00.000Z", eventTimeEnd: "2026-07-12T00:00:00.000Z", knowledgeTimeCutoff: "2026-07-14T12:45:59.000Z", payload, dependencies: dependency }) }
const values = [projection("DashboardMarketStateProjection", "MVP_SIX_INSTRUMENTS"), projection("ScannerCandidateProjection", "MVP_SIX_INSTRUMENTS")]
for (const instrument of MVP_CONSUMER_INSTRUMENTS) {
  values.push(projection("InstrumentMarketSummaryProjection", instrument), projection("ResearchEvidenceProjection", instrument), projection("ReplayTimelineProjection", instrument), projection("SourceLineageSummaryProjection", instrument), projection("EventAnnotationProjection", instrument), projection("TradeDecisionContextProjection", instrument, { sourceCandidateIdentity: `candidate:${instrument}` }))
  for (const dataset of ["ohlcv", "funding", "openInterest", "aggTrades"]) values.push(projection("CoverageDataStatusProjection", `${instrument}:${dataset}`))
}
const cutover = createMvpProjectionExposureDecision({ projectionCorpusId: corpus.id, projectionCorpusChecksum: corpus.checksum, action: "CUTOVER", previousDecisionId: null, reasonCode: "TEST_CUTOVER", actorId: "unit-test", createdAt: "2026-07-15T00:00:00.000Z" })
class Source implements MvpConsumerProjectionSource {
  constructor(readonly decision: MvpProjectionExposureDecision | null) {}
  latest(kind: MvpProjectionKind, subjectId: string) { return Promise.resolve(values.find((value) => value.projectionKind === kind && value.subjectId === subjectId) ?? null) }
  byVersion(id: string) { return Promise.resolve(values.find((value) => value.projectionVersionId === id) ?? null) }
  list(input: { kind?: MvpProjectionKind; subjectId?: string; start?: string; end?: string; limit: number }) { return Promise.resolve(values.filter((value) => (!input.kind || value.projectionKind === input.kind) && (!input.subjectId || value.subjectId === input.subjectId) && (!input.start || value.eventTimeStart >= input.start) && (!input.end || value.eventTimeEnd <= input.end)).slice(0, input.limit)) }
  exposure() { return Promise.resolve(this.decision) }
}
async function main() {
const checks: Array<[string, boolean]> = [], check = (name: string, pass: boolean) => checks.push([name, pass])
const facade = new MvpConsumerProjectionFacade(new Source(cutover), corpus)
const dashboard = await facade.read({ view: "dashboard" }), markets = await facade.read({ view: "markets" }), scanner = await facade.read({ view: "scanner" }), trade = await facade.read({ view: "trade", instrument: "BTCUSDT", candidateId: "candidate:BTCUSDT" }), replay = await facade.read({ view: "replay", instrument: "BTCUSDT", start: "2026-07-11T00:00:00.000Z", end: "2026-07-12T00:00:00.000Z" }), research = await facade.read({ view: "research", instrument: "BTCUSDT" })
check("cutover decision deterministic", cutover.decisionId === createMvpProjectionExposureDecision({ projectionCorpusId: corpus.id, projectionCorpusChecksum: corpus.checksum, action: "CUTOVER", previousDecisionId: null, reasonCode: "TEST_CUTOVER", actorId: "unit-test", createdAt: "2026-07-15T00:00:00.000Z" }).decisionId)
check("Dashboard bundle bounded", dashboard.projections.length === 43)
check("Markets maps six instruments", markets.projections.filter((value) => value.projectionKind === "InstrumentMarketSummaryProjection").length === 6)
check("Scanner ranking present", scanner.projections.some((value) => value.projectionKind === "ScannerCandidateProjection"))
check("Scanner Evidence drill-down sources present", scanner.projections.filter((value) => value.projectionKind === "ResearchEvidenceProjection").length === 6)
check("Scanner candidate reaches Trade", trade.projections.some((value) => value.payload.sourceCandidateIdentity === "candidate:BTCUSDT"))
check("Replay window bounded", replay.projections.filter((value) => value.projectionKind === "ReplayTimelineProjection").length === 1)
check("Research structured projection present", research.projections.some((value) => value.projectionKind === "ResearchEvidenceProjection"))
check("effective exposure derived", [dashboard, markets, scanner, trade, replay, research].every((bundle) => bundle.projections.every((value) => value.effectiveExposure === "CONSUMER_VISIBLE")))
const href = buildMvpNavigationHref("/trade", { instrument: "BTCUSDT", start: "2026-07-11T00:00:00.000Z", end: "2026-07-12T00:00:00.000Z", candidateId: "candidate", evidenceId: "packet" })
check("navigation context complete", href.includes("instrument=BTCUSDT") && href.includes("candidate=candidate") && href.includes("evidence=packet") && href.includes("start=2026-07-11"))
let rollback = false, mismatch = false
try { await new MvpConsumerProjectionFacade(new Source(createMvpProjectionExposureDecision({ projectionCorpusId: corpus.id, projectionCorpusChecksum: corpus.checksum, action: "ROLLBACK", previousDecisionId: cutover.decisionId, reasonCode: "TEST_ROLLBACK", actorId: "unit-test", createdAt: "2026-07-15T01:00:00.000Z" })), corpus).read({ view: "dashboard" }) } catch (error) { rollback = error instanceof MvpConsumerFacadeError && error.reasonCode === "ROLLBACK_ACTIVE" }
try { await facade.read({ view: "trade", instrument: "BTCUSDT", candidateId: "wrong" }) } catch (error) { mismatch = error instanceof MvpConsumerFacadeError && error.reasonCode === "PROJECTION_MISSING" }
check("rollback explicit", rollback)
check("candidate mismatch fails closed", mismatch)

const failures = checks.filter(([, pass]) => !pass)
console.log(`MVP CONSUMER FACADE UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_CONSUMER_FACADE_TEST_FAILED"); process.exitCode = 1 })
