import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { MvpMarketAssessment } from "@/lib/data-platform/consistency"

export const MVP_PROJECTION_GENERATOR_ID = "mvp-consumer-projection-generator"
export const MVP_PROJECTION_GENERATOR_VERSION = "1.0.0"

export type MvpProjectionKind =
  | "DashboardMarketStateProjection"
  | "InstrumentMarketSummaryProjection"
  | "ReplayTimelineProjection"
  | "ResearchEvidenceProjection"
  | "ScannerCandidateProjection"
  | "TradeDecisionContextProjection"
  | "CoverageDataStatusProjection"
  | "SourceLineageSummaryProjection"
  | "EventAnnotationProjection"
  | "MacroContextProjection"
  | "BitcoinEtfFlowProjection"
export type MvpProjectionLifecycle = "GENERATED" | "SUPERSEDED" | "WITHHELD" | "INVALID"
export type MvpConsumerExposure = "INTERNAL_ONLY" | "READY_FOR_CUTOVER" | "CONSUMER_VISIBLE"
export type MvpProjectionCompleteness = "COMPLETE" | "COMPLETE_WITH_LIMITATION" | "WITHHELD"
export type MvpProjectionDependencyType = "EVIDENCE_PACKET" | "CONSISTENCY_RESULT" | "CANONICAL_FACT" | "STREAM_SEGMENT" | "COVERAGE_DECISION" | "PROJECTION"

export interface MvpProjectionDefinition {
  readonly projectionKind: MvpProjectionKind
  readonly consumer: "DASHBOARD" | "MARKETS" | "REPLAY" | "RESEARCH" | "SCANNER" | "TRADE" | "SHARED"
  readonly schemaVersion: "1.0.0"
  readonly generatorId: typeof MVP_PROJECTION_GENERATOR_ID
  readonly generatorVersion: typeof MVP_PROJECTION_GENERATOR_VERSION
  readonly definitionChecksum: string
}
export interface MvpProjectionDependency {
  readonly dependencyType: MvpProjectionDependencyType
  readonly dependencyId: string
  readonly dependencyVersion: string | null
  readonly dependencyChecksum: string | null
}
export interface MvpProjectionVersion {
  readonly projectionId: string
  readonly projectionVersionId: string
  readonly projectionVersionIdentity: string
  readonly projectionKind: MvpProjectionKind
  readonly subjectId: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly knowledgeTimeCutoff: string
  readonly dependencyDigest: string
  readonly generatorId: typeof MVP_PROJECTION_GENERATOR_ID
  readonly generatorVersion: typeof MVP_PROJECTION_GENERATOR_VERSION
  readonly schemaVersion: "1.0.0"
  readonly structuredPayload: Readonly<Record<string, unknown>>
  readonly completeness: MvpProjectionCompleteness
  readonly limitations: readonly string[]
  readonly lifecycleState: MvpProjectionLifecycle
  readonly consumerExposureState: MvpConsumerExposure
  readonly supersedesProjectionVersionId: string | null
  readonly dependencies: readonly MvpProjectionDependency[]
  readonly projectionChecksum: string
  readonly createdAt: string
}

const definitionSpecs = [
  ["DashboardMarketStateProjection", "DASHBOARD"], ["InstrumentMarketSummaryProjection", "MARKETS"],
  ["ReplayTimelineProjection", "REPLAY"], ["ResearchEvidenceProjection", "RESEARCH"],
  ["ScannerCandidateProjection", "SCANNER"], ["TradeDecisionContextProjection", "TRADE"],
  ["CoverageDataStatusProjection", "SHARED"], ["SourceLineageSummaryProjection", "SHARED"],
  ["EventAnnotationProjection", "SHARED"],
] as const
export const MVP_PROJECTION_DEFINITIONS: readonly MvpProjectionDefinition[] = Object.freeze(definitionSpecs.map(([projectionKind, consumer]) => {
  const base = { projectionKind, consumer, schemaVersion: "1.0.0" as const, generatorId: MVP_PROJECTION_GENERATOR_ID as typeof MVP_PROJECTION_GENERATOR_ID, generatorVersion: MVP_PROJECTION_GENERATOR_VERSION as typeof MVP_PROJECTION_GENERATOR_VERSION }
  return Object.freeze({ ...base, definitionChecksum: canonicalChecksum(base) })
}))

