export const VERIFIED_EVENT_SCHEMA_VERSION = 1
export const VERIFIED_EVENT_CATALOG_VERSION = 1

export const VERIFIED_EVENT_CATEGORIES = [
  "macro",
  "etf",
  "regulation",
  "exchange",
  "stablecoin",
  "liquidation_cascade",
  "funding_extreme",
  "oi_expansion",
  "narrative_shift",
] as const

export type VerifiedEventCategory = typeof VERIFIED_EVENT_CATEGORIES[number]

export type VerifiedEventEvidenceKind =
  | "official_statement"
  | "regulatory_filing"
  | "exchange_notice"
  | "market_data"
  | "source_reference"

export interface VerifiedEventSource {
  id: string
  name: string
  url: string
}

export interface VerifiedEventEvidence {
  evidenceId: string
  kind: VerifiedEventEvidenceKind
  source: VerifiedEventSource
  observedAt: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface VerifiedEvent {
  schemaVersion: typeof VERIFIED_EVENT_SCHEMA_VERSION
  eventId: string
  title: string
  category: VerifiedEventCategory
  timestamp: string
  source: VerifiedEventSource
  evidence: VerifiedEventEvidence[]
  affectedSymbols: string[]
  affectedExchanges: string[]
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface VerifiedEventCatalog {
  catalogVersion: typeof VERIFIED_EVENT_CATALOG_VERSION
  schemaVersion: typeof VERIFIED_EVENT_SCHEMA_VERSION
  generatedAt: string
  events: VerifiedEvent[]
}

export interface VerifiedEventDateRange {
  start: string
  end: string
}

export interface VerifiedEventCatalogReader {
  getById(eventId: string): VerifiedEvent | null
  findByCategory(category: VerifiedEventCategory): VerifiedEvent[]
  findBySymbol(symbol: string): VerifiedEvent[]
  findByDateRange(range: VerifiedEventDateRange): VerifiedEvent[]
}
