import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  TemporalAlignmentRuntime,
  createConsistencyRunSpecification,
  evaluateCadenceCompatibility,
  evaluateResolutionCompatibility,
  reconcileTemporalAlignment,
  temporalAlignmentIdentity,
  type AvailableTemporalAlignmentInput,
  type ConsistencyInputReference,
  type ConsistencyKnowledgeMode,
  type TemporalAlignmentMethod,
  type TemporalAlignmentPolicy,
  type TemporalAlignmentRequest,
} from "@/lib/data-platform/consistency"

const checks: Array<[string, boolean]> = []
const check = (name: string, passed: boolean) => checks.push([name, passed])
const throws = (fn: () => unknown, code: string) => {
  try { fn(); return false } catch (error) { return error instanceof Error && error.message === code }
}

const governance = { datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "certification-snapshot", policyVersionId: "policy-1", schemaVersion: "1", normalizationVersion: "1" } as const
const start = "2026-01-01T00:00:00.000Z"
const end = "2026-01-01T01:00:00.000Z"
const cutoff = "2026-01-01T01:00:00.000Z"

function fact(recordId: string, version = 1, effectiveAt = "2026-01-01T00:30:00.000Z", knownAt = "2026-01-01T00:31:00.000Z", roleId = "observation"): AvailableTemporalAlignmentInput {
  return Object.freeze({ availability: "AVAILABLE", roleId, fact: { datasetId: "funding", businessIdentity: recordId, canonicalRecordId: recordId, recordVersion: version, factTable: "FUNDING" as const }, providerId: "provider", effectiveAt, intervalStart: null, intervalEnd: null, observedAt: effectiveAt, knowledgeAvailableAt: knownAt, ingestedAt: knownAt, publicationState: "PUBLISHED", supersessionState: version === 1 ? "ACTIVE" : "CORRECTION", supersedes: version === 1 ? null : { datasetId: "funding", businessIdentity: recordId, canonicalRecordId: recordId, recordVersion: version - 1, factTable: "FUNDING" as const }, checksum: canonicalChecksum({ recordId, version }), cadenceClass: "EVENT", resolutionClass: "EVENT_8H" })
}

function runInput(input: AvailableTemporalAlignmentInput): ConsistencyInputReference {
  return { roleId: input.roleId, fact: input.fact, physicalFactId: `${input.fact.canonicalRecordId}:${input.fact.recordVersion}`, datasetId: input.fact.datasetId, providerId: input.providerId, effectiveAt: input.effectiveAt, observedAt: input.observedAt, knowledgeAvailableAt: input.knowledgeAvailableAt!, publicationState: input.publicationState, checksum: input.checksum, governance, lineageNodeId: `lineage:${input.fact.canonicalRecordId}:${input.fact.recordVersion}` }
}

function policy(mode: TemporalAlignmentMethod, version = "1", overrides: Partial<TemporalAlignmentPolicy> = {}): TemporalAlignmentPolicy {
  return { policyId: "temporal", policyVersion: version, mode, noLookahead: true, boundary: "START_INCLUSIVE_END_EXCLUSIVE", maximumGapMs: 3_600_000, nearestDirection: "PRIOR_ONLY", tieBreak: "HIGHEST_RECORD_VERSION_THEN_LOWEST_ID", missingBehavior: "BLOCK", unsupportedBehavior: "BLOCK", allowMultipleWindowMappings: false, interpolationAllowed: false, forwardFillAllowed: false, aggregationPolicy: null, resolutionPolicy: { policyId: "resolution", policyVersion: "1" }, cadencePolicy: { policyId: "cadence", policyVersion: "1" }, eligiblePublicationStates: ["PUBLISHED"], diagnosticsSchemaVersion: "1", ...overrides }
}

