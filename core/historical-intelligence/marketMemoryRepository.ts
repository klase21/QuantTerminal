import { getAgentAccuracyStats } from "./agentAccuracyEngine"
import { getExpectationIntelligence } from "./expectationIntelligenceEngine"
import { getReplayCaseCatalog } from "./mockHistoricalIntelligenceRepository"
import { getSetupOutcomeMemory } from "./setupOutcomeMemoryEngine"
import { findSimilarReplayCases } from "./similarHistoricalEventEngine"
import type {
  AgentReliabilityNote,
  ExpectedReactionSummary,
  MarketMemoryQuery,
  MarketMemoryRepository,
  MarketMemorySnapshot,
  RecurringSetupPattern,
  RememberedMarketRegime,
  SimilarEventCluster,
} from "./marketMemoryTypes"

const GENERATED_AT = "2026-06-07T00:00:00.000Z"

function filteredCatalog(query?: MarketMemoryQuery) {
  return getReplayCaseCatalog().filter((entry) => {
    if (query?.caseId && entry.id !== query.caseId) return false
    if (query?.symbol && entry.replay.symbol !== query.symbol) return false
    if (query?.eventType && entry.eventType !== query.eventType) return false
    return true
  })
}

function rememberedRegimes(query?: MarketMemoryQuery): RememberedMarketRegime[] {
  return filteredCatalog(query).map((entry) => ({
    id: `${entry.id}-regime`,
    label: entry.replay.title,
    eventType: entry.eventType,
    symbol: entry.replay.symbol,
    shockLevel: entry.shockLevel,
    verdict: entry.replay.verdict,
    memoryRead: entry.replay.realityCheck,
  }))
}

function similarClusters(query?: MarketMemoryQuery): SimilarEventCluster[] {
  const entries = filteredCatalog(query)
  return entries.slice(0, query?.limit ?? 4).map((entry) => {
    const matches = findSimilarReplayCases(entry.replay, 3)
    const drivers = entry.replay.frames.at(-1)?.narrative.possibleDrivers.slice(0, 2).map((driver) => driver.driver) ?? []

    return {
      id: `${entry.id}-cluster`,
      label: `${entry.eventType} memory cluster`,
      caseIds: [entry.id, ...matches.map((match) => match.caseId)],
      sharedDrivers: drivers,
      averageSimilarity: matches.length
        ? Math.round(matches.reduce((sum, match) => sum + match.similarityScore, 0) / matches.length)
        : 0,
      clusterRead: matches[0]?.takeaway ?? "Insufficient mock history for a strong cluster read.",
    }
  })
}

function setupPatterns(query?: MarketMemoryQuery): RecurringSetupPattern[] {
  return filteredCatalog(query).slice(0, query?.limit ?? 4).map((entry) => {
    const memory = getSetupOutcomeMemory(entry.replay)

    return {
      id: `${entry.id}-setup-pattern`,
      label: `${entry.eventType} / ${entry.replay.symbol}`,
      sampleSize: memory.sampleSize,
      winRate: memory.winRate,
      commonFailureMode: memory.commonFailureMode,
      tacticalLesson: memory.tacticalLesson,
    }
  })
}

function agentNotes(): AgentReliabilityNote[] {
  return getAgentAccuracyStats().map((stat) => ({
    agent: stat.agent,
    accuracyScore: stat.accuracyScore,
    strongestEnvironment: stat.strongestEnvironment,
    weakestEnvironment: stat.weakestEnvironment,
    takeaway: stat.tacticalTakeaway,
  }))
}

function expectedReactions(query?: MarketMemoryQuery): ExpectedReactionSummary[] {
  return filteredCatalog(query).slice(0, query?.limit ?? 4).map((entry) => {
    const expectation = getExpectationIntelligence(entry.replay)

    return {
      caseId: entry.id,
      expectedOutcome: expectation.dominantExpectedOutcome,
      probability: expectation.expectationProbability,
      pricedInStatus: expectation.pricingStatus,
      surpriseScore: expectation.surpriseScore,
      interpretation: expectation.interpretation,
    }
  })
}

function memoryTakeaway(snapshot: Omit<MarketMemorySnapshot, "ok" | "generatedAt" | "scope" | "tacticalMemoryTakeaway">) {
  const topAgent = snapshot.agentReliabilityNotes[0]
  const topPattern = snapshot.recurringSetupPatterns[0]
  if (!topPattern) return "Market Memory is available, but the current mock scope has limited replay samples."
  return `${topPattern.label}: ${topPattern.tacticalLesson} Most reliable mock agent: ${topAgent?.agent ?? "N/A"}.`
}

export const mockMarketMemoryRepository: MarketMemoryRepository = {
  getMarketMemory(query) {
    const body = {
      rememberedMarketRegimes: rememberedRegimes(query),
      similarEventClusters: similarClusters(query),
      recurringSetupPatterns: setupPatterns(query),
      agentReliabilityNotes: agentNotes(),
      expectedReactionSummaries: expectedReactions(query),
    }

    return {
      ok: true,
      generatedAt: GENERATED_AT,
      scope: query?.caseId ? "case" : query?.symbol || query?.eventType ? "filtered" : "catalog",
      ...body,
      tacticalMemoryTakeaway: memoryTakeaway(body),
    }
  },
}
