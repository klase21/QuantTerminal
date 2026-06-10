import type { InformationItem } from "./informationTypes"
import {
  defaultInformationScoreWeights,
  informationScoreBand,
  type AttentionScore,
  type CompositeIntelligenceScore,
  type ImpactScore,
  type NarrativeScore,
  type NoveltyScore,
  type ReliabilityScore,
} from "./informationScoringTypes"
import { listMockInformationItems, type InformationRepositoryQuery } from "./mockInformationRepository"

export interface InformationIntelligenceDigestItem {
  itemId: string
  title: string
  source: string
  reliabilityScore: number
  attentionScore: number
  narrativeScore: number
  impactScore: number
  noveltyScore: number
  compositeScore: number
  tacticalRead: string
  caveat: string
  score: CompositeIntelligenceScore
}

export interface InformationIntelligenceDigest {
  ok: true
  generatedAt: string
  mode: "mock"
  items: InformationIntelligenceDigestItem[]
  topScoredItems: InformationIntelligenceDigestItem[]
  noisyButViralItems: InformationIntelligenceDigestItem[]
  reliableLowAttentionItems: InformationIntelligenceDigestItem[]
  highImpactCandidates: InformationIntelligenceDigestItem[]
  caveat: string
}

function numberFromMetadata(item: InformationItem, key: string, fallback: number) {
  const value = item.metadata[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function weightedAverage(parts: Array<[number, number]>) {
  const totalWeight = parts.reduce((sum, [, weight]) => sum + weight, 0)
  if (!totalWeight) return 0
  return clamp(parts.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight)
}

function reliabilityScore(item: InformationItem): ReliabilityScore {
  const sourceReputation = item.source.reputationScore
  const historicalAccuracy = numberFromMetadata(item, "historicalAccuracy", sourceReputation)
  const corroboration = numberFromMetadata(item, "corroboration", 35)
  const consistency = numberFromMetadata(item, "consistency", 50)
  const value = weightedAverage([
    [sourceReputation, 0.35],
    [historicalAccuracy, 0.25],
    [corroboration, 0.25],
    [consistency, 0.15],
  ])

  return {
    value,
    band: informationScoreBand(value),
    sourceReputation,
    historicalAccuracy,
    corroboration,
    consistency,
    rationale: "Mock reliability from source reputation, historical accuracy, corroboration, and consistency.",
  }
}

function attentionScore(item: InformationItem): AttentionScore {
  const velocity = numberFromMetadata(item, "velocity", 20)
  const mentions = clamp(numberFromMetadata(item, "mentions", 0) / 3)
  const spread = numberFromMetadata(item, "spread", 20)
  const crossPlatformPresence = numberFromMetadata(item, "crossPlatformPresence", 10)
  const value = weightedAverage([
    [velocity, 0.35],
    [mentions, 0.2],
    [spread, 0.25],
    [crossPlatformPresence, 0.2],
  ])

  return {
    value,
    band: informationScoreBand(value),
    velocity,
    mentions,
    spread,
    crossPlatformPresence,
    rationale: "Mock attention from velocity, mentions, spread, and cross-platform presence.",
  }
}

function narrativeStage(item: InformationItem): NarrativeScore["narrativeStage"] {
  const attention = attentionScore(item).value
  const novelty = String(item.metadata.noveltyState ?? "known")
  if (attention >= 78 && novelty === "new") return "growing"
  if (attention >= 75) return "dominant"
  if (attention >= 50) return "growing"
  if (attention >= 30) return "emerging"
  return "declining"
}

function narrativeScore(item: InformationItem): NarrativeScore {
  const attention = attentionScore(item)
  const reliability = reliabilityScore(item)
  const stage = narrativeStage(item)
  const coherence = clamp((reliability.consistency + Math.min(100, item.narrativeTags.length * 22)) / 2)
  const persistence = clamp(attention.spread * 0.55 + attention.crossPlatformPresence * 0.45)
  const contradictionLevel = clamp(100 - reliability.corroboration)
  const value = weightedAverage([
    [coherence, 0.32],
    [persistence, 0.34],
    [100 - contradictionLevel, 0.18],
    [attention.value, 0.16],
  ])

  return {
    value,
    band: informationScoreBand(value),
    narrativeStage: stage,
    coherence,
    persistence,
    contradictionLevel,
    rationale: "Mock narrative score from coherence, persistence, contradiction, and attention.",
  }
}

function impactScore(item: InformationItem): ImpactScore {
  const priceImpact = numberFromMetadata(item, "priceImpact", 20)
  const volumeImpact = numberFromMetadata(item, "volumeImpact", 20)
  const volatilityImpact = numberFromMetadata(item, "volatilityImpact", 20)
  const sentimentImpact = numberFromMetadata(item, "sentimentImpact", 20)
  const value = weightedAverage([
    [priceImpact, 0.34],
    [volumeImpact, 0.24],
    [volatilityImpact, 0.24],
    [sentimentImpact, 0.18],
  ])

  return {
    value,
    band: informationScoreBand(value),
    priceImpact,
    volumeImpact,
    volatilityImpact,
    sentimentImpact,
    rationale: "Mock impact from associated price, volume, volatility, and sentiment effects.",
  }
}

function noveltyScore(item: InformationItem): NoveltyScore {
  const noveltyState = (item.metadata.noveltyState === "new" ||
    item.metadata.noveltyState === "known" ||
    item.metadata.noveltyState === "recycled" ||
    item.metadata.noveltyState === "saturated")
    ? item.metadata.noveltyState
    : "known"
  const stateBase = {
    new: 88,
    known: 58,
    recycled: 32,
    saturated: 18,
  }[noveltyState]
  const firstSeenDistance = item.timeSensitivity === "minutes" ? 88 : item.timeSensitivity === "hours" ? 68 : 42
  const uniqueness = clamp(stateBase + item.topicTags.length * 3)
  const repetitionPenalty = noveltyState === "saturated" ? 55 : noveltyState === "recycled" ? 38 : noveltyState === "known" ? 18 : 4
  const value = clamp(weightedAverage([
    [stateBase, 0.44],
    [firstSeenDistance, 0.28],
    [uniqueness, 0.2],
    [100 - repetitionPenalty, 0.08],
  ]))

  return {
    value,
    band: informationScoreBand(value),
    noveltyState,
    firstSeenDistance,
    uniqueness,
    repetitionPenalty,
    rationale: "Mock novelty from first-seen distance, uniqueness, and repetition penalty.",
  }
}

function tacticalRead(item: InformationItem, score: CompositeIntelligenceScore) {
  if (score.attention.value >= 75 && score.reliability.value < 45) {
    return "Viral but weakly verified. Watch spread, but require corroboration before treating it as market intelligence."
  }
  if (score.reliability.value >= 70 && score.attention.value < 45) {
    return "Reliable but not widely spreading. Useful as background context unless attention accelerates."
  }
  if (score.impact.value >= 70 && score.reliability.value >= 65) {
    return "High-impact candidate with enough reliability to monitor closely in event intelligence."
  }
  if (score.novelty.value >= 75 && score.attention.value >= 60) {
    return "Fresh narrative candidate. Track whether it becomes cross-platform and price-relevant."
  }
  return "Context signal. Keep in the information layer until reliability, attention, or impact improves."
}

function caveat(item: InformationItem, score: CompositeIntelligenceScore) {
  if (item.source.category === "social") return "Social information is noisy and can spread before verification."
  if (item.source.category === "prediction_market") return "Prediction market context reflects crowd odds, not guaranteed truth."
  if (score.impact.value >= 70) return "Impact is a mock association estimate, not causal proof."
  return "Mock scoring only. No live source connection or external API used."
}

export function scoreInformationItem(item: InformationItem): CompositeIntelligenceScore {
  const reliability = reliabilityScore(item)
  const attention = attentionScore(item)
  const narrative = narrativeScore(item)
  const impact = impactScore(item)
  const novelty = noveltyScore(item)
  const weights = defaultInformationScoreWeights
  const value = clamp(
    reliability.value * weights.reliability +
      attention.value * weights.attention +
      narrative.value * weights.narrative +
      impact.value * weights.impact +
      novelty.value * weights.novelty,
  )

  return {
    value,
    band: informationScoreBand(value),
    reliability,
    attention,
    narrative,
    impact,
    novelty,
    weights,
    interpretation: "Composite mock intelligence score balancing reliability, attention, narrative formation, market impact, and novelty.",
  }
}

function digestItem(item: InformationItem): InformationIntelligenceDigestItem {
  const score = scoreInformationItem(item)
  return {
    itemId: item.id,
    title: item.title,
    source: item.source.displayName,
    reliabilityScore: score.reliability.value,
    attentionScore: score.attention.value,
    narrativeScore: score.narrative.value,
    impactScore: score.impact.value,
    noveltyScore: score.novelty.value,
    compositeScore: score.value,
    tacticalRead: tacticalRead(item, score),
    caveat: caveat(item, score),
    score,
  }
}

export function getInformationIntelligenceDigest(query: InformationRepositoryQuery = {}): InformationIntelligenceDigest {
  const items = listMockInformationItems(query).map(digestItem).sort((a, b) => b.compositeScore - a.compositeScore)

  return {
    ok: true,
    generatedAt: "2026-06-08T00:00:00.000Z",
    mode: "mock",
    items,
    topScoredItems: items.slice(0, 3),
    noisyButViralItems: items
      .filter((item) => item.attentionScore >= 70 && item.reliabilityScore < 55)
      .sort((a, b) => b.attentionScore - a.attentionScore)
      .slice(0, 3),
    reliableLowAttentionItems: items
      .filter((item) => item.reliabilityScore >= 70 && item.attentionScore < 55)
      .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
      .slice(0, 3),
    highImpactCandidates: items
      .filter((item) => item.impactScore >= 65)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 3),
    caveat: "Mock Information Intelligence scoring only. No live fetch, external API, database, or adapter is connected.",
  }
}

