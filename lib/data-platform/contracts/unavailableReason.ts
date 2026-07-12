export const UNAVAILABLE_REASONS = [
  "PROVIDER_MISSING", "RAW_DATA_MISSING", "NORMALIZATION_MISSING", "QUALITY_POLICY_MISSING",
  "CANONICAL_SCHEMA_MISSING", "IDENTITY_MISSING", "COVERAGE_MISSING", "CONSISTENCY_FAILED",
  "PROJECTION_MISSING", "EVIDENCE_LINEAGE_MISSING", "COUNTER_EVIDENCE_MISSING",
  "CONSUMER_MIGRATION_PENDING", "INTENTIONALLY_UNSUPPORTED",
] as const
export type UnavailableReason = typeof UNAVAILABLE_REASONS[number]
export function isUnavailableReason(value: unknown): value is UnavailableReason { return typeof value === "string" && UNAVAILABLE_REASONS.includes(value as UnavailableReason) }
