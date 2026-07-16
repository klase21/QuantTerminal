import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { MvpRefreshPostgresClient } from "./client"
import type { LiveResumeStage, LiveResumeStageCheckpoint } from "./liveResumeCoordinator"
import { MvpRefreshStore } from "./store"

const OWNER_ID = "mvp-live-resume-coordinator"

function checkpointFromJson(value: LiveResumeStageCheckpoint | string): LiveResumeStageCheckpoint {
  const checkpoint = typeof value === "string" ? JSON.parse(value) as LiveResumeStageCheckpoint : value
  const { checksum, ...basis } = checkpoint
  if (canonicalChecksum(basis) !== checksum) throw new Error("LIVE_RESUME_CHECKPOINT_CHECKSUM_INVALID")
  return Object.freeze(checkpoint)
}

export class PostgresLiveResumeCoordinatorControlPlane {
  private readonly store: MvpRefreshStore

  constructor(private readonly client: MvpRefreshPostgresClient, private readonly leaseSeconds = 300) {
    this.store = new MvpRefreshStore(client)
  }

  async acquire(runId: string): Promise<{ readonly fencingToken: number }> {
    const lease = await this.store.acquireLease(this.leaseKey(runId), OWNER_ID, this.leaseSeconds)
    if (!lease.acquired) throw new Error("LIVE_RESUME_COORDINATOR_LEASE_UNAVAILABLE")
    return Object.freeze({ fencingToken: lease.fencingToken })
  }

  assert(runId: string, fencingToken: number): Promise<void> {
    return this.store.assertFence(this.leaseKey(runId), OWNER_ID, fencingToken)
  }

  release(runId: string, fencingToken: number): Promise<void> {
    return this.store.releaseLease(this.leaseKey(runId), OWNER_ID, fencingToken)
  }

  async read(runId: string, stage: LiveResumeStage): Promise<LiveResumeStageCheckpoint | null> {
    const rows = await this.client.sql.unsafe<Array<{ payload: LiveResumeStageCheckpoint | string }>>("SELECT payload FROM refresh_control.refresh_event WHERE entity_kind='live_resume_coordinator' AND entity_id=$1 AND event_kind=$2 ORDER BY occurred_at,event_id", [runId, `STAGE_${stage}`])
    if (rows.length > 1) throw new Error("LIVE_RESUME_CHECKPOINT_MULTIPLE_EVENTS")
    return rows[0] ? checkpointFromJson(rows[0].payload) : null
  }

  async append(checkpoint: LiveResumeStageCheckpoint): Promise<"CREATED" | "DUPLICATE"> {
    if (checkpoint.state !== "COMPLETE") throw new Error("LIVE_RESUME_COMPLETE_CHECKPOINT_REQUIRED")
    return this.appendEvent(checkpoint, `STAGE_${checkpoint.stage}`)
  }

  async appendFailure(checkpoint: LiveResumeStageCheckpoint): Promise<"CREATED" | "DUPLICATE"> {
    if (checkpoint.state !== "FAILED" || !checkpoint.failureClassification) throw new Error("LIVE_RESUME_FAILURE_CHECKPOINT_REQUIRED")
    return this.appendEvent(checkpoint, `STAGE_FAILURE_${checkpoint.stage}`)
  }

  private async appendEvent(checkpoint: LiveResumeStageCheckpoint, eventKind: string): Promise<"CREATED" | "DUPLICATE"> {
    const verified = checkpointFromJson(checkpoint)
    await this.assert(verified.coordinatorRunId, verified.fencingToken)
    const eventChecksum = canonicalChecksum({ kind: "LIVE_RESUME_STAGE_CHECKPOINT", coordinatorRunId: verified.coordinatorRunId, stage: verified.stage, checkpointChecksum: verified.checksum })
    const eventId = `mre_${eventChecksum}`
    const result = await this.client.sql.unsafe("INSERT INTO refresh_control.refresh_event(event_id,run_id,entity_kind,entity_id,event_kind,from_state,to_state,payload,checksum,occurred_at) VALUES($1,NULL,'live_resume_coordinator',$2,$3,$4,$5,$6::jsonb,$7,now()) ON CONFLICT (event_id) DO NOTHING", [eventId, verified.coordinatorRunId, eventKind, verified.previousStage, verified.stage, JSON.stringify(verified), eventChecksum])
    const rows = await this.client.sql.unsafe<Array<{ payload: LiveResumeStageCheckpoint | string }>>("SELECT payload FROM refresh_control.refresh_event WHERE event_id=$1", [eventId])
    const persisted = rows[0] ? checkpointFromJson(rows[0].payload) : null
    if (!persisted || persisted.checksum !== verified.checksum) throw new Error("LIVE_RESUME_CHECKPOINT_IMMUTABLE_CONFLICT")
    return result.count === 1 ? "CREATED" : "DUPLICATE"
  }

  private leaseKey(runId: string): string { return `live-resume:${runId}` }
}
