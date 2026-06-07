import type { FuturesIntelligenceResponse, SectorFuturesSnapshot } from "@/core/futuresTypes"
import type { RealMarketRotationResponse, SectorRotationSnapshot } from "@/core/marketDataTypes"
import { clamp } from "@/core/shared/metrics"
import type { NarrativePropagationSurface } from "./narrativeTypes"

export type LiquidityStressRegime =
  | "HEALTHY_EXPANSION"
  | "SPECULATIVE_EXPANSION"
  | "LIQUIDITY_STRESS"
  | "DEFENSIVE_WITHDRAWAL"
  | "COMPRESSION"
  | "FRAGILE_ROTATION"
  | "MARKET_SCAN"

export interface LiquidityStressDriver {
  label: string
  value: number
  weight: number
  contribution: number
  direction: "SUPPORT" | "RISK" | "NEUTRAL"
}

export interface StressSectorRead {
  sector: string
  regime: LiquidityStressRegime
  stressScore: number
  liquidityQuality: number
  crowdingRisk: number
  withdrawalRisk: number
  operatorRead: string
  [key: string]: unknown
}

export interface LiquidityStressSurface {
  ok: boolean
  regime: LiquidityStressRegime
  stressScore: number
  liquidityQuality: number
  crowdingRisk: number
  withdrawalRisk: number
  spreadRiskProxy: number
  operatorRead: string
  drivers: LiquidityStressDriver[]
  sectors: StressSectorRead[]
  [key: string]: unknown
}

function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0
  const multiplier = 10 ** digits
  return Math.round(value * multiplier) / multiplier
}

function average(values: number[]) {
  const clean = values.filter(Number.isFinite)
  if (!clean.length) return 0
  return clean.reduce((sum, value) => sum + value, 0) / clean.length
}

function futuresBySector(futures?: FuturesIntelligenceResponse | null) {
  return new Map((futures?.sectors ?? []).map((sector) => [sector.sector, sector]))
}

function sectorStress(rotation: SectorRotationSnapshot, futures?: SectorFuturesSnapshot, propagationStress = 0): StressSectorRead {
  const narrowBreadth = clamp(100 - (rotation.breadth ?? 0))
  const leverage = futures?.crowdingScore ?? 0
  const fundingHeat = clamp((futures?.fundingAbs ?? 0) * 10000 * 12)
  const volatility = rotation.volatility ?? 0
  const outflowPressure = rotation.direction === "OUTFLOW" ? rotation.volumePressure : 0
  const liquidityQuality = clamp(
    rotation.breadth * 0.32 +
      rotation.confidence * 0.24 +
      Math.max(0, 100 - volatility) * 0.18 +
      Math.max(0, 100 - leverage) * 0.16 +
      rotation.regimeFit * 0.1
  )
  const crowdingRisk = clamp(
    leverage * 0.38 +
      fundingHeat * 0.2 +
      rotation.premiumBoost * 0.14 +
      propagationStress * 0.16 +
      Math.max(0, rotation.rotationScore - 70) * 0.12
  )
  const withdrawalRisk = clamp(
    outflowPressure * 0.34 +
      narrowBreadth * 0.22 +
      volatility * 0.2 +
      Math.max(0, 50 - rotation.avgPriceChange) * 0.1 +
      Math.max(0, 65 - liquidityQuality) * 0.14
  )
  const stressScore = clamp(crowdingRisk * 0.48 + withdrawalRisk * 0.38 + Math.max(0, 55 - liquidityQuality) * 0.14)

  const regime = inferSectorRegime({ rotation, stressScore, liquidityQuality, crowdingRisk, withdrawalRisk })
  return {
    sector: rotation.sector,
    regime,
    stressScore: round(stressScore),
    liquidityQuality: round(liquidityQuality),
    crowdingRisk: round(crowdingRisk),
    withdrawalRisk: round(withdrawalRisk),
    operatorRead: sectorOperatorRead(rotation.sector, regime, liquidityQuality, crowdingRisk, withdrawalRisk),
  }
}

function inferSectorRegime(input: {
  rotation: SectorRotationSnapshot
  stressScore: number
  liquidityQuality: number
  crowdingRisk: number
  withdrawalRisk: number
}): LiquidityStressRegime {
  const { rotation, stressScore, liquidityQuality, crowdingRisk, withdrawalRisk } = input
  if (withdrawalRisk >= 72 || rotation.direction === "OUTFLOW") return "DEFENSIVE_WITHDRAWAL"
  if (stressScore >= 75) return "LIQUIDITY_STRESS"
  if (crowdingRisk >= 70 && rotation.direction === "INFLOW") return "SPECULATIVE_EXPANSION"
  if (rotation.direction === "CHURN" || (rotation.volatility >= 65 && rotation.breadth < 52)) return "COMPRESSION"
  if (rotation.direction === "INFLOW" && liquidityQuality >= 64 && stressScore < 62) return "HEALTHY_EXPANSION"
  if (rotation.rotationScore >= 65 && liquidityQuality < 54) return "FRAGILE_ROTATION"
  return "MARKET_SCAN"
}

function sectorOperatorRead(sector: string, regime: LiquidityStressRegime, quality: number, crowding: number, withdrawal: number) {
  switch (regime) {
    case "HEALTHY_EXPANSION":
      return `${sector} flow is broad enough to support continuation; monitor for leverage overheating.`
    case "SPECULATIVE_EXPANSION":
      return `${sector} is expanding, but leverage/crowding risk is rising. Treat upside as tactical.`
    case "LIQUIDITY_STRESS":
      return `${sector} shows elevated stress; spreads/slippage risk may dominate headline momentum.`
    case "DEFENSIVE_WITHDRAWAL":
      return `${sector} is in withdrawal pressure. Avoid reading volume as clean inflow.`
    case "COMPRESSION":
      return `${sector} is rotating without clean confirmation. Wait for breadth or price follow-through.`
    case "FRAGILE_ROTATION":
      return `${sector} has rotation heat but weak quality (${round(quality, 0)}). Confirmation is incomplete.`
    default:
      return `${sector} remains below the stress/expansion threshold.`
  }
}

