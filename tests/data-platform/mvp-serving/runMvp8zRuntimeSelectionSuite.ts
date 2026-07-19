import assert from "node:assert/strict"

import { verifyMvpServingReadOnlyTransactionState } from "@/lib/data-platform/mvp-serving/client"
import { resolveMvpServingPreviewCandidate } from "@/lib/data-platform/mvp-serving/preview"
import {
  MVP8Z_OLD_CORPUS_CHECKSUM,
  MVP8Z_OLD_CORPUS_ID,
  MVP8Z_PRODUCTION_PROJECT_ID,
  MVP8Z_RUNTIME_AUTHORIZATION_ARTIFACT_KEY,
  resolveMvpServingRuntimeSelectionPolicy,
  runtimeSelectionAuthorizationArtifactChecksum,
  verifyRuntimeSelectionApproval,
  verifySelectedServingCorpus,
} from "@/lib/data-platform/mvp-serving/runtimeSelection"
import { MVP8V_APPROVED_CANDIDATE_CHECKSUM, MVP8V_APPROVED_CANDIDATE_ID, MVP8V_PRODUCTION_TARGET_ID } from "@/lib/data-platform/mvp-serving/preview"

const commit = "a".repeat(40)
const approvalChecksum = "b".repeat(64)
const expiresAt = "2099-07-20T00:00:00.000Z"
const base = Object.freeze({
  VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_SHA: commit,
  MVP_SERVING_VERCEL_PROJECT_ID: MVP8Z_PRODUCTION_PROJECT_ID,
  MVP_SERVING_RUNTIME_TARGET_ID: MVP8V_PRODUCTION_TARGET_ID,
  MVP_SERVING_RUNTIME_DEPLOYMENT_COMMIT: commit,
  MVP_SERVING_RUNTIME_CANDIDATE_CORPUS_ID: MVP8V_APPROVED_CANDIDATE_ID,
  MVP_SERVING_RUNTIME_CANDIDATE_CORPUS_CHECKSUM: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
})
const bridgeEnvironment = Object.freeze({
  ...base,
  MVP_SERVING_RUNTIME_SELECTION_POLICY: "CUTOVER_BRIDGE_EXACT_PAIR",
  MVP_SERVING_RUNTIME_OLD_CORPUS_ID: MVP8Z_OLD_CORPUS_ID,
  MVP_SERVING_RUNTIME_OLD_CORPUS_CHECKSUM: MVP8Z_OLD_CORPUS_CHECKSUM,
  MVP_SERVING_RUNTIME_AUTHORIZATION_ID: `mvp8s-approval:${approvalChecksum}`,
  MVP_SERVING_RUNTIME_AUTHORIZATION_CHECKSUM: approvalChecksum,
  MVP_SERVING_RUNTIME_AUTHORIZATION_EXPIRES_AT: expiresAt,
})

