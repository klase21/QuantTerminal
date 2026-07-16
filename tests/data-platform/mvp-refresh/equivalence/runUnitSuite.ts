import assert from "node:assert/strict"

import {
  auditNonRetainedProviderPayload,
  classifyContractProvenance,
  compareStableOhlcvFactSets,
  computeStableOhlcvDigests,
  type StableOhlcvFact,
} from "@/lib/data-platform/mvp-refresh"

function fact(id: string, timestamp: string, close = "105"): StableOhlcvFact {
  return Object.freeze({ canonicalFactIdentity: id, dataset: "ohlcv", instrument: "BTCUSDT", eventTimestamp: timestamp, interval: "5m", open: "100", high: "110", low: "90", close, volume: "12", provider: "binance-vision", sourceEventIdentity: timestamp, canonicalVersion: 1, supersedesIdentity: null, immutablePayloadChecksum: "a".repeat(64) })
}

async function main(): Promise<void> {
  const one = fact("fact-1", "2026-07-15T00:00:00.000Z"), two = fact("fact-2", "2026-07-15T00:05:00.000Z")
  const ordered = computeStableOhlcvDigests([one, two]), reversed = computeStableOhlcvDigests([two, one])
  assert.deepEqual(ordered, reversed)
  assert.equal(ordered.factCount, 2)
  assert.equal(compareStableOhlcvFactSets([one, two], [two, one]).classification, "EXACT_CANONICAL_EQUIVALENCE")

  const withAttemptMetadata = [{ ...one, unitId: "attempt-one", workerId: "worker-one" }, { ...two, unitId: "attempt-two", insertedAt: "later" }] as unknown as StableOhlcvFact[]
  assert.deepEqual(computeStableOhlcvDigests(withAttemptMetadata), ordered)
  assert.equal(compareStableOhlcvFactSets([one, two], [one]).classification, "INCOMPLETE_LINEAGE")
  assert.equal(compareStableOhlcvFactSets([one], [{ ...one, canonicalFactIdentity: "other-identity" }]).classification, "VALUE_EQUIVALENT_IDENTITY_DIFFERENT")
  const conflict = compareStableOhlcvFactSets([one], [fact("fact-1", one.eventTimestamp, "106")])
  assert.equal(conflict.classification, "TRUE_CANONICAL_VALUE_CONFLICT")
  assert.equal(conflict.valueDifferences, 1)
  assert.equal(conflict.totalDifferingRows, 1)
  assert.equal(compareStableOhlcvFactSets(null, [one]).classification, "INSUFFICIENT_EVIDENCE")

  assert.equal(classifyContractProvenance({ retrievalIdentity: true, artifactIdentity: true, candidateIdentity: true, canonicalCommitIdentity: true, sourceContractVersion: true, parserVersion: true, normalizationVersion: true, repositoryVersion: true }), "CONTRACT_PROVENANCE_COMPLETE")
  assert.equal(classifyContractProvenance({ retrievalIdentity: false, artifactIdentity: false, candidateIdentity: false, canonicalCommitIdentity: false, sourceContractVersion: true, parserVersion: true, normalizationVersion: false, repositoryVersion: true }), "CONTRACT_PROVENANCE_RECONSTRUCTED")
  assert.equal(classifyContractProvenance({ retrievalIdentity: false, artifactIdentity: false, candidateIdentity: false, canonicalCommitIdentity: false, sourceContractVersion: false, parserVersion: false, normalizationVersion: false, repositoryVersion: true }), "CONTRACT_PROVENANCE_PARTIAL")
  assert.equal(classifyContractProvenance({ retrievalIdentity: false, artifactIdentity: false, candidateIdentity: false, canonicalCommitIdentity: false, sourceContractVersion: false, parserVersion: false, normalizationVersion: false, repositoryVersion: false }), "CONTRACT_PROVENANCE_UNRECORDED")

  const payload = await auditNonRetainedProviderPayload(async () => new Uint8Array([1, 2, 3]), (bytes) => ({ byteCount: bytes.byteLength }))
  assert.deepEqual(payload, { audit: { byteCount: 3 }, retainedPayload: false })
  assert(!("bytes" in payload))

  console.log(JSON.stringify({ status: "PASS", assertions: 15, deterministicDigest: true, attemptMetadataExcluded: true, retainedProviderPayload: false }))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_EQUIVALENCE_UNIT_TEST_FAILED"); process.exitCode = 1 })
