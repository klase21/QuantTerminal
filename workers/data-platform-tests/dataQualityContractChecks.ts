import { qualityRunPasses, validateQualityPolicy } from "@/lib/data-platform/contracts"
import { QUALITY_POLICIES } from "@/lib/data-platform/registry"
export const policiesValid = QUALITY_POLICIES.every(validateQualityPolicy)
export const mandatoryNotEvaluatedFails = !qualityRunPasses({ evaluationId: "q1", datasetId: "funding", policyVersion: "1", evaluatedAt: "2026-07-12T00:00:00.000Z", resolution: "OPEN", results: [{ ruleId: "structural.schema", mandatory: true, result: "NOT_EVALUATED", severity: "CRITICAL", details: [] }] })