export const MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS: readonly MvpProjectionDefinition[] = Object.freeze(([
  ["MacroContextProjection", "DASHBOARD"],
  ["BitcoinEtfFlowProjection", "DASHBOARD"],
] as const).map(([projectionKind, consumer]) => {
  const base = { projectionKind, consumer, schemaVersion: "1.0.0" as const, generatorId: MVP_PROJECTION_GENERATOR_ID as typeof MVP_PROJECTION_GENERATOR_ID, generatorVersion: MVP_PROJECTION_GENERATOR_VERSION as typeof MVP_PROJECTION_GENERATOR_VERSION }
  return Object.freeze({ ...base, definitionChecksum: canonicalChecksum(base) })
}))

export interface MvpProjectionEvidenceInput {
  readonly assessment: MvpMarketAssessment
  readonly packetId: string
  readonly packetVersionId: string
  readonly packetChecksum: string
  readonly resultReferences: readonly { readonly resultId: string; readonly checksum: string }[]
  readonly factReferences: readonly { readonly id: string; readonly version: string; readonly checksum: string; readonly datasetId: string; readonly providerId: string; readonly publicationState: "PENDING" }[]
  readonly coverageDecisionIds: readonly string[]
  readonly latestPrice: string
}

function normalizedDependencies(values: readonly MvpProjectionDependency[]): readonly MvpProjectionDependency[] {
  const unique = new Map(values.map((value) => [`${value.dependencyType}:${value.dependencyId}:${value.dependencyVersion ?? ""}`, value]))
  return Object.freeze([...unique.values()].sort((a, b) => `${a.dependencyType}:${a.dependencyId}:${a.dependencyVersion ?? ""}`.localeCompare(`${b.dependencyType}:${b.dependencyId}:${b.dependencyVersion ?? ""}`)))
}
export function evidenceDependencies(input: MvpProjectionEvidenceInput): readonly MvpProjectionDependency[] {
  return normalizedDependencies([
    { dependencyType: "EVIDENCE_PACKET", dependencyId: input.packetId, dependencyVersion: input.packetVersionId, dependencyChecksum: input.packetChecksum },
    ...input.resultReferences.map((value) => ({ dependencyType: "CONSISTENCY_RESULT" as const, dependencyId: value.resultId, dependencyVersion: null, dependencyChecksum: value.checksum })),
    ...input.factReferences.map((value) => ({ dependencyType: value.datasetId === "agg-trade" ? "STREAM_SEGMENT" as const : "CANONICAL_FACT" as const, dependencyId: value.id, dependencyVersion: value.version, dependencyChecksum: value.checksum })),
    ...input.coverageDecisionIds.map((id) => ({ dependencyType: "COVERAGE_DECISION" as const, dependencyId: id, dependencyVersion: null, dependencyChecksum: null })),
  ])
}

