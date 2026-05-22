export type CrowdRiskState = "Low" | "Moderate" | "Elevated" | "Extreme"

export interface CrowdingInput {
  narrative: string
  participationVelocity: number
  breadth: number
  volatility: number
  premiumBoost: number
  newsBuzz?: number
  confidence?: number
}

export interface CrowdingRiskItem {
  narrative: string
  crowdRisk: number
  extremity: number
  state: CrowdRiskState
  label: string
  operatorNote: string
}
