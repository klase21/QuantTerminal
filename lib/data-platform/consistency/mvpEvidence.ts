import { canonicalChecksum } from "@/lib/data-platform/contracts"

export const MVP_EVIDENCE_RULE_SET_ID = "MVP-MARKET-EVIDENCE"
export const MVP_EVIDENCE_RULE_SET_VERSION = "1.0.0"
export const MVP_EVIDENCE_MEASUREMENT_VERSION = "mvp-market-measurements/1.0.0"

export type MvpEvidenceRuleId =
  | "DERIVATIVES_POSITIONING_EXPANSION"
  | "FUNDING_PRESSURE"
  | "AGGRESSIVE_FLOW_IMBALANCE"
  | "DERIVATIVES_OVERHEATING"
  | "DELEVERAGING_OR_NORMALIZATION"

export type MvpMarketState = "POSITIONING_EXPANSION" | "FUNDING_PRESSURE" | "AGGRESSIVE_FLOW_DOMINANCE" | "DERIVATIVES_OVERHEATING" | "DELEVERAGING" | "MIXED" | "NEUTRAL" | "NOT_EVALUABLE"
export type MvpRuleEvaluationState = "TRIGGERED" | "NOT_TRIGGERED" | "NOT_EVALUABLE"
export type MvpConfidenceClassification = "HIGH" | "MEDIUM" | "LOW" | "NOT_AVAILABLE"

export interface MvpEvidenceRuleDefinition {
  readonly ruleId: MvpEvidenceRuleId
  readonly ruleVersion: "1.0.0"
  readonly requiredDatasets: readonly string[]
  readonly optionalDatasets: readonly string[]
  readonly observationWindow: "P1D"
  readonly baselineWindow: "P14D" | "P30D"
  readonly thresholds: Readonly<Record<string, number>>
  readonly minimumCoverage: number
  readonly eventTimeSemantic: "START_INCLUSIVE_END_EXCLUSIVE"
  readonly knowledgeMode: "RETROSPECTIVE"
}

export const MVP_EVIDENCE_RULES: readonly MvpEvidenceRuleDefinition[] = Object.freeze([
  Object.freeze({ ruleId: "DERIVATIVES_POSITIONING_EXPANSION", ruleVersion: "1.0.0", requiredDatasets: Object.freeze(["ohlcv", "open-interest"]), optionalDatasets: Object.freeze([]), observationWindow: "P1D", baselineWindow: "P30D", thresholds: Object.freeze({ minimumOiChangePct: 1, baselineMultiplier: 1.5 }), minimumCoverage: 0.95, eventTimeSemantic: "START_INCLUSIVE_END_EXCLUSIVE", knowledgeMode: "RETROSPECTIVE" }),
  Object.freeze({ ruleId: "FUNDING_PRESSURE", ruleVersion: "1.0.0", requiredDatasets: Object.freeze(["funding"]), optionalDatasets: Object.freeze(["ohlcv"]), observationWindow: "P1D", baselineWindow: "P30D", thresholds: Object.freeze({ minimumAbsoluteFundingRate: 0.0001, baselinePercentile: 0.8 }), minimumCoverage: 0.95, eventTimeSemantic: "START_INCLUSIVE_END_EXCLUSIVE", knowledgeMode: "RETROSPECTIVE" }),
  Object.freeze({ ruleId: "AGGRESSIVE_FLOW_IMBALANCE", ruleVersion: "1.0.0", requiredDatasets: Object.freeze(["agg-trade"]), optionalDatasets: Object.freeze(["ohlcv"]), observationWindow: "P1D", baselineWindow: "P14D", thresholds: Object.freeze({ minimumAbsoluteImbalanceRatio: 0.1, minimumTradeCountIntensity: 0.75 }), minimumCoverage: 1, eventTimeSemantic: "START_INCLUSIVE_END_EXCLUSIVE", knowledgeMode: "RETROSPECTIVE" }),
  Object.freeze({ ruleId: "DERIVATIVES_OVERHEATING", ruleVersion: "1.0.0", requiredDatasets: Object.freeze(["ohlcv", "open-interest", "funding"]), optionalDatasets: Object.freeze(["agg-trade"]), observationWindow: "P1D", baselineWindow: "P30D", thresholds: Object.freeze({ minimumAbsolutePriceReturnPct: 1, minimumOiChangePct: 1, minimumAbsoluteFlowConfirmation: 0.1 }), minimumCoverage: 0.95, eventTimeSemantic: "START_INCLUSIVE_END_EXCLUSIVE", knowledgeMode: "RETROSPECTIVE" }),
  Object.freeze({ ruleId: "DELEVERAGING_OR_NORMALIZATION", ruleVersion: "1.0.0", requiredDatasets: Object.freeze(["ohlcv", "open-interest", "funding"]), optionalDatasets: Object.freeze(["agg-trade"]), observationWindow: "P1D", baselineWindow: "P30D", thresholds: Object.freeze({ minimumOiContractionPct: 1, maximumNormalizedFundingRatio: 0.75, maximumBalancedFlowRatio: 0.05, maximumStabilizedPriceReturnPct: 1 }), minimumCoverage: 0.95, eventTimeSemantic: "START_INCLUSIVE_END_EXCLUSIVE", knowledgeMode: "RETROSPECTIVE" }),
])

