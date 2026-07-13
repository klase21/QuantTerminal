import { readFileSync } from "node:fs"
import {
  ConsistencyRuleRegistry,
  RuleEvaluationRuntime,
  isLegalRuleExecutionTransition,
  isLegalRuleTransition,
  isTerminalRuleState,
  type RuleEvaluationContext,
  type RuleEvaluatorOutput,
  type RuleExecutionRequest,
  type RuleMetadata,
} from "@/lib/data-platform/consistency"

const governance = Object.freeze({ datasetRegistrySnapshotId: "dataset-snapshot", providerRegistrySnapshotId: "provider-snapshot", providerCertificationSnapshotId: "certification-snapshot", policyVersionId: "policy-v1", schemaVersion: "1.0.0", normalizationVersion: "1.0.0" })
const canonicalReference = Object.freeze({ datasetId: "funding", businessIdentity: "funding:BTCUSDT:2026-01-01T00:00:00Z", canonicalRecordId: "record-funding-1", recordVersion: 1, factTable: "FUNDING" } as const)
const input = Object.freeze({ roleId: "fact", fact: canonicalReference, physicalFactId: "funding-row-1", datasetId: "funding", providerId: "provider-a", effectiveAt: null, observedAt: "2026-01-01T00:00:00.000Z", knowledgeAvailableAt: "2026-01-01T00:01:00.000Z", publicationState: "PUBLISHED", checksum: "a".repeat(64), governance, lineageNodeId: "lineage-funding-1" } as const)

const activeRule: RuleMetadata = Object.freeze({
  ruleId: "d4.test.publication-state", semanticVersion: "1.0.0", compatibilityVersion: "1", owner: "D4_CONSISTENCY",
  category: "PUBLICATION_STATE_COMPATIBILITY", activationState: "ACTIVE", createdAt: "2025-12-01T00:00:00.000Z",
  activation: Object.freeze({ activeFrom: "2026-01-01T00:00:00.000Z", activeUntil: null }), supersededBy: null, deprecation: null,
})
const secondRule: RuleMetadata = Object.freeze({ ...activeRule, ruleId: "d4.test.identity", category: "IDENTITY_ALIGNMENT" })
const context: RuleEvaluationContext = Object.freeze({
  datasetIdentity: "funding", canonicalReference, knowledgeTime: "2026-01-01T01:00:00.000Z", evaluationTime: "2026-01-01T01:00:01.000Z",
  compatibilityVersion: "1", orderedInputs: Object.freeze([input]),
})
const request: RuleExecutionRequest = Object.freeze({ executionId: "execution-1", rule: Object.freeze({ ruleId: activeRule.ruleId, semanticVersion: activeRule.semanticVersion }), context })
const evaluator = () => Object.freeze({ outcome: "CONSISTENT" as const, confidenceComponents: Object.freeze([{ componentId: "publication-state", status: "SATISFIED" as const, basisCodes: Object.freeze(["PUBLISHED_INPUT"]) }]), diagnostics: Object.freeze([]) })

