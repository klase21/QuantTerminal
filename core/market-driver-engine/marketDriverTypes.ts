export const MARKET_DRIVER_SCHEMA_VERSION = 1

export const MARKET_DRIVER_CATEGORIES = [
  "funding",
  "open_interest",
  "liquidation",
  "exchange_flow",
  "treasury",
  "etf",
  "historical_analog",
  "event_impact",
] as const

export type MarketDriverCategory = typeof MARKET_DRIVER_CATEGORIES[number]
export type MarketDirection = "positive" | "negative" | "mixed" | "unknown"
export type MarketDriverQuality =
  | "verified"
  | "degraded"
  | "unavailable"
  | "unknown"

export interface MarketDriverEvidence {
  sourceArtifactId: string
  source: string
  observedAt: string | null
  value: number | null
  unit: string | null
  direction: "positive" | "negative" | "neutral"
  summary: string
}

export interface MarketDriver {
  category: MarketDriverCategory
  title: string
  evidence: MarketDriverEvidence
  impactScore: number
  quality: MarketDriverQuality
}

export interface MarketDriverSummary {
  schemaVersion: typeof MARKET_DRIVER_SCHEMA_VERSION
  symbol: string
  timestamp: string
  marketDirection: MarketDirection
  confidence: number
  drivers: MarketDriver[]
  availableCategories: MarketDriverCategory[]
  missingCategories: MarketDriverCategory[]
  quality: MarketDriverQuality
}
