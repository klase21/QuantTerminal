export const EVIDENCE_VALIDITY_SCHEMA_VERSION = 1

export const EVIDENCE_FRESHNESS_STATUSES = [
  "VALID",
  "STALE",
  "EXPIRED",
  "UNKNOWN",
] as const

export const EVIDENCE_COVERAGE_STATUSES = [
  "FULL",
  "PARTIAL",
  "UNAVAILABLE",
  "UNKNOWN",
] as const

export type EvidenceFreshnessStatus = typeof EVIDENCE_FRESHNESS_STATUSES[number]
export type EvidenceCoverageStatus = typeof EVIDENCE_COVERAGE_STATUSES[number]

export interface EvidenceValidity {
  schemaVersion: typeof EVIDENCE_VALIDITY_SCHEMA_VERSION
  observedAt: string | null
  generatedAt: string
  freshnessStatus: EvidenceFreshnessStatus
  coverageStatus: EvidenceCoverageStatus
  reason?: string
}

export interface EvidenceValidityInput {
  observedAt?: string | number | Date | null
  generatedAt: string | number | Date
  expiresAt?: string | number | Date | null
  freshnessWindowMs?: number
  coverageStatus?: EvidenceCoverageStatus
  reason?: string
  now?: string | number | Date
}
