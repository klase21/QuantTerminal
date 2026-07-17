import { MVP_PROJECTION_DEFINITIONS, MVP_PROJECTION_SCOPE_MATRIX, MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS, assertMvpProjectionKindsForScope, generateMvpProjectionCorpus, projectionKindsForScope, type MvpProjectionEvidenceInput, type MvpProjectionKind } from "@/lib/data-platform/evidence-platform"

const known = [...MVP_PROJECTION_DEFINITIONS, ...MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS].map((item) => item.projectionKind)
if (known.some((kind) => !MVP_PROJECTION_SCOPE_MATRIX[kind])) throw new Error("PROJECTION_KIND_UNCLASSIFIED")
if (new Set(known).size !== known.length) throw new Error("PROJECTION_KIND_DUPLICATE")

const instrument = projectionKindsForScope("INSTRUMENT_SCOPED")
assertMvpProjectionKindsForScope(instrument, "INSTRUMENT_SCOPED")
if (!instrument.includes("CoverageDataStatusProjection") || instrument.includes("ScannerCandidateProjection") || instrument.includes("DashboardMarketStateProjection") || instrument.includes("TradeDecisionContextProjection")) throw new Error("CANARY_SCOPE_INVALID")

let aggregateRejected = false
try { assertMvpProjectionKindsForScope(["ScannerCandidateProjection"], "INSTRUMENT_SCOPED") } catch { aggregateRejected = true }
if (!aggregateRejected) throw new Error("AGGREGATE_CANARY_ACCEPTED")

let unknownRejected = false
try { projectionKindsForScope("INSTRUMENT_SCOPED", ["UNKNOWN" as MvpProjectionKind]) } catch { unknownRejected = true }
if (!unknownRejected) throw new Error("UNKNOWN_PROJECTION_KIND_ACCEPTED")

const evidence = {
  assessment: {
    instrument: "SOLUSDT", eventTimeStart: "2026-07-15T00:00:00.000Z", eventTimeEnd: "2026-07-16T00:00:00.000Z", knowledgeTimeCutoff: "2026-07-17T00:00:00.000Z",
    marketState: "NEUTRAL", confidence: { classification: "HIGH", components: { counterEvidencePenalty: 0 } }, coverage: { ohlcv: 1, openInterest: 1, funding: 1, aggTrades: 1 },
    measurements: { priceReturnPct: 0, realizedRangePct: 1, oiChangePct: 0, fundingLatestRate: 0, aggressiveImbalanceRatio: 0, tradeCount: 1, aggressiveBuyQuantity: "1", aggressiveSellQuantity: "1", segmentChecksum: "a".repeat(64) },
    ruleEvaluations: [{ state: "NOT_TRIGGERED" }, { state: "NOT_TRIGGERED" }, { state: "NOT_TRIGGERED" }], structuredInterpretation: { supportingCodes: [], counterEvidenceCodes: [], nonTriggerCodes: [] }, limitations: [], sourceLineage: { sourceReferenceDigest: "a".repeat(64) }, measurementVersions: ["1"], ruleVersions: [], recomputeIdentity: "r",
  }, packetId: "packet", packetVersionId: "packet-version", packetChecksum: "b".repeat(64), resultReferences: [], factReferences: [{ id: "fact", version: "1", checksum: "c".repeat(64), datasetId: "ohlcv", providerId: "binance-vision", publicationState: "PENDING" }], coverageDecisionIds: ["coverage"], latestPrice: "1",
} as unknown as MvpProjectionEvidenceInput
const generated = generateMvpProjectionCorpus([evidence]).filter((item) => instrument.includes(item.projectionKind))
if (!instrument.every((kind) => generated.some((item) => item.projectionKind === kind))) throw new Error("INSTRUMENT_KIND_NOT_GENERATED")
if (generated.some((item) => MVP_PROJECTION_SCOPE_MATRIX[item.projectionKind] !== "INSTRUMENT_SCOPED")) throw new Error("AGGREGATE_GENERATED_IN_CANARY")

console.log("MVP PROJECTION SCOPE SUITE: PASS")