export function createMvpProjection(input: {
  readonly kind: MvpProjectionKind; readonly subjectId: string; readonly eventTimeStart: string; readonly eventTimeEnd: string
  readonly knowledgeTimeCutoff: string; readonly payload: Readonly<Record<string, unknown>>; readonly dependencies: readonly MvpProjectionDependency[]
  readonly completeness?: MvpProjectionCompleteness; readonly limitations?: readonly string[]; readonly supersedesProjectionVersionId?: string | null
}): MvpProjectionVersion {
  if (Date.parse(input.eventTimeEnd) <= Date.parse(input.eventTimeStart)) throw new Error("MVP_PROJECTION_INVALID_EVENT_WINDOW")
  if (Date.parse(input.knowledgeTimeCutoff) < Date.parse(input.eventTimeEnd)) throw new Error("MVP_PROJECTION_FUTURE_KNOWLEDGE_BOUNDARY_INVALID")
  const definition = [...MVP_PROJECTION_DEFINITIONS, ...MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS].find((value) => value.projectionKind === input.kind)
  if (!definition) throw new Error("MVP_PROJECTION_KIND_UNKNOWN")
  const dependencies = normalizedDependencies(input.dependencies)
  if (!dependencies.length) throw new Error("MVP_PROJECTION_DEPENDENCIES_REQUIRED")
  const dependencyDigest = canonicalChecksum(dependencies)
  const business = { kind: input.kind, subjectId: input.subjectId, eventTimeStart: input.eventTimeStart, eventTimeEnd: input.eventTimeEnd }
  const projectionIdentity = canonicalChecksum(business)
  const versionIdentity = canonicalChecksum({ ...business, dependencyDigest, generatorId: definition.generatorId, generatorVersion: definition.generatorVersion, schemaVersion: definition.schemaVersion })
  const limitations = Object.freeze([...new Set(input.limitations ?? [])].sort())
  const base = { projectionId: `mvpp_${projectionIdentity}`, projectionVersionId: `mvpv_${versionIdentity}`, projectionVersionIdentity: versionIdentity, projectionKind: input.kind, subjectId: input.subjectId, eventTimeStart: input.eventTimeStart, eventTimeEnd: input.eventTimeEnd, knowledgeTimeCutoff: input.knowledgeTimeCutoff, dependencyDigest, generatorId: definition.generatorId, generatorVersion: definition.generatorVersion, schemaVersion: definition.schemaVersion, structuredPayload: input.payload, completeness: input.completeness ?? (limitations.length ? "COMPLETE_WITH_LIMITATION" : "COMPLETE"), limitations, lifecycleState: "GENERATED" as const, consumerExposureState: "READY_FOR_CUTOVER" as const, supersedesProjectionVersionId: input.supersedesProjectionVersionId ?? null, dependencies, createdAt: input.knowledgeTimeCutoff }
  return Object.freeze({ ...base, projectionChecksum: canonicalChecksum(base) })
}

const confidenceOrder = Object.freeze({ HIGH: 3, MEDIUM: 2, LOW: 1, NOT_AVAILABLE: 0 })
const stateOrder = Object.freeze({ DERIVATIVES_OVERHEATING: 7, MIXED: 6, DELEVERAGING: 5, POSITIONING_EXPANSION: 4, FUNDING_PRESSURE: 3, AGGRESSIVE_FLOW_DOMINANCE: 2, NEUTRAL: 1, NOT_EVALUABLE: 0 })
const governedInstrumentOrder = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])
const projectionRef = (value: MvpProjectionVersion): MvpProjectionDependency => ({ dependencyType: "PROJECTION", dependencyId: value.projectionId, dependencyVersion: value.projectionVersionId, dependencyChecksum: value.projectionChecksum })