export interface MvpDerivedMeasurementSet {
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly knowledgeTimeCutoff: string
  readonly calculationVersion: typeof MVP_EVIDENCE_MEASUREMENT_VERSION
  readonly priceReturnPct: number | null
  readonly realizedRangePct: number | null
  readonly oiChangePct: number | null
  readonly oiBaselineMedianAbsChangePct: number | null
  readonly fundingLatestRate: number | null
  readonly fundingPreviousRate: number | null
  readonly fundingBaselineAbsPercentile: number | null
  readonly fundingNormalizationRatio: number | null
  readonly aggressiveBuyQuantity: string | null
  readonly aggressiveSellQuantity: string | null
  readonly aggressiveImbalanceRatio: number | null
  readonly tradeCount: number | null
  readonly tradeCountIntensity: number | null
  readonly coverage: Readonly<Record<"ohlcv" | "openInterest" | "funding" | "aggTrades", number>>
  readonly sourceReferenceDigest: string
  readonly sourceReferenceCount: number
  readonly lineageReferenceCount: number
  readonly segmentChecksum: string | null
  readonly maximumInputEventTime: string
  readonly completeness: "COMPLETE" | "LIMITED"
  readonly limitationCodes: readonly string[]
}

export interface MvpRuleEvaluation {
  readonly ruleId: MvpEvidenceRuleId
  readonly ruleVersion: string
  readonly state: MvpRuleEvaluationState
  readonly supportingCodes: readonly string[]
  readonly counterEvidenceCodes: readonly string[]
  readonly nonTriggerCodes: readonly string[]
  readonly limitationCodes: readonly string[]
  readonly measurementDigest: string
}

export interface MvpConfidenceComponents {
  readonly dataCoverage: number
  readonly sourceQuality: number
  readonly temporalAlignment: number
  readonly ruleAgreement: number
  readonly counterEvidencePenalty: number
  readonly freshness: number
  readonly reproducibility: number
}

