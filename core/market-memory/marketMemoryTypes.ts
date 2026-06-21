import type {
  IntelligenceArtifactType,
  IntelligenceArtifactSource,
} from "@/core/intelligence-artifacts"
import type { EvidenceValidity } from "@/core/evidence-validity"
import type { InvestigationThesis } from "@/types/investigationThesis"
import type { ContradictionAnalysis } from "@/core/contradiction"

export const MARKET_MEMORY_SCHEMA_VERSION = 1
export const MARKET_MEMORY_CATALOG_VERSION = 1

export const MARKET_MEMORY_TYPES = [
  "regime",
  "event",
  "narrative",
  "structural",
  "setup",
  "expectation",
  "failure",
] as const

export type MarketMemoryType = typeof MARKET_MEMORY_TYPES[number]

export interface MarketMemoryArtifactReference {
  artifactId: string
  artifactType: IntelligenceArtifactType
  title: string
  source: IntelligenceArtifactSource
  generatedAt: string
  validity: EvidenceValidity
  thesis?: InvestigationThesis
  contradiction?: ContradictionAnalysis
}

export interface MarketMemory {
  schemaVersion: typeof MARKET_MEMORY_SCHEMA_VERSION
  memoryId: string
  title: string
  memoryType: MarketMemoryType
  summary: string
  supportingArtifacts: MarketMemoryArtifactReference[]
  generatedAt: string
  validity: EvidenceValidity
  thesis?: InvestigationThesis
  contradiction?: ContradictionAnalysis
  tags?: string[]
  symbols?: string[]
  exchanges?: string[]
}

export interface MarketMemoryCatalogData {
  catalogVersion: typeof MARKET_MEMORY_CATALOG_VERSION
  schemaVersion: typeof MARKET_MEMORY_SCHEMA_VERSION
  generatedAt: string
  memories: MarketMemory[]
}

export interface MarketMemoryCatalogReader {
  getById(memoryId: string): MarketMemory | null
  findByCategory(memoryType: MarketMemoryType): MarketMemory[]
  findBySymbol(symbol: string): MarketMemory[]
}
