import type { RotationDirection, SectorRotationSnapshot } from "@/core/marketDataTypes"

export type NarrativeTone = "RISK_ON" | "RISK_OFF" | "MIXED" | "COMPRESSION" | "EUPHORIA"

export type NarrativeCategory =
  | "REGIME"
  | "ROTATION"
  | "REGIONAL_DIVERGENCE"
  | "RISK"
  | "DATA_QUALITY"
  | "WATCHLIST"
  | "NEWS_FUSION"
  | "VALIDATION"

export interface NarrativeHeatItem {
  narrative: string
  heat: number
  direction: RotationDirection | "MIXED"
  sectors: string[]
  summary: string
}

export interface NarrativeStoryStep {
  id: string
  title: string
  detail: string
  category: NarrativeCategory
  intensity: number
}

export interface OperatorCommentary {
  title: string
  body: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}

export interface NarrativeCompressionItem {
  label: string
  rawEvents: number
  compressedInto: string
}


export interface NewsNarrativeSignal {
  narrative: string
  buzz: number
  sentiment: number
  regions: string[]
  count: number
  topHeadline?: string
}

export interface NarrativeValidationItem {
  narrative: string
  newsBuzz: number
  liquidityHeat: number
  validationScore: number
  status: "VALIDATED" | "NEWS_ONLY" | "FLOW_ONLY" | "WEAK"
  summary: string
}

export interface NewsFusionSurface {
  ok: boolean
  totalNews: number
  validatedCount: number
  signals: NewsNarrativeSignal[]
  validation: NarrativeValidationItem[]
  divergence: {
    status: "NONE" | "NEWS_WITHOUT_FLOW" | "FLOW_WITHOUT_NEWS" | "VALIDATED" | "MIXED"
    summary: string
    narratives: string[]
  }
  regionalBuzz: {
    region: string
    count: number
    topNarratives: string[]
  }[]
}


export type NarrativeLifecyclePhase = "DORMANT" | "IGNITION" | "EXPANSION" | "EUPHORIA" | "EXHAUSTION" | "COLLAPSE"

export interface NarrativePropagationNode {
  narrative: string
  phase: NarrativeLifecyclePhase
  velocity: number
  acceleration: number
  persistence: number
  synchronization: number
  stress: number
  regions: string[]
  sectors: string[]
  summary: string
}

export interface NarrativePropagationLink {
  from: string
  to: string
  strength: number
  reason: string
}

export interface NarrativePropagationSurface {
  ok: boolean
  leadNarrative: string
  leadPhase: NarrativeLifecyclePhase
  velocityScore: number
  stressScore: number
  lifecycleCounts: Record<NarrativeLifecyclePhase, number>
  nodes: NarrativePropagationNode[]
  links: NarrativePropagationLink[]
  operatorRead: string
}


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
}



export type CrossMarketReflexivityRegime =
  | "SELF_REINFORCING_EXPANSION"
  | "REFLEXIVE_OVERHEAT"
  | "DEFENSIVE_FEEDBACK"
  | "BETA_ROTATION"
  | "FRAGILE_FEEDBACK"
  | "NEUTRAL_PROPAGATION"

export interface CrossMarketNode {
  id: string
  label: string
  state: "LEADING" | "EXPANDING" | "STRESSED" | "WITHDRAWING" | "NEUTRAL"
  score: number
  risk: number
  role: string
  operatorRead: string
}

export interface CrossMarketDependency {
  from: string
  to: string
  strength: number
  type: "REINFORCING" | "LAGGING" | "STRESS" | "DIVERGENCE"
  read: string
}

export interface CrossMarketReflexivitySurface {
  ok: boolean
  regime: CrossMarketReflexivityRegime
  reflexivityScore: number
  instabilityScore: number
  betaRotationPath: string[]
  nodes: CrossMarketNode[]
  dependencies: CrossMarketDependency[]
  operatorRead: string
}

export interface NarrativeSurface {
  ok: boolean
  generatedAt: string
  regime: string
  tone: NarrativeTone
  marketSummary: string
  operatorCommentary: OperatorCommentary[]
  heatmap: NarrativeHeatItem[]
  storyTimeline: NarrativeStoryStep[]
  compression: NarrativeCompressionItem[]
  regionalDivergence: {
    status: "NONE" | "KOREA_STRONG" | "GLOBAL_STRONG" | "MIXED"
    summary: string
    sectors: string[]
  }
  sourceSectors: SectorRotationSnapshot[]
  newsFusion?: NewsFusionSurface
  propagation?: NarrativePropagationSurface
  liquidityStress?: LiquidityStressSurface
  crossMarketReflexivity?: CrossMarketReflexivitySurface
  notes: string[]
}
