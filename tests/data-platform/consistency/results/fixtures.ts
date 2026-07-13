import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  TemporalAlignmentRuntime,
  createConsistencyRunSpecification,
  type AvailableTemporalAlignmentInput,
  type ConsistencyInputReference,
  type ConsistencyKnowledgeMode,
  type ConsistencyResultInputReference,
  type ConsistencyResultWriteRequest,
  type TemporalAlignmentMethod,
  type TemporalAlignmentPolicy,
} from "@/lib/data-platform/consistency"

export const RESULT_FIXTURE_START = "2026-02-01T00:00:00.000Z"
export const RESULT_FIXTURE_END = "2026-02-01T01:00:00.000Z"
export const RESULT_FIXTURE_CUTOFF = "2026-02-01T01:00:00.000Z"
const governance = { datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "provider-snapshot", policyVersionId: "temporal-policy", schemaVersion: "1", normalizationVersion: "1" } as const

export function temporalFact(recordId: string, roleId: string, recordVersion = 1, knownAt = "2026-02-01T00:31:00.000Z"): AvailableTemporalAlignmentInput {
  return Object.freeze({ availability: "AVAILABLE", roleId, fact: { datasetId: "funding", businessIdentity: recordId, canonicalRecordId: recordId, recordVersion, factTable: "FUNDING" as const }, providerId: "provider", effectiveAt: "2026-02-01T00:30:00.000Z", intervalStart: null, intervalEnd: null, observedAt: "2026-02-01T00:30:00.000Z", knowledgeAvailableAt: knownAt, ingestedAt: knownAt, publicationState: "PUBLISHED", supersessionState: recordVersion === 1 ? "ACTIVE" : "CORRECTION", supersedes: recordVersion === 1 ? null : { datasetId: "funding", businessIdentity: recordId, canonicalRecordId: recordId, recordVersion: recordVersion - 1, factTable: "FUNDING" as const }, checksum: canonicalChecksum({ recordId, recordVersion }), cadenceClass: "EVENT", resolutionClass: "EVENT_8H" })
}

function runInput(input: AvailableTemporalAlignmentInput): ConsistencyInputReference {
  return { roleId: input.roleId, fact: input.fact, physicalFactId: `${input.fact.canonicalRecordId}:${input.fact.recordVersion}`, datasetId: input.fact.datasetId, providerId: input.providerId, effectiveAt: input.effectiveAt, observedAt: input.observedAt, knowledgeAvailableAt: input.knowledgeAvailableAt!, publicationState: input.publicationState, checksum: input.checksum, governance, lineageNodeId: `lineage:${input.fact.canonicalRecordId}:${input.fact.recordVersion}` }
}

function resultInput(input: AvailableTemporalAlignmentInput): ConsistencyResultInputReference {
  return { roleId: input.roleId, canonicalRecordId: input.fact.canonicalRecordId, recordVersion: input.fact.recordVersion, datasetId: input.fact.datasetId, providerId: input.providerId, providerSnapshotId: "provider-snapshot", effectiveAt: input.effectiveAt, observedAt: input.observedAt, knowledgeAvailableAt: input.knowledgeAvailableAt!, publicationState: input.publicationState, supersessionState: input.supersessionState, checksum: input.checksum, lineageNodeId: `lineage:${input.fact.canonicalRecordId}:${input.fact.recordVersion}` }
}

function temporalPolicy(mode: TemporalAlignmentMethod, version: string): TemporalAlignmentPolicy {
  return { policyId: "temporal-policy", policyVersion: version, mode, noLookahead: true, boundary: "START_INCLUSIVE_END_EXCLUSIVE", maximumGapMs: 3_600_000, nearestDirection: "PRIOR_ONLY", tieBreak: "LOWEST_CANONICAL_ID", missingBehavior: "BLOCK", unsupportedBehavior: "BLOCK", allowMultipleWindowMappings: true, interpolationAllowed: false, forwardFillAllowed: false, aggregationPolicy: null, resolutionPolicy: { policyId: "resolution-policy", policyVersion: "1" }, cadencePolicy: { policyId: "cadence-policy", policyVersion: "1" }, eligiblePublicationStates: ["PUBLISHED"], diagnosticsSchemaVersion: "1" }
}

