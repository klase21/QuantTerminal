import { createMvpMarketAssessment, evaluateMvpEvidenceRules, type MvpDerivedMeasurementSet } from "@/lib/data-platform/consistency"

const checks: Array<[string, boolean]> = []
const check = (name: string, pass: boolean) => checks.push([name, pass])

function measurement(overrides: Partial<MvpDerivedMeasurementSet> = {}): MvpDerivedMeasurementSet {
  return {
    instrument: "BTCUSDT",
    eventTimeStart: "2026-07-11T00:00:00.000Z",
    eventTimeEnd: "2026-07-12T00:00:00.000Z",
    knowledgeTimeCutoff: "2026-07-14T00:00:00.000Z",
    calculationVersion: "mvp-market-measurements/1.0.0",
    priceReturnPct: 2,
    realizedRangePct: 3,
    oiChangePct: 3,
    oiBaselineMedianAbsChangePct: 1,
    fundingLatestRate: 0.0002,
    fundingPreviousRate: 0.0001,
    fundingBaselineAbsPercentile: 0.00008,
    fundingNormalizationRatio: 2.5,
    aggressiveBuyQuantity: "125.50",
    aggressiveSellQuantity: "74.50",
    aggressiveImbalanceRatio: 0.255,
    tradeCount: 1000,
    tradeCountIntensity: 1.2,
    coverage: { ohlcv: 1, openInterest: 1, funding: 1, aggTrades: 1 },
    sourceReferenceDigest: "a".repeat(64),
    sourceReferenceCount: 100,
    lineageReferenceCount: 100,
    segmentChecksum: "b".repeat(64),
    maximumInputEventTime: "2026-07-11T23:59:59.999Z",
    completeness: "COMPLETE",
    limitationCodes: [],
    ...overrides,
  }
}

const corpus = { corpusId: "mvp-corpus", corpusChecksum: "c".repeat(64) }
const hot = createMvpMarketAssessment({ ...corpus, measurement: measurement() })
const repeated = createMvpMarketAssessment({ ...corpus, measurement: measurement() })
check("five explicit governed rules", evaluateMvpEvidenceRules(measurement()).length === 5)
check("multi-factor overheating triggers", hot.marketState === "DERIVATIVES_OVERHEATING")
check("support and counter evidence retained", hot.structuredInterpretation.supportingCodes.length > 0 && hot.structuredInterpretation.counterEvidenceCodes.length > 0)
check("seven confidence components explicit", Object.keys(hot.confidence.components).length === 7)
check("confidence is evidence strength", hot.confidence.semantic === "EVIDENCE_STRENGTH_NOT_PROBABILITY")
check("assessment identity deterministic", hot.assessmentIdentity === repeated.assessmentIdentity && hot.assessmentChecksum === repeated.assessmentChecksum)

const neutral = createMvpMarketAssessment({ ...corpus, measurement: measurement({ priceReturnPct: 0.1, oiChangePct: 0.1, fundingLatestRate: 0.00001, fundingNormalizationRatio: 0.1, aggressiveImbalanceRatio: 0.01, tradeCountIntensity: 0.5 }) })
check("non-trigger assessment is explicit", neutral.marketState === "NEUTRAL" && neutral.structuredInterpretation.nonTriggerCodes.length > 0)
const unavailable = createMvpMarketAssessment({ ...corpus, measurement: measurement({ priceReturnPct: null, oiChangePct: null, fundingLatestRate: null, aggressiveImbalanceRatio: null, tradeCountIntensity: null, coverage: { ohlcv: 0, openInterest: 0, funding: 0, aggTrades: 0 }, completeness: "LIMITED", limitationCodes: ["INPUT_COVERAGE_LIMITED"] }) })
check("missing mandatory inputs fail closed", unavailable.marketState === "NOT_EVALUABLE" && unavailable.confidence.classification === "NOT_AVAILABLE")
check("changed truth changes recompute identity", hot.recomputeIdentity !== neutral.recomputeIdentity)
let futureRejected = false
try { evaluateMvpEvidenceRules(measurement({ maximumInputEventTime: "2026-07-12T00:00:00.000Z" })) } catch { futureRejected = true }
check("future event input rejected", futureRejected)
check("optional enrichments disclosed", hot.limitations.includes("LIQUIDATION_ENRICHMENT_NOT_REQUIRED") && hot.limitations.includes("ORDERBOOK_ENRICHMENT_NOT_REQUIRED"))

const failures = checks.filter(([, pass]) => !pass)
console.log(`MVP EVIDENCE UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
