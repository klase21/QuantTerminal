import { evaluatePublicationGate } from "@/lib/data-platform/contracts"
const base = { checksumConflict: false, qualityResults: [], consistencyMatched: true, providerExperimental: false, experimentalPublicationAllowed: false, projectionWatermarkCurrent: true, missingNoncriticalMetadata: false, partialPublicationAllowed: false } as const
export const publishDecision = evaluatePublicationGate(base)
export const checksumDecision = evaluatePublicationGate({ ...base, checksumConflict: true })
export const mismatchDecision = evaluatePublicationGate({ ...base, consistencyMatched: false })
export const experimentalDecision = evaluatePublicationGate({ ...base, providerExperimental: true })
