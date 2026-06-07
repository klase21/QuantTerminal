"use client"

import type {
  DemoTradeRecord,
  EventRecord,
  SetupOutcomeRecord,
  SetupRecord,
  TradingDatabaseSnapshot,
} from "@/lib/trading/types"

const DB_KEY = "qt.tradingDatabase.v1"
const MAX_SETUPS = 300
const MAX_OUTCOMES = 300
const MAX_TRADES = 300
const MAX_EVENTS = 500

function emptySnapshot(): TradingDatabaseSnapshot {
  return {
    version: 1,
    setups: [],
    outcomes: [],
    demoTrades: [],
    events: [],
    updatedAt: Date.now(),
  }
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

function readRaw(): TradingDatabaseSnapshot {
  if (!canUseStorage()) return emptySnapshot()
  try {
    const raw = window.localStorage.getItem(DB_KEY)
    if (!raw) return emptySnapshot()
    const parsed = JSON.parse(raw) as Partial<TradingDatabaseSnapshot>
    return {
      version: 1,
      setups: Array.isArray(parsed.setups) ? parsed.setups as SetupRecord[] : [],
      outcomes: Array.isArray(parsed.outcomes) ? parsed.outcomes as SetupOutcomeRecord[] : [],
      demoTrades: Array.isArray(parsed.demoTrades) ? parsed.demoTrades as DemoTradeRecord[] : [],
      events: Array.isArray(parsed.events) ? parsed.events as EventRecord[] : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    }
  } catch {
    return emptySnapshot()
  }
}

function writeRaw(snapshot: TradingDatabaseSnapshot) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify({
      version: 1,
      setups: snapshot.setups.slice(0, MAX_SETUPS),
      outcomes: snapshot.outcomes.slice(0, MAX_OUTCOMES),
      demoTrades: snapshot.demoTrades.slice(0, MAX_TRADES),
      events: snapshot.events.slice(0, MAX_EVENTS),
      updatedAt: Date.now(),
    }))
  } catch {
    // Storage is best-effort. Trading UI should keep working even when persistence fails.
  }
}

function upsertById<T extends { id: string }>(items: T[], incoming: T, max: number) {
  const next = [incoming, ...items.filter((item) => item.id !== incoming.id)]
  return next.slice(0, max)
}

export function readTradingDatabase(): TradingDatabaseSnapshot {
  return readRaw()
}

export function upsertSetupRecord(record: SetupRecord) {
  const snapshot = readRaw()
  writeRaw({
    ...snapshot,
    setups: upsertById(snapshot.setups, record, MAX_SETUPS),
  })
}

export function upsertSetupOutcomeRecord(record: SetupOutcomeRecord) {
  const snapshot = readRaw()
  writeRaw({
    ...snapshot,
    outcomes: upsertById(snapshot.outcomes, record, MAX_OUTCOMES),
  })
}

export function upsertDemoTradeRecord(record: DemoTradeRecord) {
  const snapshot = readRaw()
  writeRaw({
    ...snapshot,
    demoTrades: upsertById(snapshot.demoTrades, record, MAX_TRADES),
  })
}

export function upsertEventRecord(record: EventRecord) {
  const snapshot = readRaw()
  writeRaw({
    ...snapshot,
    events: upsertById(snapshot.events, record, MAX_EVENTS),
  })
}

export function exportTradingDatabaseJson() {
  return JSON.stringify(readRaw(), null, 2)
}

export function clearTradingDatabase() {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(DB_KEY)
  } catch {
    // no-op
  }
}