export function generateMvpProjectionCorpus(inputs: readonly MvpProjectionEvidenceInput[]): readonly MvpProjectionVersion[] {
  const output: MvpProjectionVersion[] = []
  const summaries = new Map<string, MvpProjectionVersion>()
  const research = new Map<string, MvpProjectionVersion>()
  const scannerByDay = new Map<string, MvpProjectionVersion>()
  for (const input of inputs) {
    const a = input.assessment, deps = evidenceDependencies(input), key = `${a.instrument}:${a.eventTimeStart}`
    const common = { marketState: a.marketState, confidence: a.confidence, coverage: a.coverage, evidencePacketId: input.packetId, evidencePacketVersionId: input.packetVersionId, reasonCodes: a.structuredInterpretation, sourcePublicationState: "PENDING", staleStatus: "FROZEN_CORPUS", limitations: a.limitations }
    const summary = createMvpProjection({ kind: "InstrumentMarketSummaryProjection", subjectId: a.instrument, eventTimeStart: a.eventTimeStart, eventTimeEnd: a.eventTimeEnd, knowledgeTimeCutoff: a.knowledgeTimeCutoff, dependencies: deps, limitations: a.limitations, payload: { ...common, latestGovernedPrice: { close: input.latestPrice, boundedPriceChangePct: a.measurements.priceReturnPct }, openInterest: { changePct: a.measurements.oiChangePct, state: a.ruleEvaluations[0]?.state }, funding: { latestProviderEventRate: a.measurements.fundingLatestRate, state: a.ruleEvaluations[1]?.state }, aggressiveFlow: { imbalanceRatio: a.measurements.aggressiveImbalanceRatio, tradeCount: a.measurements.tradeCount, state: a.ruleEvaluations[2]?.state }, replayId: `${a.instrument}:${a.eventTimeStart}` } })
    output.push(summary); summaries.set(key, summary)
    const researchProjection = createMvpProjection({ kind: "ResearchEvidenceProjection", subjectId: a.instrument, eventTimeStart: a.eventTimeStart, eventTimeEnd: a.eventTimeEnd, knowledgeTimeCutoff: a.knowledgeTimeCutoff, dependencies: deps, limitations: a.limitations, payload: { conclusion: a.marketState, verifiedFacts: a.measurements, interpretation: a.structuredInterpretation, supportingEvidence: a.structuredInterpretation.supportingCodes, counterEvidence: a.structuredInterpretation.counterEvidenceCodes, confidence: a.confidence, coverage: a.coverage, sourceLineage: a.sourceLineage, ruleVersions: a.ruleVersions, measurementVersions: a.measurementVersions, packetId: input.packetId, packetVersionId: input.packetVersionId, supersessionStatus: "ACTIVE", recomputeIdentity: a.recomputeIdentity } })
    output.push(researchProjection); research.set(key, researchProjection)
    output.push(createMvpProjection({ kind: "SourceLineageSummaryProjection", subjectId: a.instrument, eventTimeStart: a.eventTimeStart, eventTimeEnd: a.eventTimeEnd, knowledgeTimeCutoff: a.knowledgeTimeCutoff, dependencies: deps, limitations: a.limitations, payload: { providers: [...new Set(input.factReferences.map((value) => value.providerId))].sort(), sourceIdentityStatus: "GOVERNED_REFERENCES", checksumDigest: a.sourceLineage.sourceReferenceDigest, normalizerVersions: a.measurementVersions, factOrSegmentReferences: input.factReferences, resultReferences: input.resultReferences, evidencePacketId: input.packetId, evidencePacketVersionId: input.packetVersionId, eventTimeRange: [a.eventTimeStart, a.eventTimeEnd], knowledgeTimeCutoff: a.knowledgeTimeCutoff, experimental: false, lowerBound: false, dependencyCount: deps.length, verificationStatus: "VERIFIED" } }))
    output.push(createMvpProjection({ kind: "ReplayTimelineProjection", subjectId: a.instrument, eventTimeStart: a.eventTimeStart, eventTimeEnd: a.eventTimeEnd, knowledgeTimeCutoff: a.knowledgeTimeCutoff, dependencies: deps, limitations: [...a.limitations, "LIQUIDATION_HISTORY_UNAVAILABLE", "ORDERBOOK_HISTORY_UNAVAILABLE"], payload: { lanes: { ohlcv: { returnPct: a.measurements.priceReturnPct, rangePct: a.measurements.realizedRangePct }, openInterest: { changePct: a.measurements.oiChangePct }, fundingEvents: a.measurements.fundingLatestRate === null ? [] : [{ eventClass: "LATEST_PROVIDER_EVENT_IN_WINDOW", rate: a.measurements.fundingLatestRate }], aggTradesSummary: { tradeCount: a.measurements.tradeCount, aggressiveBuyQuantity: a.measurements.aggressiveBuyQuantity, aggressiveSellQuantity: a.measurements.aggressiveSellQuantity, imbalanceRatio: a.measurements.aggressiveImbalanceRatio, segmentChecksum: a.measurements.segmentChecksum }, evidenceMarkers: [{ packetId: input.packetId, state: a.marketState }], assessmentState: a.marketState }, pagination: { embeddedRawAggTradeEvents: 0, chunkAddressable: true }, unavailableLanes: ["LIQUIDATION", "ORDER_BOOK", "NEWS"] } }))
    output.push(createMvpProjection({ kind: "EventAnnotationProjection", subjectId: a.instrument, eventTimeStart: a.eventTimeStart, eventTimeEnd: a.eventTimeEnd, knowledgeTimeCutoff: a.knowledgeTimeCutoff, dependencies: deps, limitations: ["GOVERNED_NEWS_SOURCE_UNAVAILABLE"], payload: { annotations: [...a.ruleEvaluations.filter((rule) => rule.state === "TRIGGERED").map((rule) => ({ category: "RULE_TRIGGER", ruleId: rule.ruleId, reasonCodes: rule.supportingCodes })), ...(a.measurements.fundingLatestRate === null ? [] : [{ category: "FUNDING_EVENT", state: a.ruleEvaluations[1]?.state }]), { category: "EVIDENCE_STATE_CHANGE", marketState: a.marketState }], newsStatus: "SOURCE_UNAVAILABLE" } }))
    for (const [dataset, coverage] of Object.entries(a.coverage)) output.push(createMvpProjection({ kind: "CoverageDataStatusProjection", subjectId: `${a.instrument}:${dataset}`, eventTimeStart: a.eventTimeStart, eventTimeEnd: a.eventTimeEnd, knowledgeTimeCutoff: a.knowledgeTimeCutoff, dependencies: deps, limitations: coverage < 0.95 ? ["COVERAGE_LIMITED"] : [], completeness: coverage < 0.95 ? "COMPLETE_WITH_LIMITATION" : "COMPLETE", payload: { dataset, instrument: a.instrument, governedWindow: [a.eventTimeStart, a.eventTimeEnd], availableRange: [a.eventTimeStart, a.eventTimeEnd], completePartitions: coverage >= 0.95 ? 1 : 0, missingPartitions: coverage >= 0.95 ? 0 : 1, gaps: 0, conflicts: 0, freshness: "FROZEN_CORPUS", sourceStatus: "AVAILABLE", providerTier: "A_OFFICIAL_ARCHIVE", completenessClassification: coverage >= 0.95 ? "AVAILABLE" : "GAP", mvpSupportState: "SUPPORTED" } }))
  }
  const days = [...new Set(inputs.map((input) => input.assessment.eventTimeStart))].sort()
  for (const day of days) {
    const group = inputs.filter((input) => input.assessment.eventTimeStart === day).sort((a, b) => governedInstrumentOrder.indexOf(a.assessment.instrument) - governedInstrumentOrder.indexOf(b.assessment.instrument))
    const ranked = [...group].sort((a, b) => confidenceOrder[b.assessment.confidence.classification] - confidenceOrder[a.assessment.confidence.classification] || stateOrder[b.assessment.marketState] - stateOrder[a.assessment.marketState] || Math.abs(b.assessment.measurements.oiChangePct ?? 0) - Math.abs(a.assessment.measurements.oiChangePct ?? 0) || a.assessment.instrument.localeCompare(b.assessment.instrument))
    const dependencies = normalizedDependencies(group.flatMap(evidenceDependencies))
    const scanner = createMvpProjection({ kind: "ScannerCandidateProjection", subjectId: "MVP_SIX_INSTRUMENTS", eventTimeStart: day, eventTimeEnd: group[0]!.assessment.eventTimeEnd, knowledgeTimeCutoff: group.map((item) => item.assessment.knowledgeTimeCutoff).sort().at(-1)!, dependencies, limitations: [], payload: { rankingVersion: "mvp-scanner-ranking/1.0.0", rankingSemantic: "MARKET_STATE_INVESTIGATION_PRIORITY_NOT_EXPECTED_PROFIT", candidates: ranked.map((item, index) => ({ rank: index + 1, candidateId: `mvpc_${canonicalChecksum({ instrument: item.assessment.instrument, day, packet: item.packetVersionId })}`, instrument: item.assessment.instrument, observableCondition: item.assessment.marketState, ruleReasonCodes: item.assessment.structuredInterpretation.supportingCodes, assessmentState: item.assessment.marketState, evidenceStrength: item.assessment.confidence.classification, counterEvidenceStrength: item.assessment.confidence.components.counterEvidencePenalty, coverageComparable: Math.min(...Object.values(item.assessment.coverage)) >= 0.95, freshness: "FROZEN_CORPUS", evidencePacketId: item.packetId, eligibleForRanking: item.assessment.marketState !== "NOT_EVALUABLE", exclusionReason: item.assessment.marketState === "NOT_EVALUABLE" ? "NOT_EVALUABLE" : null })) } })
    output.push(scanner); scannerByDay.set(day, scanner)
    const summaryRefs = group.map((item) => projectionRef(summaries.get(`${item.assessment.instrument}:${day}`)!))
    output.push(createMvpProjection({ kind: "DashboardMarketStateProjection", subjectId: "MVP_SIX_INSTRUMENTS", eventTimeStart: day, eventTimeEnd: group[0]!.assessment.eventTimeEnd, knowledgeTimeCutoff: group.map((item) => item.assessment.knowledgeTimeCutoff).sort().at(-1)!, dependencies: [...dependencies, ...summaryRefs], limitations: [], payload: { aggregateMethod: "STATE_COUNTS_NO_CATEGORICAL_AVERAGE", stateCounts: Object.fromEntries([...new Set(group.map((item) => item.assessment.marketState))].sort().map((state) => [state, group.filter((item) => item.assessment.marketState === state).length])), instrumentStates: group.map((item) => ({ instrument: item.assessment.instrument, state: item.assessment.marketState, confidence: item.assessment.confidence.classification, evidencePacketId: item.packetId })), primaryDrivers: [...new Set(group.flatMap((item) => item.assessment.structuredInterpretation.supportingCodes))].sort(), primaryRisks: [...new Set(group.flatMap((item) => item.assessment.structuredInterpretation.counterEvidenceCodes))].sort(), coverageSummary: group.map((item) => ({ instrument: item.assessment.instrument, coverage: item.assessment.coverage })), evidenceAvailability: "AVAILABLE", staleStatus: "FROZEN_CORPUS", drillDownIds: group.map((item) => item.packetId) } }))
  }
  for (const input of inputs) {
    const a = input.assessment, day = a.eventTimeStart, scanner = scannerByDay.get(day)!, summary = summaries.get(`${a.instrument}:${day}`)!, researchProjection = research.get(`${a.instrument}:${day}`)!
    const candidate = (scanner.structuredPayload.candidates as Array<{ instrument: string; candidateId: string }>).find((item) => item.instrument === a.instrument)!
    output.push(createMvpProjection({ kind: "TradeDecisionContextProjection", subjectId: a.instrument, eventTimeStart: day, eventTimeEnd: a.eventTimeEnd, knowledgeTimeCutoff: a.knowledgeTimeCutoff, dependencies: [...evidenceDependencies(input), projectionRef(scanner), projectionRef(summary), projectionRef(researchProjection)], limitations: a.limitations, payload: { selectedInstrument: a.instrument, sourceCandidateIdentity: candidate.candidateId, marketState: a.marketState, supportingFacts: a.structuredInterpretation.supportingCodes, counterEvidence: a.structuredInterpretation.counterEvidenceCodes, riskFactors: a.structuredInterpretation.counterEvidenceCodes, invalidationConditions: a.structuredInterpretation.nonTriggerCodes.map((code) => ({ observableStateChange: code, valueStatus: "NO_FABRICATED_LEVEL" })), confidence: a.confidence, coverage: a.coverage, sourceLimitations: a.limitations, evidencePacketIds: [input.packetId], relatedReplayWindow: [day, a.eventTimeEnd], actionState: a.marketState === "NOT_EVALUABLE" ? "INSUFFICIENT_EVIDENCE" : "CONTEXT_ONLY_NO_ACTION" } }))
  }
  return Object.freeze(output.sort((a, b) => `${a.projectionKind}:${a.eventTimeStart}:${a.subjectId}`.localeCompare(`${b.projectionKind}:${b.eventTimeStart}:${b.subjectId}`)))
}

export function verifyMvpProjection(value: MvpProjectionVersion): boolean {
  const { projectionChecksum, ...base } = value
  return canonicalChecksum(base) === projectionChecksum && canonicalChecksum(value.dependencies) === value.dependencyDigest && value.consumerExposureState !== "CONSUMER_VISIBLE"
}
