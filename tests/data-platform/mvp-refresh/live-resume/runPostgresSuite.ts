import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { PostgresLiveResumeCoordinatorControlPlane, createMvpRefreshClientFromEnvironment, liveResumeStageOutput, type LiveResumeStageCheckpoint, type MvpRefreshPostgresClient } from "@/lib/data-platform/mvp-refresh"

async function main() {
  const client = createMvpRefreshClientFromEnvironment()
  await client.verify()
  let result: Record<string, unknown> | null = null
  try {
    await client.sql.begin(async (sql) => {
      const transactionClient = { sql, transaction: async <T>(work: (value: typeof sql) => Promise<T>) => work(sql) } as unknown as MvpRefreshPostgresClient
      const control = new PostgresLiveResumeCoordinatorControlPlane(transactionClient, 300)
      const runId = `certification_${canonicalChecksum({ test: "live-resume-checkpoint" })}`
      const lease = await control.acquire(runId)
      const output = liveResumeStageOutput({ logicalSlots: 24 }, ["certified-plan"])
      const basis: Omit<LiveResumeStageCheckpoint, "checksum"> = { coordinatorRunId: runId, stage: "PLAN_VERIFIED", intervalStart: "2026-07-15T00:00:00.000Z", intervalEnd: "2026-07-16T00:00:00.000Z", plannerIdentity: "mrlp_certification", plannerChecksum: canonicalChecksum({ plan: "certification" }), inputChecksum: canonicalChecksum({ input: "certification" }), output, previousStage: null, previousStageChecksum: null, fencingToken: lease.fencingToken, state: "COMPLETE", failureClassification: null, resumeEligible: true }
      const checkpoint = Object.freeze({ ...basis, checksum: canonicalChecksum(basis) })
      assert.equal(await control.append(checkpoint), "CREATED")
      assert.equal(await control.append(checkpoint), "DUPLICATE")
      assert.equal((await control.read(runId, "PLAN_VERIFIED"))?.checksum, checkpoint.checksum)
      await control.release(runId, lease.fencingToken)
      result = { checkpointCreated: true, exactRepeat: "DUPLICATE", checksumVerified: true, appendOnlyMutationRejected: true, retainedRows: 0 }
      await sql.unsafe("UPDATE refresh_control.refresh_event SET payload='{}'::jsonb WHERE entity_kind='live_resume_coordinator' AND entity_id=$1", [runId])
      throw new Error("APPEND_ONLY_MUTATION_NOT_REJECTED")
    })
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("REFRESH_EVENT_APPEND_ONLY")) throw error
  } finally { await client.shutdown() }
  console.log(JSON.stringify({ status: "PASS", ...result }))
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
