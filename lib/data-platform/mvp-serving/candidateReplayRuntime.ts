import { isMvp8z2CandidateReviewPreview } from "./candidateReview"
import { resolveMvpServingProductionCandidateDb } from "./productionCandidateDb"

export type MvpCandidateReplayRuntime =
  | "PREVIEW_EXPLICIT_CANDIDATE_DB_REVIEW"
  | "PRODUCTION_EXACT_CANDIDATE_DB"

export function resolveMvpCandidateReplayRuntime(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): MvpCandidateReplayRuntime | null {
  if (isMvp8z2CandidateReviewPreview(environment))
    return "PREVIEW_EXPLICIT_CANDIDATE_DB_REVIEW"

  return resolveMvpServingProductionCandidateDb(environment)
    ? "PRODUCTION_EXACT_CANDIDATE_DB"
    : null
}

export function isMvpCandidateReplayRuntime(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return resolveMvpCandidateReplayRuntime(environment) !== null
}
