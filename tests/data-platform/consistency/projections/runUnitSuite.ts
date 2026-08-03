import { readFileSync } from "node:fs"
import path from "node:path"

import type { MvpMarketAssessment } from "@/lib/data-platform/consistency"
import { createMvpProjection, generateMvpProjectionCorpus, MVP_PROJECTION_DEFINITIONS, verifyMvpProjection, type MvpProjectionEvidenceInput } from "@/lib/data-platform/evidence-platform"
import { createLiveResumeProjectionCorpus } from "@/lib/data-platform/mvp-refresh/liveResumeLocalBootstrap"

const source = JSON.parse(readFileSync(path.join(process.cwd(), "docs", "project", "mvp-evidence-corpus.json"), "utf8")) as { basis: { certificationSlice: Array<{ assessment: MvpMarketAssessment; packetId: string; packetVersionId: string; packetChecksum: string }> } }
const inputs: MvpProjectionEvidenceInput[] = source.basis.certificationSlice.map((item) => ({ assessment: item.assessment, packetId: item.packetId, packetVersionId: item.packetVersionId, packetChecksum: item.packetChecksum, resultReferences: [{ resultId: `result:${item.assessment.instrument}`, checksum: "a".repeat(64) }], factReferences: [{ id: `fact:${item.assessment.instrument}`, version: "1", checksum: "b".repeat(64), datasetId: "ohlcv", providerId: "binance-vision-usdm", publicationState: "PENDING" }], coverageDecisionIds: [`coverage:${item.assessment.instrument}`], latestPrice: "100.00" }))
const projections = generateMvpProjectionCorpus(inputs), repeated = generateMvpProjectionCorpus([...inputs].reverse())
const checks: Array<[string, boolean]> = [], check = (name: string, pass: boolean) => checks.push([name, pass])
check("nine governed definitions", MVP_PROJECTION_DEFINITIONS.length === 9)
check("all nine kinds generated", new Set(projections.map((value) => value.projectionKind)).size === 9)
check("six-instrument slice cardinality bounded", projections.length === 62)
const liveResumeCorpus = createLiveResumeProjectionCorpus(inputs, inputs[0]!.assessment.eventTimeStart, inputs[0]!.assessment.eventTimeEnd)
check("live-resume persists one six-instrument corpus", liveResumeCorpus.length === 62 && liveResumeCorpus.filter((value) => value.projectionKind === "DashboardMarketStateProjection").length === 1 && liveResumeCorpus.filter((value) => value.projectionKind === "ScannerCandidateProjection").length === 1)
check("identity and checksum deterministic", projections.map((value) => value.projectionVersionId).join() === repeated.map((value) => value.projectionVersionId).join() && projections.map((value) => value.projectionChecksum).join() === repeated.map((value) => value.projectionChecksum).join())
check("every checksum verifies", projections.every(verifyMvpProjection))
check("lifecycle generated and cutover-only", projections.every((value) => value.lifecycleState === "GENERATED" && value.consumerExposureState === "READY_FOR_CUTOVER"))
check("source publication remains pending", projections.filter((value) => value.projectionKind === "InstrumentMarketSummaryProjection").every((value) => value.structuredPayload.sourcePublicationState === "PENDING"))
const replay = projections.find((value) => value.projectionKind === "ReplayTimelineProjection")!
check("Replay payload bounded", (replay.structuredPayload.pagination as { embeddedRawAggTradeEvents: number }).embeddedRawAggTradeEvents === 0)
const scanner = projections.find((value) => value.projectionKind === "ScannerCandidateProjection")!
check("Scanner ranking is not profit prediction", scanner.structuredPayload.rankingSemantic === "MARKET_STATE_INVESTIGATION_PRIORITY_NOT_EXPECTED_PROFIT")
const candidates = scanner.structuredPayload.candidates as Array<{ rank: number; instrument: string; coverageComparable: boolean; eligibleForRanking: boolean }>
check("Scanner ranking inputs comparable", candidates.length === 6 && candidates.every((value, index) => value.rank === index + 1 && value.coverageComparable && value.eligibleForRanking) && new Set(candidates.map((value) => value.instrument)).size === 6)
const trade = projections.find((value) => value.projectionKind === "TradeDecisionContextProjection")!
check("Trade context emits no action", trade.structuredPayload.actionState === "CONTEXT_ONLY_NO_ACTION")
const notEvaluableInputs = inputs.map((input, index) => index === 0 ? { ...input, assessment: { ...input.assessment, marketState: "NOT_EVALUABLE" as const } } : input)
const notEvaluableTrade = generateMvpProjectionCorpus(notEvaluableInputs).find((value) => value.projectionKind === "TradeDecisionContextProjection" && value.subjectId === inputs[0]!.assessment.instrument)!
check("not-evaluable Trade context fails closed", notEvaluableTrade.structuredPayload.actionState === "INSUFFICIENT_EVIDENCE")
const original = projections[0]!, changed = createMvpProjection({ kind: original.projectionKind, subjectId: original.subjectId, eventTimeStart: original.eventTimeStart, eventTimeEnd: original.eventTimeEnd, knowledgeTimeCutoff: original.knowledgeTimeCutoff, payload: original.structuredPayload, dependencies: [...original.dependencies, { dependencyType: "CONSISTENCY_RESULT", dependencyId: "changed", dependencyVersion: null, dependencyChecksum: "c".repeat(64) }], supersedesProjectionVersionId: original.projectionVersionId })
check("changed truth creates version and supersession link", changed.projectionId === original.projectionId && changed.projectionVersionId !== original.projectionVersionId && changed.supersedesProjectionVersionId === original.projectionVersionId)
let future = false
try { createMvpProjection({ kind: "ResearchEvidenceProjection", subjectId: "BTCUSDT", eventTimeStart: "2026-07-11T00:00:00.000Z", eventTimeEnd: "2026-07-12T00:00:00.000Z", knowledgeTimeCutoff: "2026-07-11T23:00:00.000Z", payload: {}, dependencies: original.dependencies }) } catch { future = true }
check("Knowledge Time fails closed", future)

const failures = checks.filter(([, pass]) => !pass)
console.log(`MVP PROJECTION UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