function request(inputs: readonly AvailableTemporalAlignmentInput[], mode: TemporalAlignmentMethod, knowledgeMode: ConsistencyKnowledgeMode = "AS_KNOWN_THEN", overrides: Partial<TemporalAlignmentRequest> = {}, policyOverrides: Partial<TemporalAlignmentPolicy> = {}): TemporalAlignmentRequest {
  const temporalPolicy = policy(mode, policyOverrides.policyVersion ?? "1", policyOverrides)
  const runSpecification = createConsistencyRunSpecification({ ruleSetId: "temporal-fixture", ruleSetVersion: "1.0.0", subjectId: "bounded-subject", eventTimeStart: start, eventTimeEnd: end, knowledgeMode, knowledgeTimeCutoff: cutoff, orderedInputs: inputs.map(runInput), ruleRegistryChecksum: "a".repeat(64), policyBindings: { temporalPolicyId: temporalPolicy.policyId, temporalPolicyVersion: temporalPolicy.policyVersion, comparisonPolicyReferences: [], severityPolicyId: "severity", severityPolicyVersion: "1", retryPolicyReference: null }, executionProfile: "bounded-test", createdAt: end })
  return { runSpecification, policy: temporalPolicy, eventTimeWindow: { start, end }, knowledgeTime: { mode: knowledgeMode, cutoff }, targetEventTime: "2026-01-01T00:30:00.000Z", inputs, createdAt: end, ...overrides }
}

const runtime = new TemporalAlignmentRuntime()
const exactInput = fact("exact")
check("exact timestamp matches exact immutable fact", runtime.align(request([exactInput], "EXACT_TIMESTAMP")).status === "MATCHED")
check("exact timestamp does not round", runtime.align(request([fact("precision", 1, "2026-01-01T00:30:00.001Z")], "EXACT_TIMESTAMP")).status === "NOT_MATCHED")

const contained = { ...fact("contained"), intervalStart: "2026-01-01T00:00:00.000Z", intervalEnd: end }
check("window containment accepts interval ending at exclusive window boundary", runtime.align(request([contained], "WINDOW_CONTAINMENT")).status === "MATCHED")
const endPoint = fact("endpoint", 1, end)
check("exclusive window rejects point at end", runtime.align(request([endPoint], "EVENT_TO_WINDOW", "AS_KNOWN_THEN", {}, { allowMultipleWindowMappings: true })).status === "NOT_MATCHED")
check("inclusive window accepts point at end", runtime.align(request([endPoint], "EVENT_TO_WINDOW", "AS_KNOWN_THEN", {}, { boundary: "BOTH_INCLUSIVE", allowMultipleWindowMappings: true })).status === "MATCHED")

const prior = fact("prior", 1, "2026-01-01T00:29:00.000Z")
const future = fact("future", 1, "2026-01-01T00:29:30.000Z", "2026-01-01T00:29:31.000Z")
const actuallyFuture = { ...future, effectiveAt: "2026-01-01T00:30:01.000Z", observedAt: "2026-01-01T00:30:01.000Z" }
check("nearest prior never selects future event", runtime.align(request([prior, actuallyFuture], "NEAREST_PRIOR")).selectedInputs[0]?.fact.canonicalRecordId === "prior")
check("as-of selects latest eligible prior observation", runtime.align(request([fact("older", 1, "2026-01-01T00:20:00.000Z"), prior], "AS_OF")).selectedInputs[0]?.fact.canonicalRecordId === "prior")
check("nearest observation enforces historical no-lookahead", runtime.align(request([prior, actuallyFuture], "NEAREST_OBSERVATION", "AS_KNOWN_THEN", {}, { nearestDirection: "BIDIRECTIONAL", noLookahead: false })).selectedInputs[0]?.fact.canonicalRecordId === "prior")

const overlap = { ...fact("overlap"), intervalStart: "2025-12-31T23:59:00.000Z", intervalEnd: "2026-01-01T00:01:00.000Z" }
const overlapOutcome = runtime.align(request([overlap], "INTERVAL_OVERLAP"))
check("interval overlap retains bounded diagnostics", overlapOutcome.status === "MATCHED" && overlapOutcome.diagnostics[0]?.overlapDurationMs === 60_000)
check("event-to-window preserves individual event references", runtime.align(request([prior, future], "EVENT_TO_WINDOW", "AS_KNOWN_THEN", {}, { allowMultipleWindowMappings: true })).selectedInputs.length === 2)