export interface MvpMarketAssessment {
  readonly assessmentId: string
  readonly assessmentIdentity: string
  readonly assessmentChecksum: string
  readonly corpusId: string
  readonly corpusChecksum: string
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly knowledgeTimeCutoff: string
  readonly marketState: MvpMarketState
  readonly measurements: MvpDerivedMeasurementSet
  readonly ruleEvaluations: readonly MvpRuleEvaluation[]
  readonly structuredInterpretation: {
    readonly conclusionCode: string
    readonly supportingCodes: readonly string[]
    readonly counterEvidenceCodes: readonly string[]
    readonly nonTriggerCodes: readonly string[]
  }
  readonly confidence: { readonly components: MvpConfidenceComponents; readonly strength: number | null; readonly classification: MvpConfidenceClassification; readonly semantic: "EVIDENCE_STRENGTH_NOT_PROBABILITY" }
  readonly coverage: MvpDerivedMeasurementSet["coverage"]
  readonly sourceLineage: { readonly sourceReferenceDigest: string; readonly sourceReferenceCount: number; readonly lineageReferenceCount: number; readonly segmentChecksum: string | null }
  readonly limitations: readonly string[]
  readonly ruleVersions: readonly { readonly ruleId: MvpEvidenceRuleId; readonly ruleVersion: string }[]
  readonly measurementVersions: readonly string[]
  readonly recomputeIdentity: string
  readonly createdAt: string
}

const round = (value: number) => Number(value.toFixed(6))
const absoluteThreshold = (minimum: number, baseline: number | null, multiplier = 1): number => Math.max(minimum, (baseline ?? 0) * multiplier)
const available = (measurement: MvpDerivedMeasurementSet, datasets: readonly string[]) => datasets.every((dataset) => dataset === "ohlcv" ? measurement.coverage.ohlcv >= 0.95 : dataset === "open-interest" ? measurement.coverage.openInterest >= 0.95 : dataset === "funding" ? measurement.coverage.funding >= 0.95 : measurement.coverage.aggTrades >= 1)

function rule(ruleId: MvpEvidenceRuleId, state: MvpRuleEvaluationState, measurement: MvpDerivedMeasurementSet, supporting: readonly string[], counter: readonly string[], nonTrigger: readonly string[], limitations: readonly string[] = []): MvpRuleEvaluation {
  return Object.freeze({ ruleId, ruleVersion: "1.0.0", state, supportingCodes: Object.freeze([...supporting].sort()), counterEvidenceCodes: Object.freeze([...counter].sort()), nonTriggerCodes: Object.freeze([...nonTrigger].sort()), limitationCodes: Object.freeze([...limitations].sort()), measurementDigest: canonicalChecksum(measurement) })
}

