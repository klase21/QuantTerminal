"use client"

import { useEffect, useMemo, useState } from "react"

import type { MarketMoverCandidate } from "@/lib/market-movers/types"

export type ActiveSetupLifecycle = "NEW" | "ACTIVE" | "STRENGTHENING" | "WEAKENING" | "INVALIDATED" | "COMPLETED"
export type ActiveSetupOutcome = "OPEN" | "TP1_HIT" | "TP2_HIT" | "STOPPED" | "EXPIRED"

export type ActiveSetupMemoryItem = MarketMoverCandidate & {
  firstSeenAt: number
  lastSeenAt: number
  seenCount: number
  bestScore: number
  previousScore: number
  lifecycle: ActiveSetupLifecycle
  outcome: ActiveSetupOutcome
  detectedPrice: number
  latestPrice: number
  bestPrice: number
  worstPrice: number
  bestMovePct: number
  worstMovePct: number
  resultText: string
}

const STORAGE_KEY = "qt.activeSetups.v2"
const LEGACY_STORAGE_KEY = "qt.activeSetups.v1"
const MAX_ITEMS = 12
const TTL_MS = 8 * 60 * 60 * 1000
const EXPIRE_MS = 6 * 60 * 60 * 1000

function safeNow() {
  return Date.now()
}

function clampNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function movePct(item: Pick<ActiveSetupMemoryItem, "direction" | "detectedPrice">, price: number) {
  if (!item.detectedPrice || item.detectedPrice <= 0 || !Number.isFinite(price)) return 0
  const raw = ((price - item.detectedPrice) / item.detectedPrice) * 100
  return item.direction === "SHORT" ? -raw : raw
}

