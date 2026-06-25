"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Droplets,
  Gauge,
  History,
  Info,
  LineChart,
  Newspaper,
  RadioTower,
  ShieldAlert,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react"

type Bias = "Bullish" | "Bearish" | "Neutral"

type TacticalAlert = {
  asset: string
  label: string | null
  bias: Bias
  confidence: number | null
  tags: string[]
  detectedAt?: string
  context?: string | null
  explanation?: string | null
}

type MarketMoverDirection = "LONG" | "SHORT" | "NEUTRAL"

type MarketMoverCandidate = {
  symbol: string
  direction?: MarketMoverDirection
  action?: string
  setup?: string
  score?: number
  confidence?: string
  scoreBreakdown?: Array<{
    label: string
    value: number
    polarity: "positive" | "negative" | "neutral"
  }>
  chaseRisk?: number
  bias?: string
  trigger?: string
  invalidation?: string
  reason?: string
  entryZone?: string
  stopLoss?: string
  takeProfit1?: string
  numericPlan?: {
    entryLow: number
    entryHigh: number
    stopLoss: number
    takeProfit1: number
  }
}

type MarketMoversResponse = {
  candidates?: MarketMoverCandidate[]
  focusCandidate?: MarketMoverCandidate | null
  updatedAt?: string
}

type NarrativeHeatmapRow = {
  narrative: string
  kr: number
  cn: number
  en: number
  total: number
  divergence: number
}

type NarrativesResponse = {
  heatmap?: NarrativeHeatmapRow[]
  topNarratives?: string[]
  regionalLeaders?: {
    kr: string
    cn: string
    en: string
  }
  divergenceScore?: number
  updatedAt?: number
}

type NarrativeLoadState = "loading" | "ready" | "empty" | "unavailable"

type MacroItem = {
  symbol?: string
  change?: string
  signal?: string
  updatedAt?: number
  tone?: CauseTone
}

type MacroResponse = {
  ok?: boolean
  items?: MacroItem[]
  updatedAt?: number
  source?: string
  unavailableReason?: string
}

type SectorRotationSnapshot = {
  sector: string
  direction?: "INFLOW" | "OUTFLOW" | "CHURN" | "QUIET"
  rotationScore?: number
  confidence?: number
  breadth?: number
}

type SectorRotationResponse = {
  ok?: boolean
  source?: string
  updatedAt?: string
  sectors?: SectorRotationSnapshot[]
}

type FuturesSectorSnapshot = {
  sector: string
  leverageState?: "LOW" | "BUILDING" | "CROWDED" | "OVERHEATED"
  fundingBias?: "LONGS_PAYING" | "SHORTS_PAYING" | "NEUTRAL"
  leveragePressure?: number
  crowdingScore?: number
  convictionScore?: number
}

type FuturesIntelligenceResponse = {
  ok?: boolean
  source?: string
  updatedAt?: string
  sectors?: FuturesSectorSnapshot[]
}

type CauseTone = "positive" | "negative" | "neutral"

type CauseTag = {
  label: string
  tone: CauseTone
  category: string
  explanation: string
}

type InformationFlowItem = {
  time: string
  event: string
  tag: string | null
}

type NarrativeHeatItem = {
  label: string
  state: string
  icon: string
  tone: string
  evidence: string
}

type PredictionMarketsResponse = {
  ok?: boolean
  source?: string
  updatedAt?: string
  unavailableReason?: string
  marketEvents?: Array<{
    title: string
    venue: string
    probability: number
    volume?: number | null
    liquidity?: number | null
    openInterest?: number | null
    lastUpdated: string
    source: string
    url?: string
  }>
}

type EtfFlowResponse = {
  ok?: boolean
  source?: string
  updatedAt?: string
  unavailableReason?: string
  btcFlow?: number | null
  ethFlow?: number | null
  btcSourceDate?: string | null
  ethSourceDate?: string | null
  sourceUrl?: string
  isStale?: boolean
  staleReason?: string
  flows?: Array<{
    asset: "BTC" | "ETH"
    latestDate: string
    sourceDate?: string
    netFlow: number
    unit: string
    sourceUrl: string
    trend1d?: "UP" | "DOWN" | "FLAT"
    isStale?: boolean
    staleReason?: string
  }>
}

type HistoricalEvidenceResponse = {
  ok?: boolean
  status?: "available" | "unavailable"
  source?: string
  statistics?: {
    totalCases?: number
    dominantOutcome?: string
    byHorizon?: {
      "24h"?: {
        averageReturn?: number | null
        winRate?: number | null
      }
    }
  }
  diagnostics?: {
    cacheStatus?: string
    generatedAt?: string | null
    source?: string | null
    schemaVersion?: string | null
    analogCount?: number
  }
  reason?: string
}

type MarketDriverCategory =
  | "funding"
  | "open_interest"
  | "liquidation"
  | "exchange_flow"
  | "treasury"
  | "etf"
  | "historical_analog"
  | "event_impact"

type MarketDriverSummary = {
  schemaVersion?: number
  symbol: string
  timestamp: string
  marketDirection: "positive" | "negative" | "mixed" | "unknown"
  confidence: number
  drivers: Array<{
    category: MarketDriverCategory
    title: string
    impactScore: number
    quality: "verified" | "degraded" | "unavailable" | "unknown"
    evidence: {
      source: string
      observedAt: string | null
      summary: string
      direction: "positive" | "negative" | "neutral"
    }
  }>
  availableCategories?: MarketDriverCategory[]
  missingCategories?: MarketDriverCategory[]
  staleCategories?: MarketDriverCategory[]
  quality?: "verified" | "degraded" | "unavailable" | "unknown"
}

type MarketDriverResponse = {
  ok?: boolean
  summary?: MarketDriverSummary
  reason?: string
}

type MarketDriverLoadState = "loading" | "ready" | "empty" | "unavailable"

type ReserveObservationType =
  | "reserve_increase"
  | "reserve_decrease"
  | "reserve_no_change"
  | "stablecoin_accumulation"
  | "stablecoin_decline"
  | "stablecoin_no_change"
  | "delta_unavailable"

type ReserveIntelligenceObservation = {
  exchange: "binance"
  asset: string
  classification: "hard_asset" | "stablecoin" | "exchange_asset" | "smart_contract_asset" | "other"
  observationType: ReserveObservationType
  currentBalance: number
  currentBalanceUsd: number
  currentObservedAt: string
  previousObservedAt: string | null
  quantityChange: number | null
  absoluteChange: number | null
  percentageChange: number | null
  balanceUsdChange: number | null
  trendAvailability: {
    oneDay: boolean
    sevenDay: boolean
    thirtyDay: boolean
  }
  quality: "verified" | "partial" | "unavailable"
  reason: string | null
}

type ReserveIntelligenceResponse = {
  ok?: boolean
  status?: "available" | "unavailable"
  source?: string
  generatedAt?: string
  observedAt?: string | null
  freshness?: "current" | "stale" | "missing"
  coverage?: "full" | "partial" | "unavailable"
  observations?: ReserveIntelligenceObservation[]
  reason?: string
}

type ReserveIntelligenceLoadState = "loading" | "ready" | "empty" | "unavailable"

const DASHBOARD_CACHE_KEY = "qt.dashboard.v1.cache"
const DEFAULT_DASHBOARD_SYMBOL = "BTCUSDT"

function normalizeDashboardSymbol(value?: string | null) {
  const normalized = (value ?? "").replace(/\//g, "").trim().toUpperCase()
  if (!normalized) return DEFAULT_DASHBOARD_SYMBOL
  if (!/^[A-Z0-9]{2,20}$/.test(normalized)) return DEFAULT_DASHBOARD_SYMBOL
  if (/(?:USDT|USDC|USD|BUSD)$/.test(normalized)) return normalized
  if (normalized.length <= 10) return `${normalized}USDT`
  return DEFAULT_DASHBOARD_SYMBOL
}

type DashboardCache = {
  cachedAt: string
  symbol: string
  marketMovers: MarketMoversResponse | null
  narratives: NarrativesResponse | null
  macro: MacroResponse | null
  predictionMarkets: PredictionMarketsResponse | null
  etfFlow: EtfFlowResponse | null
  sectorRotation: SectorRotationResponse | null
  futures: FuturesIntelligenceResponse | null
}

function loadDashboardCache(symbol: string): DashboardCache | null {
  if (typeof window === "undefined") return null
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DASHBOARD_CACHE_KEY) ?? "null") as DashboardCache | null
    if (!parsed || parsed.symbol !== symbol) return null
    return parsed
  } catch {
    return null
  }
}

function saveDashboardCache(cache: DashboardCache) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Cache is a performance hint only.
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function compactText(value?: string) {
  const cleaned = value?.replace(/[^a-zA-Z0-9.%+\-\s]/g, " ").replace(/\s+/g, " ").trim()
  if (!cleaned) return null

  return cleaned
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .join(" ")
    .toUpperCase()
}

function compactSetup(value?: string) {
  const normalized = value?.toLowerCase() ?? ""
  if (normalized.includes("no clean")) return null
  if (normalized.includes("breakout")) return "BREAKOUT TEST"
  if (normalized.includes("pullback")) return "SUPPORT HOLDING"
  if (normalized.includes("mean")) return "RANGE REJECTION"
  if (normalized.includes("liquid")) return "LIQUIDITY WATCH"
  if (normalized.includes("funding")) return "FUNDING DIVERGENCE"

  return compactText(value)
}

function numericScore(value?: number) {
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, Math.round(value ?? 0)))
}

function displayConfidence(candidate?: MarketMoverCandidate) {
  const state = marketStateFromScore(candidate)
  const rawScore = numericScore(candidate?.score)
  if (rawScore === null) return null
  if (state === "Neutral") return Math.min(rawScore, 64)
  return Math.min(rawScore, 95)
}

function calibratedConfidence(candidate: MarketMoverCandidate | undefined, causes: CauseTag[]) {
  const rawScore = displayConfidence(candidate)
  if (rawScore === null) return null

  const state = marketStateFromScore(candidate)
  if (state === "Neutral") return Math.min(rawScore, 62)

  const bullFactors = causes.filter((cause) => cause.tone === "positive").length
  const bearFactors = causes.filter((cause) => cause.tone === "negative").length
  const aligned = state === "Bullish" ? bullFactors : bearFactors
  const opposing = state === "Bullish" ? bearFactors : bullFactors
  const net = aligned - opposing
  const evidenceScore = Math.round(58 + aligned * 5 + Math.max(0, net) * 2 - opposing * 5)
  const evidenceCap = aligned >= 6 && opposing <= 1
    ? 95
    : aligned >= 5 && opposing === 0
      ? 92
      : aligned <= 3 && opposing === 0
        ? 80
        : opposing >= aligned - 1
          ? 65
          : 88

  return Math.max(50, Math.min(rawScore, evidenceScore, evidenceCap))
}

function terminalDirectionIcon(state: Bias) {
  if (state === "Bullish") return "\u{1F7E2}"
  if (state === "Bearish") return "\u{1F534}"
  return "\u{1F7E1}"
}

function candidateBias(candidate?: MarketMoverCandidate): Bias {
  if (candidate?.direction === "LONG") return "Bullish"
  if (candidate?.direction === "SHORT") return "Bearish"
  if (candidate?.direction === "NEUTRAL") return "Neutral"

  const text = `${candidate?.bias ?? ""} ${candidate?.setup ?? ""} ${candidate?.trigger ?? ""}`.toLowerCase()
  if (text.includes("short") || text.includes("down") || text.includes("bear")) return "Bearish"
  if (text.includes("long") || text.includes("up") || text.includes("bull") || text.includes("breakout")) return "Bullish"

  return "Neutral"
}

function candidateSignal(candidate?: MarketMoverCandidate) {
  return compactSetup(candidate?.setup) ?? signalFromText(candidate?.trigger || candidate?.bias)
}

function assetContext(symbol?: string) {
  const base = symbol?.replace(/USDT$/i, "").toUpperCase()
  const contexts: Record<string, string> = {
    SOXL: "3x Semiconductor ETF",
    MSTR: "Bitcoin Proxy",
    TSLA: "EV / AI",
    NVDA: "AI Semiconductor",
    COIN: "Crypto Exchange",
    MARA: "Bitcoin Miner",
    RIOT: "Bitcoin Miner",
    CLSK: "Bitcoin Miner",
    ETH: "Smart Contract Asset",
    BTC: "Market Benchmark",
    SOL: "High Beta Layer 1",
  }

  return base ? contexts[base] ?? null : null
}

function signalExplanation(label?: string | null) {
  const normalized = label?.toLowerCase() ?? ""
  if (normalized.includes("breakout")) return "Price testing resistance"
  if (normalized.includes("liquidity")) return "Liquidity conditions changing"
  if (normalized.includes("support")) return "Buyers defending support"
  if (normalized.includes("range") || normalized.includes("rejection")) return "Price rejected near resistance"
  if (normalized.includes("funding") || normalized.includes("positioning")) return "Positioning risk changing"
  if (normalized.includes("buyers")) return "Buyers controlling activity"
  if (normalized.includes("sellers")) return "Sellers controlling activity"
  return null
}

