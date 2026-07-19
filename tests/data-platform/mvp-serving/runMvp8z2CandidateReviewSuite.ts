import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP8V_APPROVED_CANDIDATE_ID,
  MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP8Z2_CANDIDATE_TARGET_ID,
  resolveMvpServingPreviewCandidate,
} from "@/lib/data-platform/mvp-serving/preview"

const exact = {
  VERCEL_ENV: "preview",
  MVP_SERVING_PREVIEW_CANDIDATE_MODE: "EXPLICIT_CANDIDATE_DB_REVIEW",
  MVP_SERVING_PREVIEW_CANDIDATE_ID: MVP8V_APPROVED_CANDIDATE_ID,
  MVP_SERVING_PREVIEW_CANDIDATE_CHECKSUM: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP_SERVING_PREVIEW_MEMBER_SET_CHECKSUM: MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP_SERVING_PREVIEW_COMMON_WATERMARK_CHECKSUM: MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP_SERVING_PREVIEW_TARGET_ID: MVP8Z2_CANDIDATE_TARGET_ID,
}

const config = resolveMvpServingPreviewCandidate(exact)
assert.equal(config?.targetId, MVP8Z2_CANDIDATE_TARGET_ID)
assert.equal(config?.branchId, "br-flat-grass-ao9rtnyr")
assert.equal(config?.reviewMode, "SEPARATE_CANDIDATE_DB")
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, VERCEL_ENV: "production" }), /SERVING_PREVIEW_ENVIRONMENT_INVALID/)
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, MVP_SERVING_PREVIEW_TARGET_ID: "neon:soft-cell-16396854\/br-royal-block-aop70mzq\/neondb" }), /SERVING_PREVIEW_BINDING_MISMATCH/)
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, MVP_SERVING_PREVIEW_CANDIDATE_ID: "*" }), /SERVING_PREVIEW_BINDING_INVALID/)
assert.throws(() => resolveMvpServingPreviewCandidate({ ...exact, MVP_SERVING_PREVIEW_RETRY_APPROVAL_ID: `mvp8s-approval:${"0".repeat(64)}` }), /SERVING_PREVIEW_CANDIDATE_DB_RETRY_FORBIDDEN/)

const landing = readFileSync("app/candidate-review/page.tsx", "utf8")
assert.match(landing, /VERCEL_ENV !== "preview"/)
assert.match(landing, /EXPLICIT_CANDIDATE_DB_REVIEW/)
assert.equal((landing.match(/mvpv_[0-9a-f]{64}/g) ?? []).length, 6)
assert.match(landing, /timestamp: start/)

const navigation = readFileSync("components/layout/PrimaryNavigation.tsx", "utf8")
assert.match(navigation, /CUTOVER CANDIDATE PREVIEW/)
assert.match(navigation, /READ-ONLY · NOT PRODUCTION/)
assert.match(navigation, /NEXT_PUBLIC_MVP_CANDIDATE_REVIEW_MODE/)

process.stdout.write(JSON.stringify({ status: "PASS", targetId: MVP8Z2_CANDIDATE_TARGET_ID, replayLinks: 6 }))
