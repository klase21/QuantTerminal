export type ReplaySeverity = "LOW" | "MEDIUM" | "HIGH"
export type ReplaySentiment = "positive" | "negative" | "neutral"
export type ReplayDirection = "UP" | "DOWN" | "SIDEWAYS"
export type ReplayAgentTone = "BULLISH" | "BEARISH" | "MIXED" | "DEFENSIVE"
export type ReplayVerdict = "Narrative Confirmed" | "Narrative Failed" | "Reality Diverged"

export type ReplayAgentName =
  | "Technical Agent"
  | "Flow Agent"
  | "Narrative Agent"
  | "Expectation Agent"
  | "Risk Agent"
  | "Final Verdict / Narrative vs Reality"

export interface ReplayPriceCandle {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface ReplayEvent {
  id: string
  timestamp: string
  title: string
  severity: ReplaySeverity
  description: string
  source: "news" | "macro" | "price" | "derivatives" | "expectation" | "memory" | "manual"
}

export interface ReplayMarketSnapshot {
  symbol: string
  price: number
  priceChangePct: number
  direction: ReplayDirection
  volumeRead: string
  fundingRate: number
  openInterestChangePct: number
  openInterestNotional: string
  liquidityRead: string
}

export interface ReplayExpectationSnapshot {
  label: string
  probability: number
  source: string
  status: "mock" | "placeholder" | "historical"
  interpretation: string
}

export interface ReplayNarrativeItem {
  timestamp: string
  source: string
  headline: string
  sentiment: ReplaySentiment
  narrative: string
}

export interface ReplayDriverRanking {
  driver: string
  rank: number
  confidence: number
  evidence: string
}

export interface ReplayNarrativeSnapshot {
  primaryNarrative: string
  summary: string
  items: ReplayNarrativeItem[]
  possibleDrivers: ReplayDriverRanking[]
}

export interface ReplayRiskSnapshot {
  level: "LOW" | "MEDIUM" | "HIGH"
  summary: string
  invalidation: string
  risks: string[]
}

export interface ReplayAgentSummary {
  agent: ReplayAgentName
  tone: ReplayAgentTone
  confidence: number
  summary: string
  watch: string
}

export interface ReplayFrame {
  id: string
  index: number
  timestamp: string
  label: string
  eventIds: string[]
  market: ReplayMarketSnapshot
  expectation: ReplayExpectationSnapshot
  narrative: ReplayNarrativeSnapshot
  risk: ReplayRiskSnapshot
  agents: ReplayAgentSummary[]
}

export interface ReplayCase {
  id: string
  title: string
  symbol: string
  window: string
  setup: string
  outcome: string
  verdict: ReplayVerdict
  verdictSummary: string
  realityCheck: string
  events: ReplayEvent[]
  frames: ReplayFrame[]
}