function candidateTags(candidate?: MarketMoverCandidate) {
  const text = `${candidate?.setup ?? ""} ${candidate?.trigger ?? ""} ${candidate?.invalidation ?? ""}`.toLowerCase()
  const tags: string[] = []
  const bias = candidateBias(candidate)

  if (text.includes("range") || text.includes("mean")) tags.push("Trend Reversal Watch")
  if (text.includes("above") || text.includes("resistance")) tags.push("Resistance Test")
  if (text.includes("vwap") || text.includes("pullback") || text.includes("below") || text.includes("support")) tags.push("Support Holding")
  if (text.includes("volume") || text.includes("flow") || text.includes("liquid")) tags.push(bias === "Bearish" ? "Sellers Dominating" : "Buyers Dominating")
  if (text.includes("break")) tags.push("Breakout Attempt")

  return Array.from(new Set(tags)).slice(0, 3)
}

function mapCandidateToAlert(candidate: MarketMoverCandidate, updatedAt?: string): TacticalAlert {
  const label = candidateSignal(candidate)
  return {
    asset: candidate.symbol || "NO DATA",
    label,
    bias: candidateBias(candidate),
    confidence: numericScore(candidate.score),
    tags: candidateTags(candidate),
    detectedAt: updatedAt,
    context: assetContext(candidate.symbol),
    explanation: signalExplanation(label),
  }
}

function marketStateFromScore(candidate: MarketMoverCandidate | undefined): Bias {
  const score = numericScore(candidate?.score)
  if (score === null) return "Neutral"
  if (score < 55) return "Neutral"
  if (candidate) return candidateBias(candidate)
  return "Neutral"
}

function signalFromText(value?: string) {
  const normalized = value?.toLowerCase() ?? ""
  if (!normalized) return null
  if (normalized.includes("funding")) return "POSITIONING DIVERGENCE"
  if (normalized.includes("vwap")) return normalized.includes("loss") ? "SUPPORT BROKEN" : "SUPPORT HOLDING"
  if (normalized.includes("break")) return "BREAKOUT TEST"
  if (normalized.includes("range")) return "RANGE REJECTION"
  if (normalized.includes("volume") || normalized.includes("flow")) return "BUYERS DOMINATING"
  if (normalized.includes("liquid")) return "LIQUIDITY WATCH"

  return compactText(value)
}

function concreteEvidence(value?: string) {
  const normalized = value?.toLowerCase() ?? ""
  if (!normalized) return null
  if (normalized.includes("dxy")) return normalized.includes("-") || normalized.includes("down") ? "Dollar Weakness" : "Dollar Strength"
  if (normalized.includes("breadth")) return normalized.includes("weak") || normalized.includes("negative") ? "Broad Market Weakness" : "Broad Market Strength"
  if (normalized.includes("funding")) return normalized.includes("flat") ? "Positioning Stable" : "Positioning Pressure"
  if (normalized.includes("vwap")) return normalized.includes("loss") ? "Support Broken" : "Key Support Holding"
  if (normalized.includes("sell") || normalized.includes("short")) return "Strong Selling Pressure"
  if (normalized.includes("flow") || normalized.includes("volume")) return "Strong Buying Pressure"
  if (normalized.includes("breakout")) return "BREAKOUT TEST"
  if (normalized.includes("liquidation")) return "Liquidation Pressure"
  if (normalized.includes("macro")) return "Macro Pressure"

  return null
}

function topEvidence(candidate?: MarketMoverCandidate) {
  const breakdown: string[] | undefined = candidate?.scoreBreakdown
    ?.filter((item) => item.polarity !== "negative")
    .sort((left, right) => right.value - left.value)
    .map((item): string | null => concreteEvidence(item.label))
    .filter((item): item is string => Boolean(item))

  if (breakdown?.length) return breakdown

  return [
    concreteEvidence(candidate?.trigger),
    concreteEvidence(candidate?.reason),
  ].filter((item): item is string => Boolean(item))
}

function evidenceConflictsWithDirection(evidence: string[], direction: Bias) {
  const text = evidence.join(" ").toLowerCase()
  if (direction === "Bullish") return text.includes("selling") || text.includes("broken") || text.includes("weakness")
  if (direction === "Bearish") return text.includes("buying") || text.includes("support holding") || text.includes("strength")
  return false
}

function signalEvidenceSummary(evidence: string[], direction: Bias) {
  if (direction === "Neutral") {
    return {
      headline: "MIXED SIGNALS",
      support: evidence[0] ?? "NO CLEAR SETUP",
      note: evidence.some((item) => /buying|selling/i.test(item)) ? "OFFSET BY OTHER FACTORS" : null,
    }
  }

  if (evidenceConflictsWithDirection(evidence, direction)) {
    return {
      headline: "CONFLICTING SIGNALS",
      support: evidence[0] ?? "NO DATA",
      note: "OFFSET BY OTHER FACTORS",
    }
  }

  return {
    headline: evidence[0] ?? "NO DATA",
    support: evidence[1] ?? null,
    note: null,
  }
}

function failureFromText(value?: string, chaseRisk?: number) {
  const normalized = value?.toLowerCase() ?? ""
  const number = normalized.match(/\d+(?:\.\d+)?/)?.[0]
  if (normalized.includes("below") || normalized.includes("loss")) return number ? `Break Below ${Math.round(Number(number))}` : "Break Below Key Level"
  if (normalized.includes("above") || normalized.includes("reject")) return number ? `Reject Above ${Math.round(Number(number))}` : "Reject Above Key Level"
  if (normalized.includes("outside")) return number ? `Break Below ${Math.round(Number(number))}` : "Break Outside Range"
  if (normalized.includes("vwap")) return "Lose Key Support"
  if (normalized.includes("flow") || normalized.includes("volume")) return "Flow Reversal"
  if (normalized.includes("dxy")) return "Dollar Spike"
  if (normalized.includes("breadth")) return "Breadth Breakdown"
  if (Number.isFinite(chaseRisk) && (chaseRisk ?? 0) > 70) return "Avoid Chasing"

  return null
}

function actionFromCandidate(candidate?: MarketMoverCandidate) {
  const action = candidate?.action?.toUpperCase()
  const trigger = `${candidate?.trigger ?? ""} ${candidate?.setup ?? ""}`.toLowerCase()

  if (action === "AVOID") return "AVOID CHASE"
  if (action === "WAIT") return "CONFIRMATION REQUIRED"
  if (action === "WATCH") {
    if (trigger.includes("break")) return "WAIT FOR BREAKOUT"
    if (trigger.includes("resistance") || trigger.includes("reject") || trigger.includes("above")) return "SELLERS DEFENDING RESISTANCE"
    if (trigger.includes("support") || trigger.includes("pullback") || trigger.includes("vwap")) return "BUYERS DEFENDING SUPPORT"
    if (trigger.includes("flow") || trigger.includes("volume")) return candidateBias(candidate) === "Bearish" ? "MOMENTUM WEAKENING" : "MOMENTUM IMPROVING"
    return "CONFIRMATION REQUIRED"
  }

  if (candidateBias(candidate) === "Bearish") return "REDUCE RISK"
  if (candidateBias(candidate) === "Bullish") return "CONFIRMATION REQUIRED"
  return null
}

function formatLevel(value?: number | string) {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").match(/\d+(?:\.\d+)?/)?.[0])
  if (!Number.isFinite(numeric)) return null
  return numeric
}

function displayLevel(value: number) {
  return Math.round(value).toLocaleString()
}

function priceContext(candidate?: MarketMoverCandidate) {
  const stop = formatLevel(candidate?.numericPlan?.stopLoss ?? candidate?.stopLoss)
  const target = formatLevel(candidate?.numericPlan?.takeProfit1 ?? candidate?.takeProfit1)
  const entryLow = formatLevel(candidate?.numericPlan?.entryLow)
  const entryHigh = formatLevel(candidate?.numericPlan?.entryHigh)
  const rangeValues = [entryLow, entryHigh].filter((item): item is number => item !== null).sort((left, right) => left - right)
  const rangeLow = rangeValues[0]
  const rangeHigh = rangeValues[rangeValues.length - 1]
  const hasValidRange = rangeLow !== undefined && rangeHigh !== undefined && rangeLow < rangeHigh
  const supportCandidates = [stop, hasValidRange ? rangeLow : null]
    .filter((item): item is number => item !== null)
    .filter((item) => !hasValidRange || item <= rangeLow)
  const resistanceCandidates = [target, hasValidRange ? rangeHigh : null]
    .filter((item): item is number => item !== null)
    .filter((item) => !hasValidRange || item >= rangeHigh)
  const support = supportCandidates.length ? Math.max(...supportCandidates) : null
  const resistance = resistanceCandidates.length ? Math.min(...resistanceCandidates) : null
  const hasValidTriggers = support !== null && resistance !== null && support <= (hasValidRange ? rangeLow : resistance) && resistance >= (hasValidRange ? rangeHigh : support) && support < resistance

  return {
    support: support !== null ? displayLevel(support) : null,
    resistance: resistance !== null ? displayLevel(resistance) : null,
    range: hasValidRange ? `${displayLevel(rangeLow)} - ${displayLevel(rangeHigh)}` : null,
    bullishTrigger: hasValidTriggers ? `Break Above ${displayLevel(resistance)}` : null,
    bearishTrigger: hasValidTriggers ? `Break Below ${displayLevel(support)}` : null,
  }
}

function invalidationFromContext(candidate: MarketMoverCandidate | undefined, levels: ReturnType<typeof priceContext>) {
  const bias = candidateBias(candidate)
  if (bias === "Bullish" && levels.support) return `Break Below ${levels.support}`
  if (bias === "Bearish" && levels.resistance) return `Break Above ${levels.resistance}`
  return failureFromText(candidate?.invalidation, candidate?.chaseRisk)
}

function timeAgo(value?: string) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
  if (minutes < 1) return "Detected: now"
  if (minutes < 60) return `Detected: ${minutes}m ago`
  return `Detected: ${Math.round(minutes / 60)}h ago`
}

function causeFromText(value?: string, tone: CauseTone = "neutral", category = "MARKET"): CauseTag | null {
  const normalized = value?.toLowerCase() ?? ""
  if (!normalized) return null
  if (normalized.includes("no trade") || normalized.includes("major asset") || normalized.includes("quote volume")) return null
  if (normalized.includes("dxy")) {
    const positive = normalized.includes("-") || normalized.includes("down")
    return {
      label: positive ? "Dollar Weakness" : "Dollar Strength",
      tone: positive ? "positive" : "negative",
      category: "MACRO",
      explanation: positive ? "Dollar pressure easing" : "Dollar pressure rising",
    }
  }
  if (normalized.includes("breadth")) {
    const weak = normalized.includes("weak") || normalized.includes("negative")
    return {
      label: weak ? "Broad Market Weakness" : "Broad Market Strength",
      tone: weak ? "negative" : "positive",
      category,
      explanation: weak ? "Fewer assets participating" : "More assets participating",
    }
  }
  if (normalized.includes("funding")) {
    const flat = normalized.includes("flat")
    return {
      label: flat ? "Positioning Stable" : "Positioning Pressure",
      tone: flat ? "neutral" : "negative",
      category: "POSITIONING",
      explanation: flat ? "Futures positioning balanced" : "Crowded futures positioning",
    }
  }
  if (normalized.includes("sell") || normalized.includes("short")) return { label: "Strong Selling Pressure", tone: "negative", category: "FLOW", explanation: "Sellers dominating activity" }
  if (normalized.includes("flow") || normalized.includes("volume")) {
    const flat = normalized.includes("flat")
    return {
      label: flat ? "Buying Pressure Flat" : "Strong Buying Pressure",
      tone: flat ? "neutral" : "positive",
      category: "FLOW",
      explanation: flat ? "No clear demand expansion" : "Aggressive buyers dominating flow",
    }
  }
  if (normalized.includes("heat")) return { label: "Narrative Heat Increasing", tone: "positive", category: "NARRATIVE", explanation: "More real news mentions" }
  if (normalized.includes("breakout")) return { label: "Breakout Attempt", tone: "positive", category: "PRICE", explanation: "Price testing upper levels" }
  if (normalized.includes("pullback") || normalized.includes("vwap")) return { label: "Key Support Holding", tone, category: "PRICE", explanation: "Buyers defending support" }
  if (normalized.includes("risk")) return { label: "Risk-Off Sentiment", tone: "negative", category: "RISK", explanation: "Downside pressure increasing" }

  return null
}

function sectorCause(sector?: SectorRotationSnapshot): CauseTag | null {
  if (!sector) return null
  if (sector.direction === "INFLOW" || (sector.breadth ?? 0) >= 60) {
    return { label: "Sector Rotation Improving", tone: "positive", category: "SECTOR", explanation: "Capital rotating into stronger sectors" }
  }
  if (sector.direction === "OUTFLOW" || (sector.breadth ?? 100) <= 40) {
    return { label: "Sector Rotation Weakening", tone: "negative", category: "SECTOR", explanation: "Capital leaving weaker sectors" }
  }
  return null
}

