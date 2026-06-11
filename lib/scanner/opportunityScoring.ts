import type { MarketMemoryStats } from "@/types/historical"

export type ScannerSignalInput = {
  symbol: string
  setup?: string
  direction?: "LONG" | "SHORT" | "NEUTRAL"
  score?: number
  confidence?: string
  reason?: string
  trigger?: string
}

export type ScannerContextInput = {
  narrativeHot: boolean
  sectorRotationImproving: boolean
  leverageRiskElevated: boolean
  historicalAvailable: boolean
  marketMemoryStats?: MarketMemoryStats
}

export function priorityFromScore(score: number) {
  if (score >= 90) return "Extreme"
  if (score >= 75) return "High"
  if (score >= 60) return "Moderate"
  return "Low"
}

function setupBoost(signal: ScannerSignalInput) {
  const text = `${signal.setup ?? ""} ${signal.reason ?? ""} ${signal.trigger ?? ""}`.toLowerCase()
  let score = 0
  if (text.includes("buy") || text.includes("bid") || text.includes("flow+")) score += 12
  if (text.includes("breakout") || text.includes("reclaim")) score += 10
  if (text.includes("support") || text.includes("range")) score += 5
  return score
}

export function scoreOpportunity(signal: ScannerSignalInput, context: ScannerContextInput) {
  const base = typeof signal.score === "number" && Number.isFinite(signal.score) ? Math.max(0, Math.min(100, signal.score)) : 45
  const memorySuccess = context.marketMemoryStats?.successRate7d ?? null
  const score = Math.round(Math.max(0, Math.min(100,
    base * 0.45 +
    setupBoost(signal) +
    (context.sectorRotationImproving ? 10 : 0) +
    (context.narrativeHot ? 8 : 0) +
    (context.historicalAvailable ? 8 : 0) +
    (memorySuccess !== null ? Math.max(0, memorySuccess - 50) * 0.25 : 0) -
    (context.leverageRiskElevated ? 6 : 0),
  )))

  return {
    score,
    priority: priorityFromScore(score),
    historicalSupport: memorySuccess !== null ? memorySuccess : context.historicalAvailable ? 50 : null,
  }
}
