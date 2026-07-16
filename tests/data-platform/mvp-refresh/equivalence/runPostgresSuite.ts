import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createMvpRefreshClientFromEnvironment, MvpRefreshStore } from "@/lib/data-platform/mvp-refresh"

const START = "2026-07-15T00:00:00.000Z"
const END = "2026-07-16T00:00:00.000Z"

async function counts(client: ReturnType<typeof createMvpRefreshClientFromEnvironment>) {
  return (await client.sql.unsafe<Array<{ units: number; events: number; artifacts: number; leases: number; candidates: number }>>("SELECT (SELECT count(*)::int FROM refresh_control.refresh_unit) units,(SELECT count(*)::int FROM refresh_control.refresh_event) events,(SELECT count(*)::int FROM refresh_control.refresh_artifact) artifacts,(SELECT count(*)::int FROM refresh_control.refresh_lease) leases,(SELECT count(*)::int FROM refresh_control.refresh_candidate) candidates"))[0]
}

async function main(): Promise<void> {
  const client = createMvpRefreshClientFromEnvironment()
  try {
    await client.verify()
    const before = await counts(client), attempts = await new MvpRefreshStore(client).auditUnitsForWindow(START, END)
    const committed = attempts.filter((attempt) => attempt.state === "COMMITTED"), acquired = attempts.find((attempt) => attempt.state === "ACQUIRED")
    assert.equal(attempts.length, 5)
    assert.equal(committed.length, 4)
    assert(committed.every((attempt) => attempt.checkpoint.factDigest === canonicalChecksum({ unit: attempt.unitId, stage: "COMMITTED" })))
    assert(committed.every((attempt) => attempt.artifacts.length === 0 && attempt.lease === null))
    assert(acquired && acquired.artifacts.length === 0 && acquired.lease === null)
    const after = await counts(client)
    assert.deepEqual(after, before)

    const worker = await readFile("workers/data-platform/runMvpCanonicalOutputEquivalenceAudit.ts", "utf8")
    const protectedNames = ["d3-phase-3-aggtrades-segment-progress.json", "d3-phase-3-funding-progress.json", "d3-phase-3-ohlcv-progress.json", "d3-phase-3-oi-progress.json", "mvp-recent-market-corpus-progress.json"]
    assert(protectedNames.every((name) => !worker.includes(name)))
    assert(!/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/.test(worker))
    assert(!worker.includes("MVP_SERVING_POSTGRES_URL"))

    console.log(JSON.stringify({ status: "PASS", attempts: 5, syntheticDigestsReconstructed: 4, databaseRowsUnchanged: true, unitCreation: false, progressMutation: false, externalMutation: false }))
  } finally {
    await client.shutdown()
  }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_EQUIVALENCE_POSTGRES_TEST_FAILED"); process.exitCode = 1 })
