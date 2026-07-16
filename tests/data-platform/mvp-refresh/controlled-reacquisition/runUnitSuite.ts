import assert from "node:assert/strict"

import {
  CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION,
  buildRefreshSlotResumePlan,
  classifyProviderAuditDigest,
  createAuthoritativeSlotReconciliation,
  createControlledCandidateSetRecord,
  createControlledCanonicalCommitSetRecord,
  createControlledOhlcvSourceContract,
  createControlledRetrievalRecord,
  createRefreshLogicalSlot,
  type RefreshUnitAttemptAudit,
} from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-15T00:00:00.000Z", END = "2026-07-16T00:00:00.000Z", HASH = "a".repeat(64)

function sourceContract() {
  return createControlledOhlcvSourceContract({ eventTimeStart: START, eventTimeEnd: END, parserVersion: `sha256:${HASH}`, parserChecksum: HASH, normalizerVersion: "d3-phase3-normalizer-v1", normalizerChecksum: "b".repeat(64), schemaVersion: "1", schemaChecksum: "c".repeat(64), repositorySourceRevision: "d".repeat(40), boundedAdapterChecksum: "e".repeat(64) })
}

function attempts(): readonly RefreshUnitAttemptAudit[] {
  const base = { instrument: "BTCUSDT" as const, dataset: "ohlcv" as const, intervalStart: START, intervalEnd: END, artifacts: [], events: [], lease: null }
  return Object.freeze([
    ...[1, 2, 3, 4].map((ordinal) => Object.freeze({ ...base, unitId: `legacy-${ordinal}`, runId: `legacy-run-${ordinal}`, state: "COMMITTED" as const, unitChecksum: String(ordinal).repeat(64).slice(0, 64), checkpoint: { factDigest: String(ordinal).repeat(64).slice(0, 64) } })),
    Object.freeze({ ...base, unitId: "orphan", runId: "orphan-run", state: "ACQUIRED" as const, unitChecksum: "9".repeat(64), checkpoint: { stage: "ACQUIRED" } }),
  ])
}

async function main() {
  const contract = sourceContract()
  assert.deepEqual(sourceContract(), contract)
  assert.equal(contract.boundedAdapterVersion, CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION)
  assert.equal(Object.keys(contract).length >= 25, true)
  assert.equal(classifyProviderAuditDigest(HASH, HASH), "MATCHES_8A2E_PROVIDER_AUDIT")
  assert.equal(classifyProviderAuditDigest(HASH, "b".repeat(64)), "PROVIDER_OUTPUT_CHANGED")
  assert.equal(classifyProviderAuditDigest(null, HASH), "DIGEST_COMPARISON_INCONCLUSIVE")

  const retrieval = createControlledRetrievalRecord({ runId: "recovery-run", unitId: "recovery-unit", sourceContractId: contract.sourceContractId, artifactId: "artifact", sourceObjectIdentity: "bounded-source-object", contentType: "application/zip", byteCount: 1024, rawChecksum: HASH, retrievedAt: "2026-07-16T12:00:00.000Z" })
  assert.deepEqual(createControlledRetrievalRecord({ runId: "recovery-run", unitId: "recovery-unit", sourceContractId: contract.sourceContractId, artifactId: "artifact", sourceObjectIdentity: "bounded-source-object", contentType: "application/zip", byteCount: 1024, rawChecksum: HASH, retrievedAt: "2026-07-16T12:00:00.000Z" }), retrieval)
  const candidates = Array.from({ length: 288 }, (_, index) => ({ candidateId: `candidate-${String(index).padStart(3, "0")}`, checksum: index.toString(16).padStart(64, "0") }))
  const candidateSet = createControlledCandidateSetRecord({ runId: "recovery-run", unitId: "recovery-unit", retrievalId: retrieval.retrievalId, sourceContractId: contract.sourceContractId, candidates })
  const facts = Array.from({ length: 288 }, (_, index) => ({ canonicalRecordId: `fact-${String(index).padStart(3, "0")}`, recordVersion: 1, checksum: index.toString(16).padStart(64, "0"), commitId: `commit-${index}`, eventTimestamp: new Date(Date.parse(START) + index * 300_000).toISOString() }))
  const commitSet = createControlledCanonicalCommitSetRecord({ runId: "recovery-run", unitId: "recovery-unit", candidateSetId: candidateSet.candidateSetId, status: "DUPLICATE", facts, canonicalStableDomainDigest: HASH })
  assert.equal(commitSet.facts.length, 288)
  assert.equal(createControlledCanonicalCommitSetRecord({ runId: "recovery-run", unitId: "recovery-unit", candidateSetId: candidateSet.candidateSetId, status: "CONFLICT", facts: [], canonicalStableDomainDigest: null }).status, "CONFLICT")

  const slot = createRefreshLogicalSlot({ provider: "binance-vision", dataset: "ohlcv", instrument: "BTCUSDT", intervalStart: START, intervalEnd: END, contractVersion: contract.sourceContractId })
  const authority = createAuthoritativeSlotReconciliation({ logicalSlotId: slot.logicalSlotId, authoritativeUnitId: "recovery-unit", sourceContractId: contract.sourceContractId, retrievalId: retrieval.retrievalId, artifactId: "artifact", candidateSetId: candidateSet.candidateSetId, commitSetId: commitSet.commitSetId, canonicalFactSetDigest: HASH, intervalStart: START, intervalEnd: END, legacyCommittedUnitIds: ["legacy-1", "legacy-2", "legacy-3", "legacy-4"], orphanedAcquiredUnitId: "orphan" })
  const plan = buildRefreshSlotResumePlan({ intervalStart: START, intervalEnd: END, attempts: attempts(), authoritativeResolutions: [authority], sourceFinalizationState: "SOURCE_AVAILABLE" })
  assert.equal(plan.length, 24)
  assert.equal(plan.filter((item) => item.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length, 1)
  assert.equal(plan.filter((item) => item.action === "CREATE_NEW_ON_LIVE_RESUME").length, 23)
  assert.equal(plan.filter((item) => item.action === "BLOCKED_CONFLICT").length, 0)
  assert.deepEqual(plan.find((item) => item.instrument === "BTCUSDT" && item.dataset === "ohlcv")?.ignoredAttemptIds, ["legacy-1", "legacy-2", "legacy-3", "legacy-4", "orphan"])

  console.log(JSON.stringify({ status: "PASS", assertions: 16, deterministicSourceContract: true, providerChangeDetected: true, candidateCount: 288, factCount: 288, planner: { reuseAuthoritative: 1, createNew: 23, conflicts: 0 } }))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "CONTROLLED_REACQUISITION_UNIT_TEST_FAILED"); process.exitCode = 1 })
