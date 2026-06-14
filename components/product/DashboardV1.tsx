"use client"

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
import type { DashboardHistoricalAnalogResponse, MarketStateDirection, PredictionBias } from "@/types/historical"

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
  total: number
}

type NarrativesResponse = {
  heatmap?: NarrativeHeatmapRow[]
  topNarratives?: string[]
  updatedAt?: number
}

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

type HistoricalAnalogState = DashboardHistoricalAnalogResponse | null

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
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
        : item.total >= 120
          ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
          : "border-zinc-700 bg-zinc-900/80 text-zinc-300",
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

function driverKey(cause: CauseTag): string | null {
  const text = cause.label.toLowerCase()
  if (text.includes("buying")) return "buying_pressure"
  if (text.includes("selling")) return "selling_pressure"
  if (text.includes("sector rotation")) return "sector_rotation"
  if (text.includes("leverage")) return "leverage_risk"
  if (text.includes("dollar strength")) return "dollar_strength"
  if (text.includes("dollar weakness")) return "dollar_weakness"
  if (text.includes("risk-off")) return "risk_off"
  if (text.includes("risk-on")) return "risk_on"
  if (text.includes("narrative")) return "narrative_heat"
  if (text.includes("etf")) return "etf_narrative"
  return null
}

function narrativeKey(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes("bitcoin") || normalized === "btc") return "bitcoin"
  if (normalized.includes("ethereum") || normalized === "eth") return "ethereum"
  if (normalized.includes("solana") || normalized === "sol") return "solana"
  if (normalized.includes("etf")) return "etf"
  if (normalized.includes("ai")) return "ai"
  if (normalized.includes("regulation")) return "regulation"
  if (normalized.includes("macro")) return "macro"
  return normalized.replace(/\s+/g, "_")
}

function snapshotDirection(mover?: MarketMoverCandidate) {
  return marketStateFromScore(mover).toLowerCase() as MarketStateDirection
}

function snapshotLiquidity(futures: FuturesIntelligenceResponse | null) {
  const condition = liquidityCondition(futures)
  if (!condition) return "unknown"
  if (condition.label.includes("Improving")) return "improving"
  if (condition.label.includes("Weakening")) return "weakening"
  return "stable"
}

function snapshotEtfFlow(etfFlow: EtfFlowResponse | null) {
  const flows = etfFlow?.flows ?? []
  if (!flows.length) return "unknown"
  const net = flows.reduce((total, flow) => total + flow.netFlow, 0)
  if (net > 0) return "positive"
  if (net < 0) return "negative"
  return "neutral"
}

function snapshotPredictionBias(predictionMarkets: PredictionMarketsResponse | null): PredictionBias {
  const events = predictionMarkets?.marketEvents?.filter((event) => isRelevantPredictionMarket(event.title)) ?? []
  if (!events.length) return "unknown"
  const average = events.reduce((total, event) => total + event.probability, 0) / events.length
  if (average >= 55) return "bullish"
  if (average <= 45) return "bearish"
  return "neutral"
}

function snapshotNarrativeHeat(items: NarrativeHeatItem[]) {
  const top = items[0]
  if (!top) return "unknown"
  if (top.state === "Very Hot") return "very_hot"
  if (top.state === "Hot") return "hot"
  if (top.state === "Neutral") return "neutral"
  return "quiet"
}

function snapshotSectorRotation(sectorRotation: SectorRotationResponse | null) {
  const sectors = sectorRotation?.sectors ?? []
  if (!sectors.length) return "unknown"
  const inflows = sectors.filter((sector) => sector.direction === "INFLOW").length
  const outflows = sectors.filter((sector) => sector.direction === "OUTFLOW").length
  if (inflows > outflows) return "improving"
  if (outflows > inflows) return "weakening"
  return "mixed"
}