export function evaluateMvpEvidenceRules(measurement: MvpDerivedMeasurementSet): readonly MvpRuleEvaluation[] {
  if (Date.parse(measurement.maximumInputEventTime) >= Date.parse(measurement.eventTimeEnd)) throw new Error("MVP_EVIDENCE_FUTURE_EVENT_INPUT")
  const oiThreshold = absoluteThreshold(1, measurement.oiBaselineMedianAbsChangePct, 1.5)
  const fundingThreshold = absoluteThreshold(0.0001, measurement.fundingBaselineAbsPercentile)
  const evaluations: MvpRuleEvaluation[] = []

  if (!available(measurement, ["ohlcv", "open-interest"]) || measurement.oiChangePct === null || measurement.priceReturnPct === null) evaluations.push(rule("DERIVATIVES_POSITIONING_EXPANSION", "NOT_EVALUABLE", measurement, [], [], [], ["REQUIRED_OHLCV_OR_OI_UNAVAILABLE"]))
  else if (Math.abs(measurement.oiChangePct) >= oiThreshold) evaluations.push(rule("DERIVATIVES_POSITIONING_EXPANSION", "TRIGGERED", measurement, [measurement.oiChangePct > 0 ? "OI_MATERIALLY_EXPANDED" : "OI_MATERIALLY_CONTRACTED", measurement.priceReturnPct > 0 ? "PRICE_ROSE" : measurement.priceReturnPct < 0 ? "PRICE_FELL" : "PRICE_FLAT"], [Math.sign(measurement.oiChangePct) !== Math.sign(measurement.priceReturnPct) ? "PRICE_OI_DIRECTION_DIVERGED" : "NO_PRICE_OI_DIVERGENCE"], []))
  else evaluations.push(rule("DERIVATIVES_POSITIONING_EXPANSION", "NOT_TRIGGERED", measurement, [], ["OI_CHANGE_WITHIN_BASELINE"], ["OI_CHANGE_BELOW_MATERIAL_THRESHOLD"]))

  if (!available(measurement, ["funding"]) || measurement.fundingLatestRate === null) evaluations.push(rule("FUNDING_PRESSURE", "NOT_EVALUABLE", measurement, [], [], [], ["REQUIRED_FUNDING_UNAVAILABLE"]))
  else if (Math.abs(measurement.fundingLatestRate) >= fundingThreshold) evaluations.push(rule("FUNDING_PRESSURE", "TRIGGERED", measurement, [measurement.fundingLatestRate > 0 ? "FUNDING_MATERIALLY_POSITIVE" : "FUNDING_MATERIALLY_NEGATIVE"], [measurement.fundingNormalizationRatio !== null && measurement.fundingNormalizationRatio < 0.75 ? "FUNDING_NORMALIZING" : "FUNDING_NOT_NORMALIZING"], []))
  else evaluations.push(rule("FUNDING_PRESSURE", "NOT_TRIGGERED", measurement, [], ["FUNDING_WITHIN_BASELINE"], ["FUNDING_BELOW_PRESSURE_THRESHOLD"]))

  if (!available(measurement, ["agg-trade"]) || measurement.aggressiveImbalanceRatio === null || measurement.tradeCountIntensity === null) evaluations.push(rule("AGGRESSIVE_FLOW_IMBALANCE", "NOT_EVALUABLE", measurement, [], [], [], ["AGGTRADES_OPTIONAL_ENRICHMENT_UNAVAILABLE"]))
  else if (Math.abs(measurement.aggressiveImbalanceRatio) >= 0.1 && measurement.tradeCountIntensity >= 0.75) evaluations.push(rule("AGGRESSIVE_FLOW_IMBALANCE", "TRIGGERED", measurement, [measurement.aggressiveImbalanceRatio > 0 ? "AGGRESSIVE_BUY_QUANTITY_DOMINATED" : "AGGRESSIVE_SELL_QUANTITY_DOMINATED", "TRADE_COUNT_INTENSITY_SUFFICIENT"], [measurement.tradeCountIntensity < 1 ? "TRADE_COUNT_BELOW_BASELINE" : "TRADE_COUNT_AT_OR_ABOVE_BASELINE"], []))
  else evaluations.push(rule("AGGRESSIVE_FLOW_IMBALANCE", "NOT_TRIGGERED", measurement, [], [Math.abs(measurement.aggressiveImbalanceRatio) < 0.1 ? "AGGRESSIVE_FLOW_BALANCED" : "TRADE_COUNT_INTENSITY_LOW"], ["FLOW_IMBALANCE_CONDITION_NOT_MET"]))

  const positioning = evaluations[0]?.state === "TRIGGERED" && (measurement.oiChangePct ?? 0) > 0
  const pressure = evaluations[1]?.state === "TRIGGERED"
  const flowConfirms = measurement.aggressiveImbalanceRatio !== null && Math.abs(measurement.aggressiveImbalanceRatio) >= 0.1 && Math.sign(measurement.aggressiveImbalanceRatio) === Math.sign(measurement.priceReturnPct ?? 0)
  if (!available(measurement, ["ohlcv", "open-interest", "funding"])) evaluations.push(rule("DERIVATIVES_OVERHEATING", "NOT_EVALUABLE", measurement, [], [], [], ["MINIMUM_MULTIFACTOR_INPUTS_UNAVAILABLE"]))
  else if (positioning && pressure && (Math.abs(measurement.priceReturnPct ?? 0) >= 1 || flowConfirms)) evaluations.push(rule("DERIVATIVES_OVERHEATING", "TRIGGERED", measurement, ["OI_EXPANSION_CONFIRMED", "FUNDING_PRESSURE_CONFIRMED", flowConfirms ? "AGGRESSIVE_FLOW_CONFIRMED" : "PRICE_MOVEMENT_CONFIRMED"], [flowConfirms ? "NO_FLOW_DIVERGENCE" : "AGGTRADES_DID_NOT_CONFIRM"], []))
  else evaluations.push(rule("DERIVATIVES_OVERHEATING", "NOT_TRIGGERED", measurement, [], [!positioning ? "OI_EXPANSION_NOT_CONFIRMED" : !pressure ? "FUNDING_PRESSURE_NOT_CONFIRMED" : "PRICE_AND_FLOW_CONFIRMATION_ABSENT"], ["MULTIFACTOR_OVERHEATING_THRESHOLD_NOT_MET"]))

  const contraction = (measurement.oiChangePct ?? 0) <= -oiThreshold
  const normalizedFunding = measurement.fundingNormalizationRatio !== null && measurement.fundingNormalizationRatio <= 0.75
  const stabilization = Math.abs(measurement.aggressiveImbalanceRatio ?? 0) <= 0.05 || Math.abs(measurement.priceReturnPct ?? Number.POSITIVE_INFINITY) <= 1
  if (!available(measurement, ["ohlcv", "open-interest", "funding"])) evaluations.push(rule("DELEVERAGING_OR_NORMALIZATION", "NOT_EVALUABLE", measurement, [], [], [], ["MINIMUM_NORMALIZATION_INPUTS_UNAVAILABLE"]))
  else if (contraction && (normalizedFunding || stabilization)) evaluations.push(rule("DELEVERAGING_OR_NORMALIZATION", "TRIGGERED", measurement, ["OI_MATERIALLY_CONTRACTED", normalizedFunding ? "FUNDING_NORMALIZED" : "MARKET_MOVEMENT_STABILIZED"], [measurement.aggressiveImbalanceRatio !== null && Math.abs(measurement.aggressiveImbalanceRatio) > 0.1 ? "AGGRESSIVE_FLOW_REMAINS_IMBALANCED" : "NO_STRONG_FLOW_OPPOSITION"], []))
  else evaluations.push(rule("DELEVERAGING_OR_NORMALIZATION", "NOT_TRIGGERED", measurement, [], [!contraction ? "OI_CONTRACTION_NOT_MATERIAL" : "NORMALIZATION_CONFIRMATION_ABSENT"], ["DELEVERAGING_CONDITION_NOT_MET"]))
  return Object.freeze(evaluations)
}

