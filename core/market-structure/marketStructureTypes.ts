import type { SectorId } from "@/core/registry/sectorRegistry"

export type StructureState = "BUILDING" | "EXPANDING" | "CROWDED" | "COOLING" | "QUIET"
export type ConvictionState = "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
export type DataSourceState = "connected" | "partial" | "error" | "idle"

export interface SourceHealth {
  name: "binance-futures" | "binance-funding" | "upbit-datalab" | "snapshot-memory"
  status: DataSourceState
  latencyMs?: number
  records?: number
  message?: string
}

export interface DerivativesAssetSnapshot {
  symbol: string
  sector: SectorId
  openInterest: number
  openInterestUsd: number
  fundingRate: number
  markPrice: number
  notionalWeight: number
}

export interface SectorDerivativesSnapshot {
  sector: SectorId
  assets: number
  openInterestUsd: number
  avgFundingRate: number
  oiShare: number
  leverageCrowding: number
  state: StructureState
  evidence: string[]
}

export interface SectorParticipationSnapshot {
  sector: SectorId
  returnScore: number
  volumeScore: number
  breadthPersistence: number
  relativeStrength: number
  krRetailHeat: number
  participationVelocity: number
  state: StructureState
  evidence: string[]
}

export interface NarrativePropagationSnapshot {
  sector: SectorId
  narrativeVelocity: number
  regionalSpread: number
  convictionScore: number
  extremityScore: number
  propagationState: ConvictionState
  summary: string
  evidence: string[]
}

export interface HistoricalMemorySnapshot {
  sector: SectorId
  persistenceScore: number
  regimeSimilarity: number
  replayReadiness: number
  memoryState: "FRESH" | "BUILDING" | "THIN"
  events: string[]
}

export interface MarketStructureSectorSnapshot {
  sector: SectorId
  rank: number
  marketStructureScore: number
  operatorState: StructureState
  derivatives: SectorDerivativesSnapshot
  participation: SectorParticipationSnapshot
  narrative: NarrativePropagationSnapshot
  historical: HistoricalMemorySnapshot
  operatorRead: string
  risks: string[]
}

export interface MarketStructureIntelligenceResponse {
  ok: boolean
  source: "phase-27-30-market-structure"
  updatedAt: string
  mode: "real-time-derived" | "partial" | "error"
  sectors: MarketStructureSectorSnapshot[]
  topSector?: MarketStructureSectorSnapshot
  sources: SourceHealth[]
  endpoints: Record<string, string>
  notes: string[]
}
