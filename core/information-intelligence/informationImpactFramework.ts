export type InformationImpactDimension = "price" | "volume" | "volatility" | "sentiment"
export type InformationImpactHorizon = "minutes" | "hours" | "days"

export interface InformationImpactObservation {
  itemId: string
  dimension: InformationImpactDimension
  horizon: InformationImpactHorizon
  observedMove: number
  confidence: number
  note: string
}

export interface InformationImpactContract {
  itemId: string
  symbol?: string
  requiredFutureMarketInputs: [
    "price before and after first seen time",
    "volume change",
    "volatility change",
    "sentiment or positioning read",
  ]
  attributionCaveat: string
}

export const impactFrameworkPrinciples = [
  "Impact measures association first; causal attribution requires corroboration.",
  "Price impact should be evaluated against the event's first-seen timestamp.",
  "Volume and volatility can matter even when direction is unclear.",
  "Sentiment impact should be separated from realized market impact.",
  "Macro and exchange announcements may have delayed rather than immediate impact.",
] as const

