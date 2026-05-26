export type TacticalDirection = "LONG" | "SHORT" | "NEUTRAL"

export type TacticalSeverity = "LOW" | "MEDIUM" | "HIGH" | "EXTREME"

export interface TradeFlowSnapshot {
  buyVolume: number
  sellVolume: number
  delta: number
  cvd: number
  trades?: any[]
}

export interface PredictiveRotationSignal {
  from: string
  to: string
  probability: number
  confidence: number
  velocity: number
  acceleration: number
  reason: string
}

export interface NarrativeMomentumSignal {
  narrative: string
  velocity: number
  acceleration: number
  saturation: number
  exhaustionRisk: number
  phase: "EARLY" | "EXPANSION" | "SATURATION" | "EXHAUSTION"
}

export interface LiquidityZone {
  label: string
  side: "upside" | "downside" | "neutral"
  magnetScore: number
  sweepProbability: number
  note: string
}

export interface MarketPsychologyState {
  euphoria: number
  panic: number
  retailAggression: number
  smartMoneyDivergence: number
  read: string
}

export interface TacticalProbabilityResult {
  direction: TacticalDirection
  probability: number
  invalidation: string
  triggers: string[]
  blockers: string[]
}

export interface RealtimeConfidenceState {
  rawConfidence: number
  validationBoost: number
  contradictionPenalty: number
  decayPenalty: number
  finalConfidence: number
}

export interface ScenarioSimulation {
  scenario: string
  expectedImpact: string
  probabilityShift: number
}

export interface PredictiveIntelligenceState {
  primaryRotation: PredictiveRotationSignal
  narrative: NarrativeMomentumSignal
  liquidityZones: LiquidityZone[]
  psychology: MarketPsychologyState
  probability: TacticalProbabilityResult
  confidence: RealtimeConfidenceState
  summary: string
  scenarios: ScenarioSimulation[]
}
