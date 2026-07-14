import type { CanonicalCommitCommand, CanonicalCommitResult, RawObjectManifest } from "@/lib/data-platform/persistence"

export type PopulationJobProfileKind = "BACKFILL" | "INCREMENTAL" | "CORRECTION" | "RECONCILIATION"
export type PopulationJobState = "QUEUED" | "RUNNING" | "PARTIAL" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "PAUSED" | "EXPIRED"
export type PopulationRunState = "CREATED" | "RUNNING" | "SUCCEEDED" | "PARTIAL" | "FAILED" | "CANCELLED" | "EXPIRED"
export type PopulationUnitState = "PENDING" | "LEASED" | "RETRIEVING" | "RAW_PERSISTED" | "CANDIDATES_READY" | "PROCESSING" | "COMPLETED" | "RETRYABLE" | "QUARANTINED" | "FAILED" | "CANCELLED"
export type RetrievalAttemptOutcome = "SUCCESS" | "EMPTY" | "UNSUPPORTED" | "RATE_LIMITED" | "RETRYABLE_FAILURE" | "PERMANENT_FAILURE" | "MALFORMED_RESPONSE" | "CANCELLED"
export type PopulationOutcomeKind = "COMMITTED" | "DUPLICATE" | "CONFLICT" | "QUARANTINED" | "EMPTY" | "UNSUPPORTED" | "RETRYABLE_FAILURE" | "PERMANENT_FAILURE" | "CANCELLED" | "SKIPPED_BY_POLICY"
export type ValidationLayer = "TRANSPORT" | "STRUCTURAL" | "PROVIDER_SEMANTIC" | "CANONICAL_ELIGIBILITY" | "CROSS_RECORD"
export type ValidationOutcome = "PASSED" | "FAILED" | "NOT_EVALUATED"
export type FailureRouting = "RETRYABLE" | "PERMANENT" | "QUARANTINE" | "UNSUPPORTED" | "POLICY_REJECTED"
export type EligibilityStatus = "ELIGIBLE" | "BLOCKED" | "NOT_EVALUATED"
export type WatermarkEligibilityResult = "ELIGIBLE" | "BLOCKED_CONFLICT" | "BLOCKED_MISSING" | "BLOCKED_QUALITY" | "BLOCKED_RETRY" | "BLOCKED_CANCELLED" | "UNSUPPORTED" | "NOT_APPLICABLE"
export type RetryOwner = "COORDINATOR" | "WORKER" | "D2" | "NONE"
export type RetryRunBehavior = "SAME_RUN" | "NEW_RUN" | "NO_RETRY"
export type RetryDelayStrategy = "PROVIDER_RETRY_AFTER" | "POLICY_FIXED" | "POLICY_EXPONENTIAL" | "POLICY_DEFINED" | "NONE"
export type CheckpointType = "RAW_BOUNDARY" | "CANDIDATE_BOUNDARY" | "CANONICAL_BOUNDARY"

export interface PopulationDimensions {
  readonly venue: string | null
  readonly subjectOrSymbol: string | null
  readonly windowStart: string | null
  readonly windowEnd: string | null
  readonly resolution: string | null
  readonly partitionKey: string | null
}

export interface PopulationJobProfile {
  readonly profileId: string
  readonly profileVersion: string
  readonly kind: PopulationJobProfileKind
  readonly requiredDimensions: readonly (keyof PopulationDimensions)[]
  readonly rawRetrievalRequired: boolean
  readonly mayReuseVerifiedManifest: boolean
  readonly retryPolicyId: string
  readonly retryPolicyVersion: string
  readonly watermarkPolicyId: string
  readonly watermarkPolicyVersion: string
}

export interface PopulationJobRequest {
  readonly requestIdentity: string
  readonly occurrenceIdentity: string
  readonly intentionalRerunIdentity: string | null
  readonly profile: PopulationJobProfile
  readonly datasetId: string
  readonly providerId: string
  readonly dimensions: PopulationDimensions
  readonly requestedAt: string
  readonly requestedBy: string
}