const delayed = fact("delayed", 1, "2026-01-01T00:15:00.000Z", "2026-01-01T01:00:01.000Z")
check("delayed provider publication is future knowledge", runtime.align(request([delayed], "EVENT_TO_WINDOW")).status === "BLOCKED_FUTURE_KNOWLEDGE")
check("ETF post-close availability is blocked", runtime.align(request([{ ...delayed, fact: { ...delayed.fact, datasetId: "etf", factTable: "ETF_OBSERVATION" } }], "EVENT_TO_WINDOW")).status === "BLOCKED_FUTURE_KNOWLEDGE")
check("macro revision published later is blocked", runtime.align(request([{ ...delayed, fact: { ...delayed.fact, datasetId: "macro", factTable: "MACRO_OBSERVATION" } }], "EVENT_TO_WINDOW")).status === "BLOCKED_FUTURE_KNOWLEDGE")
check("unknown publication time fails closed as invalid", runtime.align(request([{ ...exactInput, knowledgeAvailableAt: null }], "EXACT_TIMESTAMP")).status === "BLOCKED_INVALID_INPUT")

const correctionV1 = fact("correction", 1, "2026-01-01T00:30:00.000Z", "2026-01-01T00:31:00.000Z")
const correctionV2 = fact("correction", 2, "2026-01-01T00:30:00.000Z", "2026-01-02T00:00:00.000Z")
check("as-known-then retains V1 across late correction", runtime.align(request([correctionV1, correctionV2], "EXACT_TIMESTAMP")).selectedInputs[0]?.fact.recordVersion === 1)
check("latest-corrected may select V2", runtime.align(request([correctionV1, correctionV2], "EXACT_TIMESTAMP", "LATEST_CORRECTED")).selectedInputs[0]?.fact.recordVersion === 2)
check("retrospective is explicit and selects governed latest version", runtime.align(request([correctionV1, correctionV2], "EXACT_TIMESTAMP", "RETROSPECTIVE")).selectedInputs[0]?.fact.recordVersion === 2)

const missingRequest = { ...request([exactInput], "EXACT_TIMESTAMP"), inputs: [{ availability: "MISSING", roleId: "observation", datasetId: "funding", reasonCode: "NOT_LOADED" }] } as TemporalAlignmentRequest
const unsupportedRequest = { ...missingRequest, inputs: [{ availability: "UNSUPPORTED", roleId: "observation", datasetId: "funding", reasonCode: "NO_CAPABILITY" }] } as TemporalAlignmentRequest
check("missing remains distinct and blocking", runtime.align(missingRequest).status === "BLOCKED_MISSING_INPUT")
check("unsupported remains distinct and blocking", runtime.align(unsupportedRequest).status === "BLOCKED_UNSUPPORTED_INPUT")
check("inapplicable remains distinct", runtime.align({ ...missingRequest, inputs: [{ availability: "INAPPLICABLE", roleId: "observation", datasetId: "funding", reasonCode: "NOT_IN_PROFILE" }] }).status === "INAPPLICABLE")

const compatibilityPolicy = policy("EVENT_TO_WINDOW", "1", { aggregationPolicy: { policyId: "mapping", policyVersion: "1" } })
check("resolution compatibility requires governed mapping", evaluateResolutionCompatibility("FIXED_1M", "FIXED_1H", compatibilityPolicy) === "COMPATIBLE_WITH_GOVERNED_MAPPING")
check("stream manifests are not observations", evaluateCadenceCompatibility("STREAM_MANIFEST", "FIXED", compatibilityPolicy) === "NOT_APPLICABLE")
check("irregular cadence remains indeterminate", evaluateCadenceCompatibility("IRREGULAR", "FIXED", policy("EVENT_TO_WINDOW")) === "INDETERMINATE")

