import assert from "node:assert/strict"

import {
  LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT,
  assertExpectedExecutionGenerationIncident,
  createCleanGenerationInputManifest,
  createExecutionGenerationQuarantineProposal,
  type ExecutionGenerationIncidentSnapshot,
} from "@/lib/data-platform/mvp-refresh"

const snapshot: ExecutionGenerationIncidentSnapshot = Object.freeze({
  generationId: `mrlr_${"2".repeat(64)}`,
  planId: `mrlp_${"1".repeat(64)}`,
  planChecksum: "1".repeat(64),
  runId: `mrlr_${"2".repeat(64)}`,
  runChecksum: "2".repeat(64),
  intervalStart: "2026-07-15T00:00:00.000Z",
  intervalEnd: "2026-07-16T00:00:00.000Z",
  refreshUnitIds: Object.freeze(Array.from({ length: 23 }, (_, index) => `refresh-unit-${index}`)),
  populationRunAttemptIds: Object.freeze(Array.from({ length: 6 }, (_, index) => `population-run-${index}`)),
  populationUnitIds: Object.freeze(Array.from({ length: 4 }, (_, index) => `population-unit-${index}`)),
  retrievalAttemptIds: Object.freeze(Array.from({ length: 4 }, (_, index) => `retrieval-${index}`)),
  rawObjectIdentities: Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({ identity: `raw-${index}`, checksum: String(index).repeat(64) }))),
  candidateIds: Object.freeze(Array.from({ length: 294 }, (_, index) => `candidate-${index}`)),
  leaseEvidence: Object.freeze([]),
  checkpointCount: 4,
  failureEventCount: 1,
  activeLeaseCount: 0,
  unreleasedLeaseCount: 1,
  lineageCounts: Object.freeze({ refreshUnits: 23, populationRunAttempts: 6, populationUnits: 4, retrievalAttempts: 4, rawObjects: 4, candidates: 294, canonicalFacts: 0, downstreamOutputs: 0, replayOutputs: 0, watermarks: 0, manifests: 0 }),
  commonWatermark: null,
  servingCandidate: null,
  productionMutation: false,
})

const proposal = createExecutionGenerationQuarantineProposal({ snapshot, reasonCode: LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT, sourceCommitSha: "a70328b", operatorConfirmationIdentity: "mvp-operator" })
assert.match(proposal.incidentChecksum, /^[0-9a-f]{64}$/)
assert.match(proposal.evidenceSummaryChecksum, /^[0-9a-f]{64}$/)
assertExpectedExecutionGenerationIncident(snapshot, { runId: snapshot.runId, planId: snapshot.planId, planChecksum: snapshot.planChecksum, intervalStart: snapshot.intervalStart, intervalEnd: snapshot.intervalEnd, counts: snapshot.lineageCounts })
assert.throws(() => assertExpectedExecutionGenerationIncident(snapshot, { runId: snapshot.runId, planId: snapshot.planId, planChecksum: snapshot.planChecksum, intervalStart: snapshot.intervalStart, intervalEnd: snapshot.intervalEnd, counts: { ...snapshot.lineageCounts, candidates: 295 } }), /INCIDENT_STATE_MISMATCH/)
const manifest = createCleanGenerationInputManifest({ proposal, logicalSlotIds: ["slot-b", "slot-a"], checkpointIds: ["checkpoint-b", "checkpoint-a"] })
assert.deepEqual(manifest.logicalSlotIds, ["slot-a", "slot-b"])
assert.equal(manifest.reusableRawPayloadBytes.length, 4)
assert.equal(manifest.excludedExecutionIdentities.retrievalAttempts.length, 4)
assert.equal(manifest.excludedExecutionIdentities.candidates.length, 294)
assert.match(manifest.checksum, /^[0-9a-f]{64}$/)

console.log(JSON.stringify({ status: "PASS", disposition: proposal.disposition, receiptPreview: true, cleanGenerationManifest: true }))
