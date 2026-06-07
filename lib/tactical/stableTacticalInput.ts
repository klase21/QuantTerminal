import type { TacticalOpportunityCandidate } from "./tacticalOpportunityRouter"
import type { TacticalVerdictInput } from "./tacticalVerdictEngine"

export type TacticalDataQuality = "FALLBACK" | "PARTIAL" | "LIVE"

export type TacticalMacroInput = {
  dxyChange: number
  us10yChange: number
  nasdaqChange: number
  btcDominanceChange: number
  stablecoinLiquidityScore: number
  cryptoBetaScore: number
}

export type TacticalFreshness = {
  ticker: boolean
  flow: boolean
  orderbook: boolean
  liquidation: boolean
  rotation: boolean
  macro: boolean
}

export type StableTacticalInputSnapshot = {
  input: TacticalVerdictInput
  macroInput: TacticalMacroInput
  opportunityCandidates?: TacticalOpportunityCandidate[]
  flowInput: {
    buyVolume: number
    sellVolume: number
    cvd: number
    orderbookImbalance: number
    spreadBps: number
    volatilityScore: number
  }
  dataQuality: TacticalDataQuality
  freshness: TacticalFreshness
  updatedAt: number
}

export const FALLBACK_TACTICAL_SNAPSHOT: StableTacticalInputSnapshot = {
  input: {
    trendScore: 62,
    momentumScore: 58,
    executionScore: 52,
    liquidityScore: 55,
    volatilityScore: 48,
    flowScore: 60,
    rotationScore: 64,
    liquidationPressure: 42,
    fundingPressure: 38,
    macroRiskScore: 46,
  },
  macroInput: {
    dxyChange: 0.08,
    us10yChange: 0.04,
    nasdaqChange: 0.42,
    btcDominanceChange: -0.18,
    stablecoinLiquidityScore: 58,
    cryptoBetaScore: 63,
  },
  opportunityCandidates: undefined,
  flowInput: {
    buyVolume: 0,
    sellVolume: 0,
    cvd: 0,
    orderbookImbalance: 0,
    spreadBps: 8,
    volatilityScore: 48,
  },
  dataQuality: "FALLBACK",
  freshness: {
    ticker: false,
    flow: false,
    orderbook: false,
    liquidation: false,
    rotation: false,
    macro: false,
  },
  updatedAt: 0,
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function finite(value: unknown, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function roundScore(value: number) {
  return Math.round(clamp(value))
}

export function sameTacticalSnapshot(a: StableTacticalInputSnapshot, b: StableTacticalInputSnapshot) {
  const ai = a.input
  const bi = b.input
  const am = a.macroInput
  const bm = b.macroInput

  return (
    a.dataQuality === b.dataQuality &&
    ai.trendScore === bi.trendScore &&
    ai.momentumScore === bi.momentumScore &&
    ai.executionScore === bi.executionScore &&
    ai.liquidityScore === bi.liquidityScore &&
    ai.volatilityScore === bi.volatilityScore &&
    ai.flowScore === bi.flowScore &&
    ai.rotationScore === bi.rotationScore &&
    ai.liquidationPressure === bi.liquidationPressure &&
    ai.fundingPressure === bi.fundingPressure &&
    ai.macroRiskScore === bi.macroRiskScore &&
    am.dxyChange === bm.dxyChange &&
    am.us10yChange === bm.us10yChange &&
    am.nasdaqChange === bm.nasdaqChange &&
    am.btcDominanceChange === bm.btcDominanceChange &&
    am.stablecoinLiquidityScore === bm.stablecoinLiquidityScore &&
    am.cryptoBetaScore === bm.cryptoBetaScore
  )
}