export interface ResultFixtureOptions {
  readonly inputs?: readonly AvailableTemporalAlignmentInput[]
  readonly mode?: TemporalAlignmentMethod
  readonly knowledgeMode?: ConsistencyKnowledgeMode
  readonly cutoff?: string
  readonly ruleId?: string
  readonly ruleVersion?: string
  readonly temporalPolicyVersion?: string
  readonly severityPolicyVersion?: string
  readonly outcome?: ConsistencyResultWriteRequest["outcome"]
  readonly createdAt?: string
  readonly diagnosticCode?: string
  readonly executionProfile?: string
}

export function createResultFixture(options: ResultFixtureOptions = {}): ConsistencyResultWriteRequest {
  const inputs = options.inputs ?? [temporalFact("result-a", "left"), temporalFact("result-b", "right")]
  const mode = options.mode ?? "EVENT_TO_WINDOW"
  const knowledgeMode = options.knowledgeMode ?? "AS_KNOWN_THEN"
  const cutoff = options.cutoff ?? RESULT_FIXTURE_CUTOFF
  const temporalPolicyVersion = options.temporalPolicyVersion ?? "1"
  const severityPolicyVersion = options.severityPolicyVersion ?? "1"
  const policies = { temporalPolicyId: "temporal-policy", temporalPolicyVersion, comparisonPolicyReferences: [{ policyId: "comparison-policy", policyVersion: "1" }], severityPolicyId: "severity-policy", severityPolicyVersion, retryPolicyReference: null } as const
  const runSpecification = createConsistencyRunSpecification({ ruleSetId: "result-rules", ruleSetVersion: "1.0.0", subjectId: "bounded-subject", eventTimeStart: RESULT_FIXTURE_START, eventTimeEnd: RESULT_FIXTURE_END, knowledgeMode, knowledgeTimeCutoff: cutoff, orderedInputs: inputs.map(runInput), ruleRegistryChecksum: "a".repeat(64), policyBindings: policies, executionProfile: options.executionProfile ?? "bounded-result-test", createdAt: options.createdAt ?? RESULT_FIXTURE_END })
  const policy = temporalPolicy(mode, temporalPolicyVersion)
  const alignment = new TemporalAlignmentRuntime().align({ runSpecification, policy, eventTimeWindow: { start: RESULT_FIXTURE_START, end: RESULT_FIXTURE_END }, knowledgeTime: { mode: knowledgeMode, cutoff }, targetEventTime: "2026-02-01T00:30:00.000Z", inputs, createdAt: options.createdAt ?? RESULT_FIXTURE_END })
  return Object.freeze({
    runSpecification, alignment, ruleId: options.ruleId ?? "result-rule", ruleVersion: options.ruleVersion ?? "1.0.0", diagnosticSchemaVersion: "1",
    inputs: Object.freeze(alignment.selectedInputs.map(resultInput)), outcome: options.outcome ?? "CONSISTENT", severity: "BLOCKING", blocking: false,
    diagnostics: Object.freeze([{ diagnosticId: "diagnostic-1", code: options.diagnosticCode ?? "VALUES_AGREE", schemaVersion: "1", inputRoleIds: Object.freeze(["left", "right"]), boundedValues: Object.freeze([{ name: "comparison", value: "equal", unit: null }]), explanationCode: "BOUNDED_COMPARISON" }]),
    policyBindings: Object.freeze({ temporalPolicyId: policies.temporalPolicyId, temporalPolicyVersion: policies.temporalPolicyVersion, comparisonPolicyReferences: policies.comparisonPolicyReferences, severityPolicyId: policies.severityPolicyId, severityPolicyVersion: policies.severityPolicyVersion }),
    schemaVersion: "1", createdAt: options.createdAt ?? RESULT_FIXTURE_END,
  })
}
