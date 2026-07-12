import { validateCorrectionTransition, type CompatibilityClassification } from "@/lib/data-platform/contracts"
export const compatibility: CompatibilityClassification = "REQUIRES_RENORMALIZATION"
export const correctionValid = validateCorrectionTransition({ fromVersion: "1", toVersion: "2", compatibility: "BACKWARD_COMPATIBLE", supersession: { previousCanonicalRecordId: "rec-1", previousRecordVersion: "1", reason: "PROVIDER_CORRECTION", supersededAt: "2026-07-12T00:00:00.000Z" } })
