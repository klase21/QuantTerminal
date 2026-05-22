export type NarrativeLifecyclePhase =
  | "EARLY"
  | "EXPANDING"
  | "VIRAL"
  | "OVERCROWDED"
  | "EXITING"
  | "QUIET"

export interface NarrativeLifecycleItem {
  narrative: string
  phase: NarrativeLifecyclePhase
  participation: number
  confirmation: number
  crowding: number
  confidence: number
  headline: string
  detail: string
  drivers: string[]
}
