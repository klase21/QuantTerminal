import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP8V_APPROVED_CANDIDATE_ID,
  MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP_GREEN_PREVIEW_CANDIDATE_TARGET_ID,
  resolveMvpServingPreviewCandidate,
} from "@/lib/data-platform/mvp-serving/preview"
import {
  MVP8Z2_CANDIDATE_REPLAY_REVIEWS,
  MVP8Z2_CANDIDATE_REVIEW_END,
  MVP8Z2_CANDIDATE_REVIEW_MODE,
  MVP8Z2_CANDIDATE_REVIEW_START,
  mvp8z2CandidateReplayHref,
} from "@/lib/data-platform/mvp-serving/candidateReview"
import { mvpApiQuery, normalizeMvpRouteContext } from "@/lib/mvp-route-context"

const exact = {
  VERCEL_ENV: "preview",
  MVP_SERVING_PREVIEW_CANDIDATE_MODE: "EXPLICIT_CANDIDATE_DB_REVIEW",
  MVP_SERVING_PREVIEW_CANDIDATE_ID: MVP8V_APPROVED_CANDIDATE_ID,
  MVP_SERVING_PREVIEW_CANDIDATE_CHECKSUM: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP_SERVING_PREVIEW_MEMBER_SET_CHECKSUM: MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP_SERVING_PREVIEW_COMMON_WATERMARK_CHECKSUM: MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP_SERVING_PREVIEW_TARGET_ID: MVP_GREEN_PREVIEW_CANDIDATE_TARGET_ID,
}

const config = resolveMvpServingPreviewCandidate(exact)
assert.equal(config?.targetId, MVP_GREEN_PREVIEW_CANDIDATE_TARGET_ID)
assert.equal(config?.branchId, "br-muddy-unit-ao3o6iid")
assert.equal(config?.candidateId, MVP8V_APPROVED_CANDIDATE_ID)
assert.equal(config?.candidateChecksum, MVP8V_APPROVED_CANDIDATE_CHECKSUM)
assert.equal(config?.memberSetChecksum, MVP8V_APPROVED_MEMBER_SET_CHECKSUM)
assert.equal(config?.commonWatermarkChecksum, MVP8V_APPROVED_WATERMARK_CHECKSUM)
assert.equal(config?.reviewMode, "SEPARATE_CANDIDATE_DB")
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, VERCEL_ENV: "production" }), /SERVING_PREVIEW_ENVIRONMENT_INVALID/)
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, MVP_SERVING_PREVIEW_TARGET_ID: "neon:soft-cell-16396854\/br-flat-grass-ao9rtnyr\/neondb" }), /SERVING_PREVIEW_BINDING_MISMATCH/)
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, MVP_SERVING_PREVIEW_TARGET_ID: "neon:soft-cell-16396854\/br-royal-block-aop70mzq\/neondb" }), /SERVING_PREVIEW_BINDING_MISMATCH/)
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, MVP_SERVING_PREVIEW_CANDIDATE_ID: "*" }), /SERVING_PREVIEW_BINDING_INVALID/)
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, MVP_SERVING_PREVIEW_RETRY_APPROVAL_ID: `mvp8s-approval:${"0".repeat(64)}` }), /SERVING_PREVIEW_CANDIDATE_DB_RETRY_FORBIDDEN/)

const landing = readFileSync("app/candidate-review/page.tsx", "utf8")
const server = readFileSync("lib/data-platform/mvp-serving/server.ts", "utf8")
assert.match(landing, /VERCEL_ENV !== "preview"/)
assert.match(landing, /EXPLICIT_CANDIDATE_DB_REVIEW/)
assert.match(landing, /MVP8Z2_CANDIDATE_REPLAY_REVIEWS/)
assert.match(server, /target\[0\]\?\.branch_id !== preview\.branchId/)
assert.equal(MVP8Z2_CANDIDATE_REPLAY_REVIEWS.length, 6)
for (const review of MVP8Z2_CANDIDATE_REPLAY_REVIEWS) {
  const url = new URL(mvp8z2CandidateReplayHref(review.instrument), "https://preview.invalid")
  assert.equal(url.searchParams.get("instrument"), review.instrument)
  assert.equal(url.searchParams.get("start"), MVP8Z2_CANDIDATE_REVIEW_START)
  assert.equal(url.searchParams.get("end"), MVP8Z2_CANDIDATE_REVIEW_END)
  assert.equal(url.searchParams.get("projection"), review.projectionVersionId)
  assert.equal(url.searchParams.get("timestamp"), null)
}