function formatMove(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function outcomeFor(input: {
  candidate: MarketMoverCandidate
  previous?: ActiveSetupMemoryItem
  now: number
}) {
  const { candidate, previous, now } = input
  const side = candidate.numericPlan?.side ?? candidate.direction
  const latestPrice = clampNumber(candidate.lastPrice, previous?.latestPrice ?? candidate.numericPlan?.detectedPrice ?? 0)
  const detectedPrice = previous?.detectedPrice ?? candidate.numericPlan?.detectedPrice ?? latestPrice
  const base = { direction: side, detectedPrice }
  const prevBestPrice = previous?.bestPrice ?? latestPrice
  const prevWorstPrice = previous?.worstPrice ?? latestPrice
  const previousBestMove = previous?.bestMovePct ?? 0
  const previousWorstMove = previous?.worstMovePct ?? 0
  const currentMove = movePct(base, latestPrice)
  const bestPrice = side === "SHORT" ? Math.min(prevBestPrice, latestPrice) : Math.max(prevBestPrice, latestPrice)
  const worstPrice = side === "SHORT" ? Math.max(prevWorstPrice, latestPrice) : Math.min(prevWorstPrice, latestPrice)
  const bestMovePct = Math.max(previousBestMove, movePct(base, bestPrice), currentMove)
  const worstMovePct = Math.min(previousWorstMove, movePct(base, worstPrice), currentMove)

  const plan = candidate.numericPlan
  const stopped = plan && side === "LONG" ? latestPrice <= plan.stopLoss : plan && side === "SHORT" ? latestPrice >= plan.stopLoss : false
  const tp2Hit = plan && side === "LONG" ? latestPrice >= plan.takeProfit2 : plan && side === "SHORT" ? latestPrice <= plan.takeProfit2 : false
  const tp1Hit = plan && side === "LONG" ? latestPrice >= plan.takeProfit1 : plan && side === "SHORT" ? latestPrice <= plan.takeProfit1 : false
  const previousTerminal = previous?.outcome === "TP2_HIT" || previous?.outcome === "STOPPED" || previous?.outcome === "EXPIRED"

  let outcome: ActiveSetupOutcome = previous?.outcome ?? "OPEN"
  if (!previousTerminal) {
    if (stopped) outcome = "STOPPED"
    else if (tp2Hit) outcome = "TP2_HIT"
    else if (tp1Hit || previous?.outcome === "TP1_HIT") outcome = "TP1_HIT"
    else if (now - (previous?.firstSeenAt ?? now) > EXPIRE_MS) outcome = "EXPIRED"
    else outcome = "OPEN"
  }

  const resultText = outcome === "TP2_HIT"
    ? `TP2 hit · best ${formatMove(bestMovePct)}`
    : outcome === "TP1_HIT"
      ? `TP1 hit · best ${formatMove(bestMovePct)}`
      : outcome === "STOPPED"
        ? `Stopped · worst ${formatMove(worstMovePct)}`
        : outcome === "EXPIRED"
          ? `Expired · best ${formatMove(bestMovePct)}`
          : `Open · best ${formatMove(bestMovePct)}`

  return { outcome, detectedPrice, latestPrice, bestPrice, worstPrice, bestMovePct, worstMovePct, resultText }
}

function lifecycleFor(input: {
  candidate: MarketMoverCandidate
  previous?: ActiveSetupMemoryItem
  now: number
  outcome: ActiveSetupOutcome
}): ActiveSetupLifecycle {
  const { candidate, previous, now, outcome } = input

  if (outcome === "TP1_HIT" || outcome === "TP2_HIT") return "COMPLETED"
  if (outcome === "STOPPED" || outcome === "EXPIRED") return "INVALIDATED"
  if (candidate.action === "AVOID" || candidate.suppressedReason) return "INVALIDATED"
  if (!previous) return "NEW"

  const ageMs = now - previous.firstSeenAt
  const scoreDelta = candidate.score - previous.previousScore

  if (scoreDelta >= 5 || candidate.score > previous.bestScore) return "STRENGTHENING"
  if (scoreDelta <= -8 || candidate.chaseRisk >= 82) return "WEAKENING"
  if (ageMs > 15 * 60 * 1000) return "ACTIVE"
  return "NEW"
}

function normalizeMemoryItem(item: unknown): ActiveSetupMemoryItem | null {
  if (!item || typeof item !== "object" || !("symbol" in item)) return null
  const record = item as Partial<ActiveSetupMemoryItem>
  const now = safeNow()
  const latestPrice = clampNumber(record.latestPrice ?? record.lastPrice ?? record.numericPlan?.detectedPrice ?? 0)
  const firstSeenAt = clampNumber(record.firstSeenAt ?? now, now)
  const bestMovePct = clampNumber(record.bestMovePct ?? 0)
  const worstMovePct = clampNumber(record.worstMovePct ?? 0)

  return {
    ...(record as MarketMoverCandidate),
    symbol: typeof record.symbol === "string" ? record.symbol : "UNKNOWN",
    bias: typeof record.bias === "string" ? record.bias : `${record.direction ?? "NEUTRAL"} BIAS`,
    direction: record.direction ?? "NEUTRAL",
    firstSeenAt,
    lastSeenAt: clampNumber(record.lastSeenAt ?? firstSeenAt, firstSeenAt),
    seenCount: clampNumber(record.seenCount ?? 1, 1),
    bestScore: clampNumber(record.bestScore ?? record.score ?? 0),
    freshness: record.freshness ?? "MATURE",
    scoreBreakdown: Array.isArray(record.scoreBreakdown) ? record.scoreBreakdown : [],
    trustSummary: typeof record.trustSummary === "string" ? record.trustSummary : `${record.grade ?? "C"} grade · ${record.confidence ?? "LOW"} confidence`,
    planQuality: record.planQuality ?? "BALANCED",
    riskReward: typeof record.riskReward === "string" ? record.riskReward : "TP1 n/a / TP2 n/a",
    slDistancePct: clampNumber(record.slDistancePct ?? 0),
    volatilityNote: typeof record.volatilityNote === "string" ? record.volatilityNote : "Volatility-adjusted plan unavailable.",
    previousScore: clampNumber(record.previousScore ?? record.score ?? 0),
    lifecycle: record.lifecycle ?? "ACTIVE",
    outcome: record.outcome ?? "OPEN",
    detectedPrice: clampNumber(record.detectedPrice ?? record.numericPlan?.detectedPrice ?? latestPrice),
    latestPrice,
    bestPrice: clampNumber(record.bestPrice ?? latestPrice),
    worstPrice: clampNumber(record.worstPrice ?? latestPrice),
    bestMovePct,
    worstMovePct,
    resultText: typeof record.resultText === "string" ? record.resultText : `Open · best ${formatMove(bestMovePct)}`,
  }
}

function readMemory(): ActiveSetupMemoryItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeMemoryItem).filter((item): item is ActiveSetupMemoryItem => Boolean(item))
  } catch {
    return []
  }
}