function futuresCause(sector?: FuturesSectorSnapshot): CauseTag | null {
  if (!sector) return null
  if (sector.leverageState === "OVERHEATED" || sector.leverageState === "CROWDED" || (sector.leveragePressure ?? 0) >= 70) {
    return { label: "Crowded Positioning", tone: "negative", category: "LEVERAGE", explanation: "Long positioning becoming crowded" }
  }
  if (sector.fundingBias === "SHORTS_PAYING") {
    return { label: "Short Pressure Building", tone: "positive", category: "LEVERAGE", explanation: "Shorts paying to stay positioned" }
  }
  if (sector.leverageState === "LOW") {
    return { label: "Leverage Risk Low", tone: "neutral", category: "LEVERAGE", explanation: "Futures positioning not crowded" }
  }
  return null
}

function buildCauses(
  candidate?: MarketMoverCandidate,
  macro?: MacroResponse | null,
  narratives?: NarrativesResponse | null,
  sectorRotation?: SectorRotationResponse | null,
  futures?: FuturesIntelligenceResponse | null,
) {
  const moverCauses = [
    causeFromText(candidate?.trigger, candidateBias(candidate) === "Bearish" ? "negative" : candidateBias(candidate) === "Bullish" ? "positive" : "neutral", "SIGNAL"),
    causeFromText(candidate?.reason, "neutral", "EVIDENCE"),
    causeFromText(candidate?.setup, "neutral", "SETUP"),
  ]

  const macroCauses = macro?.items?.slice(0, 4).map((item) => causeFromText(`${item.symbol ?? ""} ${item.change ?? ""} ${item.signal ?? ""}`, item.tone ?? "neutral", "MACRO")) ?? []
  const narrativeCauses = narratives?.topNarratives?.slice(0, 2).map((item) => causeFromText(`${item} heat`, "neutral", "NARRATIVE")) ?? []
  const sectorCauses = [
    sectorCause(sectorRotation?.sectors?.[0]),
    futuresCause(futures?.sectors?.[0]),
  ]
  const seen = new Set<string>()

  return [...moverCauses, ...macroCauses, ...sectorCauses, ...narrativeCauses]
    .filter((item): item is CauseTag => Boolean(item))
    .filter((item) => {
      if (seen.has(item.label)) return false
      seen.add(item.label)
      return true
    })
}

function buildNarrativeHeat(narratives?: NarrativesResponse | null) {
  const rows: NarrativeHeatItem[] | undefined = narratives?.heatmap?.length
    ? narratives.heatmap.slice(0, 4).map((item) => ({
      label: compactText(item.narrative) ?? "NO DATA",
      state: item.total >= 200 ? "Very Hot" : item.total >= 120 ? "Hot" : item.total >= 40 ? "Neutral" : "Quiet",
      icon: item.total >= 120 ? "\u{1F525}" : "\u{26AA}",
      evidence: `${Math.round(item.total).toLocaleString()} articles`,
      tone: item.total >= 200
        ? cn("border-[#22c55e]/25 bg-[#22c55e]/10", COLOR_STATE_POSITIVE)
        : item.total >= 120
          ? cn("border-[#38bdf8]/25 bg-[#38bdf8]/10", COLOR_ACCENT_CYAN)
          : cn("border-[#71717a]/40", COLOR_SURFACE_LEVEL4, COLOR_STATE_MISSING),
    }))
    : undefined

  return rows ?? []
}

