export const MVP8Z2_CANDIDATE_REVIEW_MODE = "CUTOVER_CANDIDATE_2026_07_16" as const
export const MVP8Z2_CANDIDATE_REVIEW_START = "2026-07-15T00:00:00.000Z" as const
export const MVP8Z2_CANDIDATE_REVIEW_END = "2026-07-16T00:00:00.000Z" as const

export const MVP8Z2_CANDIDATE_REPLAY_REVIEWS = Object.freeze([
  Object.freeze({ instrument: "BTCUSDT", projectionVersionId: "mvpv_8105e949ab2a6f0b619375fbb16fef73a0d875cedb279af57fe7afe974a067ba" }),
  Object.freeze({ instrument: "ETHUSDT", projectionVersionId: "mvpv_090b3381299ac7a317bd432c08a08c0956d891949df9417f2b7db61682c611d9" }),
  Object.freeze({ instrument: "SOLUSDT", projectionVersionId: "mvpv_ac37f0a16aca8d4095e6ab8974c3e9519ed6bcc82751df61212707e462c47124" }),
  Object.freeze({ instrument: "BNBUSDT", projectionVersionId: "mvpv_b6089b2dcaff6ddabd15ea0725149239ffa17244a226305ae2038cfec7dbbd68" }),
  Object.freeze({ instrument: "XRPUSDT", projectionVersionId: "mvpv_911d9562a8b7d549e592ab9dcfb8ebe31e30599e6f5e62e54dea20a49dd8cb02" }),
  Object.freeze({ instrument: "DOGEUSDT", projectionVersionId: "mvpv_52a13aa81e4881398d74fc4fa14374dff82e7a9487fd0c3c9867ec2cc2edc57b" }),
] as const)

export type Mvp8z2CandidateReviewInstrument = typeof MVP8Z2_CANDIDATE_REPLAY_REVIEWS[number]["instrument"]

export function isMvp8z2CandidateReviewMode(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.NEXT_PUBLIC_MVP_CANDIDATE_REVIEW_MODE === MVP8Z2_CANDIDATE_REVIEW_MODE
}

export function isMvp8z2CandidateReviewPreview(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.VERCEL_ENV === "preview" && environment.MVP_SERVING_PREVIEW_CANDIDATE_MODE === "EXPLICIT_CANDIDATE_DB_REVIEW"
}

export function mvp8z2CandidateReplayReview(instrument: string | undefined) {
  const normalized = instrument?.trim().toUpperCase() ?? "BTCUSDT"
  return MVP8Z2_CANDIDATE_REPLAY_REVIEWS.find((review) => review.instrument === normalized) ?? MVP8Z2_CANDIDATE_REPLAY_REVIEWS[0]
}

export function mvp8z2CandidateReplayHref(instrument: string): string {
  const review = mvp8z2CandidateReplayReview(instrument)
  const query = new URLSearchParams({
    instrument: review.instrument,
    start: MVP8Z2_CANDIDATE_REVIEW_START,
    end: MVP8Z2_CANDIDATE_REVIEW_END,
    projection: review.projectionVersionId,
  })
  return `/replay?${query.toString()}`
}
