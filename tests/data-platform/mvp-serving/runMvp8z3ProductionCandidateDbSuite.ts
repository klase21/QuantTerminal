import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  MVP8Z3_PRODUCTION_CANDIDATE_DB_MODE,
  resolveMvpServingProductionCandidateDb,
  verifyMvpServingProductionCandidateDbReview,
} from "@/lib/data-platform/mvp-serving/productionCandidateDb"
import {
  MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP8V_APPROVED_CANDIDATE_ID,
  MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP8Z2_CANDIDATE_TARGET_ID,
} from "@/lib/data-platform/mvp-serving/preview"
import { MVP8Z_PRODUCTION_PROJECT_ID } from "@/lib/data-platform/mvp-serving/runtimeSelection"
import type { InactiveServingCandidateReview } from "@/lib/data-platform/mvp-serving/inactiveStaging"

const candidateUrl = "postgresql://mvp_serving_reader:synthetic@ep-candidate-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
const exact = Object.freeze({
  VERCEL_ENV: "production",
  MVP_SERVING_VERCEL_PROJECT_ID: MVP8Z_PRODUCTION_PROJECT_ID,
  MVP_SERVING_PRODUCTION_CANDIDATE_DB_MODE: MVP8Z3_PRODUCTION_CANDIDATE_DB_MODE,
  MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL: candidateUrl,
  MVP_SERVING_PRODUCTION_CANDIDATE_TARGET_ID: MVP8Z2_CANDIDATE_TARGET_ID,
  MVP_SERVING_PRODUCTION_CANDIDATE_ID: MVP8V_APPROVED_CANDIDATE_ID,
  MVP_SERVING_PRODUCTION_CANDIDATE_CHECKSUM: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP_SERVING_PRODUCTION_MEMBER_SET_CHECKSUM: MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP_SERVING_PRODUCTION_COMMON_WATERMARK_CHECKSUM: MVP8V_APPROVED_WATERMARK_CHECKSUM,
})

const config = resolveMvpServingProductionCandidateDb(exact)
assert.equal(config?.targetId, MVP8Z2_CANDIDATE_TARGET_ID)
assert.equal(config?.branchId, "br-flat-grass-ao9rtnyr")
assert.equal(config?.database, "neondb")
assert.equal(config?.role, "mvp_serving_reader")
assert.equal(resolveMvpServingProductionCandidateDb({}), null)

assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, VERCEL_ENV: "preview" }), /ENVIRONMENT_INVALID/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, VERCEL_ENV: "development" }), /ENVIRONMENT_INVALID/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_VERCEL_PROJECT_ID: "prj_wrong" }), /ENVIRONMENT_INVALID/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PRODUCTION_CANDIDATE_TARGET_ID: "neon:soft-cell-16396854\/br-royal-block-aop70mzq\/neondb" }), /BINDING_MISMATCH/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PRODUCTION_CANDIDATE_ID: "*" }), /BINDING_INVALID/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PRODUCTION_CANDIDATE_CHECKSUM: "0".repeat(64) }), /BINDING_MISMATCH/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PRODUCTION_MEMBER_SET_CHECKSUM: "0".repeat(64) }), /BINDING_MISMATCH/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PRODUCTION_COMMON_WATERMARK_CHECKSUM: "0".repeat(64) }), /BINDING_MISMATCH/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL: candidateUrl.replace("mvp_serving_reader", "mvp_serving_publisher") }), /URL_UNSAFE/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL: candidateUrl.replace("-pooler", "") }), /URL_UNSAFE/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PRODUCTION_CANDIDATE_DB_URL: candidateUrl.replace("sslmode=require", "sslmode=disable") }), /URL_UNSAFE/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_POSTGRES_URL: candidateUrl }), /FALLBACK_FORBIDDEN/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_PREVIEW_CANDIDATE_MODE: "EXPLICIT_CANDIDATE_DB_REVIEW" }), /POLICY_CONFLICT/)
assert.throws(() => resolveMvpServingProductionCandidateDb({ ...exact, MVP_SERVING_RUNTIME_SELECTION_POLICY: "CUTOVER_BRIDGE_EXACT_PAIR" }), /POLICY_CONFLICT/)

const review = {
  candidateId: MVP8V_APPROVED_CANDIDATE_ID,
  servingChecksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  lifecycle: "WITHHELD",
  exposure: "INTERNAL_ONLY",
  exposureCount: 0,
  commonWatermarkId: "mvp-watermark:2026-07-16",
  commonWatermarkValue: "2026-07-16T00:00:00.000Z",
  commonWatermarkChecksum: MVP8V_APPROVED_WATERMARK_CHECKSUM,
  memberSetChecksum: MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  manifestChecksum: "a".repeat(64),
  counts: { projections: 62, evidenceSummaries: 6, replaySnapshots: 6, members: 74, manifests: 1 },
  projections: [], evidenceSummaries: [], replaySnapshots: [],
} as unknown as InactiveServingCandidateReview
assert.doesNotThrow(() => verifyMvpServingProductionCandidateDbReview(review, config!))
assert.throws(() => verifyMvpServingProductionCandidateDbReview({ ...review, exposureCount: 1 }, config!), /STATE_INVALID/)
assert.throws(() => verifyMvpServingProductionCandidateDbReview({ ...review, memberSetChecksum: "0".repeat(64) }, config!), /CHECKSUM_MISMATCH/)

const server = readFileSync("lib/data-platform/mvp-serving/server.ts", "utf8")
const health = readFileSync("app/api/health/mvp-serving/route.ts", "utf8")
assert.match(server, /createMvpServingManagedClient\(productionCandidate\.connectionString, "READER"\)/)
assert.match(server, /readOnlyTransaction/)
assert.match(server, /selectCandidate\(productionCandidate\.candidateId\)/)
assert.match(server, /PRODUCTION_EXACT_CANDIDATE_DB/)
assert.doesNotMatch(server, /INSERT INTO serving\.serving_exposure/)
assert.match(health, /READ_ONLY_TRANSACTION_VERIFIED/)
assert.match(health, /manifestMemberCount/)

console.log("MVP-8Z3 PRODUCTION EXACT CANDIDATE DB SUITE: PASS")
