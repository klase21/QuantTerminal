import type { MarketStructureSectorSnapshot } from "@/core/market-structure/marketStructureTypes"
import type { AutonomousSignal, OperatorPriority } from "@/core/ai-intelligence/aiIntelligenceTypes"

export type InstitutionalSource = "phase-41-45-institutional-terminal-layer"
export type InstitutionalMode = "derived" | "empty"
export type ExposureSide = "LONG_BIAS" | "SHORT_BIAS" | "NEUTRAL"
export type TimeframeId = "5M" | "15M" | "1H" | "4H" | "1D"
export type TimeframeDirection = "BULLISH" | "BEARISH" | "MIXED" | "COMPRESSED"
export type SignalRankClass = "ALPHA" | "WATCH" | "NOISE" | "DEFENSIVE"
export type WorkspaceMode = "OPERATOR" | "RESEARCH" | "RISK" | "EXECUTION"

export interface PortfolioExposureItem {
  sector: string
  exposureScore: number
  side: ExposureSide
  narrativeExposure: number
  crowdingExposure: number
  fractureSensitivity: number
  betaConcentration: number
  operatorRead: string
}

export interface PortfolioIntelligenceSurface {
  ok: boolean
  totalExposure: number
  concentrationRisk: number
  dominantSector?: string
  exposures: PortfolioExposureItem[]
  hedgingRead: string
  notes: string[]
}

export interface TradeMemoryPattern {
  id: string
  sector: string
  label: string
  similarity: number
  historicalOutcome: "CONTINUATION" | "REVERSAL" | "CHOP" | "UNKNOWN"
  replayWindow: "1H" | "4H" | "1D"
  confidence: number
  operatorRead: string
}

export interface AITradeMemorySurface {
  ok: boolean
  recallScore: number
  patterns: TradeMemoryPattern[]
  memoryRead: string
}

export interface TimeframeIntelligenceItem {
  timeframe: TimeframeId
  direction: TimeframeDirection
  consensusScore: number
  momentum: number
  stress: number
  topSector?: string
  operatorRead: string
}

export interface MultiTimeframeIntelligenceSurface {
  ok: boolean
  consensus: TimeframeDirection
  consensusScore: number
  alignmentScore: number
  frames: TimeframeIntelligenceItem[]
  operatorRead: string
}

export interface RankedSignal extends AutonomousSignal {
  class: SignalRankClass
  confidence: number
  decayRisk: number
  persistence: number
  falsePositiveRisk: number
  actionability: number
}

export interface SignalRankingSurface {
  ok: boolean
  topSignals: RankedSignal[]
  signalQualityScore: number
  operatorRead: string
}

export interface InstitutionalWorkspacePanel {
  id: string
  title: string
  phase: number
  mode: WorkspaceMode
  priority: OperatorPriority
  hotkey: string
  summary: string
}

export interface InstitutionalUXSurface {
  ok: boolean
  activeMode: WorkspaceMode
  commandPalette: string[]
  panels: InstitutionalWorkspacePanel[]
  operatorLayoutRead: string
}

export interface InstitutionalIntelligenceSurface {
  ok: boolean
  source: InstitutionalSource
  updatedAt: string
  mode: InstitutionalMode
  portfolio: PortfolioIntelligenceSurface
  tradeMemory: AITradeMemorySurface
  multiTimeframe: MultiTimeframeIntelligenceSurface
  signalRanking: SignalRankingSurface
  ux: InstitutionalUXSurface
  inputs: {
    sectors: number
    autonomousSignals: number
    topSector?: MarketStructureSectorSnapshot
  }
  notes: string[]
}
