"use client"

import type { MarketMoverCandidate } from "@/lib/market-movers/types"
import type { DemoTradeRecord, DemoTradeExitReason } from "@/lib/trading/types"
import { readTradingDatabase, upsertDemoTradeRecord } from "@/lib/trading/localTradingDatabase"

function nowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function calcDemoTradePnlPct(trade: Pick<DemoTradeRecord, "side" | "entryPrice">, price: number) {
  if (!Number.isFinite(price) || !Number.isFinite(trade.entryPrice) || trade.entryPrice <= 0) return 0
  const raw = ((price - trade.entryPrice) / trade.entryPrice) * 100
  return trade.side === "SHORT" ? -raw : raw
}

export function calcDistancePct(from: number, to: number) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0) return 0
  return Math.abs(((to - from) / from) * 100)
}

export function inferExitReason(trade: DemoTradeRecord, price: number): DemoTradeExitReason {
  if (trade.side === "LONG") {
    if (price <= trade.stopLoss) return "SL"
    if (price >= trade.takeProfit2) return "TP2"
    if (price >= trade.takeProfit1) return "TP1"
  }
  if (trade.side === "SHORT") {
    if (price >= trade.stopLoss) return "SL"
    if (price <= trade.takeProfit2) return "TP2"
    if (price <= trade.takeProfit1) return "TP1"
  }
  return "NONE"
}

export function openDemoTradeFromCandidate(candidate: MarketMoverCandidate): DemoTradeRecord | null {
  if (candidate.direction !== "LONG" && candidate.direction !== "SHORT") return null
  const plan = candidate.numericPlan
  const entryPrice = Number.isFinite(plan.detectedPrice) && plan.detectedPrice > 0
    ? plan.detectedPrice
    : (Number.isFinite(candidate.lastPrice) ? candidate.lastPrice : 0)
  if (!entryPrice || !Number.isFinite(entryPrice)) return null

  const record: DemoTradeRecord = {
    id: nowId("demo_trade"),
    setupId: `setup_${candidate.symbol}_${Math.round(candidate.lastPrice * 100000)}_${candidate.direction}`,
    symbol: candidate.symbol,
    side: candidate.direction,
    status: "OPEN",
    entryPrice,
    stopLoss: plan.stopLoss,
    takeProfit1: plan.takeProfit1,
    takeProfit2: plan.takeProfit2,
    sizePct: candidate.suggestedPositionPct,
    riskPct: candidate.riskPct,
    openedAt: Date.now(),
    exitReason: "NONE",
    unrealizedPnlPct: 0,
    source: "market-discovery",
    linkedEventIds: [],
    notes: `${candidate.setup} · ${candidate.grade} · ${candidate.confidence}`,
  }
  upsertDemoTradeRecord(record)
  return record
}

export function updateOpenDemoTrades(priceBySymbol: Record<string, number>) {
  const db = readTradingDatabase()
  const updated: DemoTradeRecord[] = []

  for (const trade of db.demoTrades) {
    if (trade.status !== "OPEN") continue
    const price = priceBySymbol[trade.symbol]
    if (!Number.isFinite(price) || price <= 0) continue
    const exitReason = inferExitReason(trade, price)
    const unrealizedPnlPct = calcDemoTradePnlPct(trade, price)

    if (exitReason !== "NONE") {
      const closed: DemoTradeRecord = {
        ...trade,
        status: "CLOSED",
        closedAt: Date.now(),
        exitPrice: price,
        exitReason,
        realizedPnlPct: unrealizedPnlPct,
        unrealizedPnlPct,
      }
      upsertDemoTradeRecord(closed)
      updated.push(closed)
    } else {
      const open: DemoTradeRecord = {
        ...trade,
        unrealizedPnlPct,
      }
      upsertDemoTradeRecord(open)
      updated.push(open)
    }
  }

  return updated
}

export function closeDemoTradeManually(tradeId: string, price: number) {
  const db = readTradingDatabase()
  const trade = db.demoTrades.find((item) => item.id === tradeId)
  if (!trade || trade.status !== "OPEN") return null
  const realizedPnlPct = calcDemoTradePnlPct(trade, price)
  const closed: DemoTradeRecord = {
    ...trade,
    status: "CLOSED",
    closedAt: Date.now(),
    exitPrice: price,
    exitReason: "MANUAL",
    realizedPnlPct,
    unrealizedPnlPct: realizedPnlPct,
  }
  upsertDemoTradeRecord(closed)
  return closed
}

export function formatTradeDuration(openedAt: number, closedAt?: number) {
  const ms = Math.max(0, (closedAt ?? Date.now()) - openedAt)
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "<1m"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  if (hours < 24) return rem ? `${hours}h ${rem}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours ? `${days}d ${remHours}h` : `${days}d`
}
