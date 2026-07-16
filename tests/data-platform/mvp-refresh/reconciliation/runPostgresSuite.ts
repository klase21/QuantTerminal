import assert from "node:assert/strict"

import { buildRefreshSlotResumePlan, ControlledOhlcvRecoveryStore, createMvpRefreshClientFromEnvironment, MvpRefreshStore, reconcileCommittedAttempts } from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"

async function main(): Promise<void> {
  const client = createMvpRefreshClientFromEnvironment()
  try {
    await client.verify()
    const before = await client.sql.unsafe<Array<{ units: number; events: number; artifacts: number; leases: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_unit) units,(SELECT count(*)::int FROM refresh_control.refresh_event) events,(SELECT count(*)::int FROM refresh_control.refresh_artifact) artifacts,(SELECT count(*)::int FROM refresh_control.refresh_lease) leases")
    const attempts = await new MvpRefreshStore(client).auditUnitsForWindow(START, END)
    const authorities = await new ControlledOhlcvRecoveryStore(client).readAuthoritiesForWindow(START, END)
    const plan = buildRefreshSlotResumePlan({ intervalStart: START, intervalEnd: END, attempts, authoritativeResolutions: authorities })
    const historicalIds = new Set(authorities.flatMap((authority) => [...authority.legacyCommittedUnitIds, authority.orphanedAcquiredUnitId]))
    const historical = attempts.filter((attempt) => historicalIds.has(attempt.unitId))
    const btc = historical.filter((attempt) => attempt.dataset === "ohlcv" && attempt.instrument === "BTCUSDT")
    const resolution = reconcileCommittedAttempts(btc)
    const after = await client.sql.unsafe<Array<{ units: number; events: number; artifacts: number; leases: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_unit) units,(SELECT count(*)::int FROM refresh_control.refresh_event) events,(SELECT count(*)::int FROM refresh_control.refresh_artifact) artifacts,(SELECT count(*)::int FROM refresh_control.refresh_lease) leases")
    assert.equal(historical.length, 5)
    assert.equal(btc.filter((attempt) => attempt.state === "COMMITTED").length, 4)
    assert.equal(btc.filter((attempt) => attempt.state === "ACQUIRED").length, 1)
    assert.equal(historical.filter((attempt) => attempt.instrument !== "BTCUSDT" || attempt.dataset !== "ohlcv").length, 0)
    assert.equal(resolution.classification, "CONFLICTING_COMMITTED_ATTEMPTS")
    assert(resolution.mismatchFields.includes("CANONICAL_OUTPUT"))
    assert.equal(plan.length, 24)
    assert.equal(plan.filter((entry) => entry.action === "REUSE_AUTHORITATIVE_RECOVERY_OUTPUT").length, 1)
    assert.equal(plan.filter((entry) => entry.action === "BLOCKED_CONFLICT").length, 0)
    assert.equal(plan.filter((entry) => entry.action === "CREATE_NEW_ON_LIVE_RESUME").length, 23)
    assert.deepEqual(after, before)
    console.log(JSON.stringify({ status: "PASS", historicalAttempts: 5, committed: 4, acquired: 1, logicalSlots: 24, legacyResolution: resolution.classification, reuseAuthoritative: 1, createNew: 23, blocked: 0, databaseRowsUnchanged: true }))
  } finally {
    await client.shutdown()
  }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_REFRESH_RECONCILIATION_POSTGRES_TEST_FAILED"); process.exitCode = 1 })
