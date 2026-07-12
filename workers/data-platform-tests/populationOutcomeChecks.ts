import { mapCommitResult, watermarkResultForOutcome } from "@/lib/data-platform/population"
import type { CanonicalCommitResult } from "@/lib/data-platform/persistence"

const duplicate: CanonicalCommitResult = { status: "DUPLICATE", canonicalRecordId: "canonical:1", recordVersion: 1, checksum: "a".repeat(64) }
const conflict: CanonicalCommitResult = { status: "CONFLICT", conflict: { conflictId: "conflict:1", identity: { datasetId: "funding", businessIdentity: "funding:1", canonicalRecordId: "canonical:1" }, recordVersion: 1, existingChecksum: "a".repeat(64), candidateChecksum: "b".repeat(64), rawObjectId: "raw:1", detectedAt: "2026-07-12T00:00:00.000Z" }, quarantine: { quarantineId: "quarantine:1", rawObjectId: "raw:1", attemptedIdentity: null, conflictId: "conflict:1", reasonCodes: ["CHECKSUM_CONFLICT"], createdAt: "2026-07-12T00:00:00.000Z" } }
const duplicateOutcome = mapCommitResult(duplicate, "candidate:1", "outcome:1", "2026-07-12T00:00:00.000Z")
const conflictOutcome = mapCommitResult(conflict, "candidate:1", "outcome:2", "2026-07-12T00:00:00.000Z")
export const duplicateIsIdempotentCompletion = duplicateOutcome.kind === "DUPLICATE" && watermarkResultForOutcome(duplicateOutcome.kind) === "ELIGIBLE"
export const conflictIsNotSuccess = conflictOutcome.kind === "CONFLICT" && watermarkResultForOutcome(conflictOutcome.kind) === "BLOCKED_CONFLICT"
export const failedCommitCannotAdvance = watermarkResultForOutcome("RETRYABLE_FAILURE") === "BLOCKED_RETRY" && watermarkResultForOutcome("PERMANENT_FAILURE") === "BLOCKED_MISSING"
