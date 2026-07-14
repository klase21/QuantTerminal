import type { UnavailableReason } from "@/lib/data-platform/contracts"

export type CanonicalCommitOperation = "INITIAL_VERSION" | "PROVIDER_CORRECTION" | "GOVERNED_IMPORT"
export type PublicationState = "PENDING" | "CERTIFIED" | "PUBLISHED" | "SUPERSEDED" | "REJECTED" | "REVOKED"
export type PublicationDecisionType = "INITIAL_PENDING" | "CERTIFY" | "PUBLISH" | "SUPERSEDE" | "REJECT" | "REVOKE"
export type LineageNodeType = "RAW_OBJECT" | "CANONICAL_FACT" | "PROJECTION_VERSION" | "EVIDENCE_PACKET"
export type LineageRelationship = "NORMALIZED_FROM" | "PROJECTED_FROM" | "EVIDENCED_BY"
export type VerificationState = "PENDING" | "VERIFIED" | "FAILED"
export type CompressionType = "NONE" | "GZIP" | "ZSTD" | "ZIP" | "PARQUET"
export type RetentionClass = "HOT" | "STANDARD" | "ARCHIVE" | "LEGAL_HOLD"

export interface GovernanceBindings {
  readonly datasetRegistrySnapshotId: string
  readonly providerRegistrySnapshotId: string
  readonly providerCertificationSnapshotId: string
  readonly policyVersionId: string
  readonly schemaVersion: string
  readonly normalizationVersion: string
}

export interface CanonicalRecordIdentity {
  readonly datasetId: string
  readonly businessIdentity: string
  readonly canonicalRecordId: string
}

export interface CanonicalFactReference extends CanonicalRecordIdentity {
  readonly recordVersion: number
  readonly factTable: CanonicalFactTable
}

export type CanonicalFactTable =
  | "OHLCV" | "FUNDING" | "OPEN_INTEREST" | "LIQUIDATION"
  | "PREDICTION_SNAPSHOT" | "ETF_OBSERVATION" | "RESERVE_OBSERVATION"
  | "MACRO_OBSERVATION" | "STREAM_MANIFEST"

interface FactBase {
  readonly identity: CanonicalRecordIdentity
  readonly providerId: string
  readonly venue: string | null
  readonly symbolOrSubject: string
  readonly observedAt: string
  readonly effectiveAt: string | null
  readonly checksum: string
  readonly governance: GovernanceBindings
}

export interface OhlcvFact extends FactBase { readonly kind: "OHLCV"; readonly resolution: string; readonly open: string; readonly high: string; readonly low: string; readonly close: string; readonly volume: string; readonly closeTime: string }
export interface FundingFact extends FactBase {
  readonly kind: "FUNDING"
  readonly canonicalInstrumentId: string
  readonly marketType: "USD_M_FUTURES"
  readonly fundingRate: string
  readonly fundingTime: string
  readonly fundingIntervalHours: number
}
export interface OpenInterestFact extends FactBase { readonly kind: "OPEN_INTEREST"; readonly openInterest: string; readonly unit: string; readonly window: string }
export interface LiquidationFact extends FactBase { readonly kind: "LIQUIDATION"; readonly side: "BUY" | "SELL"; readonly price: string; readonly quantity: string; readonly eventTime: string; readonly providerRecordId: string }
export interface PredictionSnapshotFact extends FactBase { readonly kind: "PREDICTION_SNAPSHOT"; readonly marketId: string; readonly outcomeId: string; readonly probability: string; readonly volume: string | null; readonly liquidity: string | null }
export interface EtfObservationFact extends FactBase { readonly kind: "ETF_OBSERVATION"; readonly instrumentId: string; readonly flowValue: string; readonly currency: string; readonly windowStart: string; readonly windowEnd: string }
export interface ReserveObservationFact extends FactBase { readonly kind: "RESERVE_OBSERVATION"; readonly asset: string; readonly balance: string; readonly unit: string }
export interface MacroObservationFact extends FactBase { readonly kind: "MACRO_OBSERVATION"; readonly seriesId: string; readonly value: string; readonly unit: string; readonly period: string }
export interface StreamManifestFact extends FactBase { readonly kind: "STREAM_MANIFEST"; readonly streamKind: "AGG_TRADE" | "ORDERBOOK"; readonly rawObjectId: string; readonly windowStart: string; readonly windowEnd: string; readonly firstSequence: string | null; readonly lastSequence: string | null; readonly recordCount: number | null }
export type CanonicalFact = OhlcvFact | FundingFact | OpenInterestFact | LiquidationFact | PredictionSnapshotFact | EtfObservationFact | ReserveObservationFact | MacroObservationFact | StreamManifestFact

export interface RepositoryEnvelope {
  readonly envelopeId: string
  readonly commitId: string
  readonly fact: CanonicalFactReference
  readonly checksum: string
  readonly providerId: string
  readonly governance: GovernanceBindings
  readonly createdAt: string
}

