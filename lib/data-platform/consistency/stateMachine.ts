import type { ConsistencyRunOutcome, ConsistencyResultOutcome } from "./contracts"
export type ConsistencyRunState = "PENDING" | "RUNNING" | ConsistencyRunOutcome
const RUN_TRANSITIONS: Readonly<Record<ConsistencyRunState, readonly ConsistencyRunState[]>> = {
  PENDING: ["RUNNING", "BLOCKED", "FAILED"], RUNNING: ["COMPLETED", "PARTIAL", "BLOCKED", "FAILED"],
  COMPLETED: [], PARTIAL: [], BLOCKED: [], FAILED: [],
}
export function isLegalConsistencyRunTransition(from: ConsistencyRunState, to: ConsistencyRunState): boolean { return RUN_TRANSITIONS[from].includes(to) }
export function resultBlocksEvidence(outcome: ConsistencyResultOutcome, severity: "ADVISORY" | "BLOCKING"): boolean {
  if (severity === "ADVISORY") return false
  return outcome === "INCONSISTENT" || outcome === "INDETERMINATE" || outcome.startsWith("BLOCKED_")
}
