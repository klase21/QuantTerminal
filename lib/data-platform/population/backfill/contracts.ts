import type { CanonicalFactTable, CompressionType } from "@/lib/data-platform/persistence"

export type HistoricalDatasetClassification = "SOURCE_HISTORICAL" | "DERIVED_INTERNAL" | "CONTROL_PLANE"
export type HistoricalPopulationStatus = "REQUIRED" | "OPTIONAL" | "EXCLUDED_FROM_SOURCE_BACKFILL" | "BLOCKED_REQUIRED_PROVIDER" | "BLOCKED_REQUIRED_TARGET"
export type BackfillPartitionStatus = "EXECUTABLE" | "BLOCKED" | "NOT_APPLICABLE" | "SOURCE_NOT_AVAILABLE_FOR_PERIOD"

export interface HistoricalDatasetScope {
  readonly datasetId: string
  readonly classification: HistoricalDatasetClassification
  readonly status: HistoricalPopulationStatus
  readonly justification: string
  readonly producingOrSourceSystem: string
  readonly canonicalTarget: CanonicalFactTable | "DOCUMENT_METADATA" | null
  readonly ownerPhase: "D2" | "D3" | "D4"
}

export interface InstrumentLifecycleRecord {
  readonly canonicalInstrumentId: string
  readonly providerId: string
  readonly providerSymbol: string
  readonly venue: string
  readonly marketType: "FUTURES"
  readonly contractType: "PERPETUAL"
  readonly baseAsset: string
  readonly quoteAsset: string
  readonly activatedAt: string
  readonly deactivatedAt: string | null
  readonly replacementInstrumentId: string | null
  readonly lifecycleEvidence: string
  readonly lifecycleChecksum: string
  readonly supportStatus: "ACTIVE" | "INACTIVE" | "LIFECYCLE_UNKNOWN" | "MAPPING_CONFLICT"
}

export interface BackfillPolicyBinding {
  readonly policyId: string
  readonly version: string
  readonly state: "APPROVED" | "BLOCKED"
  readonly source: string
}

export interface BackfillTargetBinding {
  readonly environmentVariable: "D3_BACKFILL_OBJECT_ROOT" | "D2_CANONICAL_POSTGRES_URL" | "D3_POPULATION_POSTGRES_URL"
  readonly targetIdentity: string | null
  readonly status: "BOUND" | "MISSING" | "REJECTED"
}

export interface BackfillPartition {
  readonly partitionId: string
  readonly datasetId: string
  readonly providerId: string
  readonly canonicalInstrumentId: string | null
  readonly providerSymbol: string | null
  readonly venue: string | null
  readonly market: string | null
  readonly resolution: string | null
  readonly windowStart: string | null
  readonly windowEnd: string | null
  readonly sourceObject: string | null
  readonly status: BackfillPartitionStatus
  readonly blockerIds: readonly string[]
}

export interface BackfillManifestContent {
  readonly manifestSchemaVersion: "1.0.0"
  readonly approvalStatus: "APPROVED" | "APPROVED_WITH_BLOCKERS" | "BLOCKED"
  readonly executable: boolean
  readonly frozenCutoffUtc: string
  readonly datasetRegistryVersion: string
  readonly providerRegistryVersion: string
  readonly datasets: readonly HistoricalDatasetScope[]
  readonly instruments: readonly InstrumentLifecycleRecord[]
  readonly partitions: readonly BackfillPartition[]
  readonly objectStorageBinding: BackfillTargetBinding
  readonly d2CanonicalTargetBinding: BackfillTargetBinding
  readonly d3PopulationTargetBinding: BackfillTargetBinding
  readonly normalizerBindings: readonly { readonly datasetId: string; readonly candidateKind: string; readonly normalizerId: string; readonly version: string; readonly status: "AVAILABLE" | "BLOCKED" }[]
  readonly policies: readonly BackfillPolicyBinding[]
  readonly checksumPolicy: "SHA-256"
  readonly retryPolicyReference: string
  readonly incrementalHandoffBoundary: string
  readonly unresolvedBlockers: readonly string[]
}

export interface BackfillManifest extends BackfillManifestContent {
  readonly manifestId: string
  readonly manifestChecksum: string
}

export interface HistoricalSourcePartition {
  readonly datasetId: string
  readonly providerId: string
  readonly providerSymbol: string
  readonly venue: string
  readonly market: string
  readonly resolution: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly sourceUrl: string
  readonly mediaType: string
  readonly compression: CompressionType
}

export type SourceAvailability =
  | { readonly status: "AVAILABLE"; readonly contentLength: number | null; readonly etag: string | null; readonly lastModified: string | null }
  | { readonly status: "SOURCE_NOT_AVAILABLE_FOR_PERIOD" }
  | { readonly status: "RETRYABLE_FAILURE"; readonly reason: string }
  | { readonly status: "PERMANENT_FAILURE"; readonly reason: string }