const previousReviewMode = process.env.NEXT_PUBLIC_MVP_CANDIDATE_REVIEW_MODE
process.env.NEXT_PUBLIC_MVP_CANDIDATE_REVIEW_MODE = MVP8Z2_CANDIDATE_REVIEW_MODE
const normalizedReplay = normalizeMvpRouteContext("replay", new URLSearchParams({ instrument: "SOLUSDT", start: "2026-07-10T00:00:00.000Z", end: "2026-07-11T00:00:00.000Z", projection: "mvpv_75febb52e54434d3f46960ead55908a2d488c3d7f3461fd92f9137766fe0f638" }))
assert.equal(normalizedReplay.get("start"), MVP8Z2_CANDIDATE_REVIEW_START)
assert.equal(normalizedReplay.get("end"), MVP8Z2_CANDIDATE_REVIEW_END)
assert.equal(normalizedReplay.get("timestamp"), MVP8Z2_CANDIDATE_REVIEW_START)
assert.equal(normalizedReplay.get("projection"), MVP8Z2_CANDIDATE_REPLAY_REVIEWS[2].projectionVersionId)
const browserApiQuery = mvpApiQuery("replay", new URLSearchParams(mvp8z2CandidateReplayHref("ETHUSDT").split("?")[1]), { candidateReview: true })
assert.equal(browserApiQuery.get("instrument"), "ETHUSDT")
assert.equal(browserApiQuery.get("start"), MVP8Z2_CANDIDATE_REVIEW_START)
assert.equal(browserApiQuery.get("end"), MVP8Z2_CANDIDATE_REVIEW_END)
assert.equal(browserApiQuery.get("projection"), MVP8Z2_CANDIDATE_REPLAY_REVIEWS[1].projectionVersionId)
assert.equal(browserApiQuery.get("timestamp"), null)
const boundedInstrument = normalizeMvpRouteContext("replay", new URLSearchParams({ instrument: "NOT_IN_REVIEW" }))
assert.equal(boundedInstrument.get("instrument"), "BTCUSDT")
assert.equal(boundedInstrument.get("projection"), MVP8Z2_CANDIDATE_REPLAY_REVIEWS[0].projectionVersionId)
if (previousReviewMode === undefined) delete process.env.NEXT_PUBLIC_MVP_CANDIDATE_REVIEW_MODE
else process.env.NEXT_PUBLIC_MVP_CANDIDATE_REVIEW_MODE = previousReviewMode

const productionReplay = normalizeMvpRouteContext("replay", new URLSearchParams({ instrument: "SOLUSDT", start: "2026-07-10T00:00:00.000Z", end: "2026-07-11T00:00:00.000Z" }))
assert.equal(productionReplay.get("start"), "2026-07-10T00:00:00.000Z")
assert.equal(productionReplay.get("end"), "2026-07-11T00:00:00.000Z")

const navigation = readFileSync("components/layout/PrimaryNavigation.tsx", "utf8")
assert.match(navigation, /CUTOVER CANDIDATE PREVIEW/)
assert.match(navigation, /READ-ONLY · NOT PRODUCTION/)
assert.match(navigation, /NEXT_PUBLIC_MVP_CANDIDATE_REVIEW_MODE/)

process.stdout.write(JSON.stringify({ status: "PASS", targetId: MVP_GREEN_PREVIEW_CANDIDATE_TARGET_ID, replayLinks: 6 }))
