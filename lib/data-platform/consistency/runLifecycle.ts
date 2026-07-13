import { canonicalChecksum, normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import type { ConsistencyInputReference } from "./contracts"
import type { ConsistencyRunEventType, ConsistencyRunLifecycleState, ConsistencyRunPolicyBindings, ConsistencyRunSpecification } from "./runContracts"

const TRANSITIONS: Readonly<Record<ConsistencyRunLifecycleState, readonly ConsistencyRunLifecycleState[]>> = Object.freeze({ PENDING: ["RUNNING", "CANCELLED"], RUNNING: ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED", "EXPIRED"], COMPLETED: [], PARTIAL: [], FAILED: [], CANCELLED: [], EXPIRED: [] })
export function isLegalRunLifecycleTransition(from: ConsistencyRunLifecycleState, to: ConsistencyRunLifecycleState): boolean { return from !== to && TRANSITIONS[from].includes(to) }
export function isTerminalRunLifecycleState(state: ConsistencyRunLifecycleState): boolean { return TRANSITIONS[state].length === 0 }
export function runEventTypeForState(state: ConsistencyRunLifecycleState): ConsistencyRunEventType { const types: Record<ConsistencyRunLifecycleState,ConsistencyRunEventType>={ PENDING: "RUN_CREATED", RUNNING: "RUN_STARTED", COMPLETED: "RUN_COMPLETED", PARTIAL: "RUN_PARTIAL", FAILED: "RUN_FAILED", CANCELLED: "RUN_CANCELLED", EXPIRED: "RUN_EXPIRED" }; return types[state] }
function inputIdentity(input: ConsistencyInputReference) { return { roleId: input.roleId, canonicalRecordId: input.fact.canonicalRecordId, recordVersion: input.fact.recordVersion, checksum: input.checksum } }
export function createConsistencyInputSetIdentity(inputs: readonly ConsistencyInputReference[]): string { if (!inputs.length) throw new Error("RUN_INPUTS_REQUIRED"); return "cin_" + canonicalChecksum(inputs.map(inputIdentity).sort((a,b) => canonicalChecksum(a).localeCompare(canonicalChecksum(b)))) }
export interface ConsistencyRunSpecificationInput { readonly ruleSetId: string; readonly ruleSetVersion: string; readonly subjectId: string; readonly eventTimeStart: string; readonly eventTimeEnd: string; readonly knowledgeMode: ConsistencyRunSpecification["knowledgeMode"]; readonly knowledgeTimeCutoff: string; readonly orderedInputs: readonly ConsistencyInputReference[]; readonly ruleRegistryChecksum: string; readonly policyBindings: ConsistencyRunPolicyBindings; readonly executionProfile: string; readonly createdAt: string }
export function createConsistencyRunSpecification(input: ConsistencyRunSpecificationInput): ConsistencyRunSpecification {
  if (Date.parse(input.eventTimeEnd) <= Date.parse(input.eventTimeStart)) throw new Error("RUN_EVENT_WINDOW_INVALID")
  const inputSetIdentity = createConsistencyInputSetIdentity(input.orderedInputs)
  const identityMaterial = { ruleSetId: normalizeIdentifier(input.ruleSetId), ruleSetVersion: input.ruleSetVersion, subjectId: normalizeIdentifier(input.subjectId), eventTimeStart: normalizeIsoTimestamp(input.eventTimeStart), eventTimeEnd: normalizeIsoTimestamp(input.eventTimeEnd), knowledgeMode: input.knowledgeMode, knowledgeTimeCutoff: normalizeIsoTimestamp(input.knowledgeTimeCutoff), inputSetIdentity, policyBindings: input.policyBindings, executionProfile: input.executionProfile }
  const runId = "crun_" + canonicalChecksum(identityMaterial)
  const specificationChecksum = canonicalChecksum({ ...identityMaterial, runId, ruleRegistryChecksum: input.ruleRegistryChecksum })
  return Object.freeze({
    ruleSetId: identityMaterial.ruleSetId, ruleSetVersion: input.ruleSetVersion, subjectId: identityMaterial.subjectId,
    eventTimeStart: identityMaterial.eventTimeStart, eventTimeEnd: identityMaterial.eventTimeEnd, knowledgeMode: input.knowledgeMode,
    knowledgeTimeCutoff: identityMaterial.knowledgeTimeCutoff, ruleRegistryChecksum: input.ruleRegistryChecksum,
    policyBindings: Object.freeze({ ...input.policyBindings, comparisonPolicyReferences: Object.freeze([...input.policyBindings.comparisonPolicyReferences]) }),
    executionProfile: input.executionProfile, createdAt: normalizeIsoTimestamp(input.createdAt), inputSetIdentity, runId, specificationChecksum,
  })
}
export function createConsistencyRunEventId(input: { readonly commandId: string; readonly runId: string; readonly eventType: ConsistencyRunEventType; readonly previousState: ConsistencyRunLifecycleState | null; readonly nextState: ConsistencyRunLifecycleState; readonly specificationChecksum: string }): string { return "crevt_" + canonicalChecksum(input) }