function main() {
  const bridge = resolveMvpServingRuntimeSelectionPolicy(bridgeEnvironment)
  assert.equal(bridge.mode, "CUTOVER_BRIDGE_EXACT_PAIR")
  assert.doesNotThrow(() => verifySelectedServingCorpus(bridge, { id: MVP8Z_OLD_CORPUS_ID, checksum: MVP8Z_OLD_CORPUS_CHECKSUM }))
  assert.doesNotThrow(() => verifySelectedServingCorpus(bridge, { id: MVP8V_APPROVED_CANDIDATE_ID, checksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM }))
  assert.throws(() => verifySelectedServingCorpus(bridge, { id: `third:${"c".repeat(64)}`, checksum: "c".repeat(64) }), /SERVING_BRIDGE_CORPUS_REJECTED/)
  assert.throws(() => verifySelectedServingCorpus(bridge, { id: MVP8Z_OLD_CORPUS_ID, checksum: "c".repeat(64) }), /SERVING_CORPUS_CHECKSUM_MISMATCH/)
  assert.throws(() => resolveMvpServingRuntimeSelectionPolicy({ ...bridgeEnvironment, MVP_SERVING_RUNTIME_OLD_CORPUS_ID: "*" }), /SERVING_BRIDGE_PAIR_BINDING_INVALID/)
  assert.throws(() => resolveMvpServingRuntimeSelectionPolicy({ ...bridgeEnvironment, MVP_SERVING_RUNTIME_TARGET_ID: "neon:wrong/branch/neondb" }), /SERVING_RUNTIME_PRODUCTION_IDENTITY_INVALID/)
  assert.throws(() => resolveMvpServingRuntimeSelectionPolicy({ ...bridgeEnvironment, MVP_SERVING_RUNTIME_AUTHORIZATION_EXPIRES_AT: "2020-01-01T00:00:00.000Z" }), /SERVING_RUNTIME_AUTHORIZATION_EXPIRED/)

  if (bridge.mode !== "CUTOVER_BRIDGE_EXACT_PAIR") throw new Error("BRIDGE_POLICY_REQUIRED")
  const artifactChecksum = runtimeSelectionAuthorizationArtifactChecksum({ reviewedCommit: commit, expiresAt })
  const record = Object.freeze({ approval_id: `mvp8s-approval:${approvalChecksum}`, approval_checksum: approvalChecksum, candidate_id: MVP8V_APPROVED_CANDIDATE_ID, candidate_checksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM, reviewed_commit: commit, review_artifact_checksums: { [MVP8Z_RUNTIME_AUTHORIZATION_ARTIFACT_KEY]: artifactChecksum }, target_fingerprint: MVP8V_PRODUCTION_TARGET_ID, expires_at: expiresAt })
  assert.doesNotThrow(() => verifyRuntimeSelectionApproval(bridge, record, "2026-07-20T00:00:00.000Z"))
  assert.throws(() => verifyRuntimeSelectionApproval(bridge, { ...record, review_artifact_checksums: { [MVP8Z_RUNTIME_AUTHORIZATION_ARTIFACT_KEY]: "0".repeat(64) } }, "2026-07-20T00:00:00.000Z"), /SERVING_RUNTIME_AUTHORIZATION_ARTIFACT_MISMATCH/)

  const candidateOnly = resolveMvpServingRuntimeSelectionPolicy({ ...base, MVP_SERVING_RUNTIME_SELECTION_POLICY: "CANDIDATE_ONLY" })
  assert.equal(candidateOnly.mode, "CANDIDATE_ONLY")
  assert.doesNotThrow(() => verifySelectedServingCorpus(candidateOnly, { id: MVP8V_APPROVED_CANDIDATE_ID, checksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM }))
  assert.throws(() => verifySelectedServingCorpus(candidateOnly, { id: MVP8Z_OLD_CORPUS_ID, checksum: MVP8Z_OLD_CORPUS_CHECKSUM }), /SERVING_CANDIDATE_ONLY_CORPUS_REJECTED/)
  assert.throws(() => verifySelectedServingCorpus(candidateOnly, { id: MVP8V_APPROVED_CANDIDATE_ID, checksum: "0".repeat(64) }), /SERVING_CORPUS_CHECKSUM_MISMATCH/)
  assert.throws(() => resolveMvpServingRuntimeSelectionPolicy({ ...base, MVP_SERVING_RUNTIME_SELECTION_POLICY: "CANDIDATE_ONLY", MVP_SERVING_RUNTIME_AUTHORIZATION_ID: `mvp8s-approval:${approvalChecksum}` }), /SERVING_CANDIDATE_ONLY_BRIDGE_BINDING_FORBIDDEN/)

  const active = resolveMvpServingRuntimeSelectionPolicy({ MVP_SERVING_EXPECTED_CORPUS_ID: MVP8Z_OLD_CORPUS_ID, MVP_SERVING_EXPECTED_CHECKSUM: MVP8Z_OLD_CORPUS_CHECKSUM })
  assert.equal(active.mode, "ACTIVE_ONLY")
  assert.doesNotThrow(() => verifySelectedServingCorpus(active, { id: MVP8Z_OLD_CORPUS_ID, checksum: MVP8Z_OLD_CORPUS_CHECKSUM }))
  assert.throws(() => verifySelectedServingCorpus(active, { id: MVP8V_APPROVED_CANDIDATE_ID, checksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM }), /SERVING_CORPUS_ID_MISMATCH/)
  assert.throws(() => resolveMvpServingRuntimeSelectionPolicy({ VERCEL_ENV: "production" }), /SERVING_ACTIVE_ONLY_BINDING_REQUIRED/)
  assert.equal(resolveMvpServingPreviewCandidate({}), null)

  assert.doesNotThrow(() => verifyMvpServingReadOnlyTransactionState({ role: "mvp_serving_reader", database: "neondb", read_only: "on" }, { role: "mvp_serving_reader", database: "neondb" }))
  assert.throws(() => verifyMvpServingReadOnlyTransactionState({ role: "qt_prod_candidate_reader", database: "neondb", read_only: "on" }, { role: "mvp_serving_reader", database: "neondb" }), /MVP_SERVING_READ_ONLY_TRANSACTION_VERIFICATION_FAILED/)
  assert.throws(() => verifyMvpServingReadOnlyTransactionState({ role: "mvp_serving_reader", database: "neondb", read_only: "off" }, { role: "mvp_serving_reader", database: "neondb" }), /MVP_SERVING_READ_ONLY_TRANSACTION_VERIFICATION_FAILED/)

  console.log("MVP-8Z EXACT DUAL-CORPUS RUNTIME SELECTION SUITE: PASS")
}

main()
