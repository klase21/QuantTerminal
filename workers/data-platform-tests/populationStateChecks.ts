import { aggregateJobState, isLegalJobTransition, isLegalUnitTransition, nextFencingToken, requireCurrentFencingToken } from "@/lib/data-platform/population"

export const legalJobTransitions = isLegalJobTransition("QUEUED", "RUNNING") && isLegalJobTransition("RUNNING", "SUCCEEDED")
export const illegalJobTransitionsFail = !isLegalJobTransition("SUCCEEDED", "RUNNING") && !isLegalJobTransition("FAILED", "QUEUED")
export const legalUnitTransitions = isLegalUnitTransition("PENDING", "LEASED") && isLegalUnitTransition("PROCESSING", "COMPLETED") && isLegalUnitTransition("RETRYABLE", "LEASED")
export const illegalUnitTransitionsFail = !isLegalUnitTransition("COMPLETED", "PROCESSING") && !isLegalUnitTransition("PENDING", "COMPLETED")
let staleRejected = false
try { requireCurrentFencingToken(2, 3) } catch { staleRejected = true }
export const staleFencingRejected = staleRejected
export const fencingMonotonic = nextFencingToken(3) === 4
export const aggregateSucceeded = aggregateJobState(["COMPLETED", "COMPLETED"], [true, true]) === "SUCCEEDED"
export const aggregatePartial = aggregateJobState(["COMPLETED", "FAILED"], [true, true]) === "PARTIAL"
export const aggregateFailed = aggregateJobState(["FAILED", "QUARANTINED"], [true, true]) === "FAILED"
