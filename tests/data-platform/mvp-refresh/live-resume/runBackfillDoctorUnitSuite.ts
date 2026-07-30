import assert from "node:assert/strict"

import {
  BACKFILL_DOCTOR_BASELINE_RUN_ID,
  BACKFILL_DOCTOR_REQUIRED_ENVIRONMENT_NAMES,
  parseBackfillDoctorOptions,
  runBackfillDoctor,
  type BackfillDoctorPorts,
} from "@/lib/data-platform/mvp-refresh/backfillDoctor"

const start = "2026-07-16T00:00:00.000Z"
const through = "2026-07-17T00:00:00.000Z"
function ports(overrides: Partial<BackfillDoctorPorts> = {}): BackfillDoctorPorts {
  return {
    preflightEnvironment: async ({ requiredEnvironmentNames }) => {
      assert.deepEqual(requiredEnvironmentNames, BACKFILL_DOCTOR_REQUIRED_ENVIRONMENT_NAMES)
      return Object.freeze({ passed: true, missingEnvironmentNames: Object.freeze([]), diagnostics: Object.freeze([]) })
    },
    inspectD3Schema: async () => Object.freeze({ passedThroughMigration: 5, diagnostic: null }),
    inspectRun: async (input) => Object.freeze({ runId: input.runId, executionGenerationState: "ACTIVE" as const, resumeEligible: true, leaseState: "EXPIRED" as const, persistedUnitCount: 24, recoverableSlots: 24, blockedSlots: 0, unitCountsByState: Object.freeze({ PENDING: 24 }), terminalUnitCount: 0, retainedArtifacts: Object.freeze({ count: 2, allAttributedToRun: true }), candidateCount: 0, commonWatermark: null }),
    inspectProviderAvailability: async (input) => {
      assert.equal(input.start, start)
      assert.equal(input.through, through)
      return Object.freeze({ available: true, diagnostic: null })
    },
    ...overrides,
  }
}

async function main(): Promise<void> {
  const options = parseBackfillDoctorOptions([`--start=${start}`, `--through=${through}`])
  assert.deepEqual(options, { start, through })
  assert.throws(() => parseBackfillDoctorOptions([`--start=${start}`, "--through=2026-07-17T01:00:00.000Z"]), /BACKFILL_DOCTOR_EXACT_UTC_DAY_REQUIRED/)

  const ready = await runBackfillDoctor(options, ports())
  assert.equal(ready.status, "READY")
  assert.deepEqual(ready.blockers, [])
  assert.deepEqual(ready.facts, { retainedArtifactCount: 2, candidateCount: 0, commonWatermark: null })

  const blocked = await runBackfillDoctor(options, ports({
    inspectRun: async (input) => Object.freeze({ runId: input.runId, executionGenerationState: "ACTIVE" as const, resumeEligible: true, leaseState: "ACTIVE" as const, persistedUnitCount: 23, recoverableSlots: 23, blockedSlots: 1, unitCountsByState: Object.freeze({ PENDING: 23, BLOCKED: 1 }), terminalUnitCount: 1, retainedArtifacts: Object.freeze({ count: 1, allAttributedToRun: false }), candidateCount: 2, commonWatermark: through }),
    inspectProviderAvailability: async () => Object.freeze({ available: false, diagnostic: "PROVIDERS:BINANCE_VISION_UNAVAILABLE" }),
  }))
  assert.equal(blocked.status, "BLOCKED")
  assert.deepEqual(blocked.blockers, ["CANDIDATES:ALREADY_PRESENT", "COMMON_WATERMARK:ALREADY_PRESENT", "PROVIDERS:BINANCE_VISION_UNAVAILABLE", "RETAINED_ARTIFACTS:COUNT_MISMATCH", "RETAINED_ARTIFACTS:UNATTRIBUTED", "RUN:ACTIVE_LEASE_PRESENT", "RUN:PERSISTED_UNIT_BASELINE_MISMATCH", "RUN:TERMINAL_UNITS_PRESENT"])
  assert.equal(blocked.checks.run, "BLOCKED")
  assert.equal(blocked.checks.providers, "BLOCKED")

  console.log(JSON.stringify({ status: "PASS", ready: ready.status, blocked: blocked.status, requiredEnvironmentNames: BACKFILL_DOCTOR_REQUIRED_ENVIRONMENT_NAMES.length, runId: BACKFILL_DOCTOR_BASELINE_RUN_ID }))
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
