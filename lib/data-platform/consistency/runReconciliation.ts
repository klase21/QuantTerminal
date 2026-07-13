import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { isTerminalRunLifecycleState } from "./runLifecycle"
import type { ConsistencyRunRecord, ConsistencyRunEvent, RunReconciliationReason, RunReconciliationResult } from "./runContracts"
export function reconcileConsistencyRun(run: ConsistencyRunRecord, events: readonly ConsistencyRunEvent[]): RunReconciliationResult {
  const reasons: RunReconciliationReason[] = []; const affected = [run.specification.runId]
  if (!events.length) reasons.push("EVENT_HISTORY_MISSING")
  const ordered = [...events].sort((a,b)=>a.eventSequence-b.eventSequence)
  if (ordered.some((event,index)=>event.eventSequence!==index+1)) reasons.push("EVENT_SEQUENCE_GAP")
  if (ordered.at(-1)?.nextState !== run.currentState || ordered.at(-1)?.eventSequence !== run.lastEventSequence) reasons.push("CURRENT_STATE_MISMATCH")
  const expected = canonicalChecksum({ ruleSetId: run.specification.ruleSetId, ruleSetVersion: run.specification.ruleSetVersion, subjectId: run.specification.subjectId, eventTimeStart: run.specification.eventTimeStart, eventTimeEnd: run.specification.eventTimeEnd, knowledgeMode: run.specification.knowledgeMode, knowledgeTimeCutoff: run.specification.knowledgeTimeCutoff, inputSetIdentity: run.specification.inputSetIdentity, policyBindings: run.specification.policyBindings, executionProfile: run.specification.executionProfile, runId: run.specification.runId, ruleRegistryChecksum: run.specification.ruleRegistryChecksum })
  if (expected !== run.specification.specificationChecksum) reasons.push("SPECIFICATION_CHECKSUM_MISMATCH")
  if (isTerminalRunLifecycleState(run.currentState) !== Boolean(run.terminalAt)) reasons.push("TERMINAL_TIMESTAMP_MISMATCH")
  if ((run.currentState === "COMPLETED" || run.currentState === "PARTIAL") !== Boolean(run.completionSummary)) reasons.push("COMPLETION_SUMMARY_MISMATCH")
  if (ordered.filter((event)=>isTerminalRunLifecycleState(event.nextState)).length > 1) reasons.push("MULTIPLE_TERMINAL_EVENTS")
  return Object.freeze({ consistent: reasons.length===0, reasonCodes:Object.freeze(reasons), affectedIdentities:Object.freeze(affected) })
}
