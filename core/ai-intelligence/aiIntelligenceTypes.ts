import type { MarketStructureSectorSnapshot } from "@/core/market-structure/marketStructureTypes"

export type ForecastDirection = "ACCELERATE" | "CONTINUE" | "FADE" | "REVERSAL" | "NEUTRAL"
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type RegimeTransitionState = "RISK_ON" | "RISK_OFF" | "ALT_ROTATION" | "BTC_DOMINANCE" | "VOLATILITY_BREAKOUT" | "COMPRESSION"
export type OperatorPriority = "WATCH" | "ACTIONABLE" | "DEFENSIVE" | "IGNORE"

export interface NarrativeForecastSignal {
  sector: string
  narrative: string
  currentScore: number
  forecastScore: number
  probability: number
  direction: ForecastDirection
  horizon: "1H" | "4H" | "24H"
  drivers: string[]
  operatorRead: string
}

export interface LiquidityFractureSignal {
  sector: string
  fractureScore: number
  level: RiskLevel
  triggers: string[]
  operatorRead: string
}

export interface RegimeTransitionSignal {
  from: string
  to: RegimeTransitionState
  probability: number
  confidence: number
  evidence: string[]
  operatorRead: string
}

export interface OperatorCopilotBrief {
  title: string
  priority: OperatorPriority
  summary: string
  bullets: string[]
  watchlist: string[]
}

export interface AutonomousSignal {
  id: string
  rank: number
  type: "FORECAST" | "FRACTURE" | "REGIME" | "ANOMALY"
  label: string
  score: number
  priority: OperatorPriority
  read: string
}

export interface AIIntelligenceLayerSurface {
  ok: boolean
  source: "phase-36-40-ai-intelligence-layer"
  updatedAt: string
  mode: "derived" | "empty"
  forecast: NarrativeForecastSignal[]
  liquidityFractures: LiquidityFractureSignal[]
  regimeTransitions: RegimeTransitionSignal[]
  copilot: OperatorCopilotBrief
  autonomousSignals: AutonomousSignal[]
  inputs: {
    sectors: number
    topSector?: MarketStructureSectorSnapshot
  }
  notes: string[]
}