function buildDashboardSnapshot({
  symbol,
  mover,
  causes,
  narratives,
  narrativeItems,
  etfFlow,
  predictionMarkets,
  sectorRotation,
  futures,
}: {
  symbol: string
  mover?: MarketMoverCandidate
  causes: CauseTag[]
  narratives: NarrativesResponse | null
  narrativeItems: NarrativeHeatItem[]
  etfFlow: EtfFlowResponse | null
  predictionMarkets: PredictionMarketsResponse | null
  sectorRotation: SectorRotationResponse | null
  futures: FuturesIntelligenceResponse | null
}) {
  const drivers = causes.map(driverKey).filter((item): item is string => Boolean(item))
  const narrativeValues = [
    ...(narratives?.topNarratives ?? []),
    ...narrativeItems.map((item) => item.label),
  ].map(narrativeKey)

  return {
    timestamp: new Date().toISOString(),
    symbol,
    direction: snapshotDirection(mover),
    confidence: calibratedConfidence(mover, causes),
    bullFactors: causes.filter((cause) => cause.tone === "positive").length,
    bearFactors: causes.filter((cause) => cause.tone === "negative").length,
    drivers: Array.from(new Set(drivers)),
    liquidityState: snapshotLiquidity(futures),
    narratives: Array.from(new Set(narrativeValues)).slice(0, 8),
    narrativeHeat: snapshotNarrativeHeat(narrativeItems),
    dominantNarrative: narrativeValues[0] ?? null,
    sectorRotationState: snapshotSectorRotation(sectorRotation),
    etfFlowState: snapshotEtfFlow(etfFlow),
    predictionState: snapshotPredictionBias(predictionMarkets),
  }
}

function biasClass(bias: Bias) {
  if (bias === "Bullish") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
  if (bias === "Bearish") return "border-rose-400/25 bg-rose-400/10 text-rose-200"
  return "border-zinc-700 bg-zinc-900/80 text-zinc-300"
}

function stateTone(state: Bias) {
  if (state === "Bullish") return "text-emerald-100"
  if (state === "Bearish") return "text-rose-100"
  return "text-zinc-100"
}

