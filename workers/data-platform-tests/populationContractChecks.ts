import type { PopulationCandidate, PopulationRetryClassification } from "@/lib/data-platform/population"

const classificationKinds: readonly PopulationRetryClassification["failureKind"][] = ["TRANSPORT_TIMEOUT","DNS_NETWORK","HTTP_429","HTTP_5XX","HTTP_4XX","UNSUPPORTED_CAPABILITY","EMPTY_RESPONSE","MALFORMED_PAYLOAD","DECOMPRESSION_FAILURE","CHECKSUM_MISMATCH","PARSER_FAILURE","SCHEMA_MISMATCH","MISSING_REGISTRY","MISSING_CERTIFICATION","VALIDATION_REJECTION","QUALITY_BLOCK","D2_DUPLICATE","D2_CONFLICT","D2_RETRYABLE_FAILURE","POSTGRES_CONNECTION","WORKER_CRASH","LEASE_EXPIRATION","CANCELLATION"]
export const retryTaxonomyComplete = new Set(classificationKinds).size === 23
export const candidateKindsBounded: readonly PopulationCandidate["kind"][] = ["OHLCV", "FUNDING", "OPEN_INTEREST", "LIQUIDATION", "STREAM_MANIFEST"]
export const candidateToSubmissionCardinality = "one candidate has a unique canonical submission" as const