export interface RepositoryRecordVersion {
  readonly versionId: string
  readonly commitId: string
  readonly identity: CanonicalRecordIdentity
  readonly recordVersion: number
  readonly checksum: string
  readonly currentPublicationState: PublicationState
  readonly currentDecisionId: string
  readonly createdAt: string
}

export interface PublicationDecision {
  readonly decisionId: string
  readonly commitId: string
  readonly canonicalRecordId: string
  readonly recordVersion: number
  readonly previousState: PublicationState | null
  readonly nextState: PublicationState
  readonly decisionType: PublicationDecisionType
  readonly policyVersionId: string
  readonly decidedAt: string
  readonly reasonCodes: readonly string[]
}

export interface PublicationTransition { readonly from: PublicationState; readonly to: PublicationState }
export interface SupersessionReference { readonly supersessionId: string; readonly canonicalRecordId: string; readonly predecessorVersion: number; readonly successorVersion: number; readonly successorCommitId: string; readonly createdAt: string }
export interface LineageNodeReference { readonly nodeType: LineageNodeType; readonly nodeId: string; readonly nodeVersion: string }
export interface LineageEdge { readonly edgeId: string; readonly source: LineageNodeReference; readonly destination: LineageNodeReference; readonly relationship: LineageRelationship; readonly commitId: string; readonly createdAt: string; readonly digest: string | null }

export interface RawObjectManifest {
  readonly objectId: string; readonly datasetId: string; readonly providerId: string; readonly venue: string | null
  readonly symbolOrSubject: string | null; readonly windowStart: string | null; readonly windowEnd: string | null
  readonly contentHash: string; readonly sizeBytes: number; readonly mediaType: string; readonly compression: CompressionType
  readonly retrievedAt: string; readonly providerSnapshotId: string; readonly retentionClass: RetentionClass
  readonly verificationState: VerificationState; readonly objectStorageKey: string; readonly createdAt: string
}

export interface CanonicalCommit {
  readonly commitId: string; readonly operationType: CanonicalCommitOperation; readonly datasetId: string; readonly providerId: string
  readonly registrySnapshotId: string; readonly providerSnapshotId: string; readonly policyVersionId: string
  readonly providerCertificationSnapshotId: string
  readonly schemaVersion: string; readonly normalizationVersion: string; readonly initiatedAt: string; readonly committedAt: string
  readonly idempotencyKey: string; readonly candidateCount: 1; readonly committedRecordCount: 1
}

export type OutboxEvent =
  | { readonly eventId: string; readonly commitId: string; readonly eventType: "CANONICAL_RECORD_COMMITTED"; readonly payloadVersion: "1"; readonly canonicalRecordId: string; readonly recordVersion: number; readonly publicationDecisionId: null; readonly createdAt: string }
  | { readonly eventId: string; readonly commitId: string; readonly eventType: "PUBLICATION_STATE_CHANGED"; readonly payloadVersion: "1"; readonly canonicalRecordId: string; readonly recordVersion: number; readonly publicationDecisionId: string; readonly createdAt: string }
export interface PersistenceConflict { readonly conflictId: string; readonly identity: CanonicalRecordIdentity; readonly recordVersion: number; readonly existingChecksum: string; readonly candidateChecksum: string; readonly rawObjectId: string; readonly detectedAt: string }
export interface QuarantineCandidate { readonly quarantineId: string; readonly rawObjectId: string; readonly attemptedIdentity: CanonicalRecordIdentity | null; readonly conflictId: string | null; readonly reasonCodes: readonly string[]; readonly createdAt: string }

export interface CanonicalCommitCommand {
  readonly operationType: CanonicalCommitOperation
  readonly idempotencyKey: string
  readonly initiatedAt: string
  readonly rawObject: RawObjectManifest
  readonly fact: CanonicalFact
  readonly targetRecordVersion: number
  readonly predecessor: CanonicalFactReference | null
  readonly requiredLineage: readonly LineageEdge[]
}

export type CanonicalCommitResult =
  | { readonly status: "SUCCESS"; readonly commit: CanonicalCommit; readonly fact: CanonicalFactReference }
  | { readonly status: "DUPLICATE"; readonly canonicalRecordId: string; readonly recordVersion: number; readonly checksum: string }
  | { readonly status: "CONFLICT"; readonly conflict: PersistenceConflict; readonly quarantine: QuarantineCandidate }
  | { readonly status: "REJECTED"; readonly reasons: readonly UnavailableReason[] }
  | { readonly status: "RETRYABLE_FAILURE"; readonly code: "DEADLOCK" | "SERIALIZATION_FAILURE" | "CONNECTION_INTERRUPTED"; readonly retryWithSameIdempotencyKey: true }