function inferGlobalRegime(input: {
  stressScore: number
  liquidityQuality: number
  crowdingRisk: number
  withdrawalRisk: number
  top?: SectorRotationSnapshot
}): LiquidityStressRegime {
  const { stressScore, liquidityQuality, crowdingRisk, withdrawalRisk, top } = input
  if (withdrawalRisk >= 70) return "DEFENSIVE_WITHDRAWAL"
  if (stressScore >= 72) return "LIQUIDITY_STRESS"
  if (crowdingRisk >= 68 && top?.direction === "INFLOW") return "SPECULATIVE_EXPANSION"
  if ((top?.direction === "CHURN") || (stressScore >= 48 && liquidityQuality < 58)) return "COMPRESSION"
  if (top?.direction === "INFLOW" && liquidityQuality >= 62 && stressScore < 60) return "HEALTHY_EXPANSION"
  if ((top?.rotationScore ?? 0) >= 65 && liquidityQuality < 55) return "FRAGILE_ROTATION"
  return "MARKET_SCAN"
}

function driver(label: string, value: number, weight: number, direction: LiquidityStressDriver["direction"]): LiquidityStressDriver {
  return {
    label,
    value: round(value),
    weight,
    contribution: round(value * weight),
    direction,
  }
}

function globalOperatorRead(regime: LiquidityStressRegime, stress: number, quality: number, crowding: number, withdrawal: number, top?: SectorRotationSnapshot) {
  const focus = top ? `${top.sector} leads the board` : "No sector has cleared leadership yet"
  switch (regime) {
    case "HEALTHY_EXPANSION":
      return `${focus}. Liquidity quality is supportive while stress remains contained.`
    case "SPECULATIVE_EXPANSION":
      return `${focus}, but crowding is building. Upside can continue, though liquidation risk is increasing.`
    case "LIQUIDITY_STRESS":
      return `${focus}. Stress is elevated; prioritize spread, funding, and breadth confirmation before promotion.`
    case "DEFENSIVE_WITHDRAWAL":
      return `${focus}. Withdrawal risk dominates; treat rotation signals as defensive until breadth recovers.`
    case "COMPRESSION":
      return `${focus}. Market is compressing; wait for a clean expansion or breakdown trigger.`
    case "FRAGILE_ROTATION":
      return `${focus}, but liquidity quality is weak. This is a watch signal, not a high-conviction expansion.`
    default:
      return `Market stress engine is scanning. Stress ${round(stress, 0)}, quality ${round(quality, 0)}, crowding ${round(crowding, 0)}, withdrawal ${round(withdrawal, 0)}.`
  }
}

export function buildLiquidityStressSurface(args: {
  rotation?: RealMarketRotationResponse | null
  futures?: FuturesIntelligenceResponse | null
  propagation?: NarrativePropagationSurface
}): LiquidityStressSurface {
  const sectors = args.rotation?.sectors ?? []
  const futuresMap = futuresBySector(args.futures)
  const propagationMap = new Map((args.propagation?.nodes ?? []).map((node) => [node.narrative, node.stress]))
  const sectorReads = sectors.slice(0, 8).map((sector) => sectorStress(sector, futuresMap.get(sector.sector), propagationMap.get(sector.sector) ?? 0))

  const top = sectors[0]
  const avgStress = average(sectorReads.map((sector) => sector.stressScore))
  const avgQuality = average(sectorReads.map((sector) => sector.liquidityQuality))
  const avgCrowding = average(sectorReads.map((sector) => sector.crowdingRisk))
  const avgWithdrawal = average(sectorReads.map((sector) => sector.withdrawalRisk))
  const propagationStress = args.propagation?.stressScore ?? 0
  const spreadRiskProxy = clamp(avgStress * 0.46 + avgWithdrawal * 0.22 + avgCrowding * 0.2 + propagationStress * 0.12)
  const stressScore = clamp(avgStress * 0.7 + propagationStress * 0.3)
  const regime = inferGlobalRegime({ stressScore, liquidityQuality: avgQuality, crowdingRisk: avgCrowding, withdrawalRisk: avgWithdrawal, top })

  const drivers = [
    driver("Liquidity Quality", avgQuality, 0.24, avgQuality >= 62 ? "SUPPORT" : "RISK"),
    driver("Crowding Risk", avgCrowding, 0.24, avgCrowding >= 62 ? "RISK" : "NEUTRAL"),
    driver("Withdrawal Risk", avgWithdrawal, 0.22, avgWithdrawal >= 58 ? "RISK" : "NEUTRAL"),
    driver("Propagation Stress", propagationStress, 0.18, propagationStress >= 62 ? "RISK" : "NEUTRAL"),
    driver("Spread Risk Proxy", spreadRiskProxy, 0.12, spreadRiskProxy >= 60 ? "RISK" : "NEUTRAL"),
  ]

  return {
    ok: sectors.length > 0,
    regime,
    stressScore: round(stressScore),
    liquidityQuality: round(avgQuality),
    crowdingRisk: round(avgCrowding),
    withdrawalRisk: round(avgWithdrawal),
    spreadRiskProxy: round(spreadRiskProxy),
    operatorRead: globalOperatorRead(regime, stressScore, avgQuality, avgCrowding, avgWithdrawal, top),
    drivers,
    sectors: sectorReads,
  }
}
