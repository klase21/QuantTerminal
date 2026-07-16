import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  buildRefreshSlotResumePlan,
  classifyNonterminalAttempt,
  createMissingRefreshUnitsForResume,
  createRefreshLogicalSlot,
  reconcileCommittedAttempts,
  type RefreshUnitAttemptAudit,
} from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"
const DIGEST = canonicalChecksum({ output: "same" })
const ARTIFACT = canonicalChecksum({ artifact: "same" })

function attempt(input: { readonly unitId: string; readonly state: RefreshUnitAttemptAudit["state"]; readonly factDigest?: string; readonly artifact?: boolean; readonly activeLease?: boolean }): RefreshUnitAttemptAudit {
  return Object.freeze({
    unitId: input.unitId,
    runId: `run:${input.unitId}`,
    instrument: "BTCUSDT",
    dataset: "ohlcv",
    intervalStart: START,
    intervalEnd: END,
    state: input.state,
    unitChecksum: canonicalChecksum({ unitId: input.unitId }),
    checkpoint: input.factDigest ? Object.freeze({ stage: input.state, factDigest: input.factDigest }) : Object.freeze({}),
    artifacts: input.artifact ? Object.freeze([Object.freeze({ artifactId: `artifact:${input.unitId}`, checksum: ARTIFACT, retrievalIdentity: "retrieval:same", contractVersion: "mvp-bounded-ohlcv/1.0.0" })]) : Object.freeze([]),
    events: Object.freeze(input.state === "COMMITTED" ? [Object.freeze({ eventKind: "STATE_TRANSITION", fromState: "NORMALIZED", toState: "COMMITTED", occurredAt: `2026-07-16T00:00:0${input.unitId.at(-1) ?? "0"}.000Z` })] : []),
    lease: input.activeLease ? Object.freeze({ fencingToken: 2, active: true, released: false }) : null,
  })
}

async function main(): Promise<void> {
  const slot = createRefreshLogicalSlot({ provider: "binance-vision", dataset: "ohlcv", instrument: "BTCUSDT", intervalStart: START, intervalEnd: END, contractVersion: "mvp-bounded-ohlcv/1.0.0" })
  assert.deepEqual(slot, createRefreshLogicalSlot({ provider: "binance-vision", dataset: "ohlcv", instrument: "BTCUSDT", intervalStart: START, intervalEnd: END, contractVersion: "mvp-bounded-ohlcv/1.0.0" }))

  const committed = [1, 2, 3, 4].map((value) => attempt({ unitId: `unit-${value}`, state: "COMMITTED", factDigest: DIGEST, artifact: true }))
  const orphan = attempt({ unitId: "unit-5", state: "ACQUIRED" })
  const equivalent = reconcileCommittedAttempts([...committed, orphan])
  assert.equal(equivalent.classification, "EQUIVALENT_COMMITTED_ATTEMPTS")
  assert.equal(equivalent.authoritativeUnitId, "unit-1")
  assert.equal(classifyNonterminalAttempt(orphan, equivalent), "SUPERSEDED_BY_COMMITTED_LOGICAL_SLOT")

  const plan = buildRefreshSlotResumePlan({ intervalStart: START, intervalEnd: END, attempts: [...committed, orphan] })
  assert.equal(plan.length, 24)
  assert.equal(plan.filter((entry) => entry.action === "REUSE_COMMITTED").length, 1)
  assert.equal(plan.filter((entry) => entry.action === "CREATE_NEW_ON_LIVE_RESUME").length, 23)
  assert.equal(plan.find((entry) => entry.logicalSlotId === slot.logicalSlotId)?.ignoredAttemptIds.length, 4)
  const units = createMissingRefreshUnitsForResume("resume-run", plan)
  assert.equal(units.length, 23)
  assert(!units.some((unit) => unit.datasetId === "ohlcv" && unit.instrument === "BTCUSDT"))
  assert.deepEqual(plan, buildRefreshSlotResumePlan({ intervalStart: START, intervalEnd: END, attempts: [orphan, ...committed].reverse() }))

  const conflicting = committed.map((value, index) => index === 3 ? attempt({ unitId: value.unitId, state: "COMMITTED", factDigest: canonicalChecksum({ output: "different" }), artifact: true }) : value)
  const conflictResolution = reconcileCommittedAttempts(conflicting)
  assert.equal(conflictResolution.classification, "CONFLICTING_COMMITTED_ATTEMPTS")
  assert(conflictResolution.mismatchFields.includes("CANONICAL_OUTPUT"))
  const blocked = buildRefreshSlotResumePlan({ intervalStart: START, intervalEnd: END, attempts: [...conflicting, orphan] })
  assert.equal(blocked.filter((entry) => entry.action === "BLOCKED_CONFLICT").length, 1)
  assert.throws(() => createMissingRefreshUnitsForResume("resume-run", blocked), /REFRESH_LOGICAL_SLOT_PLAN_BLOCKED/)
  assert.equal(classifyNonterminalAttempt(orphan, conflictResolution), "CONTROL_PLANE_CONFLICT")

  const recoverable = attempt({ unitId: "recoverable", state: "ACQUIRED", factDigest: DIGEST, artifact: true, activeLease: true })
  assert.equal(classifyNonterminalAttempt(recoverable, reconcileCommittedAttempts([])), "RECOVERABLE_ACQUIRED")
  assert.equal(classifyNonterminalAttempt(orphan, reconcileCommittedAttempts([])), "ORPHANED_ACQUIRED")

  const liveService = await readFile("lib/data-platform/mvp-refresh/service.ts", "utf8")
  assert(liveService.indexOf("auditUnitsForWindow") < liveService.indexOf("putRun(runId"))
  assert(liveService.includes("createMissingRefreshUnitsForResume(runId, resumePlan)"))

  console.log(JSON.stringify({ status: "PASS", assertions: 20, logicalSlots: 24, cleanCase: { reuseCommitted: 1, createNew: 23 }, livePlannerGuard: true, mutations: 0 }))
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_REFRESH_RECONCILIATION_TEST_FAILED"); process.exitCode = 1 })
