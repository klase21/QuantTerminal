import { createCandidateId, createJobRequestIdentity, createPopulationJobId, createPopulationRunId, createPopulationUnitId, createRetrievalAttemptId } from "@/lib/data-platform/population"

const dimensions = { venue: "binance-futures", subjectOrSymbol: "BTCUSDT", windowStart: "2026-07-01T00:00:00.000Z", windowEnd: "2026-07-02T00:00:00.000Z", resolution: "5m", partitionKey: "2026-07-01" } as const
const profile = { profileId: "backfill-ohlcv", profileVersion: "1", kind: "BACKFILL", requiredDimensions: ["subjectOrSymbol", "windowStart", "windowEnd", "resolution"], rawRetrievalRequired: true, mayReuseVerifiedManifest: true, retryPolicyId: "retry.ohlcv", retryPolicyVersion: "1", watermarkPolicyId: "watermark.ohlcv", watermarkPolicyVersion: "1" } as const
const requestInput = { profile, datasetId: "ohlcv", providerId: "binance-public-archive", dimensions }
export const jobRequestA = createJobRequestIdentity(requestInput)
export const jobRequestB = createJobRequestIdentity(requestInput)
export const jobId = createPopulationJobId(jobRequestA, "schedule:2026-07-02", null)
export const runId = createPopulationRunId(jobId, 1)
export const unitIdA = createPopulationUnitId({ profileId: profile.profileId, profileVersion: profile.profileVersion, datasetId: "ohlcv", providerId: "binance-public-archive", ...dimensions })
export const unitIdB = createPopulationUnitId({ profileId: profile.profileId, profileVersion: profile.profileVersion, datasetId: "ohlcv", providerId: "binance-public-archive", ...dimensions })
export const retrievalId = createRetrievalAttemptId(unitIdA, runId, 1)
export const candidateA = createCandidateId({ rawManifestId: "raw-manifest:abc", sourceObservationId: "source:1", parserVersion: "1", candidateOrdinal: "0" })
export const candidateB = createCandidateId({ rawManifestId: "raw-manifest:abc", sourceObservationId: "source:1", parserVersion: "1", candidateOrdinal: "0" })
export const distinctIdentities = new Set([jobId, runId, unitIdA, retrievalId, candidateA]).size === 5
export const candidateIndependentOfRunWorker = candidateA === candidateB
