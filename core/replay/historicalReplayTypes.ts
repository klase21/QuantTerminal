import type { GeoDiffusionState } from "@/core/geoNarrativeTypes"
import type { NarrativeLifecyclePhase } from "@/core/narrative/lifecycleTypes"
import type { RotationDirection } from "@/core/marketDataTypes"

export type ReplayWindow = "30D" | "90D" | "180D"
export type ReplayIntensityState = "Quiet" | "Forming" | "Accelerating" | "Overheated" | "Fading"

export interface HistoricalReplayFrame {
  id: string
  index: number
  label: string
  timestampLabel: string
  leadNarrative: string
  lifecycle: NarrativeLifecyclePhase
  direction: RotationDirection
  diffusion: GeoDiffusionState
  intensity: number
  confidence: number
  participation: number
  crowding: number
  breadth: number
  liquidity: number
  replayState: ReplayIntensityState
  headline: string
  operatorNote: string
}

export interface HistoricalReplayCaseStudy {
  title: string
  thesis: string
  sequence: string[]
  risk: string
  confidence: number
}

export interface HistoricalReplaySurface {
  ok: boolean
  generatedAt: string
  window: ReplayWindow
  frames: HistoricalReplayFrame[]
  activeIndex: number
  current: HistoricalReplayFrame | null
  caseStudy: HistoricalReplayCaseStudy
  compressedSummary: string
  notes: string[]
}
