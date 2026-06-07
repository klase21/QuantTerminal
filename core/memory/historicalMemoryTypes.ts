export type MemoryRegimeBias = "MATCH" | "RHYME" | "DIVERGENT" | "INSUFFICIENT_HISTORY"

export interface HistoricalRegimeSnapshot {
  id: string
  timestamp: string
  regime: string
  tone: string
  leadNarrative: string
  leadSector: string
  leadPhase: string
  heat: number
  stress: number
  reflexivity: number
  instability: number
  liquidityQuality: number
  crowding: number
  futuresConviction: number
  topSectors: string[]
}

export interface HistoricalSimilarityMatch {
  snapshot: HistoricalRegimeSnapshot
  similarity: number
  matchedOn: string[]
  operatorRead: string
}

export interface NarrativePersistenceMemory {
  narrative: string
  observations: number
  persistenceScore: number
  firstSeen?: string
  lastSeen?: string
  operatorRead: string
}

export interface RegimeTransitionMemory {
  from: string
  to: string
  count: number
  probability: number
  lastSeen?: string
  operatorRead: string
}

export interface HistoricalMemorySurface {
  ok: boolean
  generatedAt: string
  sampleSize: number
  current?: HistoricalRegimeSnapshot
  bias: MemoryRegimeBias
  bestMatch?: HistoricalSimilarityMatch
  matches: HistoricalSimilarityMatch[]
  persistence: NarrativePersistenceMemory[]
  transitions: RegimeTransitionMemory[]
  operatorRead: string
  notes: string[]
}
