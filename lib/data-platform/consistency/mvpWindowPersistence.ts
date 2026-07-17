import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  ConsistencyResultStore,
  ConsistencyRunStore,
  CoreEvidenceStore,
  MvpEvidenceAssessmentStore,
  type ConsistencyPostgresRuntime,
} from "@/lib/data-platform/consistency-evidence/postgres"
import type { EvidenceAssemblyProfile } from "@/lib/data-platform/evidence-platform"
import { MVP_EVIDENCE_RULES, MVP_EVIDENCE_RULE_SET_ID, MVP_EVIDENCE_RULE_SET_VERSION, createMvpMarketAssessment, type MvpMarketAssessment, type MvpRuleEvaluation } from "./mvpEvidence"
import type { MvpEvidenceWindowData } from "./mvpEvidenceData"
import type { ConsistencyResult } from "./resultContracts"
import { createConsistencyRunSpecification } from "./runLifecycle"
import type { TemporalAlignmentPolicy } from "./temporalContracts"
import { TemporalAlignmentRuntime } from "./temporalRuntime"

export const MVP_EVIDENCE_POLICY = Object.freeze({
  temporal: "mvp-evidence-temporal/1.0.0",
  comparison: "mvp-evidence-comparison/1.0.0",
  severity: "mvp-evidence-severity/1.0.0",
  activation: "mvp-evidence-activation/1.0.0",
})
export const MVP_EVIDENCE_RULE_REGISTRY_CHECKSUM = canonicalChecksum(MVP_EVIDENCE_RULES)
const MVP_EVIDENCE_GOVERNANCE_CREATED_AT = "2026-07-15T00:00:00.000Z"

export const MVP_EVIDENCE_PROFILE: EvidenceAssemblyProfile = Object.freeze({
  profileId: "MVP-MARKET-STATE-CORE-EVIDENCE", profileVersion: "1.0.0", schemaVersion: "1",
  assemblyPolicyId: MVP_EVIDENCE_POLICY.activation, assemblyPolicyVersion: "1.0.0",
  selectionPolicyReferences: Object.freeze([{ policyId: MVP_EVIDENCE_POLICY.comparison, policyVersion: "1.0.0" }]),
  conclusionPolicyId: MVP_EVIDENCE_POLICY.activation, conclusionPolicyVersion: "1.0.0",
  roleRules: Object.freeze(MVP_EVIDENCE_RULES.flatMap((rule) => [
    { ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, outcomes: Object.freeze(["CONSISTENT"] as const), role: "SUPPORTING" as const },
    { ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, outcomes: Object.freeze(["INCONSISTENT"] as const), role: "CONFLICTING" as const },
    { ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, outcomes: Object.freeze(["PARTIAL", "INDETERMINATE", "NOT_APPLICABLE"] as const), role: "CONTEXTUAL" as const },
    { ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, outcomes: Object.freeze(["BLOCKED_MISSING_INPUT", "BLOCKED_INVALID_INPUT", "BLOCKED_SUPERSEDED_INPUT", "BLOCKED_FUTURE_KNOWLEDGE"] as const), role: "BLOCKING" as const },
  ])),
  requiredRoles: Object.freeze([]),
  optionalRoles: Object.freeze(["SUPPORTING", "CONFLICTING", "CONTEXTUAL", "BLOCKING"] as const),
})

export interface MvpEvidenceCorpusReference { readonly corpusId: string; readonly corpusChecksum: string }
export interface BoundedPersistenceContract {
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly committedInputIdentities: readonly { readonly identity: string; readonly checksum: string }[]
  readonly modelVersion: string
  readonly modelChecksum: string
}

export type BoundedPersistenceStatus = "CREATED" | "DUPLICATE" | "INELIGIBLE" | "CONFLICT"

