import type { SectorId } from "../registry/sectorRegistry"

export type SectorRotationState = "QUIET" | "CHURN" | "INFLOW" | "EXPANSION" | "EXHAUSTION" | "OUTFLOW"

export interface SectorRotationScore {
  sector: SectorId | string
  state: SectorRotationState
  score: number
  rank: number
  rankDelta: number
  volumeAcceleration: number
  volatilityExpansion: number
  priceMomentum: number
  premiumBoost: number
  regimeFit: number
  evidence: string[]
}