function buildInformationFlow(macro?: MacroResponse | null, narratives?: NarrativesResponse | null) {
  const formatTime = (value?: number) => {
    if (!value) return null
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  const macroItems = macro?.items?.slice(0, 2).map((item) => ({
    time: formatTime(item.updatedAt ?? macro.updatedAt),
    event: compactText(`${item.symbol ?? ""} ${item.change ?? ""}`),
    tag: compactText(item.signal ?? undefined),
  }))
    .filter((item): item is InformationFlowItem => Boolean(item.time && item.event)) ?? []

  const narrativeItems = narratives?.topNarratives?.slice(0, 2).map((item) => ({
    time: formatTime(narratives.updatedAt),
    event: compactText(item),
    tag: "HEAT",
  }))
    .filter((item): item is InformationFlowItem => Boolean(item.time && item.event)) ?? []

  return [...macroItems, ...narrativeItems]
}

function biasClass(bias: Bias) {
  if (bias === "Bullish") return cn("border-[#22c55e]/25 bg-[#22c55e]/10", COLOR_STATE_POSITIVE)
  if (bias === "Bearish") return cn("border-[#e53535]/25 bg-[#e53535]/10", COLOR_STATE_NEGATIVE)
  return cn("border-[#facc15]/25 bg-[#facc15]/10", COLOR_STATE_NEUTRAL)
}

function stateTone(state: Bias) {
  if (state === "Bullish") return COLOR_STATE_POSITIVE
  if (state === "Bearish") return COLOR_STATE_NEGATIVE
  return COLOR_STATE_NEUTRAL
}

type DashboardPanelLevel = "level1" | "level2" | "level3" | "level4"

const TYPO_HERO_DIRECTION = "text-7xl font-black uppercase leading-[0.86] tracking-[0.035em] md:text-8xl xl:text-9xl"
const TYPO_HERO_CONCLUSION = "text-base font-black uppercase leading-[1.45] tracking-[0.08em] md:text-lg"
const TYPO_HERO_METADATA_VALUE = "text-3xl font-black leading-[1.0] sm:text-4xl xl:text-5xl"
const TYPO_HERO_METADATA_LABEL = "text-[10px] font-black uppercase leading-[1.2] tracking-[0.16em]"
const TYPO_SECTION_TITLE = "text-[10px] font-black uppercase leading-[1.2] tracking-[0.18em]"
const TYPO_DRIVER_RANK = "text-4xl font-black leading-[1.0]"
const TYPO_DRIVER_TITLE = "text-base font-black uppercase leading-[1.2] tracking-[0.03em]"
const TYPO_DRIVER_SCORE = "text-4xl font-black leading-[1.0]"
const TYPO_DRIVER_SUMMARY = "text-[10px] font-black uppercase leading-[1.45] tracking-[0.1em]"
const TYPO_EVIDENCE_TITLE = "text-[9px] font-black uppercase leading-[1.2] tracking-[0.16em]"
const TYPO_EVIDENCE_BODY = "text-[12px] font-black leading-[1.45]"
const TYPO_EVIDENCE_METADATA = "text-[8px] font-black uppercase leading-[1.2] tracking-[0.1em]"
const TYPO_ANALYTICS_TITLE = "text-[10px] font-black uppercase leading-[1.2] tracking-[0.16em]"
const TYPO_ANALYTICS_VALUE = "text-base font-black leading-[1.1]"
const TYPO_BADGE = "text-[9px] font-black uppercase leading-[1.15] tracking-[0.12em]"

const COLOR_BACKGROUND_BASE = "bg-[#070d07]"
const COLOR_BACKGROUND_DEEP = "bg-[#030805]"
const COLOR_SURFACE_LEVEL1 = "bg-[#07120b]"
const COLOR_SURFACE_LEVEL2 = "bg-[#0c140c]"
const COLOR_SURFACE_LEVEL3 = "bg-[#111911]"
const COLOR_SURFACE_LEVEL4 = "bg-[#0a0f0a]"
const COLOR_SURFACE_ACTIVE = "bg-[#141e14]"
const COLOR_BORDER_SUBTLE = "border-[#1c2c1c]"
const COLOR_BORDER_STRONG = "border-[#3a4d2c]"
const COLOR_BORDER_MUTED = "border-[#142014]"
const COLOR_TEXT_PRIMARY = "text-[#d4dbd4]"
const COLOR_TEXT_SECONDARY = "text-[#a0b0a0]"
const COLOR_TEXT_MUTED = "text-[#6b7d6b]"
const COLOR_TEXT_DIM = "text-[#3d503d]"
const COLOR_ACCENT_AMBER = "text-[#f97316]"
const COLOR_ACCENT_AMBER_DIM = "text-[#7c3d12]"
const COLOR_ACCENT_CYAN = "text-[#38bdf8]"
const COLOR_ACCENT_CYAN_DIM = "text-[#075985]"
const COLOR_STATE_POSITIVE = "text-[#22c55e]"
const COLOR_STATE_NEGATIVE = "text-[#e53535]"
const COLOR_STATE_NEUTRAL = "text-[#facc15]"
const COLOR_STATE_STALE = "text-[#f59e0b]"
const COLOR_STATE_MISSING = "text-[#71717a]"
const COLOR_STATE_LOADING = "text-[#38bdf8]"

const SURFACE_HERO = cn(COLOR_BORDER_STRONG, COLOR_SURFACE_LEVEL1, "shadow-[0_0_0_1px_rgba(249,115,22,.06),0_24px_80px_rgba(0,0,0,.36)] md:p-4")
const SURFACE_PRIMARY = cn(COLOR_BORDER_SUBTLE, COLOR_SURFACE_LEVEL2, "shadow-[inset_0_1px_0_rgba(56,189,248,.06)]")
const SURFACE_SECONDARY = cn(COLOR_BORDER_MUTED, COLOR_SURFACE_LEVEL3)
const SURFACE_ANALYTICS = cn(COLOR_BORDER_MUTED, COLOR_SURFACE_LEVEL4)
const SURFACE_STRIP = cn("border-[#f97316]/20", COLOR_SURFACE_LEVEL4, "shadow-[inset_0_1px_0_rgba(249,115,22,.06)]")

const DASHBOARD_PANEL_BASE = "min-h-0 rounded-lg border p-3"
const DASHBOARD_PANEL_LEVEL_CLASS: Record<DashboardPanelLevel, string> = {
  level1: SURFACE_HERO,
  level2: SURFACE_PRIMARY,
  level3: SURFACE_SECONDARY,
  level4: SURFACE_ANALYTICS,
}
const DASHBOARD_SECTION_HEADER = cn("mb-3 flex min-h-[22px] items-center justify-between gap-3 border-b pb-2", COLOR_BORDER_MUTED)
const DASHBOARD_SECTION_TITLE = cn("flex min-w-0 items-center gap-2", COLOR_ACCENT_CYAN, TYPO_SECTION_TITLE)
const DASHBOARD_INNER_PANEL = cn("rounded-lg border", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP)

function Card({
  title,
  icon,
  children,
  className,
  right,
  level = "level3",
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  right?: ReactNode
  level?: DashboardPanelLevel
}) {
  return (
    <section className={cn(DASHBOARD_PANEL_BASE, DASHBOARD_PANEL_LEVEL_CLASS[level], className)}>
      <div className={DASHBOARD_SECTION_HEADER}>
        <div className={DASHBOARD_SECTION_TITLE}>
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

function marketSummary(state: Bias, bullFactors: number, bearFactors: number, causes: CauseTag[]) {
  if (state === "Bullish" && bearFactors > 0) return "Buying pressure outweighs bearish signals"
  if (state === "Bullish" && causes.some((cause) => cause.label === "Sector Rotation Improving")) return "Sector rotation supports risk assets"
  if (state === "Bullish") return "Bullish momentum remains dominant"
  if (state === "Bearish" && bullFactors > 0) return "Selling pressure outweighs bullish signals"
  if (state === "Bearish") return "Bearish pressure remains dominant"
  return "Mixed evidence keeps market neutral"
}

function MarketBrief({ mover, causes }: { mover?: MarketMoverCandidate; causes: CauseTag[] }) {
  const state = marketStateFromScore(mover)
  const bullFactors = causes.filter((cause) => cause.tone === "positive").length
  const bearFactors = causes.filter((cause) => cause.tone === "negative").length
  const score = calibratedConfidence(mover, causes)
  const summary = marketSummary(state, bullFactors, bearFactors, causes)
  const stateIcon = terminalDirectionIcon(state)
  const stateBorder = state === "Bullish"
    ? "border-[#22c55e]/30 bg-[#22c55e]/10"
    : state === "Bearish"
      ? "border-[#e53535]/30 bg-[#e53535]/10"
      : cn("border-[#facc15]/25 bg-[#facc15]/10")

  return (
    <Card
      title="Market Brief"
      icon={<LineChart className="h-3.5 w-3.5" />}
      className={cn("border-[#38bdf8]/25 p-4", COLOR_SURFACE_LEVEL4)}
    >
      <div className="grid gap-3 md:grid-cols-[1.2fr_.8fr] md:items-stretch">
        <div className={cn("flex min-h-[156px] flex-col justify-center rounded-lg border border-[#38bdf8]/15 p-5", COLOR_BACKGROUND_DEEP)}>
          <div className={cn(COLOR_ACCENT_CYAN, score === null ? TYPO_HERO_METADATA_VALUE : TYPO_HERO_DIRECTION)}>{score ?? "NO DATA"}</div>
          <div className={cn("mt-2", COLOR_TEXT_MUTED, TYPO_HERO_METADATA_LABEL)}>Confidence</div>
        </div>
        <div className={cn("flex min-h-[156px] flex-col justify-center rounded-lg border p-5 text-right", stateBorder)}>
          <div className="text-5xl leading-none">{stateIcon}</div>
          <div className={cn("mt-3", TYPO_HERO_METADATA_VALUE, stateTone(state))}>{state}</div>
          <div className={cn("mt-2 truncate", COLOR_TEXT_SECONDARY, TYPO_DRIVER_SUMMARY)}>{summary}</div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <div className={cn("rounded border border-[#22c55e]/15 p-2", COLOR_BACKGROUND_DEEP)}>
              <div className={cn(COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>Bull Factors</div>
              <div className={cn(COLOR_STATE_POSITIVE, TYPO_ANALYTICS_VALUE)}>{bullFactors}</div>
            </div>
            <div className={cn("rounded border border-[#e53535]/15 p-2", COLOR_BACKGROUND_DEEP)}>
              <div className={cn(COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>Bear Factors</div>
              <div className={cn(COLOR_STATE_NEGATIVE, TYPO_ANALYTICS_VALUE)}>{bearFactors}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function causeToneClass(tone: CauseTone) {
  if (tone === "positive") return cn("border-[#22c55e]/25 bg-[#22c55e]/10", COLOR_STATE_POSITIVE)
  if (tone === "negative") return cn("border-[#e53535]/25 bg-[#e53535]/10", COLOR_STATE_NEGATIVE)
  return cn("border-[#facc15]/25 bg-[#facc15]/10", COLOR_STATE_NEUTRAL)
}

function causeIcon(tone: CauseTone) {
  if (tone === "positive") return "\u{1F7E2}"
  if (tone === "negative") return "\u{1F534}"
  return "\u{1F7E1}"
}

function WhyCard({ causes }: { causes: CauseTag[] }) {
  const hasEnoughEvidence = causes.length >= 3

  return (
    <Card title="Market Drivers" icon={<Info className="h-3.5 w-3.5" />} level="level3">
      {!hasEnoughEvidence ? (
        <div className={cn(DASHBOARD_INNER_PANEL, "px-2 py-4 text-center", COLOR_TEXT_MUTED, TYPO_BADGE)}>INSUFFICIENT LIVE EVIDENCE</div>
      ) : (
        <div className="grid gap-1.5">
          {causes.slice(0, 3).map((cause, index) => (
            <div key={cause.label} className={cn("rounded-md border px-2 py-2", TYPO_DRIVER_SUMMARY, causeToneClass(cause.tone))}>
              <div>
                <span className={cn("mr-1.5", COLOR_TEXT_SECONDARY)}>#{index + 1}</span>
                <span className="mr-1.5">{causeIcon(cause.tone)}</span>
                {cause.label}
              </div>
              <div className={cn("mt-1", COLOR_TEXT_SECONDARY, TYPO_EVIDENCE_METADATA)}>{cause.explanation}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function TrendChangeRiskCard({ mover, causes }: { mover?: MarketMoverCandidate; causes: CauseTag[] }) {
  const direction = marketStateFromScore(mover)
  const confidence = calibratedConfidence(mover, causes)
  const reversalDrivers = causes.filter((cause) => {
    if (direction === "Bearish") return cause.tone === "positive"
    if (direction === "Bullish") return cause.tone === "negative"
    return cause.tone !== "neutral"
  })
  const riskLevel = confidence === null
    ? "NO DATA"
    : confidence < 78 || reversalDrivers.length >= 2
      ? "HIGH"
      : confidence < 88 || reversalDrivers.length === 1
        ? "MEDIUM"
        : "LOW"
  const interpretation = confidence === null
    ? "Unavailable"
    : riskLevel === "HIGH"
      ? "Direction may change soon"
      : riskLevel === "MEDIUM"
        ? "Watch for reversal pressure"
        : `Market remains ${direction.toLowerCase()}`
  const reason = reversalDrivers[0]?.label
    ? `${reversalDrivers[0].label} against current direction`
    : direction === "Neutral"
      ? "Mixed evidence remains unresolved"
      : `${direction} evidence remains dominant`

  return (
    <Card title="Trend Change Risk" icon={<AlertTriangle className="h-3.5 w-3.5" />} level="level4">
      <div className={cn(DASHBOARD_INNER_PANEL, "p-3")}>
        <div className="flex items-center justify-between gap-2">
          <span className={cn(COLOR_TEXT_MUTED, TYPO_ANALYTICS_TITLE)}>Risk Level</span>
          <span className={cn(
            TYPO_BADGE,
            riskLevel === "HIGH" && COLOR_STATE_NEGATIVE,
            riskLevel === "MEDIUM" && COLOR_STATE_NEUTRAL,
            riskLevel === "LOW" && COLOR_STATE_POSITIVE,
            riskLevel === "NO DATA" && COLOR_STATE_MISSING,
          )}>
            {riskLevel}
          </span>
        </div>
        <div className={cn("mt-2", COLOR_TEXT_PRIMARY, TYPO_DRIVER_SUMMARY)}>{interpretation}</div>
        <div className={cn("mt-1", COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>Reason: {reason}</div>
        {reversalDrivers.length > 0 && (
          <div className="mt-2 grid gap-1">
            {reversalDrivers.slice(0, 2).map((driver) => (
              <div key={`trend-${driver.label}`} className={cn(COLOR_TEXT_SECONDARY, TYPO_EVIDENCE_METADATA)}>
                Watch: {driver.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function TopRowCard({ title, icon, primary, rows }: { title: string; icon: ReactNode; primary: string; rows: string[] }) {
  return (
    <Card title={title} icon={icon} level="level4">
      <div className={cn(COLOR_TEXT_PRIMARY, TYPO_ANALYTICS_VALUE)}>{primary}</div>
      <div className="mt-2 grid gap-1.5">
        {rows.map((row) => (
          <div key={`${title}-${row}`} className={cn(DASHBOARD_INNER_PANEL, "px-2 py-1.5", COLOR_TEXT_SECONDARY, TYPO_EVIDENCE_BODY)}>
            {row}
          </div>
        ))}
      </div>
    </Card>
  )
}

function GuidanceCard({ mover }: { mover?: MarketMoverCandidate }) {
  const levels = priceContext(mover)
  const doItems = [
    actionFromCandidate(mover),
    levels.bullishTrigger,
    levels.bearishTrigger,
  ].filter((item): item is string => Boolean(item))
  const avoidItems = [
    failureFromText(mover?.invalidation, mover?.chaseRisk),
  ].filter((item): item is string => Boolean(item))

  return (
    <Card title="Execution Guidance" icon={<ShieldAlert className="h-3.5 w-3.5" />} level="level4">
      <div className="grid gap-2">
        <div className="rounded-md border border-[#22c55e]/15 bg-[#22c55e]/10 px-2 py-1.5">
          <div className={cn(COLOR_STATE_POSITIVE, TYPO_ANALYTICS_TITLE)}>DO</div>
          {(doItems.length ? doItems : ["NO DATA"]).map((item) => (
            <div key={`do-${item}`} className={cn("mt-1 uppercase", COLOR_STATE_POSITIVE, TYPO_ANALYTICS_VALUE)}>{item}</div>
          ))}
        </div>
        <div className="rounded-md border border-[#e53535]/15 bg-[#e53535]/10 px-2 py-1.5">
          <div className={cn(COLOR_STATE_NEGATIVE, TYPO_ANALYTICS_TITLE)}>AVOID</div>
          {(avoidItems.length ? avoidItems : ["NO DATA"]).map((item) => (
            <div key={`avoid-${item}`} className={cn("mt-1 uppercase", COLOR_STATE_NEGATIVE, TYPO_ANALYTICS_VALUE)}>{item}</div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function TacticalAlerts({ alerts }: { alerts: TacticalAlert[] }) {
  const rankedAlerts = [...alerts].sort((left, right) => (right.confidence ?? -1) - (left.confidence ?? -1))
  const numericScores = rankedAlerts.map((alert) => alert.confidence).filter((score): score is number => score !== null)
  const uniqueScores = new Set(numericScores)
  const scoreSpread = numericScores.length ? Math.max(...numericScores) - Math.min(...numericScores) : 0
  const hasRepeatedExtremeScores = numericScores.filter((score) => score >= 97).length > 1
  const hasMeaningfulNumericScores = uniqueScores.size === numericScores.length && scoreSpread >= 10 && !hasRepeatedExtremeScores
  const priorityLabel = (score: number | null) => {
    if (score === null) return "LOW"
    if (score >= 80) return "HIGH"
    if (score >= 60) return "MEDIUM"
    return "LOW"
  }
  const scoreLabel = (score: number | null) => {
    if (score === null) return "NO SCORE"
    if (hasMeaningfulNumericScores) return String(score)
    return null
  }
  const directionLabel = (bias: Bias) => {
    if (bias === "Bullish") return "Uptrend"
    if (bias === "Bearish") return "Downtrend"
    return "Neutral"
  }
  const marketHref = (alert: TacticalAlert) => {
    const params = new URLSearchParams({
      symbol: alert.asset,
      source: "tactical-alert",
      setup: alert.label ?? "Live Market Signal",
      direction: directionLabel(alert.bias),
    })
    if (alert.confidence !== null) params.set("confidence", String(alert.confidence))
    if (alert.explanation) params.set("reason", alert.explanation)
    return `/markets?${params.toString()}`
  }

  return (
    <Card title="Tactical Alerts" icon={<Zap className="h-3.5 w-3.5" />} level="level3" className="min-h-[132px]">
      {rankedAlerts.length === 0 ? (
        <div className={cn(DASHBOARD_INNER_PANEL, "px-3 py-2 text-center", COLOR_TEXT_MUTED, TYPO_BADGE)}>NO LIVE ALERTS</div>
      ) : (
      <div className="grid gap-1.5 xl:grid-cols-4">
        <div className={cn("xl:col-span-4", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>
          What should I watch next?
        </div>
        {rankedAlerts.map((alert, index) => (
          <article key={`${alert.asset}-${alert.label}`} className={cn("flex h-full flex-col rounded border p-2.5", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP)}>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
              <div className="min-h-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className={cn(COLOR_ACCENT_CYAN, TYPO_EVIDENCE_TITLE)}>#{index + 1} Watch</div>
                  <span className={cn(
                    "shrink-0 rounded border px-1.5 py-0.5",
                    TYPO_BADGE,
                    priorityLabel(alert.confidence) === "HIGH" && cn("border-[#22c55e]/25 bg-[#22c55e]/10", COLOR_STATE_POSITIVE),
                    priorityLabel(alert.confidence) === "MEDIUM" && cn("border-[#facc15]/25 bg-[#facc15]/10", COLOR_STATE_NEUTRAL),
                    priorityLabel(alert.confidence) === "LOW" && cn("border-[#71717a]/40", COLOR_SURFACE_LEVEL4, COLOR_STATE_MISSING),
                  )}>{priorityLabel(alert.confidence)}</span>
                </div>
                <div className={cn("mt-1 uppercase", COLOR_TEXT_PRIMARY, TYPO_ANALYTICS_VALUE)}>{alert.asset}</div>
                {alert.context && <div className={cn("mt-0.5", COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>{alert.context}</div>}
                <div className={cn("mt-0.5 line-clamp-1", COLOR_TEXT_SECONDARY, TYPO_DRIVER_SUMMARY)}>{alert.label ?? "NO DATA"}</div>
                {alert.explanation && <div className={cn("mt-1 line-clamp-2", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>{alert.explanation}</div>}
                {timeAgo(alert.detectedAt) && (
                  <div className={cn("mt-1", COLOR_STATE_POSITIVE, TYPO_EVIDENCE_METADATA)}>{timeAgo(alert.detectedAt)}</div>
                )}
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className={cn("rounded-full border px-2 py-0.5", TYPO_BADGE, biasClass(alert.bias))}>{alert.bias}</span>
                {scoreLabel(alert.confidence) && (
                  <span className={cn(COLOR_ACCENT_CYAN, TYPO_ANALYTICS_VALUE)}>{scoreLabel(alert.confidence)}</span>
                )}
              </div>
              {alert.tags.length > 0 && <div className="flex flex-wrap gap-1">
                {alert.tags.map((tag) => (
                  <span key={`${alert.asset}-${tag}`} className={cn("rounded border px-1.5 py-0.5", COLOR_BORDER_MUTED, COLOR_SURFACE_LEVEL4, COLOR_TEXT_MUTED, TYPO_BADGE)}>
                    {tag}
                  </span>
                ))}
              </div>}
              <Link
                href={marketHref(alert)}
                className={cn("mt-auto rounded border border-[#38bdf8]/20 bg-[#38bdf8]/10 px-2 py-1 text-center hover:border-[#38bdf8]/50", COLOR_ACCENT_CYAN, TYPO_BADGE)}
              >
                Inspect Market
              </Link>
            </div>
          </article>
        ))}
      </div>
      )}
    </Card>
  )
}

function consistencyNote(mover: MarketMoverCandidate | undefined, causes: CauseTag[], futures: FuturesIntelligenceResponse | null) {
  const direction = marketStateFromScore(mover)
  const liquidity = liquidityCondition(futures)
  const conflictingCause = causes.find((cause) => {
    if (direction === "Bullish") return cause.tone === "negative"
    if (direction === "Bearish") return cause.tone === "positive"
    return false
  })

  if (direction === "Bullish" && liquidity?.label === "Liquidity Weakening") return "Bullish trend but liquidity weakening"
  if (direction === "Bearish" && topEvidence(mover).some((item) => item.toLowerCase().includes("buying"))) return "Recovery attempt against broader weakness"
  if (direction !== "Neutral" && conflictingCause) return `${direction} trend but ${conflictingCause.label.toLowerCase()}`
  return null
}

function WhyThisSignal({ mover, causes, futures, marketDirection }: { mover?: MarketMoverCandidate; causes: CauseTag[]; futures: FuturesIntelligenceResponse | null; marketDirection: Bias }) {
  const evidence = topEvidence(mover)
  const evidenceRead = signalEvidenceSummary(evidence, marketDirection)
  const action = actionFromCandidate(mover)
  const levels = priceContext(mover)
  const failure = invalidationFromContext(mover, levels)
  const note = consistencyNote(mover, causes, futures)

  if (!mover) {
    return (
      <Card title="Signal Evidence" icon={<Target className="h-3.5 w-3.5" />} level="level4">
        <div className={cn(DASHBOARD_INNER_PANEL, "p-5 text-center", COLOR_TEXT_MUTED, TYPO_ANALYTICS_TITLE)}>NO SIGNAL DATA</div>
      </Card>
    )
  }

  return (
    <Card title="Signal Evidence" icon={<Target className="h-3.5 w-3.5" />} level="level4">
      <div className="grid gap-2 lg:grid-cols-3">
        <div className="rounded-lg border border-[#38bdf8]/20 bg-[#38bdf8]/10 p-3">
          <div className={cn(COLOR_ACCENT_CYAN, TYPO_ANALYTICS_TITLE)}>Evidence</div>
          <div className={cn("mt-1.5 uppercase", COLOR_TEXT_PRIMARY, TYPO_ANALYTICS_VALUE)}>{evidenceRead.headline}</div>
          {evidenceRead.support && <div className={cn("mt-1 uppercase", COLOR_TEXT_SECONDARY, TYPO_DRIVER_SUMMARY)}>{evidenceRead.support}</div>}
          {(evidenceRead.note || note) && <div className={cn("mt-2 rounded border border-[#f97316]/20 bg-[#f97316]/10 px-2 py-1", COLOR_ACCENT_AMBER, TYPO_EVIDENCE_METADATA)}>{evidenceRead.note ?? note}</div>}
        </div>
        <div className="rounded-lg border border-[#e53535]/20 bg-[#e53535]/10 p-3">
          <div className={cn(COLOR_STATE_NEGATIVE, TYPO_ANALYTICS_TITLE)}>Invalidation</div>
          <div className={cn("mt-1.5", COLOR_TEXT_PRIMARY, TYPO_ANALYTICS_VALUE)}>{failure ?? "NO DATA"}</div>
        </div>
        <div className="rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/10 p-3">
          <div className={cn(COLOR_STATE_POSITIVE, TYPO_ANALYTICS_TITLE)}>Action</div>
          <div className={cn("mt-1.5", COLOR_TEXT_PRIMARY, TYPO_ANALYTICS_VALUE)}>{action ?? "NO DATA"}</div>
          <div className={cn("mt-2 grid gap-0.5", COLOR_TEXT_SECONDARY, TYPO_EVIDENCE_METADATA)}>
            <div>Range: {levels.range ?? "NO DATA"}</div>
            <div>Resistance: {levels.resistance ?? "NO DATA"}</div>
            <div>Support: {levels.support ?? "NO DATA"}</div>
            <div>{levels.bullishTrigger ?? "Bullish Trigger: NO DATA"}</div>
            <div>{levels.bearishTrigger ?? "Bearish Trigger: NO DATA"}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function InformationFlow({ items }: { items: InformationFlowItem[] }) {
  return (
    <Card title="Information Flow" icon={<Newspaper className="h-3.5 w-3.5" />} level="level4">
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className={cn(DASHBOARD_INNER_PANEL, "p-4 text-center", COLOR_TEXT_MUTED, TYPO_BADGE)}>NO FLOW DATA</div>
        ) : items.map((item) => (
          <div key={`${item.time}-${item.event}`} className={cn(DASHBOARD_INNER_PANEL, "grid grid-cols-[38px_1fr_auto] items-center gap-2 p-2")}>
            <div className={cn(COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>{item.time}</div>
            <div className={cn("truncate", COLOR_TEXT_PRIMARY, TYPO_EVIDENCE_BODY)}>{item.event}</div>
            <div className={cn(COLOR_ACCENT_CYAN, TYPO_EVIDENCE_METADATA)}>{item.tag ?? ""}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SystemStatus({ liquidationCount, alertCount, cacheUpdatedAt }: { liquidationCount: number; alertCount: number; cacheUpdatedAt?: string | null }) {
  return (
    <Card title="System Status" icon={<RadioTower className="h-3.5 w-3.5" />} level="level4">
      <div className="space-y-1.5">
        <div className={cn(DASHBOARD_INNER_PANEL, "flex items-center justify-between p-2", TYPO_EVIDENCE_BODY)}>
          <span className={cn("flex items-center gap-2", COLOR_TEXT_SECONDARY)}><CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" /> Market feed</span>
          <span className={COLOR_STATE_POSITIVE}>Live</span>
        </div>
        <div className={cn(DASHBOARD_INNER_PANEL, "flex items-center justify-between p-2", TYPO_EVIDENCE_BODY)}>
          <span className={cn("flex items-center gap-2", COLOR_TEXT_SECONDARY)}><Activity className="h-3.5 w-3.5 text-[#38bdf8]" /> Alerts</span>
          <span className={COLOR_ACCENT_CYAN}>{alertCount}</span>
        </div>
        <div className={cn(DASHBOARD_INNER_PANEL, "flex items-center justify-between p-2", TYPO_EVIDENCE_BODY)}>
          <span className={cn("flex items-center gap-2", COLOR_TEXT_SECONDARY)}><AlertTriangle className="h-3.5 w-3.5 text-[#f97316]" /> Liquidations</span>
          <span className={COLOR_ACCENT_AMBER}>{liquidationCount}</span>
        </div>
        {cacheUpdatedAt ? (
          <div className={cn(DASHBOARD_INNER_PANEL, "flex items-center justify-between p-2", TYPO_EVIDENCE_METADATA)}>
            <span className={COLOR_TEXT_MUTED}>Last updated</span>
            <span className={COLOR_TEXT_SECONDARY}>{new Date(cacheUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function HistoricalEvidenceStrip({ data, loading }: { data: HistoricalEvidenceResponse | null; loading: boolean }) {
  const horizon = data?.statistics?.byHorizon?.["24h"]
  const available = data?.ok === true && data.status === "available" && (data.diagnostics?.analogCount ?? 0) > 0
  const generatedAt = data?.diagnostics?.generatedAt
  const source = data?.diagnostics?.source ?? data?.source
  const reason = data?.diagnostics?.cacheStatus === "missing"
    ? "cache not generated"
    : data?.reason ?? "cached evidence unavailable"

  return (
    <section className={cn("rounded-lg border px-3 py-2", SURFACE_STRIP)}>
      <div className="grid gap-2 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-center">
        <div className="border-l-2 border-[#f97316]/40 pl-3">
          <div className={cn("flex items-center gap-2", COLOR_ACCENT_AMBER, TYPO_EVIDENCE_TITLE)}>
            <History className="h-3.5 w-3.5" />
            Historical Analog
          </div>
          <div className={cn("mt-1", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>
            Lightweight context strip
          </div>
        </div>
        {available ? (
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(150px,auto)] xl:items-stretch">
            <div className={cn("rounded border px-2.5 py-1.5", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>
              Similar Cases
              <div className={cn("mt-0.5", COLOR_TEXT_PRIMARY, TYPO_ANALYTICS_VALUE)}>{data?.statistics?.totalCases ?? data?.diagnostics?.analogCount}</div>
            </div>
            <div className={cn("rounded border px-2.5 py-1.5", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>
              Avg Move 24h
              <div className={cn("mt-0.5", TYPO_ANALYTICS_VALUE, (horizon?.averageReturn ?? 0) >= 0 ? COLOR_STATE_POSITIVE : COLOR_STATE_NEGATIVE)}>
                {horizon?.averageReturn === null || horizon?.averageReturn === undefined ? "NO DATA" : `${horizon.averageReturn > 0 ? "+" : ""}${horizon.averageReturn.toFixed(2)}%`}
              </div>
            </div>
            <div className={cn("rounded border px-2.5 py-1.5", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>
              Continuation
              <div className={cn("mt-0.5", COLOR_TEXT_PRIMARY, TYPO_ANALYTICS_VALUE)}>
                {horizon?.winRate === null || horizon?.winRate === undefined ? "NO DATA" : `${horizon.winRate.toFixed(1)}%`}
              </div>
            </div>
            <div className={cn("rounded border px-2.5 py-1.5", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>
              Outcome
              <div className={cn("mt-0.5", COLOR_ACCENT_AMBER, TYPO_ANALYTICS_VALUE)}>{data?.statistics?.dominantOutcome?.toUpperCase() ?? "NO DATA"}</div>
            </div>
            <div className={cn("flex flex-col justify-center rounded border px-2.5 py-1.5", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>
              {source ?? "UNKNOWN SOURCE"} · {generatedAt ? new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "NO GENERATED TIME"}
            </div>
          </div>
        ) : (
          <div className={cn("rounded border px-3 py-2", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>
            <span className={COLOR_TEXT_SECONDARY}>{loading ? "Historical Analog Loading" : "Historical Analog Unavailable"}</span>
            {!loading ? <span className={cn("ml-2", COLOR_TEXT_DIM)}>Reason: {reason}</span> : null}
          </div>
        )}
      </div>
    </section>
  )
}

function driverBias(direction?: MarketDriverSummary["marketDirection"]): Bias {
  if (direction === "positive") return "Bullish"
  if (direction === "negative") return "Bearish"
  return "Neutral"
}

function driverCategoryLabel(category: MarketDriverCategory) {
  const labels: Record<MarketDriverCategory, string> = {
    funding: "Funding",
    open_interest: "Open Interest",
    liquidation: "Liquidation",
    exchange_flow: "Exchange Flow",
    treasury: "Treasury",
    etf: "ETF",
    historical_analog: "Historical Analog",
    event_impact: "Event Impact",
  }
  return labels[category]
}

function dashboardHealthFromDriverState(
  state: MarketDriverLoadState,
  summary?: MarketDriverSummary | null,
) {
  if (state === "loading") return "LOADING"
  if (state === "unavailable") return "UNAVAILABLE"
  if (state === "empty" || !summary) return "MISSING"
  if (summary.quality === "verified" && !summary.staleCategories?.length) return "CURRENT"
  if (summary.staleCategories?.length) return "STALE"
  if (summary.quality === "degraded" || summary.missingCategories?.length) return "PARTIAL"
  if (summary.quality === "unavailable") return "UNAVAILABLE"
  return "PARTIAL"
}

function healthBadgeClass(health: string) {
  if (health === "CURRENT" || health === "VERIFIED") return cn("border-[#22c55e]/25 bg-[#22c55e]/10", COLOR_STATE_POSITIVE)
  if (health === "PARTIAL" || health === "DEGRADED") return cn("border-[#facc15]/25 bg-[#facc15]/10", COLOR_STATE_NEUTRAL)
  if (health === "STALE") return cn("border-[#f59e0b]/25 bg-[#f59e0b]/10", COLOR_STATE_STALE)
  if (health === "LOADING") return cn("border-[#38bdf8]/25 bg-[#38bdf8]/10", COLOR_STATE_LOADING)
  if (health === "MISSING") return cn("border-[#71717a]/40 bg-[#0a0f0a]", COLOR_STATE_MISSING)
  return cn(COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED)
}

function evidencePriority(health: string) {
  if (health === "CURRENT" || health === "VERIFIED") return "high"
  if (health === "PARTIAL" || health === "DEGRADED") return "medium"
  return "low"
}

function evidencePriorityClass(priority: string) {
  if (priority === "high") {
    return cn("border-[#22c55e]/30 bg-[#22c55e]/10 shadow-[inset_0_1px_0_rgba(34,197,94,.12)]")
  }
  if (priority === "medium") {
    return cn("border-[#facc15]/25 bg-[#facc15]/10 shadow-[inset_0_1px_0_rgba(250,204,21,.08)]")
  }
  return cn(COLOR_BORDER_MUTED, COLOR_SURFACE_LEVEL4)
}

function evidencePriorityLabel(priority: string) {
  if (priority === "high") return "Primary Evidence"
  if (priority === "medium") return "Partial Evidence"
  return "Evidence Missing"
}

function driverDirectionClass(direction: MarketDriverSummary["drivers"][number]["evidence"]["direction"]) {
  if (direction === "positive") return COLOR_STATE_POSITIVE
  if (direction === "negative") return COLOR_STATE_NEGATIVE
  return COLOR_STATE_NEUTRAL
}

function driverDirectionPanelClass(direction: MarketDriverSummary["drivers"][number]["evidence"]["direction"]) {
  if (direction === "positive") {
    return "border-[#22c55e]/30 bg-[#22c55e]/10 shadow-[inset_0_1px_0_rgba(34,197,94,.1)]"
  }
  if (direction === "negative") {
    return "border-[#e53535]/30 bg-[#e53535]/10 shadow-[inset_0_1px_0_rgba(229,53,53,.1)]"
  }
  return "border-[#facc15]/25 bg-[#facc15]/10 shadow-[inset_0_1px_0_rgba(250,204,21,.08)]"
}

function driverDirectionBadgeClass(direction: MarketDriverSummary["drivers"][number]["evidence"]["direction"]) {
  if (direction === "positive") return cn("border-[#22c55e]/30 bg-[#22c55e]/10", COLOR_STATE_POSITIVE)
  if (direction === "negative") return cn("border-[#e53535]/30 bg-[#e53535]/10", COLOR_STATE_NEGATIVE)
  return cn("border-[#facc15]/30 bg-[#facc15]/10", COLOR_STATE_NEUTRAL)
}

function formatDashboardTimestamp(value?: string | null) {
  if (!value) return "NO TIME"
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return "NO TIME"
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

function formatReserveNumber(value: number | null | undefined, unit = "") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const absolute = Math.abs(value)
  const sign = value > 0 ? "+" : value < 0 ? "-" : ""
  const formatted = absolute >= 1_000_000_000
    ? `${(absolute / 1_000_000_000).toFixed(2)}B`
    : absolute >= 1_000_000
      ? `${(absolute / 1_000_000).toFixed(2)}M`
      : absolute >= 1_000
        ? `${(absolute / 1_000).toFixed(2)}K`
        : absolute.toFixed(absolute >= 100 ? 0 : 2)
  return `${sign}${formatted}${unit}`
}

function reserveObservationLabel(type: ReserveObservationType) {
  const labels: Record<ReserveObservationType, string> = {
    reserve_increase: "Reserve Increase",
    reserve_decrease: "Reserve Decrease",
    reserve_no_change: "Reserve No Change",
    stablecoin_accumulation: "Stablecoin Accumulation",
    stablecoin_decline: "Stablecoin Decline",
    stablecoin_no_change: "Stablecoin No Change",
    delta_unavailable: "Delta Unavailable",
  }
  return labels[type]
}

function reserveObservationSummary(observation: ReserveIntelligenceObservation) {
  if (observation.observationType === "delta_unavailable") {
    return `${observation.asset}: ${observation.reason ?? "Reserve delta unavailable."}`
  }
  const usdChange = formatReserveNumber(observation.balanceUsdChange, " USD")
  const assetChange = formatReserveNumber(observation.quantityChange)
  const percent = observation.percentageChange === null || observation.percentageChange === undefined
    ? "NO PCT"
    : `${observation.percentageChange > 0 ? "+" : ""}${observation.percentageChange.toFixed(2)}%`
  return `${observation.asset}: ${reserveObservationLabel(observation.observationType)} (${assetChange}, ${usdChange}, ${percent}).`
}

function MarketDirectionPanel({
  data,
  state,
  reason,
}: {
  data: MarketDriverSummary | null
  state: MarketDriverLoadState
  reason: string | null
}) {
  const direction = driverBias(data?.marketDirection)
  const health = dashboardHealthFromDriverState(state, data)
  const tone = direction === "Bullish"
    ? "border-[#22c55e]/35 bg-[linear-gradient(135deg,rgba(7,18,11,.95),rgba(34,197,94,.16))] text-[#22c55e] shadow-[inset_0_1px_0_rgba(34,197,94,.14)]"
    : direction === "Bearish"
      ? "border-[#e53535]/35 bg-[linear-gradient(135deg,rgba(7,18,11,.95),rgba(229,53,53,.16))] text-[#e53535] shadow-[inset_0_1px_0_rgba(229,53,53,.12)]"
      : "border-[#facc15]/30 bg-[linear-gradient(135deg,rgba(7,18,11,.95),rgba(250,204,21,.14))] text-[#facc15] shadow-[inset_0_1px_0_rgba(250,204,21,.12)]"
  const topDriver = data?.drivers[0]
  const conclusion = topDriver
    ? `${direction} because ${topDriver.title}`
    : `${direction} with no ranked driver evidence`

  return (
    <Card
      title="Market Direction"
      icon={<LineChart className="h-3.5 w-3.5" />}
      level="level1"
      right={data ? (
        <div className={cn(TYPO_EVIDENCE_METADATA, COLOR_TEXT_DIM)}>
          {new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
        </div>
      ) : null}
    >
      {state === "loading" ? (
        <div className={cn(DASHBOARD_INNER_PANEL, "grid min-h-[148px] place-items-center", COLOR_TEXT_MUTED, TYPO_BADGE)}>
          Loading Market Direction
        </div>
      ) : state === "unavailable" ? (
        <div className={cn(DASHBOARD_INNER_PANEL, "grid min-h-[148px] place-items-center px-4 text-center")}>
          <div>
            <div className={cn(COLOR_TEXT_SECONDARY, TYPO_SECTION_TITLE)}>Market Direction Unavailable</div>
            <div className={cn("mt-2", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>Reason: {reason ?? "Market Driver evidence unavailable."}</div>
          </div>
        </div>
      ) : state === "empty" || !data ? (
        <div className={cn(DASHBOARD_INNER_PANEL, "grid min-h-[148px] place-items-center", COLOR_TEXT_MUTED, TYPO_BADGE)}>
          No Market Driver Evidence
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className={cn("relative flex min-h-[310px] overflow-hidden rounded-lg border px-5 py-6 md:px-8 md:py-8", tone)}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f97316]/40 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-[linear-gradient(90deg,rgba(249,115,22,.12),transparent_55%)]" />
            <div className="relative z-10 flex max-w-5xl flex-col justify-center">
              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded border px-2 py-1", TYPO_BADGE, healthBadgeClass(health))}>
                  Health {health}
                </span>
                <span className={cn("rounded border px-2 py-1", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_BADGE)}>
                  Regime Unavailable
                </span>
                <span className={cn("rounded border border-[#38bdf8]/20 bg-[#38bdf8]/10 px-2 py-1", COLOR_ACCENT_CYAN, TYPO_BADGE)}>
                  {data.symbol}
                </span>
              </div>
              <div className={cn("mt-6", COLOR_ACCENT_AMBER, TYPO_SECTION_TITLE)}>What Is Happening</div>
              <div className={cn("mt-3", TYPO_HERO_DIRECTION)}>{direction}</div>
              <div className={cn("mt-6 max-w-4xl border-l-2 border-[#f97316]/40 pl-4", COLOR_TEXT_PRIMARY, TYPO_HERO_CONCLUSION)}>
                {conclusion}
              </div>
              <div className={cn("mt-6", COLOR_TEXT_MUTED, TYPO_HERO_METADATA_LABEL)}>Conclusion first. Evidence ranked below.</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="flex min-h-[96px] flex-col justify-center rounded-lg border border-[#38bdf8]/25 bg-[linear-gradient(135deg,rgba(7,89,133,.34),rgba(3,8,5,.34))] p-4 shadow-[inset_0_1px_0_rgba(56,189,248,.12)]">
              <div className={cn(TYPO_HERO_METADATA_VALUE, COLOR_ACCENT_CYAN)}>{Math.round(data.confidence)}%</div>
              <div className={cn("mt-2", COLOR_TEXT_SECONDARY, TYPO_HERO_METADATA_LABEL)}>Confidence</div>
            </div>
            <div className="flex min-h-[96px] flex-col justify-center rounded-lg border border-[#f97316]/25 bg-[linear-gradient(135deg,rgba(124,61,18,.34),rgba(3,8,5,.34))] p-4 shadow-[inset_0_1px_0_rgba(249,115,22,.12)]">
              <div className={cn(TYPO_HERO_METADATA_VALUE, COLOR_ACCENT_AMBER)}>{data.drivers.length}</div>
              <div className={cn("mt-2", COLOR_TEXT_SECONDARY, TYPO_HERO_METADATA_LABEL)}>Driver Count</div>
            </div>
            <div className="flex min-h-[96px] flex-col justify-center rounded-lg border border-[#1c2c1c] bg-[linear-gradient(135deg,rgba(20,30,20,.82),rgba(3,8,5,.36))] p-4 shadow-[inset_0_1px_0_rgba(160,176,160,.1)]">
              <div className={cn(TYPO_HERO_METADATA_VALUE, "uppercase", COLOR_TEXT_PRIMARY)}>{health}</div>
              <div className={cn("mt-2", COLOR_TEXT_SECONDARY, TYPO_HERO_METADATA_LABEL)}>Data Health</div>
              <div className={cn("mt-1", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>{formatDashboardTimestamp(data.timestamp)}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function WhyMarketMoving({
  data,
  state,
}: {
  data: MarketDriverSummary | null
  state: MarketDriverLoadState
}) {
  const primaryDrivers = data?.drivers.slice(0, 3) ?? []
  const extraDriverCount = Math.max(0, (data?.drivers.length ?? 0) - 3)
  const slots = [0, 1, 2]

  return (
    <Card title="Top Drivers" icon={<Info className="h-3.5 w-3.5" />} level="level2">
      {state === "loading" ? (
        <div className={cn(DASHBOARD_INNER_PANEL, "p-5 text-center", COLOR_TEXT_MUTED, TYPO_SECTION_TITLE)}>Loading Ranked Drivers</div>
      ) : data?.drivers.length ? (
        <div className="grid gap-2">
          <div className={cn(COLOR_TEXT_MUTED, TYPO_DRIVER_SUMMARY)}>
            Ranked reasons behind the current market direction.
          </div>
          <div className="grid gap-2 lg:grid-cols-3">
            {slots.map((slot) => {
              const driver = primaryDrivers[slot]
              if (!driver) {
                return (
                  <article key={`missing-driver-${slot}`} className={cn(DASHBOARD_INNER_PANEL, "p-3")}>
                    <div className={cn(COLOR_TEXT_DIM, TYPO_EVIDENCE_TITLE)}>#{slot + 1} Driver</div>
                    <div className={cn("mt-2", COLOR_TEXT_MUTED, TYPO_DRIVER_TITLE)}>Driver Unavailable</div>
                    <div className={cn("mt-2", COLOR_TEXT_DIM, TYPO_DRIVER_SUMMARY)}>No evidence for this rank.</div>
                  </article>
                )
              }
              return (
                <article key={`${driver.category}-${driver.title}`} className={cn("min-w-0 rounded-lg border p-3", driverDirectionPanelClass(driver.evidence.direction))}>
                  <div className="grid h-full grid-cols-[56px_minmax(0,1fr)_auto] gap-3">
                    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-[#f97316]/20 bg-[#f97316]/10 px-2 py-3", COLOR_ACCENT_AMBER)}>
                      <div className={cn(COLOR_ACCENT_AMBER, TYPO_BADGE)}>Rank</div>
                      <div className={cn("mt-1", TYPO_DRIVER_RANK)}>#{slot + 1}</div>
                    </div>
                    <div className="min-w-0 self-center">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded border border-[#38bdf8]/20 bg-[#38bdf8]/10 px-1.5 py-0.5", COLOR_ACCENT_CYAN, TYPO_BADGE)}>
                          {driverCategoryLabel(driver.category)}
                        </span>
                        <span className={cn(
                          "rounded border px-1.5 py-0.5",
                          TYPO_BADGE,
                          driverDirectionBadgeClass(driver.evidence.direction),
                        )}>
                          {driver.evidence.direction}
                        </span>
                      </div>
                      <div className={cn("mt-2 line-clamp-1", COLOR_TEXT_PRIMARY, TYPO_DRIVER_TITLE)}>{driver.title}</div>
                      <div className={cn("mt-2 line-clamp-2", COLOR_TEXT_MUTED, TYPO_DRIVER_SUMMARY)}>
                        {driver.evidence.summary}
                      </div>
                    </div>
                    <div className={cn("flex min-w-[72px] flex-col items-end justify-center border-l pl-3 text-right", COLOR_BORDER_MUTED)}>
                      <div className={cn(COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>Impact</div>
                      <div className={cn("mt-1", TYPO_DRIVER_SCORE, driverDirectionClass(driver.evidence.direction))}>
                        {driver.impactScore.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          {extraDriverCount > 0 ? (
            <div className={cn("rounded-lg border px-3 py-2 text-center", COLOR_BORDER_MUTED, COLOR_SURFACE_LEVEL4, COLOR_TEXT_MUTED, TYPO_BADGE)}>
              + {extraDriverCount} More Drivers
            </div>
          ) : null}
        </div>
      ) : (
        <div className={cn(DASHBOARD_INNER_PANEL, "p-5 text-center", COLOR_TEXT_MUTED, TYPO_SECTION_TITLE)}>No Ranked Drivers Available</div>
      )}
    </Card>
  )
}

function SupportingEvidence({
  data,
  state,
  reserve,
  reserveState,
  reserveReason,
}: {
  data: MarketDriverSummary | null
  state: MarketDriverLoadState
  reserve: ReserveIntelligenceResponse | null
  reserveState: ReserveIntelligenceLoadState
  reserveReason: string | null
}) {
  const driverByCategory = (category: MarketDriverCategory) => data?.drivers.find((driver) => driver.category === category)
  const reserveEvidence = reserve?.status === "available" ? reserve.observations?.[0] : null
  const staleCategories = new Set(data?.staleCategories ?? [])
  const missingCategories = new Set(data?.missingCategories ?? [])
  const makeDriverEvidence = (label: string, category: MarketDriverCategory) => {
    const driver = driverByCategory(category)
    const stale = staleCategories.has(category)
    const missing = missingCategories.has(category)
    const health = state === "loading"
      ? "LOADING"
      : stale
        ? "STALE"
        : driver
          ? driver.quality.toUpperCase()
          : missing
            ? "MISSING"
            : "UNAVAILABLE"

    return {
      id: category,
      label,
      health,
      observation: driver?.evidence.summary ?? (state === "loading" ? "Loading evidence." : `${label} evidence unavailable.`),
      source: driver?.evidence.source ?? (missing ? "missing category" : "market-driver"),
    }
  }
  const reserveHealth = reserveState === "loading"
    ? "LOADING"
    : reserveEvidence
      ? reserveEvidence.quality.toUpperCase()
      : reserveState === "empty"
        ? "MISSING"
        : "UNAVAILABLE"
  const evidenceCards = [
    makeDriverEvidence("ETF", "etf"),
    {
      id: "reserve",
      label: "Reserve",
      health: reserveHealth,
      observation: reserveEvidence
        ? reserveObservationSummary(reserveEvidence)
        : reserveState === "loading"
          ? "Loading Reserve Intelligence."
          : reserveReason ?? reserve?.reason ?? "Reserve Intelligence unavailable.",
      source: reserve?.source ?? "reserve-intelligence-v1",
    },
    makeDriverEvidence("Treasury", "treasury"),
    makeDriverEvidence("Open Interest", "open_interest"),
    makeDriverEvidence("Liquidation", "liquidation"),
    makeDriverEvidence("Exchange Flow", "exchange_flow"),
    makeDriverEvidence("Funding", "funding"),
  ]

  return (
    <Card title="Evidence Preview" icon={<Target className="h-3.5 w-3.5" />} level="level2">
      <div className={cn(COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>
        Status-ranked observations. Valid evidence is visually separated from partial and missing sources.
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_repeat(4,minmax(0,0.8fr))]">
        {evidenceCards.map((card, index) => {
          const priority = evidencePriority(card.health)
          return (
            <article
              key={card.id}
              className={cn(
                "min-w-0 rounded-lg border p-3",
                evidencePriorityClass(priority),
                index < 3 ? "xl:min-h-[148px]" : "xl:min-h-[132px]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={cn("truncate", COLOR_ACCENT_CYAN, TYPO_EVIDENCE_TITLE)}>{card.label}</div>
                  <div className={cn(
                    "mt-1",
                    TYPO_EVIDENCE_METADATA,
                    priority === "high" && COLOR_STATE_POSITIVE,
                    priority === "medium" && COLOR_STATE_NEUTRAL,
                    priority === "low" && COLOR_TEXT_DIM,
                  )}>
                    {evidencePriorityLabel(priority)}
                  </div>
                </div>
                <div className={cn(
                  "shrink-0 rounded border px-1.5 py-0.5",
                  TYPO_BADGE,
                  healthBadgeClass(card.health),
                )}>{card.health}</div>
              </div>
              <div className={cn(
                "mt-3 line-clamp-2 min-h-[34px]",
                TYPO_EVIDENCE_BODY,
                priority === "low" ? COLOR_TEXT_MUTED : COLOR_TEXT_PRIMARY,
              )}>
                {card.observation}
              </div>
              <div className={cn("mt-3 flex items-center justify-between gap-2 border-t pt-2", COLOR_BORDER_MUTED)}>
                <div className={cn("truncate", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>{card.source}</div>
                <div className={cn(
                  "h-1.5 w-10 rounded-full",
                  priority === "high" && "bg-[#22c55e]/70",
                  priority === "medium" && "bg-[#facc15]/65",
                  priority === "low" && "bg-[#71717a]",
                )} />
              </div>
            </article>
          )
        })}
      </div>
    </Card>
  )
}


function BottomCard({
  title,
  icon,
  children,
  level = "level4",
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  level?: DashboardPanelLevel
}) {
  return (
    <Card title={title} icon={icon} level={level} className="min-h-[92px]">
      {children}
    </Card>
  )
}

function formatUpdatedTime(value?: string) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

function formatMarketVolume(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO VOLUME"
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function formatProbability(value: number) {
  if (value > 0 && value < 1) return "<1%"
  return `${Math.round(value)}%`
}

function marketAttentionValue(event: NonNullable<PredictionMarketsResponse["marketEvents"]>[number]) {
  if (event.volume !== null && event.volume !== undefined) return { value: formatMarketVolume(event.volume), label: "Volume" }
  if (event.liquidity !== null && event.liquidity !== undefined) return { value: formatMarketVolume(event.liquidity), label: "Liquidity" }
  return { value: `${Math.round(event.probability)}%`, label: "Probability" }
}

function isRelevantPredictionMarket(title: string) {
  const normalized = title.toLowerCase()
  const allowed = [
    "crypto",
    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "etf",
    "fed",
    "rate",
    "rates",
    "recession",
    "macro",
    "inflation",
    "risk",
  ]
  const blocked = [
    "win",
    "champion",
    "league",
    "nba",
    "nfl",
    "soccer",
    "football",
    "tennis",
    "ufc",
    "gaming",
    "celebrity",
    "movie",
    "album",
    "netherlands",
    "election",
    "president",
  ]
  const hasAllowedTerm = allowed.some((term) => normalized.includes(term))
  const hasBlockedTerm = blocked.some((term) => normalized.includes(term))
  const isMacroException = ["fed", "rate", "rates", "recession", "inflation"].some((term) => normalized.includes(term))

  return hasAllowedTerm && (!hasBlockedTerm || isMacroException)
}

function PredictionMarketsCard({ data }: { data: PredictionMarketsResponse | null }) {
  const events = data?.marketEvents?.filter((event) => isRelevantPredictionMarket(event.title)).slice(0, 3) ?? []

  return (
    <BottomCard title="Prediction Markets" icon={<Gauge className="h-3.5 w-3.5" />} level="level3">
      {events.length ? (
        <div className="grid gap-1.5">
          <div className={cn(COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>
            What is the market pricing?
          </div>
          {events.map((event) => (
            <div key={event.title} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded border px-2.5 py-1.5", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP)}>
              <div className="min-w-0">
                <div className={cn("line-clamp-1", COLOR_TEXT_SECONDARY, TYPO_DRIVER_SUMMARY)}>{event.title}</div>
                <div className={cn(COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>{formatProbability(event.probability)} · {formatUpdatedTime(event.lastUpdated) ?? event.venue}</div>
              </div>
              <div className="text-right">
                <div className={cn(COLOR_ACCENT_CYAN, TYPO_ANALYTICS_VALUE)}>{marketAttentionValue(event).value}</div>
                <div className={cn(COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>{marketAttentionValue(event).label}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={cn("rounded border px-3 py-2", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_BADGE)}>{data?.unavailableReason ?? "NO MEANINGFUL MARKET INTEREST"}</div>
      )}
    </BottomCard>
  )
}

function formatFlow(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(Math.abs(value) >= 100 ? 0 : 1)}M`
}

function EtfFlowCard({ data }: { data: EtfFlowResponse | null }) {
  const flows = data?.flows ?? []
  const btc = flows.find((flow) => flow.asset === "BTC")
  const eth = flows.find((flow) => flow.asset === "ETH")
  const rows = [btc, eth].filter((flow): flow is NonNullable<typeof flow> => Boolean(flow))
  const reason = data?.staleReason ?? data?.unavailableReason ?? "NO DATA"

  return (
    <BottomCard title="ETF Flow" icon={<TrendingUp className="h-3.5 w-3.5" />}>
      {rows.length && !data?.isStale ? (
        <div className="grid gap-1">
          {rows.map((flow) => (
            <div key={flow.asset} className="flex items-end justify-between gap-2">
              <div>
                <div className={cn(COLOR_TEXT_MUTED, TYPO_ANALYTICS_TITLE)}>{flow.asset} ETF</div>
                <div className={cn(COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>{flow.asset} ETF Latest: {flow.sourceDate ?? flow.latestDate}</div>
                {flow.trend1d && <div className={cn(COLOR_TEXT_SECONDARY, TYPO_EVIDENCE_METADATA)}>Momentum: {flow.trend1d === "UP" ? "Strengthening" : flow.trend1d === "DOWN" ? "Weakening" : "Stable"}</div>}
              </div>
              <div className={cn(TYPO_ANALYTICS_VALUE, flow.netFlow >= 0 ? COLOR_STATE_POSITIVE : COLOR_STATE_NEGATIVE)}>{formatFlow(flow.netFlow)}</div>
            </div>
          ))}
          <div className={cn("mt-1", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>Source: Farside</div>
        </div>
      ) : (
        <div>
          <div className={cn("rounded border px-3 py-2", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_BADGE)}>NO DATA</div>
          <div className={cn("mt-1", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>{reason}</div>
          <div className={cn("mt-1", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>Source: Farside</div>
        </div>
      )}
    </BottomCard>
  )
}

function liquidityCondition(futures: FuturesIntelligenceResponse | null) {
  const sectors = futures?.sectors ?? []
  if (!sectors.length) return null
  const averagePressure = sectors.reduce((total, sector) => total + (sector.leveragePressure ?? 0), 0) / sectors.length
  const overheated = sectors.some((sector) => sector.leverageState === "OVERHEATED" || sector.leverageState === "CROWDED")
  if (overheated || averagePressure >= 70) return { label: "Liquidity Weakening", reason: "Aggressive leverage increasing", tone: COLOR_STATE_NEGATIVE }
  if (averagePressure <= 35) return { label: "Liquidity Improving", reason: "Positioning pressure low", tone: COLOR_STATE_POSITIVE }
  return { label: "Liquidity Stable", reason: "No major liquidity changes", tone: COLOR_STATE_NEUTRAL }
}

function LiquidityConditionsCard({ futures }: { futures: FuturesIntelligenceResponse | null }) {
  const condition = liquidityCondition(futures)

  return (
    <BottomCard title="Liquidity Conditions" icon={<Droplets className="h-3.5 w-3.5" />}>
      {condition ? (
        <>
          <div className={cn("uppercase", TYPO_ANALYTICS_VALUE, condition.tone)}>{condition.label}</div>
          <div className={cn("mt-2", COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>{condition.reason}</div>
          <div className={cn("mt-1", COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>Binance Futures</div>
        </>
      ) : (
        <div className={cn("rounded border px-3 py-2", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_BADGE)}>Unavailable</div>
      )}
    </BottomCard>
  )
}

export default function DashboardV1({
  symbol,
  liquidationCount,
}: {
  symbol: string
  marketMode: string
  price?: number
  tradeCount: number
  liquidationCount: number
}) {
  const activeSymbol = useMemo(() => normalizeDashboardSymbol(symbol), [symbol])
  const cachedDashboard = useMemo(() => loadDashboardCache(activeSymbol), [activeSymbol])
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | null>(cachedDashboard?.cachedAt ?? null)
  const [marketMovers, setMarketMovers] = useState<MarketMoversResponse | null>(cachedDashboard?.marketMovers ?? null)
  const [narratives, setNarratives] = useState<NarrativesResponse | null>(cachedDashboard?.narratives ?? null)
  const [narrativeLoadState, setNarrativeLoadState] = useState<NarrativeLoadState>(
    cachedDashboard?.narratives?.heatmap?.length ? "ready" : "loading"
  )
  const [narrativeUnavailableReason, setNarrativeUnavailableReason] = useState<string | null>(null)
  const [macro, setMacro] = useState<MacroResponse | null>(cachedDashboard?.macro ?? null)
  const [predictionMarkets, setPredictionMarkets] = useState<PredictionMarketsResponse | null>(cachedDashboard?.predictionMarkets ?? null)
  const [etfFlow, setEtfFlow] = useState<EtfFlowResponse | null>(cachedDashboard?.etfFlow ?? null)
  const [sectorRotation, setSectorRotation] = useState<SectorRotationResponse | null>(cachedDashboard?.sectorRotation ?? null)
  const [futures, setFutures] = useState<FuturesIntelligenceResponse | null>(cachedDashboard?.futures ?? null)
  const [historicalEvidence, setHistoricalEvidence] = useState<HistoricalEvidenceResponse | null>(null)
  const [historicalEvidenceLoading, setHistoricalEvidenceLoading] = useState(true)
  const [marketDrivers, setMarketDrivers] = useState<MarketDriverSummary | null>(null)
  const [marketDriverLoadState, setMarketDriverLoadState] = useState<MarketDriverLoadState>("loading")
  const [marketDriverUnavailableReason, setMarketDriverUnavailableReason] = useState<string | null>(null)
  const [reserveIntelligence, setReserveIntelligence] = useState<ReserveIntelligenceResponse | null>(null)
  const [reserveIntelligenceLoadState, setReserveIntelligenceLoadState] = useState<ReserveIntelligenceLoadState>("loading")
  const [reserveIntelligenceUnavailableReason, setReserveIntelligenceUnavailableReason] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controllers: AbortController[] = []
    let deferredTimer: ReturnType<typeof setTimeout> | null = null
    const nextCache: DashboardCache = {
      cachedAt: new Date().toISOString(),
      symbol: activeSymbol,
      marketMovers: cachedDashboard?.marketMovers ?? null,
      narratives: cachedDashboard?.narratives ?? null,
      macro: cachedDashboard?.macro ?? null,
      predictionMarkets: cachedDashboard?.predictionMarkets ?? null,
      etfFlow: cachedDashboard?.etfFlow ?? null,
      sectorRotation: cachedDashboard?.sectorRotation ?? null,
      futures: cachedDashboard?.futures ?? null,
    }

    function commitCache() {
      nextCache.cachedAt = new Date().toISOString()
      saveDashboardCache(nextCache)
      if (active) setCacheUpdatedAt(nextCache.cachedAt)
    }

    async function loadJson<T>(path: string, onValue: (value: T) => void, cacheKey: keyof Omit<DashboardCache, "cachedAt" | "symbol">) {
      const controller = new AbortController()
      controllers.push(controller)
      const timeout = setTimeout(() => controller.abort(), 4500)
      try {
        const response = await fetch(path, { cache: "no-store", signal: controller.signal })
        if (!active || !response.ok) return
        const value = await response.json() as T
        if (!active) return
        onValue(value)
        ;(nextCache[cacheKey] as T | null) = value
        commitCache()
      } catch {
        // Keep cached or existing state visible.
      } finally {
        clearTimeout(timeout)
      }
    }

    async function loadDashboardData() {
      void loadJson<MarketMoversResponse>(`/api/market/movers?focus=${encodeURIComponent(activeSymbol)}`, setMarketMovers, "marketMovers")
      void loadJson<PredictionMarketsResponse>("/api/prediction-markets", setPredictionMarkets, "predictionMarkets")
      void loadJson<FuturesIntelligenceResponse>("/api/market/futures-intelligence", setFutures, "futures")
      deferredTimer = setTimeout(() => {
        if (!active) return
        void loadJson<MacroResponse>("/api/macro", setMacro, "macro")
        void loadJson<EtfFlowResponse>("/api/etf-flow", setEtfFlow, "etfFlow")
        void loadJson<SectorRotationResponse>("/api/market/sector-rotation", setSectorRotation, "sectorRotation")
      }, 2500)
    }

    void loadDashboardData()

    return () => {
      active = false
      if (deferredTimer) clearTimeout(deferredTimer)
      controllers.forEach((controller) => controller.abort())
    }
  }, [activeSymbol, cachedDashboard])

  useEffect(() => {
    let active = true
    let timedOut = false
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 12000)

    setNarrativeLoadState(narratives?.heatmap?.length ? "ready" : "loading")
    setNarrativeUnavailableReason(null)

    void fetch("/api/narratives?range=24h", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Narrative request failed (${response.status})`)
        return response.json() as Promise<NarrativesResponse>
      })
      .then((value) => {
        if (!active || controller.signal.aborted) return
        const heatmap = Array.isArray(value.heatmap) ? value.heatmap : []
        const normalized = { ...value, heatmap }
        setNarratives(normalized)
        setNarrativeLoadState(heatmap.length > 0 ? "ready" : "empty")
      })
      .catch((error: unknown) => {
        if (!active) return
        setNarrativeLoadState("unavailable")
        setNarrativeUnavailableReason(
          timedOut
            ? "Narrative request timed out."
            : error instanceof Error
              ? error.message
              : "Narrative request failed."
        )
      })
      .finally(() => {
        clearTimeout(timeout)
      })

    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [activeSymbol])

  useEffect(() => {
    let active = true
    let timedOut = false
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 8000)

    setMarketDrivers(null)
    setMarketDriverLoadState("loading")
    setMarketDriverUnavailableReason(null)

    void fetch(`/api/market-drivers?symbol=${encodeURIComponent(activeSymbol)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json() as MarketDriverResponse
        if (!response.ok || value.ok !== true) {
          throw new Error(value.reason ?? `Market Driver request failed (${response.status})`)
        }
        return value
      })
      .then((value) => {
        if (!active || controller.signal.aborted) return
        const summary = value.summary ?? null
        setMarketDrivers(summary)
        setMarketDriverLoadState(summary?.drivers.length ? "ready" : "empty")
      })
      .catch((error: unknown) => {
        if (!active) return
        setMarketDriverLoadState("unavailable")
        setMarketDriverUnavailableReason(
          timedOut
            ? "Market Driver request timed out."
            : error instanceof Error
              ? error.message
              : "Market Driver evidence unavailable.",
        )
      })
      .finally(() => clearTimeout(timeout))

    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [activeSymbol])

  useEffect(() => {
    let active = true
    let timedOut = false
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 4500)

    setReserveIntelligence(null)
    setReserveIntelligenceLoadState("loading")
    setReserveIntelligenceUnavailableReason(null)

    void fetch(`/api/dashboard/reserve-intelligence?symbol=${encodeURIComponent(activeSymbol)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json() as ReserveIntelligenceResponse
        if (!response.ok || value.ok === false) {
          throw new Error(value.reason ?? `Reserve Intelligence request failed (${response.status})`)
        }
        return value
      })
      .then((value) => {
        if (!active || controller.signal.aborted) return
        setReserveIntelligence(value)
        const count = value.observations?.length ?? 0
        setReserveIntelligenceLoadState(value.status === "available" && count > 0 ? "ready" : "empty")
      })
      .catch((error: unknown) => {
        if (!active) return
        setReserveIntelligenceLoadState("unavailable")
        setReserveIntelligenceUnavailableReason(
          timedOut
            ? "Reserve Intelligence request timed out."
            : error instanceof Error
              ? error.message
              : "Reserve Intelligence unavailable.",
        )
      })
      .finally(() => clearTimeout(timeout))

    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [activeSymbol])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    setHistoricalEvidence(null)
    setHistoricalEvidenceLoading(true)

    void fetch(`/api/historical-analog?symbol=${encodeURIComponent(activeSymbol)}&interval=1h`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() as Promise<HistoricalEvidenceResponse> : null)
      .then((value) => {
        if (active && !controller.signal.aborted) setHistoricalEvidence(value)
      })
      .catch(() => {
        // Historical evidence is optional and must never block Dashboard.
      })
      .finally(() => {
        clearTimeout(timeout)
        if (active) setHistoricalEvidenceLoading(false)
      })

    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [activeSymbol])

  const moverCandidates = useMemo(() => {
    const focus = marketMovers?.focusCandidate ? [marketMovers.focusCandidate] : []
    const candidates = marketMovers?.candidates ?? []
    const merged = [...focus, ...candidates]
    const seen = new Set<string>()

    return merged.filter((candidate) => {
      const key = `${candidate.symbol}-${candidate.setup}-${candidate.score}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [marketMovers])

  const alerts = useMemo(() => {
    const mapped = moverCandidates.slice(0, 4).map((candidate) => mapCandidateToAlert(candidate, marketMovers?.updatedAt))
    return mapped
  }, [marketMovers?.updatedAt, moverCandidates])

  const topMover = moverCandidates[0]
  const marketDirection = marketStateFromScore(topMover)
  const causes = useMemo(() => buildCauses(topMover, macro, narratives, sectorRotation, futures), [topMover, macro, narratives, sectorRotation, futures])
  const narrativeItems = useMemo(() => buildNarrativeHeat(narratives), [narratives])
  const informationItems = useMemo(() => buildInformationFlow(macro, narratives), [macro, narratives])
  return (
    <main className={cn("min-h-screen px-3 py-3 lg:px-4", COLOR_BACKGROUND_BASE, COLOR_TEXT_PRIMARY)}>
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <section className="grid min-w-0 gap-3">
          <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2", COLOR_BORDER_MUTED, COLOR_SURFACE_LEVEL4)}>
            <div>
              <div className={cn(COLOR_ACCENT_AMBER, TYPO_SECTION_TITLE)}>Conclusion → Drivers → Evidence</div>
              <div className={cn("mt-1", COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>
                First-read market intelligence with deeper analytics kept below.
              </div>
            </div>
            <div className={cn(COLOR_TEXT_DIM, TYPO_EVIDENCE_METADATA)}>
              Dashboard • fast summary surface
            </div>
          </div>
          <MarketDirectionPanel
            data={marketDrivers}
            state={marketDriverLoadState}
            reason={marketDriverUnavailableReason}
          />
          <WhyMarketMoving data={marketDrivers} state={marketDriverLoadState} />
          <SupportingEvidence
            data={marketDrivers}
            state={marketDriverLoadState}
            reserve={reserveIntelligence}
            reserveState={reserveIntelligenceLoadState}
            reserveReason={reserveIntelligenceUnavailableReason}
          />
          <HistoricalEvidenceStrip data={historicalEvidence} loading={historicalEvidenceLoading} />
        </section>

        <section className="grid min-w-0 gap-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)]">
            <PredictionMarketsCard data={predictionMarkets} />
            <TacticalAlerts alerts={alerts} />
          </div>

          <div className={cn("rounded-lg border px-3 py-2", COLOR_BORDER_MUTED, COLOR_SURFACE_LEVEL4)}>
            <div className={cn(COLOR_TEXT_SECONDARY, TYPO_ANALYTICS_TITLE)}>Analytics & Supporting Sections</div>
            <div className={cn("mt-1", COLOR_TEXT_MUTED, TYPO_EVIDENCE_METADATA)}>
              Deeper reading after the market conclusion, ranked drivers, and evidence preview.
            </div>
          </div>

          <WhyThisSignal mover={topMover} causes={causes} futures={futures} marketDirection={marketDirection} />

          <div className="grid gap-3 lg:grid-cols-4">
            <GuidanceCard mover={topMover} />
            <EtfFlowCard data={etfFlow} />
            <LiquidityConditionsCard futures={futures} />
            <BottomCard title="Narrative Heatmap" icon={<Database className="h-3.5 w-3.5" />}>
              {narrativeItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {narrativeItems.map((item) => (
                    <span key={item.label} className={cn("rounded border px-2 py-1", TYPO_BADGE, item.tone)}>
                      {item.icon} {item.label}
                      <span className={cn("ml-2", COLOR_TEXT_SECONDARY)}>{item.state}</span>
                      <span className={cn("ml-2", COLOR_TEXT_MUTED)}>{item.evidence}</span>
                    </span>
                  ))}
                </div>
              ) : narrativeLoadState === "loading" ? (
                <div className={cn("rounded border px-3 py-2", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_BADGE)}>LOADING NARRATIVE DATA</div>
              ) : narrativeLoadState === "unavailable" ? (
                <div className={cn("rounded border px-3 py-2", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_BADGE)}>
                  NARRATIVE DATA UNAVAILABLE
                  <span className={cn("ml-2", COLOR_TEXT_DIM)}>
                    Reason: {narrativeUnavailableReason ?? "Narrative request failed."}
                  </span>
                </div>
              ) : (
                <div className={cn("rounded border px-3 py-2", COLOR_BORDER_MUTED, COLOR_BACKGROUND_DEEP, COLOR_TEXT_MUTED, TYPO_BADGE)}>NO NARRATIVE DATA</div>
              )}
            </BottomCard>
          </div>

          <aside className="grid gap-3 xl:grid-cols-3 xl:content-start">
            <InformationFlow items={informationItems} />
            <TrendChangeRiskCard mover={topMover} causes={causes} />
            <SystemStatus liquidationCount={liquidationCount} alertCount={alerts.length} cacheUpdatedAt={cacheUpdatedAt} />
          </aside>
        </section>
      </div>
    </main>
  )
}