export async function seedMvpEvidenceGovernance(runtime: ConsistencyPostgresRuntime): Promise<"CREATED" | "DUPLICATE"> {
  return runtime.transaction(async (sql) => {
    let created = false
    const policies = [
      [MVP_EVIDENCE_POLICY.temporal, "mvp-evidence-temporal"],
      [MVP_EVIDENCE_POLICY.comparison, "mvp-evidence-comparison"],
      [MVP_EVIDENCE_POLICY.severity, "mvp-evidence-severity"],
      [MVP_EVIDENCE_POLICY.activation, "mvp-evidence-activation"],
    ] as const
    for (const [policyId, datasetId] of policies) {
      const content = Object.freeze({ policyId, policyVersion: "1.0.0", owner: "D4_CONSISTENCY", purpose: datasetId })
      const checksum = canonicalChecksum(content)
      const inserted = await sql.unsafe<Array<{ policy_version_id: string }>>(
        "INSERT INTO control.policy_versions(policy_version_id,dataset_id,policy_version,content_checksum,canonical_content,effective_at,created_at) VALUES($1,$2,'1.0.0',$3,$4::text::jsonb,$5,$5) ON CONFLICT DO NOTHING RETURNING policy_version_id",
        [policyId, datasetId, checksum, JSON.stringify(content), MVP_EVIDENCE_GOVERNANCE_CREATED_AT],
      )
      created ||= inserted.length === 1
      const existing = await sql.unsafe<Array<{ content_checksum: string }>>(
        "SELECT content_checksum FROM control.policy_versions WHERE policy_version_id=$1",
        [policyId],
      )
      if (existing[0]?.content_checksum !== checksum) throw new Error("MVP_EVIDENCE_POLICY_CONFLICT")
    }

    const ruleSet = await sql.unsafe<Array<{ rule_set_id: string }>>(
      "INSERT INTO consistency.rule_sets(rule_set_id,rule_set_version,policy_version_id,state,definition_checksum,created_at) VALUES($1,$2,$3,'APPROVED',$4,$5) ON CONFLICT DO NOTHING RETURNING rule_set_id",
      [MVP_EVIDENCE_RULE_SET_ID, MVP_EVIDENCE_RULE_SET_VERSION, MVP_EVIDENCE_POLICY.activation, MVP_EVIDENCE_RULE_REGISTRY_CHECKSUM, MVP_EVIDENCE_GOVERNANCE_CREATED_AT],
    )
    created ||= ruleSet.length === 1
    const existingRuleSet = await sql.unsafe<Array<{ definition_checksum: string }>>(
      "SELECT definition_checksum FROM consistency.rule_sets WHERE rule_set_id=$1 AND rule_set_version=$2",
      [MVP_EVIDENCE_RULE_SET_ID, MVP_EVIDENCE_RULE_SET_VERSION],
    )
    if (existingRuleSet[0]?.definition_checksum !== MVP_EVIDENCE_RULE_REGISTRY_CHECKSUM) throw new Error("MVP_EVIDENCE_RULE_SET_CONFLICT")

    for (const rule of MVP_EVIDENCE_RULES) {
      const checksum = canonicalChecksum(rule)
      const inserted = await sql.unsafe<Array<{ rule_id: string }>>(
        "INSERT INTO consistency.rules(rule_id,rule_version,rule_set_id,rule_set_version,category,semantic_class,diagnostics_schema_version,policy_version_id,default_severity,definition_checksum,created_at) VALUES($1,$2,$3,$4,'DATASET_AGREEMENT','FACTUAL','1',$5,'ADVISORY',$6,$7) ON CONFLICT DO NOTHING RETURNING rule_id",
        [rule.ruleId, rule.ruleVersion, MVP_EVIDENCE_RULE_SET_ID, MVP_EVIDENCE_RULE_SET_VERSION, MVP_EVIDENCE_POLICY.activation, checksum, MVP_EVIDENCE_GOVERNANCE_CREATED_AT],
      )
      created ||= inserted.length === 1
      const existing = await sql.unsafe<Array<{ definition_checksum: string }>>(
        "SELECT definition_checksum FROM consistency.rules WHERE rule_id=$1 AND rule_version=$2",
        [rule.ruleId, rule.ruleVersion],
      )
      if (existing[0]?.definition_checksum !== checksum) throw new Error("MVP_EVIDENCE_RULE_CONFLICT")
    }

    const profileChecksum = canonicalChecksum(MVP_EVIDENCE_PROFILE)
    const profile = await sql.unsafe<Array<{ profile_id: string }>>(
      "INSERT INTO evidence.core_assembly_profiles(profile_id,profile_version,schema_version,assembly_policy_id,assembly_policy_version,selection_policy_references,conclusion_policy_id,conclusion_policy_version,role_rules,required_roles,optional_roles,definition_checksum,created_at) VALUES($1,$2,$3,$4,$5,$6::text::jsonb,$7,$8,$9::text::jsonb,$10,$11,$12,$13) ON CONFLICT DO NOTHING RETURNING profile_id",
      [MVP_EVIDENCE_PROFILE.profileId, MVP_EVIDENCE_PROFILE.profileVersion, MVP_EVIDENCE_PROFILE.schemaVersion, MVP_EVIDENCE_PROFILE.assemblyPolicyId, MVP_EVIDENCE_PROFILE.assemblyPolicyVersion, JSON.stringify(MVP_EVIDENCE_PROFILE.selectionPolicyReferences), MVP_EVIDENCE_PROFILE.conclusionPolicyId, MVP_EVIDENCE_PROFILE.conclusionPolicyVersion, JSON.stringify(MVP_EVIDENCE_PROFILE.roleRules), MVP_EVIDENCE_PROFILE.requiredRoles, MVP_EVIDENCE_PROFILE.optionalRoles, profileChecksum, MVP_EVIDENCE_GOVERNANCE_CREATED_AT],
    )
    created ||= profile.length === 1
    const existingProfile = await sql.unsafe<Array<{ definition_checksum: string }>>(
      "SELECT definition_checksum FROM evidence.core_assembly_profiles WHERE profile_id=$1 AND profile_version=$2",
      [MVP_EVIDENCE_PROFILE.profileId, MVP_EVIDENCE_PROFILE.profileVersion],
    )
    if (existingProfile[0]?.definition_checksum !== profileChecksum) throw new Error("MVP_EVIDENCE_PROFILE_CONFLICT")
    return created ? "CREATED" : "DUPLICATE"
  })
}

