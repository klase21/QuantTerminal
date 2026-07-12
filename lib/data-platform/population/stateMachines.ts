import type { PopulationJobState, PopulationRunState, PopulationUnitState } from "./contracts"

const JOB: Readonly<Record<PopulationJobState, readonly PopulationJobState[]>> = {
  QUEUED: ["RUNNING", "CANCELLED", "PAUSED", "EXPIRED"], RUNNING: ["PARTIAL", "SUCCEEDED", "FAILED", "CANCELLED", "PAUSED", "EXPIRED"],
  PAUSED: ["QUEUED", "CANCELLED", "EXPIRED"], PARTIAL: [], SUCCEEDED: [], FAILED: [], CANCELLED: [], EXPIRED: [],
}
const RUN: Readonly<Record<PopulationRunState, readonly PopulationRunState[]>> = {
  CREATED: ["RUNNING", "CANCELLED", "EXPIRED"], RUNNING: ["SUCCEEDED", "PARTIAL", "FAILED", "CANCELLED", "EXPIRED"],
  SUCCEEDED: [], PARTIAL: [], FAILED: [], CANCELLED: [], EXPIRED: [],
}
const UNIT: Readonly<Record<PopulationUnitState, readonly PopulationUnitState[]>> = {
  PENDING: ["LEASED", "CANCELLED"], LEASED: ["RETRIEVING", "RETRYABLE", "CANCELLED"], RETRIEVING: ["RAW_PERSISTED", "RETRYABLE", "QUARANTINED", "FAILED", "CANCELLED"],
  RAW_PERSISTED: ["CANDIDATES_READY", "RETRYABLE", "QUARANTINED", "FAILED", "CANCELLED"], CANDIDATES_READY: ["PROCESSING", "QUARANTINED", "FAILED", "CANCELLED"],
  PROCESSING: ["COMPLETED", "RETRYABLE", "QUARANTINED", "FAILED", "CANCELLED"], RETRYABLE: ["LEASED", "CANCELLED"],
  COMPLETED: [], QUARANTINED: [], FAILED: [], CANCELLED: [],
}

export const isLegalJobTransition = (from: PopulationJobState, to: PopulationJobState) => JOB[from].includes(to)
export const isLegalRunTransition = (from: PopulationRunState, to: PopulationRunState) => RUN[from].includes(to)
export const isLegalUnitTransition = (from: PopulationUnitState, to: PopulationUnitState) => UNIT[from].includes(to)

export function requireCurrentFencingToken(presented: number, current: number): void {
  if (!Number.isInteger(presented) || presented <= 0 || presented !== current) throw new Error("STALE_FENCING_TOKEN")
}

export function nextFencingToken(current: number): number {
  if (!Number.isInteger(current) || current < 0) throw new Error("INVALID_FENCING_TOKEN")
  return current + 1
}

export function aggregateJobState(states: readonly PopulationUnitState[], required: readonly boolean[]): PopulationJobState {
  if (states.length === 0 || states.length !== required.length) throw new Error("INVALID_UNIT_AGGREGATE")
  const requiredStates = states.filter((_, index) => required[index])
  if (requiredStates.every((state) => state === "COMPLETED")) return "SUCCEEDED"
  const terminal = new Set<PopulationUnitState>(["COMPLETED", "QUARANTINED", "FAILED", "CANCELLED"])
  if (requiredStates.every((state) => terminal.has(state))) return requiredStates.some((state) => state === "COMPLETED") ? "PARTIAL" : "FAILED"
  return "RUNNING"
}
