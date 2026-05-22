import type { RotationDirection, SectorRotationSnapshot } from "@/core/marketDataTypes"
import type { NarrativeLifecycleItem } from "./lifecycleTypes"
import type { GeoNarrativeSurface } from "@/core/geoNarrativeTypes"
import type { OpportunitySurface } from "@/core/opportunity/opportunityTypes"
import type { KRRetailReactionSurface } from "@/core/krRetail/krRetailTypes"

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

export interface NarrativeSurface {
  ok: boolean
  generatedAt: string
  regime: string
  tone: NarrativeTone
  marketSummary: string
  operatorCommentary: OperatorCommentary[]
  heatmap: NarrativeHeatItem[]
  lifecycle: NarrativeLifecycleItem[]
  storyTimeline: NarrativeStoryStep[]
  compression: NarrativeCompressionItem[]
  regionalDivergence: {
    status: "NONE" | "KOREA_STRONG" | "GLOBAL_STRONG" | "MIXED"
    summary: string
    sectors: string[]
  }
  geoNarrative?: GeoNarrativeSurface
  opportunity?: OpportunitySurface
  krRetail?: KRRetailReactionSurface
  sourceSectors: SectorRotationSnapshot[]
  newsFusion?: NewsFusionSurface
  notes: string[]
}
