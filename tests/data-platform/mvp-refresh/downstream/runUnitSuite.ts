import { readFile } from "node:fs/promises"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  executeBoundedReplayHandoff,
  resumeBoundedCandidatePipeline,
  type BoundedCandidateCheckpoint,
  type BoundedCandidateStage,
  type BoundedReplayHandoff,
} from "@/lib/data-platform/mvp-refresh"
import {
  canonicalizeServingCorpusMembers,
  compareServingCorpusMembership,
  computeCandidateServingChecksum,
  type ServingCorpusMember,
} from "@/lib/data-platform/mvp-serving"
import type { ReplaySequenceModel } from "@/lib/replay-sequence"

let failures = 0
const check = (name: string, condition: boolean) => { console.log(`${condition ? "PASS" : "FAIL"} ${name}`); if (!condition) failures += 1 }
async function rejects(name: string, work: () => unknown | Promise<unknown>, expected: string) { try { await work(); check(name, false) } catch (error) { check(name, error instanceof Error && error.message === expected) } }

const digest = (value: string) => canonicalChecksum({ value })
const member = (kind: ServingCorpusMember["memberKind"], id: string, checksum = digest(id)): ServingCorpusMember => Object.freeze({ memberKind: kind, memberId: id, memberChecksum: checksum, canonicalSortKey: `${kind}:${id}`, inheritedSourceCorpusId: "active:one", schemaVersion: "1", metadata: Object.freeze({ inherited: true }) })
const start = "2026-07-14T00:00:00.000Z", end = "2026-07-15T00:00:00.000Z"