async function main() {
  const checks: Array<[string, boolean]> = []
  const check = (name: string, pass: boolean) => checks.push([name, pass])
  const rejects = (work: () => unknown, message: string) => { try { work(); return false } catch (error) { return error instanceof Error && error.message === message } }

  const registry = new ConsistencyRuleRegistry([secondRule, activeRule])
  check("registry ordering deterministic", registry.list().map((rule) => rule.ruleId).join(",") === "d4.test.identity,d4.test.publication-state")
  check("registry snapshot immutable", Object.isFrozen(registry.list()) && registry.list().every(Object.isFrozen))
  check("exact version lookup", registry.get({ ruleId: activeRule.ruleId, semanticVersion: "1.0.0" })?.owner === "D4_CONSISTENCY")
  check("exact active version resolves", registry.resolveForExecution(request.rule, context.knowledgeTime, "1")?.semanticVersion === "1.0.0")
  check("duplicate identity rejected", rejects(() => new ConsistencyRuleRegistry([activeRule, activeRule]), "DUPLICATE_RULE_IDENTITY"))
  check("invalid semantic version rejected", rejects(() => new ConsistencyRuleRegistry([{ ...activeRule, semanticVersion: "1" }]), "RULE_SEMANTIC_VERSION_INVALID"))
  check("illegal activation rejected", rejects(() => new ConsistencyRuleRegistry([{ ...activeRule, activation: { activeFrom: null, activeUntil: null } }]), "ACTIVE_RULE_WINDOW_REQUIRED"))
  check("ambiguous supersession rejected", rejects(() => new ConsistencyRuleRegistry([{ ...activeRule, activationState: "SUPERSEDED", activation: { activeFrom: "2026-01-01T00:00:00.000Z", activeUntil: "2026-02-01T00:00:00.000Z" }, supersededBy: { ruleId: activeRule.ruleId, semanticVersion: "2.0.0" } }]), "AMBIGUOUS_RULE_SUPERSESSION"))
  check("overlapping active versions rejected", rejects(() => new ConsistencyRuleRegistry([activeRule, { ...activeRule, semanticVersion: "2.0.0" }]), "AMBIGUOUS_ACTIVE_RULE_WINDOW"))
  const successor = { ...activeRule, semanticVersion: "2.0.0", activation: { activeFrom: "2026-02-01T00:00:00.000Z", activeUntil: null } } as const
  const predecessor = { ...activeRule, activationState: "SUPERSEDED", activation: { activeFrom: "2026-01-01T00:00:00.000Z", activeUntil: "2026-02-01T00:00:00.000Z" }, supersededBy: { ruleId: activeRule.ruleId, semanticVersion: "2.0.0" } } as const
  check("explicit increasing supersession accepted", new ConsistencyRuleRegistry([predecessor, successor]).get({ ruleId: activeRule.ruleId, semanticVersion: "1.0.0" })?.activationState === "SUPERSEDED")
  check("deprecation metadata required", rejects(() => new ConsistencyRuleRegistry([{ ...activeRule, activationState: "DEPRECATED", activation: { activeFrom: "2026-01-01T00:00:00.000Z", activeUntil: "2026-02-01T00:00:00.000Z" } }]), "RULE_DEPRECATION_REQUIRED"))

  check("registered activates", isLegalRuleTransition("REGISTERED", "ACTIVE"))
  check("active deprecates", isLegalRuleTransition("ACTIVE", "DEPRECATED"))
  check("active supersedes", isLegalRuleTransition("ACTIVE", "SUPERSEDED"))
  check("duplicate transition rejected", !isLegalRuleTransition("ACTIVE", "ACTIVE"))
  check("illegal transition rejected", !isLegalRuleTransition("REGISTERED", "SUPERSEDED"))
  check("terminal rule states", isTerminalRuleState("SUPERSEDED") && isTerminalRuleState("DISABLED") && !isTerminalRuleState("DEPRECATED"))
  check("execution state machine", isLegalRuleExecutionTransition("PENDING", "RUNNING") && isLegalRuleExecutionTransition("RUNNING", "COMPLETED") && !isLegalRuleExecutionTransition("COMPLETED", "RUNNING"))

  const evaluators = new Map([[activeRule.ruleId + "@1.0.0", evaluator], [secondRule.ruleId + "@1.0.0", evaluator]])
  const runtime = new RuleEvaluationRuntime(registry, evaluators, { monotonicMilliseconds: () => 10 })
  const first = runtime.execute(request)
  const second = runtime.execute(request)
  check("valid rule evaluates", first.status === "EVALUATED" && first.outcome === "CONSISTENT" && first.failureReason === null)
  check("outcome deterministic", first.outcomeChecksum === second.outcomeChecksum && first.orderedInputDigest === second.orderedInputDigest)
  check("result immutable", Object.isFrozen(first) && Object.isFrozen(first.confidenceComponents) && Object.isFrozen(first.diagnostics))
  check("confidence remains component evidence", first.confidenceComponents[0]?.status === "SATISFIED" && first.confidenceComponents[0]?.basisCodes[0] === "PUBLISHED_INPUT")
  check("missing rule fails closed", runtime.execute({ ...request, rule: { ruleId: "missing", semanticVersion: "1.0.0" } }).failureReason === "RULE_NOT_FOUND")
  check("compatibility fails closed", runtime.execute({ ...request, context: { ...context, compatibilityVersion: "2" } }).failureReason === "INCOMPATIBLE_RULE_VERSION")
  check("inactive window fails closed", runtime.execute({ ...request, context: { ...context, knowledgeTime: "2025-12-01T00:00:00.000Z", evaluationTime: "2025-12-01T00:00:01.000Z" } }).failureReason === "RULE_NOT_ACTIVE_AT_KNOWLEDGE_TIME")
  check("missing input fails closed", runtime.execute({ ...request, context: { ...context, orderedInputs: [] } }).failureReason === "INPUTS_REQUIRED")
  check("invalid context fails closed", runtime.execute({ ...request, context: { ...context, datasetIdentity: "open-interest" } }).failureReason === "INVALID_EXECUTION_CONTEXT")
  const noEvaluator = new RuleEvaluationRuntime(registry, new Map(), { monotonicMilliseconds: () => 10 })
  check("missing evaluator fails closed", noEvaluator.execute(request).failureReason === "EVALUATOR_NOT_REGISTERED")
  const throwingRuntime = new RuleEvaluationRuntime(registry, new Map([[activeRule.ruleId + "@1.0.0", () => { throw new Error("failure") }]]), { monotonicMilliseconds: () => 10 })
  check("evaluator exception fails closed", throwingRuntime.execute(request).failureReason === "EVALUATOR_EXCEPTION")
  const invalidRuntime = new RuleEvaluationRuntime(registry, new Map([[activeRule.ruleId + "@1.0.0", () => ({ outcome: "UNKNOWN" } as unknown as RuleEvaluatorOutput)]]), { monotonicMilliseconds: () => 10 })
  check("invalid evaluator output fails closed", invalidRuntime.execute(request).failureReason === "INVALID_EVALUATOR_OUTPUT")
  const ordered = runtime.executeAll([{ ...request, executionId: "z", rule: { ruleId: secondRule.ruleId, semanticVersion: "1.0.0" } }, { ...request, executionId: "a" }])
  check("batch execution ordering deterministic", ordered[0]?.ruleId === secondRule.ruleId && ordered[1]?.ruleId === activeRule.ruleId)
  check("historic replay exact", runtime.replayHistoric(request, first) === first)
  check("historic replay mismatch rejected", rejects(() => runtime.replayHistoric({ ...request, executionId: "different" }, first), "HISTORIC_EXECUTION_RECORD_MISMATCH"))

  const runtimeSource = readFileSync("lib/data-platform/consistency/ruleEvaluationRuntime.ts", "utf8")
  check("no retry or background execution", !runtimeSource.includes("setInterval") && !runtimeSource.includes("setTimeout") && !runtimeSource.includes("retry"))
  check("no singleton registry", !runtimeSource.includes("static instance") && !readFileSync("lib/data-platform/consistency/ruleRegistryRuntime.ts", "utf8").includes("export const registry"))

  const failures = checks.filter(([, pass]) => !pass)
  console.log("D4 PHASE 2 PART 02 UNIT SUITE: " + (failures.length ? "FAIL" : "PASS"))
  for (const [name, pass] of checks) console.log("[" + (pass ? "PASS" : "FAIL") + "] " + name)
  if (failures.length) process.exitCode = 1
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