function Card({
  title,
  icon,
  children,
  className,
  right,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  right?: ReactNode
}) {
  return (
    <section className={cn("min-h-0 rounded-lg border border-zinc-800 bg-zinc-950/85 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
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
    ? "border-emerald-300/30 bg-emerald-400/10"
    : state === "Bearish"
      ? "border-rose-300/30 bg-rose-400/10"
      : "border-zinc-700 bg-zinc-900/80"

  return (
    <Card
      title="Market Brief"
      icon={<LineChart className="h-3.5 w-3.5" />}
      className="border-cyan-300/25 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,.16),transparent_34%),rgba(9,9,11,.92)] p-4"
    >
      <div className="grid gap-3 md:grid-cols-[1.2fr_.8fr] md:items-stretch">
        <div className="flex min-h-[156px] flex-col justify-center rounded-lg border border-cyan-300/15 bg-black/50 p-5">
          <div className={cn("font-black leading-none text-cyan-100", score === null ? "text-3xl" : "text-8xl")}>{score ?? "NO DATA"}</div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Confidence</div>
        </div>
        <div className={cn("flex min-h-[156px] flex-col justify-center rounded-lg border p-5 text-right", stateBorder)}>
          <div className="text-5xl leading-none">{stateIcon}</div>
          <div className={cn("mt-3 text-3xl font-black uppercase tracking-[0.08em]", stateTone(state))}>{state}</div>
          <div className="mt-2 truncate text-[11px] font-black uppercase tracking-[0.1em] text-zinc-400">{summary}</div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <div className="rounded border border-emerald-300/15 bg-black/35 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Bull Factors</div>
              <div className="text-xl font-black text-emerald-100">{bullFactors}</div>
            </div>
            <div className="rounded border border-rose-300/15 bg-black/35 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Bear Factors</div>
              <div className="text-xl font-black text-rose-100">{bearFactors}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function causeToneClass(tone: CauseTone) {
  if (tone === "positive") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
  if (tone === "negative") return "border-rose-400/25 bg-rose-400/10 text-rose-100"
  return "border-amber-400/25 bg-amber-400/10 text-amber-100"
}

function causeIcon(tone: CauseTone) {
  if (tone === "positive") return "\u{1F7E2}"
  if (tone === "negative") return "\u{1F534}"
  return "\u{1F7E1}"
}

function WhyCard({ causes }: { causes: CauseTag[] }) {
  const hasEnoughEvidence = causes.length >= 3

  return (
    <Card title="Market Drivers" icon={<Info className="h-3.5 w-3.5" />} className="bg-zinc-950/65 p-2.5">
      {!hasEnoughEvidence ? (
        <div className="rounded-md border border-zinc-900 bg-black/45 px-2 py-4 text-center text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">INSUFFICIENT LIVE EVIDENCE</div>
      ) : (
        <div className="grid gap-1.5">
          {causes.slice(0, 3).map((cause, index) => (
            <div key={cause.label} className={cn("rounded-md border px-2 py-2 text-[11px] font-black uppercase tracking-[0.08em]", causeToneClass(cause.tone))}>
              <div>
                <span className="mr-1.5 text-zinc-400">#{index + 1}</span>
                <span className="mr-1.5">{causeIcon(cause.tone)}</span>
                {cause.label}
              </div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400">{cause.explanation}</div>
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
    <Card title="Trend Change Risk" icon={<AlertTriangle className="h-3.5 w-3.5" />} className="bg-zinc-950/65 p-2.5">
      <div className="rounded-md border border-zinc-900 bg-black/45 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Risk Level</span>
          <span className={cn(
            "text-sm font-black uppercase",
            riskLevel === "HIGH" && "text-rose-100",
            riskLevel === "MEDIUM" && "text-amber-100",
            riskLevel === "LOW" && "text-emerald-100",
            riskLevel === "NO DATA" && "text-zinc-500",
          )}>
            {riskLevel}
          </span>
        </div>
        <div className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-white">{interpretation}</div>
        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">Reason: {reason}</div>
        {reversalDrivers.length > 0 && (
          <div className="mt-2 grid gap-1">
            {reversalDrivers.slice(0, 2).map((driver) => (
              <div key={`trend-${driver.label}`} className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                Watch: {driver.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function formatAnalogDate(value: string) {
  const timestamp = new Date(`${value}T00:00:00Z`).getTime()
  if (!Number.isFinite(timestamp)) return value
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

function formatSignedPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function pastResultLabel(direction?: string | null, currentDirection?: MarketStateDirection) {
  if (currentDirection === "neutral") return "MIXED"
  const normalized = direction?.toLowerCase() ?? ""
  if (normalized.includes("bullish")) return "BULLISH"
  if (normalized.includes("bearish")) return "BEARISH"
  return "MIXED"
}

function HistoricalAnalogCard({ analog }: { analog: HistoricalAnalogState }) {
  const match = analog?.status === "available" ? analog.match : null
  const currentDirection = analog?.currentDirection
  const stats = analog?.status === "available" && analog.stats
    ? {
      found: analog.similarCases ?? analog.stats.totalCases,
      avg7d: analog.stats.avgReturn7d,
      avg30d: analog.stats.avgReturn30d,
      successRate: analog.stats.successRate,
      dominantOutcome: analog.stats.dominantOutcome,
    }
    : match?.outcomeStats
      ? { ...match.outcomeStats, dominantOutcome: null }
      : undefined
  const pastResult = pastResultLabel(stats?.dominantOutcome ?? match?.outcomeSummary, currentDirection)

  return (
    <Card title="Historical Analog" icon={<History className="h-3.5 w-3.5" />} className="bg-zinc-950/65 p-2.5">
      {!match ? (
        <div className="rounded-md border border-zinc-900 bg-black/45 px-2 py-4 text-center text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
          {analog ? "NO VERIFIED MEMORY" : "VERIFYING HISTORY"}
        </div>
      ) : (
        <div className="grid gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Most Similar Market Setup</div>
            <div className="mt-1 text-lg font-black uppercase leading-tight text-white">{match.label}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{formatAnalogDate(match.date)}</div>
          </div>
          <div className="flex flex-wrap gap-1">
            {match.matchedConditions.slice(0, 3).map((condition) => (
              <span key={condition} className="rounded border border-cyan-300/15 bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100">
                {condition}
              </span>
            ))}
          </div>
          <div className="rounded border border-zinc-900 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Outcome</div>
            {stats ? (
              <div className="mt-2 grid grid-cols-3 gap-1">
                <div>
                  <div className="text-lg font-black text-white">{stats.found ?? "NO DATA"}</div>
                  <div className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">Matched Cases</div>
                </div>
                <div>
                  <div className="text-lg font-black uppercase text-white">{pastResult}</div>
                  <div className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">Past Result</div>
                </div>
                <div>
                  <div className="text-lg font-black text-white">{formatSignedPercent(stats.avg7d)}</div>
                  <div className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">Avg Return</div>
                </div>
              </div>
            ) : (
              <div className="mt-1 text-xs font-black uppercase text-white">{match.outcomeSummary}</div>
            )}
          </div>
          {(analog?.alternatives?.length ?? 0) > 0 && (
            <div className="grid gap-1">
              {analog?.alternatives?.slice(0, 2).map((item) => {
                return (
                  <div key={`${item.date}-${item.label}`} className="flex items-center justify-between gap-2 rounded border border-zinc-900 bg-black/35 px-2 py-1">
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-zinc-200">{item.label}</div>
                      <div className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{formatAnalogDate(item.date)}</div>
                    </div>
                    <div className="text-xs font-black text-cyan-100">{item.outcomeSummary}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function TopRowCard({ title, icon, primary, rows }: { title: string; icon: ReactNode; primary: string; rows: string[] }) {
  return (
    <Card title={title} icon={icon} className="bg-zinc-950/65 p-2.5">
      <div className="text-xl font-black uppercase text-white">{primary}</div>
      <div className="mt-2 grid gap-1.5">
        {rows.map((row) => (
          <div key={`${title}-${row}`} className="rounded-md border border-zinc-900 bg-black/45 px-2 py-1.5 text-[11px] font-black uppercase text-zinc-300">
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
    <Card title="Execution Guidance" icon={<ShieldAlert className="h-3.5 w-3.5" />} className="bg-zinc-950/65 p-2.5">
      <div className="grid gap-2">
        <div className="rounded-md border border-emerald-300/15 bg-emerald-400/10 px-2 py-1.5">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/70">DO</div>
          {(doItems.length ? doItems : ["NO DATA"]).map((item) => (
            <div key={`do-${item}`} className="mt-1 text-xs font-black uppercase text-emerald-100">{item}</div>
          ))}
        </div>
        <div className="rounded-md border border-rose-300/15 bg-rose-400/10 px-2 py-1.5">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-rose-100/70">AVOID</div>
          {(avoidItems.length ? avoidItems : ["NO DATA"]).map((item) => (
            <div key={`avoid-${item}`} className="mt-1 text-xs font-black uppercase text-rose-100">{item}</div>
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
  const scoreLabel = (score: number | null) => {
    if (score === null) return "NO SCORE"
    if (hasMeaningfulNumericScores) return String(score)
    if (score >= 80) return "HIGH PRIORITY"
    if (score >= 60) return "WATCHLIST"
    return "DEVELOPING"
  }

  return (
    <Card title="Tactical Alerts" icon={<Zap className="h-3.5 w-3.5" />} className="min-h-[168px]">
      {rankedAlerts.length === 0 ? (
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-6 text-center text-sm font-black uppercase tracking-[0.16em] text-zinc-500">NO LIVE ALERTS</div>
      ) : (
      <div className="grid gap-2 xl:grid-cols-4">
        {rankedAlerts.map((alert, index) => (
          <article key={`${alert.asset}-${alert.label}`} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="grid gap-2">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">#{index + 1}</div>
                <div className="mt-1 text-lg font-black text-white">{alert.asset}</div>
                {alert.context && <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{alert.context}</div>}
                <div className="mt-0.5 text-sm font-black text-zinc-300">{alert.label ?? "NO DATA"}</div>
                {alert.explanation && <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{alert.explanation}</div>}
                {timeAgo(alert.detectedAt) && (
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100">{timeAgo(alert.detectedAt)}</div>
                )}
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black uppercase", biasClass(alert.bias))}>{alert.bias}</span>
                <span className={cn("font-black leading-none text-cyan-100", hasMeaningfulNumericScores && alert.confidence !== null ? "text-4xl" : "text-sm")}>{scoreLabel(alert.confidence)}</span>
              </div>
              {alert.tags.length > 0 && <div className="flex flex-wrap gap-1">
                {alert.tags.map((tag) => (
                  <span key={`${alert.asset}-${tag}`} className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>}
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

function WhyThisSignal({ mover, causes, futures, analog, marketDirection }: { mover?: MarketMoverCandidate; causes: CauseTag[]; futures: FuturesIntelligenceResponse | null; analog: HistoricalAnalogState; marketDirection: Bias }) {
  const evidence = topEvidence(mover)
  const evidenceRead = signalEvidenceSummary(evidence, marketDirection)
  const action = actionFromCandidate(mover)
  const levels = priceContext(mover)
  const failure = invalidationFromContext(mover, levels)
  const note = consistencyNote(mover, causes, futures)
  const topAnalog = analog?.status === "available" ? analog.match : null

  if (!mover) {
    return (
      <Card title="Signal Evidence" icon={<Target className="h-3.5 w-3.5" />} className="min-h-[250px] border-cyan-300/20 bg-zinc-950/90 p-4">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-10 text-center text-sm font-black uppercase tracking-[0.16em] text-zinc-500">NO SIGNAL DATA</div>
      </Card>
    )
  }

  return (
    <Card title="Signal Evidence" icon={<Target className="h-3.5 w-3.5" />} className="min-h-[250px] border-cyan-300/20 bg-zinc-950/90 p-4">
      <div className="grid gap-2 lg:grid-cols-4">
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Evidence</div>
          <div className="mt-2 text-3xl font-black uppercase leading-none text-white">{evidenceRead.headline}</div>
          {evidenceRead.support && <div className="mt-2 text-sm font-black uppercase text-cyan-50/80">{evidenceRead.support}</div>}
          {(evidenceRead.note || note) && <div className="mt-3 rounded border border-amber-300/20 bg-amber-400/10 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100">{evidenceRead.note ?? note}</div>}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/50 p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">History</div>
          <div className="mt-2 text-3xl font-black uppercase leading-none text-white">{topAnalog?.label ?? "NO VERIFIED ANALOG"}</div>
          {topAnalog && <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">{formatAnalogDate(topAnalog.date)}</div>}
        </div>
        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/70">Invalidation</div>
          <div className="mt-2 text-4xl font-black leading-none text-white">{failure ?? "NO DATA"}</div>
        </div>
        <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">Action</div>
          <div className="mt-2 text-4xl font-black leading-none text-white">{action ?? "NO DATA"}</div>
          <div className="mt-3 grid gap-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-50/80">
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
    <Card title="Information Flow" icon={<Newspaper className="h-3.5 w-3.5" />}>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-zinc-900 bg-black/45 p-4 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-500">NO FLOW DATA</div>
        ) : items.map((item) => (
          <div key={`${item.time}-${item.event}`} className="grid grid-cols-[38px_1fr_auto] items-center gap-2 rounded-md border border-zinc-900 bg-black/45 p-2">
            <div className="text-[10px] font-black text-zinc-500">{item.time}</div>
            <div className="truncate text-xs font-black text-white">{item.event}</div>
            <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">{item.tag ?? ""}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SystemStatus({ liquidationCount, alertCount }: { liquidationCount: number; alertCount: number }) {
  return (
    <Card title="System Status" icon={<RadioTower className="h-3.5 w-3.5" />}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between rounded-md border border-zinc-900 bg-black/45 p-2 text-xs">
          <span className="flex items-center gap-2 text-zinc-300"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Market feed</span>
          <span className="font-black text-emerald-100">Live</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-zinc-900 bg-black/45 p-2 text-xs">
          <span className="flex items-center gap-2 text-zinc-300"><Activity className="h-3.5 w-3.5 text-cyan-300" /> Alerts</span>
          <span className="font-black text-cyan-100">{alertCount}</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-zinc-900 bg-black/45 p-2 text-xs">
          <span className="flex items-center gap-2 text-zinc-300"><AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Liquidations</span>
          <span className="font-black text-amber-100">{liquidationCount}</span>
        </div>
      </div>
    </Card>
  )
}

function BottomCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card title={title} icon={icon} className="min-h-[92px]">
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
    <BottomCard title="Prediction Markets" icon={<Gauge className="h-3.5 w-3.5" />}>
      {events.length ? (
        <div className="grid gap-1.5">
          {events.map((event) => (
            <div key={event.title} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded border border-zinc-900 bg-black/35 px-2 py-1.5">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.1em] text-white">{event.title}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{formatProbability(event.probability)} · {formatUpdatedTime(event.lastUpdated) ?? event.venue}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-cyan-100">{marketAttentionValue(event).value}</div>
                <div className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-500">{marketAttentionValue(event).label}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">{data?.unavailableReason ?? "NO MEANINGFUL MARKET INTEREST"}</div>
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
                <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">{flow.asset} ETF</div>
                <div className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{flow.asset} ETF Latest: {flow.sourceDate ?? flow.latestDate}</div>
                {flow.trend1d && <div className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400">Momentum: {flow.trend1d === "UP" ? "Strengthening" : flow.trend1d === "DOWN" ? "Weakening" : "Stable"}</div>}
              </div>
              <div className={cn("text-2xl font-black", flow.netFlow >= 0 ? "text-emerald-100" : "text-rose-100")}>{formatFlow(flow.netFlow)}</div>
            </div>
          ))}
          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">Source: Farside</div>
        </div>
      ) : (
        <div>
          <div className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">NO DATA</div>
          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">{reason}</div>
          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">Source: Farside</div>
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
  if (overheated || averagePressure >= 70) return { label: "Liquidity Weakening", reason: "Aggressive leverage increasing", tone: "text-rose-100" }
  if (averagePressure <= 35) return { label: "Liquidity Improving", reason: "Positioning pressure low", tone: "text-emerald-100" }
  return { label: "Liquidity Stable", reason: "No major liquidity changes", tone: "text-amber-100" }
}

function LiquidityConditionsCard({ futures }: { futures: FuturesIntelligenceResponse | null }) {
  const condition = liquidityCondition(futures)

  return (
    <BottomCard title="Liquidity Conditions" icon={<Droplets className="h-3.5 w-3.5" />}>
      {condition ? (
        <>
          <div className={cn("text-2xl font-black uppercase leading-none", condition.tone)}>{condition.label}</div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{condition.reason}</div>
          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">Binance Futures</div>
        </>
      ) : (
        <div className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">Unavailable</div>
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
  const [marketMovers, setMarketMovers] = useState<MarketMoversResponse | null>(null)
  const [narratives, setNarratives] = useState<NarrativesResponse | null>(null)
  const [macro, setMacro] = useState<MacroResponse | null>(null)
  const [predictionMarkets, setPredictionMarkets] = useState<PredictionMarketsResponse | null>(null)
  const [etfFlow, setEtfFlow] = useState<EtfFlowResponse | null>(null)
  const [sectorRotation, setSectorRotation] = useState<SectorRotationResponse | null>(null)
  const [futures, setFutures] = useState<FuturesIntelligenceResponse | null>(null)
  const [historicalAnalog, setHistoricalAnalog] = useState<HistoricalAnalogState>(null)

  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      const [moversResult, narrativesResult, macroResult, predictionResult, etfFlowResult, sectorRotationResult, futuresResult] = await Promise.allSettled([
        fetch(`/api/market/movers?focus=${encodeURIComponent(symbol)}`, { cache: "no-store" }),
        fetch("/api/narratives?range=24h", { cache: "no-store" }),
        fetch("/api/macro", { cache: "no-store" }),
        fetch("/api/prediction-markets", { cache: "no-store" }),
        fetch("/api/etf-flow", { cache: "no-store" }),
        fetch("/api/market/sector-rotation", { cache: "no-store" }),
        fetch("/api/market/futures-intelligence", { cache: "no-store" }),
      ])

      if (!active) return

      if (moversResult.status === "fulfilled" && moversResult.value.ok) {
        setMarketMovers(await moversResult.value.json())
      }

      if (narrativesResult.status === "fulfilled" && narrativesResult.value.ok) {
        setNarratives(await narrativesResult.value.json())
      }

      if (macroResult.status === "fulfilled" && macroResult.value.ok) {
        setMacro(await macroResult.value.json())
      }

      if (predictionResult.status === "fulfilled" && predictionResult.value.ok) {
        setPredictionMarkets(await predictionResult.value.json())
      }

      if (etfFlowResult.status === "fulfilled" && etfFlowResult.value.ok) {
        setEtfFlow(await etfFlowResult.value.json())
      }

      if (sectorRotationResult.status === "fulfilled" && sectorRotationResult.value.ok) {
        setSectorRotation(await sectorRotationResult.value.json())
      }

      if (futuresResult.status === "fulfilled" && futuresResult.value.ok) {
        setFutures(await futuresResult.value.json())
      }
    }

    void loadDashboardData()

    return () => {
      active = false
    }
  }, [symbol])

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
  const dashboardSnapshot = useMemo(() => buildDashboardSnapshot({
    symbol,
    mover: topMover,
    causes,
    narratives,
    narrativeItems,
    etfFlow,
    predictionMarkets,
    sectorRotation,
    futures,
  }), [symbol, topMover, causes, narratives, narrativeItems, etfFlow, predictionMarkets, sectorRotation, futures])

  useEffect(() => {
    let active = true

    async function loadHistoricalAnalog() {
      await fetch("/api/dashboard/snapshots", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(dashboardSnapshot),
      })

      const response = await fetch(`/api/dashboard/historical-analog?symbol=${encodeURIComponent(symbol)}&interval=1h`, { cache: "no-store" })
      if (!active || !response.ok) return
      setHistoricalAnalog(await response.json())
    }

    void loadHistoricalAnalog()

    return () => {
      active = false
    }
  }, [dashboardSnapshot, symbol])

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,.7fr)_minmax(0,.7fr)_minmax(0,.7fr)]">
            <MarketBrief
              mover={topMover}
              causes={causes}
            />
            <WhyCard causes={causes} />
            <HistoricalAnalogCard analog={historicalAnalog} />
            <GuidanceCard mover={topMover} />
          </div>

          <TacticalAlerts alerts={alerts} />
          <WhyThisSignal mover={topMover} causes={causes} futures={futures} analog={historicalAnalog} marketDirection={marketDirection} />

          <div className="grid gap-3 lg:grid-cols-4">
            <PredictionMarketsCard data={predictionMarkets} />
            <EtfFlowCard data={etfFlow} />
            <LiquidityConditionsCard futures={futures} />
            <BottomCard title="Narrative Heatmap" icon={<Database className="h-3.5 w-3.5" />}>
              {narrativeItems.length === 0 ? (
                <div className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">NO NARRATIVE DATA</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {narrativeItems.map((item) => (
                    <span key={item.label} className={cn("rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em]", item.tone)}>
                      {item.icon} {item.label}
                      <span className="ml-2 text-[10px] tracking-[0.08em] text-zinc-300">{item.state}</span>
                      <span className="ml-2 text-[10px] tracking-[0.08em] text-zinc-500">{item.evidence}</span>
                    </span>
                  ))}
                </div>
              )}
            </BottomCard>
          </div>
        </div>

        <aside className="grid gap-3 xl:content-start">
          <InformationFlow items={informationItems} />
          <TrendChangeRiskCard mover={topMover} causes={causes} />
          <SystemStatus liquidationCount={liquidationCount} alertCount={alerts.length} />
        </aside>
      </div>
    </main>
  )
}
