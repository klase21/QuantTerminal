import type { PopulationJobState, PopulationRunState, PopulationUnitState } from "./contracts"

interface EventBase { readonly eventId: string; readonly occurredAt: string; readonly actorId: string }
export type PopulationOperationalEvent =
  | EventBase & { readonly type: "JOB_CREATED" | "JOB_COMPLETED" | "CANCELLATION_REQUESTED"; readonly jobId: string; readonly state: PopulationJobState }
  | EventBase & { readonly type: "RUN_CREATED" | "RUN_STARTED"; readonly jobId: string; readonly runId: string; readonly state: PopulationRunState }
  | EventBase & { readonly type: "LEASE_ACQUIRED" | "HEARTBEAT" | "LEASE_EXPIRED"; readonly unitId: string; readonly leaseId: string; readonly fencingToken: number; readonly state: PopulationUnitState }
  | EventBase & { readonly type: "CHECKPOINT_ADVANCED"; readonly unitId: string; readonly checkpointId: string; readonly fencingToken: number; readonly state: PopulationUnitState }
  | EventBase & { readonly type: "UNIT_OUTCOME"; readonly unitId: string; readonly outcomeId: string; readonly state: PopulationUnitState }
  | EventBase & { readonly type: "RETRY_SCHEDULED"; readonly unitId: string; readonly retryEventId: string; readonly state: "RETRYABLE" }
  | EventBase & { readonly type: "WATERMARK_DECIDED"; readonly unitId: string; readonly decisionId: string }

export function latestStateFromEvents<T extends { readonly occurredAt: string; readonly state?: string }>(events: readonly T[]): string | null {
  const ordered = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  return ordered.at(-1)?.state ?? null
}
