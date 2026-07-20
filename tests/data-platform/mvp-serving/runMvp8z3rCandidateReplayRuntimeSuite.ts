import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  MVP8Z2_CANDIDATE_REPLAY_REVIEWS,
  MVP8Z2_CANDIDATE_REVIEW_END,
  MVP8Z2_CANDIDATE_REVIEW_START,
  mvp8z2CandidateReplayHref,
} from "@/lib/data-platform/mvp-serving/candidateReview"
import {
  isMvpCandidateReplayRuntime,
  resolveMvpCandidateReplayRuntime,
} from "@/lib/data-platform/mvp-serving/candidateReplayRuntime"
import { MVP8Z3_PRODUCTION_CANDIDATE_DB_MODE } from "@/lib/data-platform/mvp-serving/productionCandidateDb"
import {
  MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP8V_APPROVED_CANDIDATE_ID,
  MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP8Z2_CANDIDATE_TARGET_ID,
} from "@/lib/data-platform/mvp-serving/preview"
import { MVP8Z_PRODUCTION_PROJECT_ID } from "@/lib/data-platform/mvp-serving/runtimeSelection"
import { mvpApiQuery, normalizeMvpRouteContext } from "@/lib/mvp-route-context"

const preview = Object.freeze({
  VERCEL_ENV: "preview",
  MVP_SERVING_PREVIEW_CANDIDATE_MODE: "EXPLICIT_CANDIDATE_DB_REVIEW",
})
const syntheticCandidateUrl = [
  "postgresql:",
  "",
  "mvp_serving_reader:synthetic@ep-candidate-pooler.ap-southeast-1.aws.neon.tech",
  "neondb?sslmode=require",
].join("/")
const production = Object.freeze({
  VERCEL_ENV: "production",
  MVP_SERVING_VERCEL_PROJECT_ID: MVP8Z_PRODUCTION_PROJECT_ID,
  MVP_SERVING_PRODUCTION_CANDIDATE_DB_MODE: MVP8Z3_PRODUCTION_CANDIDATE_DB_MODE,
  MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL: syntheticCandidateUrl,
  MVP_SERVING_PRODUCTION_CANDIDATE_TARGET_ID: MVP8Z2_CANDIDATE_TARGET_ID,
  MVP_SERVING_PRODUCTION_CANDIDATE_ID: MVP8V_APPROVED_CANDIDATE_ID,
  MVP_SERVING_PRODUCTION_CANDIDATE_CHECKSUM: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP_SERVING_PRODUCTION_MEMBER_SET_CHECKSUM: MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP_SERVING_PRODUCTION_COMMON_WATERMARK_CHECKSUM: MVP8V_APPROVED_WATERMARK_CHECKSUM,
})

assert.equal(resolveMvpCandidateReplayRuntime(preview), "PREVIEW_EXPLICIT_CANDIDATE_DB_REVIEW")
assert.equal(resolveMvpCandidateReplayRuntime(production), "PRODUCTION_EXACT_CANDIDATE_DB")
assert.equal(isMvpCandidateReplayRuntime(preview), true)
assert.equal(isMvpCandidateReplayRuntime(production), true)
assert.equal(isMvpCandidateReplayRuntime({ VERCEL_ENV: "production" }), false)
assert.equal(isMvpCandidateReplayRuntime({ VERCEL_ENV: "development" }), false)
assert.equal(isMvpCandidateReplayRuntime({ VERCEL_ENV: "preview" }), false)
assert.throws(
  () => isMvpCandidateReplayRuntime({ ...production, MVP_SERVING_VERCEL_PROJECT_ID: "prj_wrong" }),
  /SERVING_PRODUCTION_CANDIDATE_DB_ENVIRONMENT_INVALID/,
)

for (const runtime of [preview, production]) {
  assert.equal(isMvpCandidateReplayRuntime(runtime), true)
  for (const review of MVP8Z2_CANDIDATE_REPLAY_REVIEWS) {
    const browserUrl = new URL(mvp8z2CandidateReplayHref(review.instrument), "https://candidate.invalid")
    assert.equal(browserUrl.searchParams.get("instrument"), review.instrument)
    assert.equal(browserUrl.searchParams.get("start"), MVP8Z2_CANDIDATE_REVIEW_START)
    assert.equal(browserUrl.searchParams.get("end"), MVP8Z2_CANDIDATE_REVIEW_END)
    assert.equal(browserUrl.searchParams.get("projection"), review.projectionVersionId)
    assert.equal(browserUrl.searchParams.get("timestamp"), null)

    const normalized = normalizeMvpRouteContext("replay", browserUrl.searchParams, { candidateReview: true })
    const apiQuery = mvpApiQuery("replay", normalized, { candidateReview: true })
    assert.equal(apiQuery.get("instrument"), review.instrument)
    assert.equal(apiQuery.get("start"), MVP8Z2_CANDIDATE_REVIEW_START)
    assert.equal(apiQuery.get("end"), MVP8Z2_CANDIDATE_REVIEW_END)
    assert.equal(apiQuery.get("projection"), review.projectionVersionId)
    assert.equal(apiQuery.get("timestamp"), null)
  }
}

const ordinaryProduction = normalizeMvpRouteContext(
  "replay",
  new URLSearchParams({ instrument: "ETHUSDT", start: "2026-07-10T00:00:00.000Z", end: "2026-07-11T00:00:00.000Z" }),
  { candidateReview: false },
)
assert.equal(ordinaryProduction.get("start"), "2026-07-10T00:00:00.000Z")
assert.equal(ordinaryProduction.get("end"), "2026-07-11T00:00:00.000Z")
assert.equal(ordinaryProduction.get("projection"), null)

for (const view of ["dashboard", "scanner", "trade"] as const) {
  const query = mvpApiQuery(view, new URLSearchParams({ instrument: "BTCUSDT" }), { candidateReview: true })
  assert.equal(query.get("view"), view)
  assert.equal(query.get("projection"), null)
}

const replayPage = readFileSync("app/replay/page.tsx", "utf8")
const cutoverPage = readFileSync("components/mvp-cutover/MvpCutoverPage.tsx", "utf8")
assert.match(replayPage, /isMvpCandidateReplayRuntime\(\)/)
assert.match(replayPage, /mvp8z2CandidateReplayHref\("BTCUSDT"\)/)
assert.match(cutoverPage, /mvpApiQuery\(view, new URLSearchParams\(params\), \{ candidateReview \}\)/)
assert.doesNotMatch(cutoverPage, /timestamp:\s*window\[0\].*projection:/)

process.stdout.write(JSON.stringify({
  status: "PASS",
  runtimes: ["PREVIEW_EXPLICIT_CANDIDATE_DB_REVIEW", "PRODUCTION_EXACT_CANDIDATE_DB"],
  replayLinksPerRuntime: MVP8Z2_CANDIDATE_REPLAY_REVIEWS.length,
}))