function stateFor(evaluations: readonly MvpRuleEvaluation[]): MvpMarketState {
  const triggered = new Set(evaluations.filter((item) => item.state === "TRIGGERED").map((item) => item.ruleId))
  if (evaluations.every((item) => item.state === "NOT_EVALUABLE")) return "NOT_EVALUABLE"
  if (triggered.has("DERIVATIVES_OVERHEATING")) return "DERIVATIVES_OVERHEATING"
  if (triggered.has("DELEVERAGING_OR_NORMALIZATION")) return "DELEVERAGING"
  if (triggered.size > 1) return "MIXED"
  if (triggered.has("DERIVATIVES_POSITIONING_EXPANSION")) return "POSITIONING_EXPANSION"
  if (triggered.has("FUNDING_PRESSURE")) return "FUNDING_PRESSURE"
  if (triggered.has("AGGRESSIVE_FLOW_IMBALANCE")) return "AGGRESSIVE_FLOW_DOMINANCE"
  return "NEUTRAL"
}

export function createMvpMarketAssessment(input: { readonly corpusId: string; readonly corpusChecksum: string; readonly measurement: MvpDerivedMeasurementSet }): MvpMarketAssessment {
  const evaluations = evaluateMvpEvidenceRules(input.measurement)
  const marketState = stateFor(evaluations)
  const supportingCodes = [...new Set(evaluations.flatMap((item) => item.supportingCodes))].sort()
  const counterEvidenceCodes = [...new Set(evaluations.flatMap((item) => item.counterEvidenceCodes))].sort()
  const nonTriggerCodes = [...new Set(evaluations.flatMap((item) => item.nonTriggerCodes))].sort()
  const limitations = [...new Set([...input.measurement.limitationCodes, ...evaluations.flatMap((item) => item.limitationCodes), "LIQUIDATION_ENRICHMENT_NOT_REQUIRED", "ORDERBOOK_ENRICHMENT_NOT_REQUIRED"])].sort()
  const evaluated = evaluations.filter((item) => item.state !== "NOT_EVALUABLE")
  const triggered = evaluated.filter((item) => item.state === "TRIGGERED").length
  const components: MvpConfidenceComponents = Object.freeze({ dataCoverage: round(Math.min(...Object.values(input.measurement.coverage))), sourceQuality: 1, temporalAlignment: 1, ruleAgreement: evaluated.length ? round(triggered / evaluated.length) : 0, counterEvidencePenalty: evaluated.length ? round(counterEvidenceCodes.filter((code) => !code.startsWith("NO_")).length / evaluated.length) : 1, freshness: input.measurement.completeness === "COMPLETE" ? 1 : 0.5, reproducibility: 1 })
  const strength = marketState === "NOT_EVALUABLE" ? null : round(((components.dataCoverage + components.sourceQuality + components.temporalAlignment + components.ruleAgreement + components.freshness + components.reproducibility) / 6) * (1 - 0.5 * Math.min(1, components.counterEvidencePenalty)))
  const classification: MvpConfidenceClassification = strength === null ? "NOT_AVAILABLE" : strength >= 0.85 && components.counterEvidencePenalty <= 0.2 ? "HIGH" : strength >= 0.65 ? "MEDIUM" : "LOW"
  const ruleVersions = Object.freeze(evaluations.map(({ ruleId, ruleVersion }) => Object.freeze({ ruleId, ruleVersion })))
  const structuredInterpretation = Object.freeze({ conclusionCode: marketState, supportingCodes: Object.freeze(supportingCodes), counterEvidenceCodes: Object.freeze(counterEvidenceCodes), nonTriggerCodes: Object.freeze(nonTriggerCodes) })
  const sourceLineage = Object.freeze({ sourceReferenceDigest: input.measurement.sourceReferenceDigest, sourceReferenceCount: input.measurement.sourceReferenceCount, lineageReferenceCount: input.measurement.lineageReferenceCount, segmentChecksum: input.measurement.segmentChecksum })
  const identityMaterial = { corpusId: input.corpusId, corpusChecksum: input.corpusChecksum, instrument: input.measurement.instrument, eventTimeStart: input.measurement.eventTimeStart, eventTimeEnd: input.measurement.eventTimeEnd, knowledgeTimeCutoff: input.measurement.knowledgeTimeCutoff, ruleVersions, measurementVersion: input.measurement.calculationVersion, sourceReferenceDigest: input.measurement.sourceReferenceDigest }
  const assessmentIdentity = canonicalChecksum(identityMaterial)
  const recomputeIdentity = canonicalChecksum({ ...identityMaterial, assessmentIdentity, measurementDigest: canonicalChecksum(input.measurement) })
  const base = { assessmentId: `mvp_assessment_${assessmentIdentity}`, assessmentIdentity, corpusId: input.corpusId, corpusChecksum: input.corpusChecksum, instrument: input.measurement.instrument, eventTimeStart: input.measurement.eventTimeStart, eventTimeEnd: input.measurement.eventTimeEnd, knowledgeTimeCutoff: input.measurement.knowledgeTimeCutoff, marketState, measurements: input.measurement, ruleEvaluations: evaluations, structuredInterpretation, confidence: Object.freeze({ components, strength, classification, semantic: "EVIDENCE_STRENGTH_NOT_PROBABILITY" as const }), coverage: input.measurement.coverage, sourceLineage, limitations: Object.freeze(limitations), ruleVersions, measurementVersions: Object.freeze([input.measurement.calculationVersion]), recomputeIdentity, createdAt: input.measurement.knowledgeTimeCutoff }
  return Object.freeze({ ...base, assessmentChecksum: canonicalChecksum(base) })
}