function writeMemory(items: ActiveSetupMemoryItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    // localStorage can fail in private mode; the UI should still work with in-memory state.
  }
}

export function formatSetupAge(firstSeenAt: number, now = safeNow()) {
  const minutes = Math.max(0, Math.round((now - firstSeenAt) / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function useActiveSetupMemory(candidates: MarketMoverCandidate[] | undefined) {
  const [memory, setMemory] = useState<ActiveSetupMemoryItem[]>([])

  useEffect(() => {
    setMemory(readMemory())
  }, [])

  useEffect(() => {
    if (!candidates?.length) return

    setMemory((prev) => {
      const now = safeNow()
      const freshBySymbol = new Map(candidates.map((candidate) => [candidate.symbol, candidate]))
      const prevBySymbol = new Map(prev.map((item) => [item.symbol, item]))

      const mergedFresh: ActiveSetupMemoryItem[] = candidates
        .filter((candidate) => !candidate.suppressedReason && candidate.action !== "AVOID")
        .map((candidate) => {
          const previous = prevBySymbol.get(candidate.symbol)
          const outcome = outcomeFor({ candidate, previous, now })
          const lifecycle = lifecycleFor({ candidate, previous, now, outcome: outcome.outcome })
          return {
            ...candidate,
            firstSeenAt: previous?.firstSeenAt ?? now,
            lastSeenAt: now,
            seenCount: (previous?.seenCount ?? 0) + 1,
            bestScore: Math.max(previous?.bestScore ?? candidate.score, candidate.score),
            previousScore: candidate.score,
            lifecycle,
            ...outcome,
          }
        })

      const retained = prev
        .filter((item) => !freshBySymbol.has(item.symbol))
        .filter((item) => now - item.lastSeenAt <= TTL_MS)
        .map((item) => {
          const staleLifecycle = now - item.lastSeenAt > 90 * 60 * 1000 ? "WEAKENING" as const : item.lifecycle
          const expired = now - item.firstSeenAt > EXPIRE_MS && item.outcome === "OPEN"
          return {
            ...item,
            lifecycle: expired ? "INVALIDATED" as const : staleLifecycle,
            outcome: expired ? "EXPIRED" as const : item.outcome,
            resultText: expired ? `Expired · best ${formatMove(item.bestMovePct ?? 0)}` : item.resultText,
          }
        })

      const next = [...mergedFresh, ...retained]
        .sort((a, b) => {
          const lifecycleWeight = (item: ActiveSetupMemoryItem) =>
            item.lifecycle === "STRENGTHENING" ? 5 : item.lifecycle === "COMPLETED" ? 4 : item.lifecycle === "ACTIVE" ? 3 : item.lifecycle === "NEW" ? 2 : item.lifecycle === "WEAKENING" ? 1 : 0
          return lifecycleWeight(b) - lifecycleWeight(a) || b.bestScore - a.bestScore || b.lastSeenAt - a.lastSeenAt
        })
        .slice(0, MAX_ITEMS)

      writeMemory(next)
      return next
    })
  }, [candidates])

  return useMemo(() => memory, [memory])
}
