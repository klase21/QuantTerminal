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

export type NarrativeLifecyclePhase =
  | "DORMANT"
  | "IGNITION"
  | "EXPANSION"
  | "EUPHORIA"
  | "EXHAUSTION"
  | "COLLAPSE"

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
  id?: string
  label?: string
  sector?: string
  heat?: number
  confidence?: number
  [key: string]: unknown
}

export interface NarrativePropagationLink {
  from?: string
  to?: string
  reason?: string
  source?: string
  target?: string
  strength: number
  velocity?: number
  confidence?: number
  summary?: string
  [key: string]: unknown
}

export interface NarrativePropagationSurface {
  ok?: boolean
  leadNarrative?: string
  leadPhase: NarrativeLifecyclePhase | string
  velocityScore?: number
  accelerationScore?: number
  persistenceScore?: number
  synchronizationScore?: number
  stressScore?: number
  phaseDistribution?: Partial<Record<NarrativeLifecyclePhase, number>>
  summary?: string
  leadSectors?: string[]
  nodes?: NarrativePropagationNode[]
  links?: NarrativePropagationLink[]
  lagSectors?: string[]
  confidence?: number
  [key: string]: unknown
}

export type LiquidityStressRegime =
  | "NORMAL"
  | "COMPRESSION"
  | "STRESS"
  | "WITHDRAWAL"
  | "FRAGILE"
  | "DISLOCATION"
  | string

export interface LiquidityStressSector {
  sector: string
  stressScore: number
  withdrawalRisk?: number
  liquidityQuality?: number
  crowdingRisk?: number
  regime?: LiquidityStressRegime
  summary?: string
  [key: string]: unknown
}

export interface NarrativeLiquidityStressSurface {
  ok?: boolean
  stressScore?: number
  liquidityQuality?: number
  crowdingRisk?: number
  withdrawalRisk?: number
  regime?: LiquidityStressRegime
  sectors?: LiquidityStressSector[]
  summary?: string
  status?: string
  notes?: string[]
  [key: string]: unknown
}

export type LiquidityStressSurface = NarrativeLiquidityStressSurface

export interface NarrativeCrossMarketReflexivitySurface {
  reflexivityScore?: number
  instabilityScore?: number
  summary?: string
  status?: string
}

export type CrossMarketReflexivityRegime =
  | "STABLE"
  | "COUPLED"
  | "REFLEXIVE"
  | "FRAGILE"
  | "STRESSED"
  | "DISLOCATED"
  | "CONTAGION"
  | "DISLOCATION"
  | "MIXED"
  | "DEFENSIVE_FEEDBACK"
  | "REFLEXIVE_OVERHEAT"
  | "SELF_REINFORCING_EXPANSION"
  | "BETA_ROTATION"
  | string

export interface CrossMarketNode {
  id: string
  label: string
  score: number
  risk: number
  market?: string
  sector?: string
  narrative?: string
  heat?: number
  stress?: number
  reflexivity?: number
  influence?: number
  sensitivity?: number
  weight?: number
  liquidity?: number
  direction?: RotationDirection | "MIXED" | "CHURN" | "OUTFLOW" | string
  summary?: string
  [key: string]: unknown
}

export interface CrossMarketDependency {
  from?: string
  to?: string
  source?: string
  target?: string
  strength: number
  type?: string
  direction?: string
  reason?: string
  read?: string
  summary?: string
  lag?: number
  correlation?: number
  confidence?: number
  [key: string]: unknown
}

export interface CrossMarketReflexivitySurface extends NarrativeCrossMarketReflexivitySurface {
  ok?: boolean
  regime?: CrossMarketReflexivityRegime
  reflexivityScore?: number
  instabilityScore?: number
  contagionRisk?: number
  dependencyScore?: number
  stressScore?: number
  nodes?: CrossMarketNode[]
  dependencies?: CrossMarketDependency[]
  links?: CrossMarketDependency[]
  summary?: string
  status?: string
  notes?: string[]
  [key: string]: unknown
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
  propagation?: NarrativePropagationSurface
  liquidityStress?: NarrativeLiquidityStressSurface
  crossMarketReflexivity?: NarrativeCrossMarketReflexivitySurface | CrossMarketReflexivitySurface
  newsFusion?: NewsFusionSurface
  notes: string[]
}
