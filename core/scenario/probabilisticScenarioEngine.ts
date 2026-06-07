export type ScenarioHorizon = "5m" | "15m" | "1h" | "4h"
export type ScenarioType = "CONTINUATION" | "SWEEP_REVERSAL" | "RISK_OFF" | "FAKE_BREAKOUT"

export interface ScenarioBranch {
  id: string
  type: ScenarioType
  title: string
  probability: number
  confidence: number
  horizon: ScenarioHorizon
  path: string[]
  trigger: string
  invalidation: string
  expectedBehavior: string
}

export interface ProbabilitySurface {
  continuation: number
  reversal: number
  fakeBreakout: number
  riskOff: number
  sweepRisk: number
}

export interface RiskCascade {
  id: string
  condition: string
  impact: string
  probabilityDelta: number
  severity: "LOW" | "MEDIUM" | "HIGH"
}

export interface ScenarioTimelinePoint {
  horizon: ScenarioHorizon
  dominantScenario: string
  probability: number
  note: string
}

export interface ProbabilisticScenarioState {
  branches: ScenarioBranch[]
  surface: ProbabilitySurface
  cascades: RiskCascade[]
  timeline: ScenarioTimelinePoint[]
  narrator: string
  confidenceCollapseRisk: number
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildProbabilisticScenarioState({
  rotationConfidence = 81,
  sellPressure = 62,
  buyPressure = 38,
  liquidityRisk = 72,
  contradictionPenalty = 14,
}: {
  rotationConfidence?: number
  sellPressure?: number
  buyPressure?: number
  liquidityRisk?: number
  contradictionPenalty?: number
} = {}): ProbabilisticScenarioState {
  const executionDrag = sellPressure > buyPressure ? sellPressure - buyPressure : 0

  const continuation = clamp(rotationConfidence * 0.55 + buyPressure * 0.25 - contradictionPenalty * 0.8)
  const sweepReversal = clamp(liquidityRisk * 0.5 + executionDrag * 0.6 + rotationConfidence * 0.18)
  const riskOff = clamp(executionDrag * 0.72 + contradictionPenalty * 1.4)
  const fakeBreakout = clamp(liquidityRisk * 0.38 + contradictionPenalty * 1.1 + rotationConfidence * 0.12)

  const branches = [
    {
      id: "rwa-continuation",
      type: "CONTINUATION",
      title: "RWA continuation after absorption",
      probability: continuation,
      confidence: 78,
      horizon: "15m",
      path: ["AI", "RWA", "BTC"],
      trigger: "Buy absorption + CVD recovery after pullback.",
      invalidation: "Sell pressure expands and RWA route confidence drops below 60.",
      expectedBehavior: "Temporary pullback, absorption, then continuation through RWA leadership.",
    },
    {
      id: "sweep-reversal",
      type: "SWEEP_REVERSAL",
      title: "Liquidity sweep then reversal",
      probability: sweepReversal,
      confidence: 74,
      horizon: "5m",
      path: ["Downside Sweep", "BTC", "RWA"],
      trigger: "Downside liquidity sweep followed by aggressive buy imbalance.",
      invalidation: "No absorption after sweep and tape remains sell-heavy.",
      expectedBehavior: "Fast stop sweep, volatility spike, then recovery if smart money validates.",
    },
    {
      id: "risk-off-cascade",
      type: "RISK_OFF",
      title: "Risk-off cascade into BTC/STABLE",
      probability: riskOff,
      confidence: 66,
      horizon: "1h",
      path: ["MEME", "L2", "BTC", "STABLE"],
      trigger: "BTC weakens while sell pressure expands across beta sectors.",
      invalidation: "RWA/AI reclaim inflow and CVD turns positive.",
      expectedBehavior: "Beta sectors fade first, then defensive migration into BTC and stable liquidity.",
    },
    {
      id: "fake-breakout",
      type: "FAKE_BREAKOUT",
      title: "Fake breakout above upside liquidity",
      probability: fakeBreakout,
      confidence: 61,
      horizon: "15m",
      path: ["Upside Liquidity", "AI", "RWA"],
      trigger: "Upside sweep without follow-through volume.",
      invalidation: "Breakout holds with rising spot confirmation.",
      expectedBehavior: "Liquidity grab above range, rejection, then rotation slows.",
    },
  ] satisfies ScenarioBranch[]

  const sortedBranches: ScenarioBranch[] = branches
    .slice()
    .sort((a, b) => b.probability - a.probability)

  const surface: ProbabilitySurface = {
    continuation,
    reversal: sweepReversal,
    fakeBreakout,
    riskOff,
    sweepRisk: liquidityRisk,
  }

  const cascades: RiskCascade[] = [
    {
      id: "btc-weakness",
      condition: "If BTC weakens further",
      impact: "MEME and L2 drawdown probability rises rapidly.",
      probabilityDelta: 18,
      severity: "HIGH",
    },
    {
      id: "cvd-recovery",
      condition: "If CVD recovers after sweep",
      impact: "Continuation probability improves for RWA route.",
      probabilityDelta: 14,
      severity: "MEDIUM",
    },
    {
      id: "funding-crowd",
      condition: "If funding overheats into breakout",
      impact: "Fake breakout probability rises.",
      probabilityDelta: 11,
      severity: "MEDIUM",
    },
  ]

  const timeline: ScenarioTimelinePoint[] = [
    {
      horizon: "5m",
      dominantScenario: "Liquidity sweep / tape test",
      probability: sweepReversal,
      note: "Short-term flow likely tests liquidity before clean direction.",
    },
    {
      horizon: "15m",
      dominantScenario: "RWA continuation path",
      probability: continuation,
      note: "Continuation is valid only after execution confirmation.",
    },
    {
      horizon: "1h",
      dominantScenario: "Rotation expansion or defensive migration",
      probability: Math.max(continuation, riskOff),
      note: "Regime depends on whether sell pressure fades.",
    },
    {
      horizon: "4h",
      dominantScenario: "Rotation structure persistence",
      probability: clamp(rotationConfidence * 0.82),
      note: "Higher timeframe remains constructive unless BTC weakness accelerates.",
    },
  ]

  const confidenceCollapseRisk = clamp(contradictionPenalty * 2.6 + executionDrag * 0.8)

  const top = sortedBranches[0]
  const narrator =
    `Most likely path: ${top.title}. Probability is ${top.probability}%, but liquidity sweep risk remains elevated. Co-Pilot prefers scenario tracking over immediate execution until flow confirms.`

  return {
    branches: sortedBranches,
    surface,
    cascades,
    timeline,
    narrator,
    confidenceCollapseRisk,
  }
}