function temporalPolicy(): TemporalAlignmentPolicy {
  return Object.freeze({ policyId: MVP_EVIDENCE_POLICY.temporal, policyVersion: "1.0.0", mode: "WINDOW_CONTAINMENT", noLookahead: true, boundary: "START_INCLUSIVE_END_EXCLUSIVE", maximumGapMs: null, nearestDirection: "PRIOR_ONLY", tieBreak: "LOWEST_CANONICAL_ID", missingBehavior: "BLOCK", unsupportedBehavior: "BLOCK", allowMultipleWindowMappings: true, interpolationAllowed: false, forwardFillAllowed: false, aggregationPolicy: null, resolutionPolicy: { policyId: MVP_EVIDENCE_POLICY.comparison, policyVersion: "1.0.0" }, cadencePolicy: { policyId: MVP_EVIDENCE_POLICY.comparison, policyVersion: "1.0.0" }, eligiblePublicationStates: ["PENDING", "CERTIFIED", "PUBLISHED"] as const, diagnosticsSchemaVersion: "mvp-evidence-diagnostics/1.0.0" })
}

export function validateMvpBoundedPersistenceContract(data: MvpEvidenceWindowData, contract?: BoundedPersistenceContract): void {
  if (!contract) return
  if (data.measurement.instrument !== contract.instrument || data.measurement.eventTimeStart !== contract.eventTimeStart || data.measurement.eventTimeEnd !== contract.eventTimeEnd) throw new Error("BOUNDED_EVIDENCE_WINDOW_MISMATCH")
  if (!contract.committedInputIdentities.length || contract.committedInputIdentities.some((value) => !value.identity || !/^[0-9a-f]{64}$/.test(value.checksum))) throw new Error("BOUNDED_EVIDENCE_INPUT_INVALID")
  if (!contract.modelVersion || !/^[0-9a-f]{64}$/.test(contract.modelChecksum)) throw new Error("BOUNDED_EVIDENCE_MODEL_INVALID")
  const available = new Set(data.committedInputs.map((value) => `${value.commitId}:${value.checksum}`))
  if (contract.committedInputIdentities.some((value) => !available.has(`${value.identity}:${value.checksum}`))) throw new Error("BOUNDED_EVIDENCE_COMMITTED_INPUT_MISSING")
}

function outcome(evaluation: MvpRuleEvaluation): "CONSISTENT" | "INCONSISTENT" | "BLOCKED_MISSING_INPUT" { return evaluation.state === "TRIGGERED" ? "CONSISTENT" : evaluation.state === "NOT_TRIGGERED" ? "INCONSISTENT" : "BLOCKED_MISSING_INPUT" }
function diagnostic(evaluation: MvpRuleEvaluation, assessment: MvpMarketAssessment) {
  const values = [{ name: "marketState", value: assessment.marketState, unit: null }, { name: "measurementDigest", value: evaluation.measurementDigest, unit: null }, { name: "supportingCodes", value: evaluation.supportingCodes.join(",") || "NONE", unit: null }, { name: "counterEvidenceCodes", value: evaluation.counterEvidenceCodes.join(",") || "NONE", unit: null }, { name: "nonTriggerCodes", value: evaluation.nonTriggerCodes.join(",") || "NONE", unit: null }]
  return Object.freeze({ diagnosticId: `mvp_diag_${canonicalChecksum({ assessment: assessment.assessmentIdentity, rule: evaluation.ruleId })}`, code: evaluation.state, schemaVersion: "mvp-evidence-diagnostics/1.0.0", inputRoleIds: Object.freeze([]), boundedValues: Object.freeze(values), explanationCode: evaluation.ruleId })
}
function completionSummary(runId: string, evaluations: readonly MvpRuleEvaluation[]) {
  const consistent = evaluations.filter((item) => item.state === "TRIGGERED").length, blocked = evaluations.filter((item) => item.state === "NOT_EVALUABLE").length
  const base = { summaryId: `mvp_summary_${canonicalChecksum({ runId, evaluations: evaluations.map((item) => item.state) })}`, runId, requiredRuleCount: evaluations.length, completedRuleCount: evaluations.length, consistentResultCount: consistent, inconsistentResultCount: evaluations.length - consistent - blocked, blockedResultCount: blocked, failedEvaluationCount: 0, unresolvedCount: 0, terminalState: "COMPLETED" as const, reasonCodes: Object.freeze([] as string[]) }
  return Object.freeze({ ...base, summaryChecksum: canonicalChecksum(base) })
}