async function main() {
  const active = [member("PROJECTION", "projection:one"), member("EVIDENCE_SUMMARY", "evidence:one"), member("REPLAY_SNAPSHOT", "replay:one"), member("DEMO_PROFILE", "profile:primary"), member("RELEASE_INVENTORY", "inventory:one")]
  const additive = [...active, member("PROJECTION", "projection:two")]
  const first = computeCandidateServingChecksum({ governedThrough: end, schemaVersion: "1", members: additive })
  const second = computeCandidateServingChecksum({ governedThrough: end, schemaVersion: "1", members: [...additive].reverse() })
  check("candidate checksum is canonical-order deterministic", first === second)
  check("member canonical order is stable", canonicalizeServingCorpusMembers([...additive].reverse())[0]!.canonicalSortKey === "DEMO_PROFILE:profile:primary")
  await rejects("duplicate logical member rejected", () => canonicalizeServingCorpusMembers([...active, active[0]!]), "SERVING_CANDIDATE_DUPLICATE_LOGICAL_MEMBER")

  const comparison = compareServingCorpusMembership({ activeMembers: active, candidateMembers: additive, activeChecksum: digest("active"), candidateChecksum: first, activeGovernedThrough: start, candidateGovernedThrough: end })
  check("additive candidate preserves active membership", comparison.status === "PASS" && comparison.added.PROJECTION.length === 1 && comparison.unexpectedDeletions.length === 0 && comparison.uiContractImpact === "ADDITIVE")
  const deletion = compareServingCorpusMembership({ activeMembers: active, candidateMembers: additive.slice(1), activeChecksum: digest("active"), candidateChecksum: first, activeGovernedThrough: start, candidateGovernedThrough: end })
  check("unexpected deletion blocks readiness", deletion.status === "BLOCKED" && deletion.unexpectedDeletions.includes("PROJECTION:projection:one"))
  const superseded = compareServingCorpusMembership({ activeMembers: active, candidateMembers: [member("PROJECTION", "projection:one", digest("corrected")), ...active.slice(1)], activeChecksum: digest("active"), candidateChecksum: digest("candidate"), activeGovernedThrough: start, candidateGovernedThrough: end })
  check("same identity with changed immutable content is blocked", superseded.status === "BLOCKED" && superseded.immutableMismatches.includes("PROJECTION:projection:one"))

  const handoff: BoundedReplayHandoff = {
    instrument: "BTCUSDT", eventTimeStart: start, eventTimeEnd: end,
    price: { identity: "price", checksum: digest("price"), sampleCount: 288 },
    openInterest: { identity: "oi", checksum: digest("oi"), sampleCount: 288 },
    funding: { identity: "funding", checksum: digest("funding"), eventCount: 3 },
    aggressiveFlow: { identity: "flow", checksum: digest("flow"), bucketCount: 48 },
    evidence: { identity: "evidence", checksum: digest("evidence") },
    sourceProjection: { identity: "projection", checksum: digest("projection") },
  }
  const model = Object.freeze({ status: "AVAILABLE", modelVersion: "mvp-replay-sequence/1.0.0", modelChecksum: digest("model"), instrument: "BTCUSDT", eventTimeStart: start, eventTimeEnd: end, sourceProjectionVersionId: "projection", sourceProjectionChecksum: digest("projection"), marketState: "MIXED", evidencePacketId: "evidence", price: Object.freeze([]), openInterest: Object.freeze([]), funding: Object.freeze([]), flow: Object.freeze([]), sequence: Object.freeze([]), sampleCounts: Object.freeze({ price: 288, openInterest: 288, funding: 3, flow: 48 }), limitations: Object.freeze([]) }) as ReplaySequenceModel
  const replay = await executeBoundedReplayHandoff(handoff, async () => model)
  check("complete Replay handoff is executable", replay.status === "CREATED" && replay.model?.modelChecksum === model.modelChecksum)
  const incomplete = await executeBoundedReplayHandoff({ ...handoff, openInterest: { ...handoff.openInterest, sampleCount: 287 } }, async () => model)
  check("incomplete Replay handoff is ineligible", incomplete.status === "INELIGIBLE" && incomplete.model === null)

  const stored = new Map<BoundedCandidateStage, BoundedCandidateCheckpoint>()
  const calls: BoundedCandidateStage[] = []
  const stages: BoundedCandidateStage[] = ["CANONICAL_COMMIT", "COVERAGE", "CONSISTENCY", "EVIDENCE", "PROJECTION", "REPLAY", "CANDIDATE", "MANIFEST", "COMPARISON"]
  const execute = Object.fromEntries(stages.map((stage) => [stage, async () => { calls.push(stage); return [`${stage}:output`] }])) as unknown as Record<BoundedCandidateStage, () => Promise<readonly string[]>>
  const port = { read: async (stage: BoundedCandidateStage) => stored.get(stage) ?? null, write: async (checkpoint: BoundedCandidateCheckpoint) => { const existing = stored.get(checkpoint.stage); if (existing && existing.checksum !== checkpoint.checksum) throw new Error("CHECKPOINT_IMMUTABLE_CONFLICT"); stored.set(checkpoint.stage, checkpoint); return existing ? "DUPLICATE" as const : "CREATED" as const } }
  const pipeline = await resumeBoundedCandidatePipeline({ checkpointPort: port, execute })
  check("candidate orchestration executes every bounded stage", pipeline.status === "COMPLETE" && calls.length === stages.length)
  calls.length = 0
  const resumed = await resumeBoundedCandidatePipeline({ checkpointPort: port, execute })
  check("checkpoint resume skips completed stages", resumed.status === "COMPLETE" && calls.length === 0)

  const evidenceWorker = await readFile("workers/data-platform/runMvpEvidence.ts", "utf8")
  const projectionWorker = await readFile("workers/data-platform/runMvpProjections.ts", "utf8")
  const evidenceData = await readFile("lib/data-platform/consistency/mvpEvidenceData.ts", "utf8")
  const pipelineSource = await readFile("lib/data-platform/mvp-refresh/boundedPipeline.ts", "utf8")
  check("broad Evidence worker reuses shared window persistence", evidenceWorker.includes("persistMvpEvidenceWindow(input)"))
  check("broad Projection worker reuses shared batch persistence", projectionWorker.includes("persistMvpProjectionBatch") && projectionWorker.includes("projections.length !== 868"))
  check("bounded Evidence loader requires explicit complete contract", evidenceData.includes("MVP_EVIDENCE_BOUNDED_CONTRACT_INCOMPLETE") && evidenceData.includes("eventTimeStart?: string"))
  check("bounded mode has no 84 or 868 corpus assertion", !pipelineSource.includes("inputs.length !== 84") && !pipelineSource.includes("projections.length !== 868"))
  const protectedNames = ["d3-phase-3-aggtrades-segment-progress.json", "d3-phase-3-ohlcv-progress.json", "d3-phase-3-oi-progress.json", "d3-phase-3-funding-progress.json", "mvp-recent-market-corpus-progress.json"]
  const changedSources = [evidenceWorker, projectionWorker, evidenceData, pipelineSource, await readFile("lib/data-platform/mvp-serving/candidateMembership.ts", "utf8")]
  check("downstream foundation does not reference operational progress files", protectedNames.every((name) => changedSources.every((source) => !source.includes(name))))
  if (failures) process.exitCode = 1
}

void main().catch((error) => { console.error(error); process.exitCode = 1 })
