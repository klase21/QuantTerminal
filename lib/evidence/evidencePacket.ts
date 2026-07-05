export const EVIDENCE_READINESS = ["READY", "PARTIAL", "DEGRADED", "INSUFFICIENT"] as const
export type EvidenceReadiness = typeof EVIDENCE_READINESS[number]

export const EVIDENCE_COVERAGE_STATUSES = [
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "UNAVAILABLE",
  "EXPERIMENTAL",
  "VARIABLE",
] as const
export type EvidenceCoverageStatus = typeof EVIDENCE_COVERAGE_STATUSES[number]

export interface EvidencePacketDataset {
  readonly dataset: string
  readonly coverageStatus: EvidenceCoverageStatus
  readonly actualRecords: number
  readonly expectedRecords: number | null
  readonly coveragePercent: number | null
  readonly resolution: string
  readonly coverageMode: string
  readonly providerTier: string
  readonly canonical: boolean
  readonly verified: boolean
  readonly confidence: number
  readonly firstObservedAt: string | null
  readonly lastObservedAt: string | null
  readonly limitations: readonly string[]
}

export interface EvidencePacket {
  readonly symbol: string
  readonly utcDay: string
  readonly generatedAt: string
  readonly evidenceReadiness: EvidenceReadiness
  readonly datasets: readonly EvidencePacketDataset[]
  readonly missingEvidence: readonly string[]
  readonly experimentalEvidence: readonly string[]
  readonly canonicalEvidence: readonly string[]
  readonly warnings: readonly string[]
}

export type EvidencePacketBuildResult =
  | { readonly status: "SUCCESS"; readonly value: EvidencePacket }
  | { readonly status: "INVALID_PROJECTION"; readonly reason: string }

export type EvidencePacketLoadResult =
  | { readonly status: "SUCCESS"; readonly value: EvidencePacket }
  | { readonly status: "STALE" | "PROJECTION_MISSING" | "UNAVAILABLE" | "VALIDATION_ERROR" | "INVALID_PROJECTION"; readonly reason: string }
