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
  velocity: number
  acceleration: number
  temperature: string
  participationLabel: string
  crowdRisk: number
  crowdRiskState: string
  crowdRiskLabel: string
  headline: string
  detail: string
  drivers: string[]
}