const identityInputs = [fact("identity-a"), fact("identity-b", 1, "2026-01-01T00:30:00.000Z")]
const identityRequest = request(identityInputs, "EXACT_TIMESTAMP")
check("alignment identity ignores input ordering", temporalAlignmentIdentity(identityRequest) === temporalAlignmentIdentity({ ...identityRequest, inputs: [...identityInputs].reverse() }))
check("fact version changes alignment identity", temporalAlignmentIdentity(identityRequest) !== temporalAlignmentIdentity(request([identityInputs[0]!, fact("identity-b", 2)], "EXACT_TIMESTAMP")))
check("policy version changes alignment identity", temporalAlignmentIdentity(identityRequest) !== temporalAlignmentIdentity(request(identityInputs, "EXACT_TIMESTAMP", "AS_KNOWN_THEN", {}, { policyVersion: "2" })))
check("knowledge cutoff changes alignment identity", temporalAlignmentIdentity(identityRequest) !== temporalAlignmentIdentity(request(identityInputs, "EXACT_TIMESTAMP", "AS_KNOWN_THEN", { knowledgeTime: { mode: "AS_KNOWN_THEN", cutoff: "2026-01-01T00:59:00.000Z" } })))
check("mode changes alignment identity", temporalAlignmentIdentity(identityRequest) !== temporalAlignmentIdentity(request(identityInputs, "EVENT_TO_WINDOW")))

check("Run policy mismatch fails closed", throws(() => runtime.align({ ...identityRequest, policy: { ...identityRequest.policy, policyVersion: "unexpected" } }), "RUN_TEMPORAL_BINDING_MISMATCH"))
check("Run input-set mismatch fails closed", throws(() => runtime.align({ ...identityRequest, inputs: [identityInputs[0]!] }), "RUN_INPUT_SET_MISMATCH"))
check("non-UTC timestamps fail closed", throws(() => runtime.align({ ...identityRequest, eventTimeWindow: { start: "2026-01-01T00:00:00+00:00", end } }), "TEMPORAL_TIMESTAMP_NOT_UTC"))

const baseline = runtime.align(identityRequest)
check("reconciliation accepts immutable outcome", reconcileTemporalAlignment(baseline, identityRequest).consistent)
check("reconciliation detects checksum mutation", reconcileTemporalAlignment({ ...baseline, status: "NOT_MATCHED" }, identityRequest).reasonCodes.includes("CHECKSUM_MISMATCH"))
const driftRequest = structuredClone(identityRequest)
const driftRuntime = new TemporalAlignmentRuntime({ fail: point => { if (point === "AFTER_INPUT_LOADING") (driftRequest.policy as { maximumGapMs: number | null }).maximumGapMs = 0 } })
check("active evaluation is isolated from policy-version drift", driftRuntime.align(driftRequest).checksum === baseline.checksum)
const failurePoints = ["AFTER_INPUT_LOADING", "AFTER_KNOWLEDGE_FILTER", "AFTER_EVENT_FILTER", "AFTER_TIE_BREAK", "AFTER_SELECTION", "AFTER_CHECKSUM"] as const
for (const point of failurePoints) {
  const failing = new TemporalAlignmentRuntime({ fail: current => { if (current === point) throw new Error(point) } })
  check(`failure injection ${point} leaves deterministic retry`, throws(() => failing.align(identityRequest), point) && runtime.align(identityRequest).checksum === baseline.checksum)
}
void Promise.all([Promise.resolve().then(() => runtime.align(identityRequest)), Promise.resolve().then(() => runtime.align(identityRequest))]).then(concurrent => {
  check("concurrent pure evaluations are deterministic", concurrent[0]!.alignmentId === concurrent[1]!.alignmentId && concurrent[0]!.checksum === concurrent[1]!.checksum)
  const failures = checks.filter(([, passed]) => !passed)
  console.log(`D4 PHASE 2 PART 04 UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
  for (const [name, passed] of checks) console.log(`[${passed ? "PASS" : "FAIL"}] ${name}`)
  if (failures.length) process.exitCode = 1
})