export interface PopulationJob {
  readonly jobId: string
  readonly request: PopulationJobRequest
  readonly currentState: PopulationJobState
  readonly currentEventId: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface PopulationRun {
  readonly runId: string
  readonly jobId: string
  readonly attemptNumber: number
  readonly currentState: PopulationRunState
  readonly workerPoolId: string | null
  readonly startedAt: string | null
  readonly heartbeatAt: string | null
  readonly completedAt: string | null
  readonly retryClassificationId: string | null
  readonly currentCheckpointId: string | null
}

export interface PopulationUnitIdentity extends PopulationDimensions {
  readonly profileId: string
  readonly profileVersion: string
  readonly datasetId: string
  readonly providerId: string
}

export interface PopulationUnit {
  readonly unitId: string
  readonly jobId: string
  readonly identity: PopulationUnitIdentity
  readonly providerSnapshotId: string
  readonly policyVersionId: string
  readonly requestFingerprint: string
  readonly requestParameters: Readonly<Record<string, string | number | boolean | null>>
  readonly required: boolean
  readonly currentState: PopulationUnitState
  readonly attemptCount: number
  readonly activeLeaseId: string | null
  readonly currentCheckpointId: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface PopulationLease {
  readonly leaseId: string
  readonly unitId: string
  readonly ownerId: string
  readonly fencingToken: number
  readonly acquiredAt: string
  readonly expiresAt: string
  readonly heartbeatAt: string
  readonly releasedAt: string | null
  readonly releaseReason: "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED" | "RECLAIMED" | null
  readonly leaseVersion: number
}

export interface PopulationCheckpoint {
  readonly checkpointId: string
  readonly jobId: string
  readonly runId: string
  readonly unitId: string
  readonly fencingToken: number
  readonly checkpointType: CheckpointType
  readonly completedStage: PopulationUnitState
  readonly rawManifestId: string | null
  readonly candidateCursor: string | null
  readonly canonicalSubmissionId: string | null
  readonly lastOutcomeId: string | null
  readonly createdAt: string
}

export interface RetrievalAttempt {
  readonly attemptId: string
  readonly unitId: string
  readonly runId: string
  readonly providerId: string
  readonly providerSnapshotId: string
  readonly requestFingerprint: string
  readonly startedAt: string
  readonly completedAt: string | null
  readonly outcome: RetrievalAttemptOutcome | null
  readonly statusCode: number | null
  readonly retryAfter: string | null
  readonly responseMediaType: string | null
  readonly rawByteCount: number | null
  readonly rawManifestId: string | null
  readonly errorClass: string | null
  readonly errorCode: string | null
  readonly retryClassificationId: string | null
}

export interface RawArtifactReference {
  readonly rawObjectId: string
  readonly rawManifestId: string
  readonly contentHash: string
  readonly objectStorageKey: string
  readonly verificationState: RawObjectManifest["verificationState"]
}

interface CandidateBase<K extends string, P> {
  readonly kind: K
  readonly candidateId: string
  readonly unitId: string
  readonly retrievalAttemptId: string
  readonly rawManifestId: string
  readonly datasetId: string
  readonly providerId: string
  readonly providerSnapshotId: string
  readonly sourceObservationId: string
  readonly sourceObservedAt: string
  readonly effectiveAt: string | null
  readonly parserVersion: string
  readonly candidateSchemaVersion: string
  readonly payload: P
  readonly candidateChecksum: string
  readonly validationStatus: EligibilityStatus
  readonly qualityEligibility: EligibilityStatus
  readonly normalizationEligibility: EligibilityStatus
  readonly createdAt: string
}

export type PopulationCandidate =
  | CandidateBase<"OHLCV", { readonly symbol: string; readonly resolution: string; readonly open: string; readonly high: string; readonly low: string; readonly close: string; readonly volume: string; readonly closeTime: string }>
  | CandidateBase<"FUNDING", { readonly symbol: string; readonly canonicalInstrumentId: string; readonly marketType: "USD_M_FUTURES"; readonly fundingRate: string; readonly fundingTime: string; readonly fundingIntervalHours: number }>
  | CandidateBase<"OPEN_INTEREST", { readonly symbol: string; readonly canonicalInstrumentId: string; readonly marketType: "USD_M_FUTURES"; readonly openInterest: string; readonly unit: "PROVIDER_NATIVE"; readonly openInterestValue: string | null; readonly valueUnit: "PROVIDER_NATIVE_QUOTE_VALUE" | null; readonly window: "5m" }>
  | CandidateBase<"AGG_TRADE", { readonly symbol: string; readonly canonicalInstrumentId: string; readonly marketType: "USD_M_FUTURES"; readonly aggregateTradeId: string; readonly price: string; readonly quantity: string; readonly firstTradeId: string; readonly lastTradeId: string; readonly tradeTime: string; readonly sourceTimestamp: string; readonly buyerIsMaker: boolean }>
  | CandidateBase<"LIQUIDATION", { readonly symbol: string; readonly side: "BUY" | "SELL"; readonly price: string; readonly quantity: string; readonly eventTime: string; readonly providerRecordId: string }>
  | CandidateBase<"STREAM_MANIFEST", { readonly symbol: string; readonly streamKind: "AGG_TRADE" | "ORDERBOOK"; readonly rawObjectId: string; readonly windowStart: string; readonly windowEnd: string; readonly firstSequence: string | null; readonly lastSequence: string | null; readonly recordCount: number | null; readonly segmentContractVersion?: "2"; readonly canonicalInstrumentId?: string; readonly sourcePartitionKey?: string; readonly segmentObjectKey?: string; readonly segmentContentChecksum?: string; readonly segmentByteLength?: number; readonly columnarFormat?: "PARQUET"; readonly compressionFormat?: "SNAPPY"; readonly eventTimeMin?: string; readonly eventTimeMax?: string; readonly eventOrderPolicy?: string; readonly acceptedCount?: number; readonly rejectedCount?: number; readonly duplicateCount?: number }>

export interface CandidateValidationResult {
  readonly validationRunId: string
  readonly candidateId: string | null
  readonly retrievalAttemptId: string | null
  readonly layer: ValidationLayer
  readonly ruleId: string
  readonly ruleVersion: string
  readonly outcome: ValidationOutcome
  readonly blocking: boolean
  readonly failureRouting: FailureRouting | null
  readonly policyVersionId: string
  readonly diagnostics: Readonly<Record<string, string | number | boolean | null>>
  readonly createdAt: string
}

export interface CandidateQualityResult {
  readonly qualityResultId: string
  readonly evaluationRunId: string
  readonly candidateId: string | null
  readonly unitId: string
  readonly level: "CANDIDATE" | "UNIT"
  readonly ruleId: string
  readonly ruleVersion: string
  readonly outcome: "PASSED" | "ADVISORY" | "BLOCKED" | "NOT_EVALUATED"
  readonly policyVersionId: string
  readonly providerCertificationSnapshotId: string
  readonly createdAt: string
}

export interface CandidateNormalizationInput {
  readonly candidate: PopulationCandidate
  readonly datasetRegistrySnapshotId: string
  readonly providerRegistrySnapshotId: string
  readonly providerCertificationSnapshotId: string
  readonly policyVersionId: string
  readonly schemaVersion: string
  readonly normalizationVersion: string
  readonly rawManifestId: string
}

export interface CandidateCanonicalSubmission {
  readonly submissionId: string
  readonly candidateId: string
  readonly command: CanonicalCommitCommand
  readonly submittedAt: string
}

export type PopulationOutcome =
  | { readonly kind: "COMMITTED"; readonly outcomeId: string; readonly candidateId: string; readonly commitId: string; readonly canonicalRecordId: string; readonly recordVersion: number; readonly createdAt: string }
  | { readonly kind: "DUPLICATE"; readonly outcomeId: string; readonly candidateId: string; readonly canonicalRecordId: string; readonly recordVersion: number; readonly createdAt: string }
  | { readonly kind: "CONFLICT"; readonly outcomeId: string; readonly candidateId: string; readonly conflictId: string; readonly quarantineId: string; readonly createdAt: string }
  | { readonly kind: "QUARANTINED" | "EMPTY" | "UNSUPPORTED" | "PERMANENT_FAILURE" | "CANCELLED" | "SKIPPED_BY_POLICY"; readonly outcomeId: string; readonly candidateId: string | null; readonly reasonCodes: readonly string[]; readonly createdAt: string }
  | { readonly kind: "RETRYABLE_FAILURE"; readonly outcomeId: string; readonly candidateId: string | null; readonly retryClassificationId: string; readonly createdAt: string }

export interface PopulationFailure {
  readonly failureId: string
  readonly unitId: string
  readonly candidateId: string | null
  readonly classificationId: string
  readonly reasonCode: string
  readonly message: string
  readonly occurredAt: string
}

export interface PopulationRetryClassification {
  readonly classificationId: string
  readonly failureKind: "TRANSPORT_TIMEOUT" | "DNS_NETWORK" | "HTTP_429" | "HTTP_5XX" | "HTTP_4XX" | "UNSUPPORTED_CAPABILITY" | "EMPTY_RESPONSE" | "MALFORMED_PAYLOAD" | "DECOMPRESSION_FAILURE" | "CHECKSUM_MISMATCH" | "PARSER_FAILURE" | "SCHEMA_MISMATCH" | "MISSING_REGISTRY" | "MISSING_CERTIFICATION" | "VALIDATION_REJECTION" | "QUALITY_BLOCK" | "D2_DUPLICATE" | "D2_CONFLICT" | "D2_RETRYABLE_FAILURE" | "POSTGRES_CONNECTION" | "WORKER_CRASH" | "LEASE_EXPIRATION" | "CANCELLATION"
  readonly retryable: boolean
  readonly retryOwner: RetryOwner
  readonly runBehavior: RetryRunBehavior
  readonly reuseCandidate: boolean
  readonly reuseRawManifest: boolean
  readonly quarantine: boolean
  readonly alertEligible: boolean
}

export interface RetryPolicyReference {
  readonly policyId: string
  readonly policyVersion: string
  readonly classificationId: string
  readonly delayStrategy: RetryDelayStrategy
  readonly maximumAttemptsPolicyKey: string
  readonly providerRetryAfterPrecedence: boolean
  readonly jitterPolicyKey: string | null
  readonly exhaustionOutcome: "PERMANENT_FAILURE" | "QUARANTINED" | "UNSUPPORTED"
}

export interface PopulationWatermarkEligibility {
  readonly decisionId: string
  readonly unitId: string
  readonly datasetId: string
  readonly providerId: string
  readonly dimensions: PopulationDimensions
  readonly outcomeIds: readonly string[]
  readonly requiredUnitPolicyId: string
  readonly result: WatermarkEligibilityResult
  readonly blockingReasons: readonly string[]
  readonly policyVersionId: string
  readonly createdAt: string
}

export interface PopulationPublicationHandoff {
  readonly handoffId: string
  readonly candidateId: string
  readonly canonicalRecordId: string
  readonly recordVersion: number
  readonly commitId: string
  readonly publicationState: "PENDING"
  readonly publicationPolicyVersionId: string
  readonly createdAt: string
}

export type PopulationCommandResult =
  | { readonly status: "ACCEPTED"; readonly jobId: string }
  | { readonly status: "DUPLICATE_REQUEST"; readonly jobId: string }
  | { readonly status: "REJECTED"; readonly reasonCodes: readonly string[] }

export interface NormalizerRegistration<K extends PopulationCandidate["kind"]> {
  readonly datasetId: string
  readonly candidateKind: K
  readonly normalizationVersion: string
  readonly normalize: (input: CandidateNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: K }> }) => CanonicalCommitCommand
}

export interface CanonicalCommitPort { execute(command: CanonicalCommitCommand): Promise<CanonicalCommitResult> }

export interface ObjectStoragePort {
  putImmutable(input: { readonly objectStorageKey: string; readonly contentHash: string; readonly mediaType: string; readonly byteLength: number; readonly content: AsyncIterable<Uint8Array> }): Promise<RawArtifactReference>
  stat(objectStorageKey: string): Promise<{ readonly exists: boolean; readonly contentHash: string | null; readonly byteLength: number | null }>
  read(objectStorageKey: string): AsyncIterable<Uint8Array>
}