export async function persistMvpConsistencyWindow(input: { readonly corpus: MvpEvidenceCorpusReference; readonly data: MvpEvidenceWindowData; readonly worker: ConsistencyPostgresRuntime; readonly contract?: BoundedPersistenceContract }) {
  validateMvpBoundedPersistenceContract(input.data, input.contract)
  const assessment = createMvpMarketAssessment({ corpusId: input.corpus.corpusId, corpusChecksum: input.corpus.corpusChecksum, measurement: input.data.measurement })
  const policies = { temporalPolicyId: MVP_EVIDENCE_POLICY.temporal, temporalPolicyVersion: "1.0.0", comparisonPolicyReferences: [{ policyId: MVP_EVIDENCE_POLICY.comparison, policyVersion: "1.0.0" }], severityPolicyId: MVP_EVIDENCE_POLICY.severity, severityPolicyVersion: "1.0.0", retryPolicyReference: null }
  const spec = createConsistencyRunSpecification({ ruleSetId: MVP_EVIDENCE_RULE_SET_ID, ruleSetVersion: MVP_EVIDENCE_RULE_SET_VERSION, subjectId: assessment.instrument, eventTimeStart: assessment.eventTimeStart, eventTimeEnd: assessment.eventTimeEnd, knowledgeMode: "RETROSPECTIVE", knowledgeTimeCutoff: assessment.knowledgeTimeCutoff, orderedInputs: input.data.runInputs, ruleRegistryChecksum: MVP_EVIDENCE_RULE_REGISTRY_CHECKSUM, policyBindings: policies, executionProfile: "mvp-bounded-corpus", createdAt: assessment.createdAt })
  const runStore = new ConsistencyRunStore(input.worker), resultStore = new ConsistencyResultStore(input.worker)
  const created = await runStore.create(spec)
  if (created.status === "CONFLICT") return Object.freeze({ status: "CONFLICT" as const, assessment, runId: spec.runId, results: Object.freeze([] as ConsistencyResult[]), resultStatuses: Object.freeze([] as string[]) })
  if (created.run.currentState === "PENDING") {
    const transition = await runStore.transition({ commandId: `start:${spec.runId}`, runId: spec.runId, specificationChecksum: spec.specificationChecksum, nextState: "RUNNING", actorType: "WORKER", actorId: "mvp-evidence-worker", occurredAt: assessment.createdAt, policyVersionReferences: Object.values(MVP_EVIDENCE_POLICY), reasonCodes: [], details: [], completionSummary: null })
    if (transition.status === "REJECTED") throw new Error(`MVP_EVIDENCE_RUN_START_REJECTED:${transition.failure}`)
  }
  const alignment = new TemporalAlignmentRuntime().align({ runSpecification: spec, policy: temporalPolicy(), eventTimeWindow: { start: assessment.eventTimeStart, end: assessment.eventTimeEnd }, knowledgeTime: { mode: "RETROSPECTIVE", cutoff: assessment.knowledgeTimeCutoff }, targetEventTime: null, inputs: input.data.temporalInputs, createdAt: assessment.createdAt })
  if (alignment.status !== "MATCHED") return Object.freeze({ status: "INELIGIBLE" as const, assessment, runId: spec.runId, results: Object.freeze([] as ConsistencyResult[]), resultStatuses: Object.freeze([] as string[]) })
  const results: ConsistencyResult[] = [], resultStatuses: string[] = []
  for (const evaluation of assessment.ruleEvaluations) {
    const write = await resultStore.write({ runSpecification: spec, alignment, ruleId: evaluation.ruleId, ruleVersion: evaluation.ruleVersion, diagnosticSchemaVersion: "mvp-evidence-diagnostics/1.0.0", inputs: input.data.resultInputs, outcome: outcome(evaluation), severity: "ADVISORY", blocking: evaluation.state === "NOT_EVALUABLE", diagnostics: [diagnostic(evaluation, assessment)], policyBindings: policies, schemaVersion: "1", createdAt: assessment.createdAt })
    if (write.status === "CONFLICT") return Object.freeze({ status: "CONFLICT" as const, assessment, runId: spec.runId, results: Object.freeze(results), resultStatuses: Object.freeze(resultStatuses) })
    if (write.status !== "CREATED" && write.status !== "DUPLICATE" && write.status !== "REUSED") throw new Error(`MVP_EVIDENCE_RESULT_${write.status}`)
    results.push(write.result); resultStatuses.push(write.status)
  }
  const current = await runStore.read(spec.runId)
  if (current.currentState === "RUNNING") {
    const transition = await runStore.transition({ commandId: `complete:${spec.runId}`, runId: spec.runId, specificationChecksum: spec.specificationChecksum, nextState: "COMPLETED", actorType: "WORKER", actorId: "mvp-evidence-worker", occurredAt: assessment.createdAt, policyVersionReferences: Object.values(MVP_EVIDENCE_POLICY), reasonCodes: [], details: [], completionSummary: completionSummary(spec.runId, assessment.ruleEvaluations) })
    if (transition.status === "REJECTED") throw new Error(`MVP_EVIDENCE_RUN_COMPLETE_REJECTED:${transition.failure}`)
  }
  return Object.freeze({ status: resultStatuses.some((value) => value === "CREATED") ? "CREATED" as const : "DUPLICATE" as const, assessment, runId: spec.runId, results: Object.freeze(results), resultStatuses: Object.freeze(resultStatuses) })
}

