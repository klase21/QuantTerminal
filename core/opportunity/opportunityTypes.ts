export type OpportunityState =
  | "HIGH_OPPORTUNITY"
  | "EMERGING"
  | "WATCHLIST"
  | "SUPPRESSED"
  | "OVERCROWDED"
  | "EXITING"

export type OpportunityConviction = "High" | "Medium" | "Low" | "Avoid"

export interface OpportunityBreakdown {
  liquidity: number
  breadth: number
  participation: number
  crowdingSafety: number
  geoConfirmation: number
  whaleConfidence: number
  dataQuality: number
}

export interface OpportunityItem {
  narrative: string
  state: OpportunityState
  label: string
  shortLabel: string
  conviction: OpportunityConviction
  confidence: number
  headline: string
  operatorNote: string
  action: string
  breakdown: OpportunityBreakdown
  confirmations: string[]
  suppressions: string[]
  source: "rotation" | "narrative" | "mixed"
}

export interface OpportunitySurface {
  ok: boolean
  generatedAt: string
  lead: OpportunityItem | null
  items: OpportunityItem[]
  suppressed: OpportunityItem[]
  summary: string
  notes: string[]
}
