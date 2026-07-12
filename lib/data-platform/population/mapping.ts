import type { CanonicalCommitResult } from "@/lib/data-platform/persistence"
import type { PopulationOutcome, PopulationWatermarkEligibility, WatermarkEligibilityResult } from "./contracts"

export function mapCommitResult(input: CanonicalCommitResult, candidateId: string, outcomeId: string, createdAt: string): PopulationOutcome {
  switch (input.status) {
    case "SUCCESS": return { kind: "COMMITTED", outcomeId, candidateId, commitId: input.commit.commitId, canonicalRecordId: input.fact.canonicalRecordId, recordVersion: input.fact.recordVersion, createdAt }
    case "DUPLICATE": return { kind: "DUPLICATE", outcomeId, candidateId, canonicalRecordId: input.canonicalRecordId, recordVersion: input.recordVersion, createdAt }
    case "CONFLICT": return { kind: "CONFLICT", outcomeId, candidateId, conflictId: input.conflict.conflictId, quarantineId: input.quarantine.quarantineId, createdAt }
    case "REJECTED": return { kind: "PERMANENT_FAILURE", outcomeId, candidateId, reasonCodes: input.reasons, createdAt }
    case "RETRYABLE_FAILURE": return { kind: "RETRYABLE_FAILURE", outcomeId, candidateId, retryClassificationId: input.code, createdAt }
  }
}

export function watermarkResultForOutcome(kind: PopulationOutcome["kind"]): WatermarkEligibilityResult {
  switch (kind) {
    case "COMMITTED": case "DUPLICATE": return "ELIGIBLE"
    case "CONFLICT": return "BLOCKED_CONFLICT"
    case "RETRYABLE_FAILURE": return "BLOCKED_RETRY"
    case "QUARANTINED": return "BLOCKED_QUALITY"
    case "EMPTY": case "PERMANENT_FAILURE": return "BLOCKED_MISSING"
    case "UNSUPPORTED": return "UNSUPPORTED"
    case "CANCELLED": return "BLOCKED_CANCELLED"
    case "SKIPPED_BY_POLICY": return "NOT_APPLICABLE"
  }
}

export function createWatermarkEligibility(input: Omit<PopulationWatermarkEligibility, "result"> & { readonly outcome: PopulationOutcome }): PopulationWatermarkEligibility {
  return { ...input, result: watermarkResultForOutcome(input.outcome.kind) }
}