export async function persistMvpEvidenceWindow(input: { readonly corpus: MvpEvidenceCorpusReference; readonly data: MvpEvidenceWindowData; readonly worker: ConsistencyPostgresRuntime; readonly assembler: ConsistencyPostgresRuntime; readonly contract?: BoundedPersistenceContract }) {
  const consistency = await persistMvpConsistencyWindow(input)
  if (consistency.status === "CONFLICT" || consistency.status === "INELIGIBLE") return Object.freeze({ ...consistency, packet: null, packetStatus: consistency.status, assessmentStatus: consistency.status })
  for (const result of consistency.results) if (result.eventTimeWindow.start !== consistency.assessment.eventTimeStart || result.eventTimeWindow.end !== consistency.assessment.eventTimeEnd || result.knowledgeMode !== "RETROSPECTIVE" || result.knowledgeTimeCutoff !== consistency.assessment.knowledgeTimeCutoff) throw new Error("MVP_EVIDENCE_RESULT_TIME_DRIFT")
  const evidence = await new CoreEvidenceStore(input.assembler).assemble({ subject: { subjectId: consistency.assessment.instrument, subjectType: "INSTRUMENT" }, topic: "MVP_MARKET_STATE", timeScope: { eventTimeStart: consistency.assessment.eventTimeStart, eventTimeEnd: consistency.assessment.eventTimeEnd, knowledgeMode: "RETROSPECTIVE", knowledgeTimeCutoff: consistency.assessment.knowledgeTimeCutoff }, profile: MVP_EVIDENCE_PROFILE, selections: consistency.results.map((result) => ({ result, dependencySnapshotId: input.corpus.corpusId })), requirements: [], createdAt: consistency.assessment.createdAt })
  if (evidence.status === "CONFLICT") return Object.freeze({ ...consistency, status: "CONFLICT" as const, packet: null, packetStatus: "CONFLICT" as const, assessmentStatus: "CONFLICT" as const })
  if (!("packet" in evidence) || ["REJECTED", "RETRYABLE_FAILURE"].includes(evidence.status)) return Object.freeze({ ...consistency, status: "INELIGIBLE" as const, packet: null, packetStatus: "INELIGIBLE" as const, assessmentStatus: "INELIGIBLE" as const })
  const assessmentWrite = await new MvpEvidenceAssessmentStore(input.assembler).write(evidence.packet.packetVersionId, consistency.assessment)
  if (assessmentWrite.status === "CONFLICT") return Object.freeze({ ...consistency, status: "CONFLICT" as const, packet: evidence.packet, packetStatus: evidence.status, assessmentStatus: "CONFLICT" as const })
  const status = consistency.status === "CREATED" || evidence.status !== "REUSED" || assessmentWrite.status === "CREATED" ? "CREATED" as const : "DUPLICATE" as const
  return Object.freeze({ ...consistency, status, packet: evidence.packet, packetStatus: evidence.status, assessmentStatus: assessmentWrite.status })
}
