import { createHash } from "node:crypto"
import type { PopulationJobRequest, PopulationUnitIdentity } from "./contracts"

function digest(namespace: string, ordered: readonly (string | null)[]): string {
  return `${namespace}:${createHash("sha256").update(JSON.stringify(ordered)).digest("hex")}`
}

export function createJobRequestIdentity(input: Omit<PopulationJobRequest, "requestIdentity" | "occurrenceIdentity" | "intentionalRerunIdentity" | "requestedAt" | "requestedBy">): string {
  const d = input.dimensions
  return digest("population-job-request-v1", [input.profile.profileId, input.profile.profileVersion, input.datasetId, input.providerId, d.venue, d.subjectOrSymbol, d.windowStart, d.windowEnd, d.resolution, d.partitionKey])
}

export function createPopulationJobId(requestIdentity: string, occurrenceIdentity: string, intentionalRerunIdentity: string | null): string {
  return digest("population-job-v1", [requestIdentity, occurrenceIdentity, intentionalRerunIdentity])
}

export function createPopulationRunId(jobId: string, attemptNumber: number): string {
  if (!Number.isInteger(attemptNumber) || attemptNumber <= 0) throw new Error("Run attempt number must be positive")
  return digest("population-run-v1", [jobId, String(attemptNumber)])
}

export function createPopulationUnitId(identity: PopulationUnitIdentity): string {
  return digest("population-unit-v1", [identity.profileId, identity.profileVersion, identity.datasetId, identity.providerId, identity.venue, identity.subjectOrSymbol, identity.windowStart, identity.windowEnd, identity.resolution, identity.partitionKey])
}

export function createRetrievalAttemptId(unitId: string, runId: string, attemptNumber: number): string {
  if (!Number.isInteger(attemptNumber) || attemptNumber <= 0) throw new Error("Retrieval attempt number must be positive")
  return digest("retrieval-attempt-v1", [unitId, runId, String(attemptNumber)])
}

export function createCandidateId(input: { readonly rawManifestId: string; readonly sourceObservationId: string; readonly parserVersion: string; readonly candidateOrdinal: string }): string {
  return digest("population-candidate-v1", [input.rawManifestId, input.sourceObservationId, input.parserVersion, input.candidateOrdinal])
}
