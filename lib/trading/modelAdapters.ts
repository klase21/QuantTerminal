import type { MarketMoverCandidate } from "@/lib/market-movers/types"
import type { ActiveSetupMemoryItem } from "@/hooks/market-movers/useActiveSetupMemory"
import type { EventRecord, SetupOutcomeRecord, SetupRecord } from "@/lib/trading/types"

function normalizeIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_")
}

export function setupRecordId(symbol: string, firstSeenAt: number) {
  return `setup_${normalizeIdPart(symbol)}_${firstSeenAt}`
}

export function setupEventRecordId(symbol: string, firstSeenAt: number) {
  return `event_setup_${normalizeIdPart(symbol)}_${firstSeenAt}`
}

export function setupOutcomeRecordId(symbol: string, firstSeenAt: number) {
  return `outcome_${normalizeIdPart(symbol)}_${firstSeenAt}`
}

export function setupRecordFromMemory(item: ActiveSetupMemoryItem): SetupRecord {
  const id = setupRecordId(item.symbol, item.firstSeenAt)
  const status = item.lifecycle === "COMPLETED"
    ? "COMPLETED"
    : item.lifecycle === "INVALIDATED"
      ? item.outcome === "EXPIRED" ? "EXPIRED" : "INVALIDATED"
      : item.lifecycle

  return {
    id,
    symbol: item.symbol,
    setup: item.setup,
    source: "market-discovery",
    direction: item.direction,
    bias: item.bias,
    grade: item.grade,
    confidence: item.confidence,
    freshness: item.freshness,
    regime: item.marketRegime,
    score: item.score,
    trustSummary: item.trustSummary,
    qualityReason: item.qualityReason,
    plan: {
      side: item.numericPlan?.side ?? item.direction,
      detectedPrice: item.numericPlan?.detectedPrice ?? item.detectedPrice,
      entryLow: item.numericPlan?.entryLow ?? item.detectedPrice,
      entryHigh: item.numericPlan?.entryHigh ?? item.detectedPrice,
      stopLoss: item.numericPlan?.stopLoss ?? item.detectedPrice,
      takeProfit1: item.numericPlan?.takeProfit1 ?? item.detectedPrice,
      takeProfit2: item.numericPlan?.takeProfit2 ?? item.detectedPrice,
      riskReward: item.riskReward,
      planQuality: item.planQuality,
      slDistancePct: item.slDistancePct,
      riskPct: item.riskPct,
      suggestedPositionPct: item.suggestedPositionPct,
    },
    firstSeenAt: item.firstSeenAt,
    lastSeenAt: item.lastSeenAt,
    status,
    outcome: item.outcome,
    linkedEventIds: [setupEventRecordId(item.symbol, item.firstSeenAt)],
    metadata: {
      capTier: item.capTier,
      qualityState: item.qualityState,
      qualityReason: item.qualityReason,
      bestMovePct: item.bestMovePct,
      worstMovePct: item.worstMovePct,
      scoreBreakdown: item.scoreBreakdown,
    },
  }
}

export function outcomeRecordFromMemory(item: ActiveSetupMemoryItem): SetupOutcomeRecord {
  return {
    id: setupOutcomeRecordId(item.symbol, item.firstSeenAt),
    setupId: setupRecordId(item.symbol, item.firstSeenAt),
    symbol: item.symbol,
    direction: item.direction,
    status: item.outcome,
    detectedPrice: item.detectedPrice,
    latestPrice: item.latestPrice,
    bestPrice: item.bestPrice,
    worstPrice: item.worstPrice,
    bestMovePct: item.bestMovePct,
    worstMovePct: item.worstMovePct,
    resultText: item.resultText,
    firstSeenAt: item.firstSeenAt,
    resolvedAt: item.outcome === "OPEN" ? undefined : item.lastSeenAt,
    durationMs: item.outcome === "OPEN" ? undefined : Math.max(0, item.lastSeenAt - item.firstSeenAt),
  }
}

export function setupDetectedEventFromMemory(item: ActiveSetupMemoryItem): EventRecord {
  const setupId = setupRecordId(item.symbol, item.firstSeenAt)
  return {
    id: setupEventRecordId(item.symbol, item.firstSeenAt),
    type: "SETUP_DETECTED",
    category: "SYSTEM",
    title: `${item.symbol} ${item.bias} · ${item.setup}`,
    timestamp: item.firstSeenAt,
    source: "market-discovery",
    importance: item.grade === "A" || item.confidence === "HIGH" ? "HIGH" : "MEDIUM",
    linkedSetupIds: [setupId],
    linkedTradeIds: [],
    metadata: {
      symbol: item.symbol,
      direction: item.direction,
      grade: item.grade,
      confidence: item.confidence,
      setup: item.setup,
      regime: item.marketRegime,
    },
  }
}

export function candidateToDraftSetupRecord(candidate: MarketMoverCandidate, firstSeenAt = Date.now()): SetupRecord {
  return {
    id: setupRecordId(candidate.symbol, firstSeenAt),
    symbol: candidate.symbol,
    setup: candidate.setup,
    source: "market-discovery",
    direction: candidate.direction,
    bias: candidate.bias,
    grade: candidate.grade,
    confidence: candidate.confidence,
    freshness: candidate.freshness,
    regime: candidate.marketRegime,
    score: candidate.score,
    trustSummary: candidate.trustSummary,
    qualityReason: candidate.qualityReason,
    plan: {
      side: candidate.numericPlan?.side ?? candidate.direction,
      detectedPrice: candidate.numericPlan?.detectedPrice ?? candidate.lastPrice,
      entryLow: candidate.numericPlan?.entryLow ?? candidate.lastPrice,
      entryHigh: candidate.numericPlan?.entryHigh ?? candidate.lastPrice,
      stopLoss: candidate.numericPlan?.stopLoss ?? candidate.lastPrice,
      takeProfit1: candidate.numericPlan?.takeProfit1 ?? candidate.lastPrice,
      takeProfit2: candidate.numericPlan?.takeProfit2 ?? candidate.lastPrice,
      riskReward: candidate.riskReward,
      planQuality: candidate.planQuality,
      slDistancePct: candidate.slDistancePct,
      riskPct: candidate.riskPct,
      suggestedPositionPct: candidate.suggestedPositionPct,
    },
    firstSeenAt,
    lastSeenAt: firstSeenAt,
    status: "DETECTED",
    outcome: "OPEN",
    linkedEventIds: [setupEventRecordId(candidate.symbol, firstSeenAt)],
  }
}
