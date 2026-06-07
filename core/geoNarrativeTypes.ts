export type GeoRegionCode = "US" | "KR" | "CN" | "GLOBAL"

export type GeoNarrativeState =
  | "Institutional"
  | "Retail Speculation"
  | "Policy Watch"
  | "Global Liquidity"
  | "Quiet"

export type GeoDiffusionState =
  | "US_TO_KR"
  | "KR_TO_GLOBAL"
  | "GLOBAL_SYNC"
  | "KOREA_OVERHEAT"
  | "GLOBAL_LEADS"
  | "NO_CLEAR_FLOW"

export interface GeoNarrativeRegion {
  region: GeoRegionCode
  label: string
  state: GeoNarrativeState
  leadNarrative: string
  intensity: number
  confidence: number
  description: string
}

export interface GeoNarrativeSurface {
  ok: boolean
  leadRegion: GeoRegionCode | "NONE"
  diffusion: GeoDiffusionState
  diffusionLabel: string
  summary: string
  regions: GeoNarrativeRegion[]
  divergenceScore: number
  operatorNote: string
}
