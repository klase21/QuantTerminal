import { canonicalChecksum, normalizeIdentifier, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
import { consistencyInputDigest } from "./identity"
import type { ConsistencyDiagnostic, ConsistencyInputReference, ConsistencyResultOutcome } from "./contracts"
import type {
  RuleConfidenceComponent, RuleEvaluationContext, RuleEvaluator, RuleEvaluatorOutput, RuleExecutionRequest,
  RuleExecutionResult, RuleFailureReason, RuleIdentity, RuleRuntimeClock,
} from "./ruleRuntimeContracts"
import { ConsistencyRuleRegistry } from "./ruleRegistryRuntime"

function ruleKey(identity: RuleIdentity): string {
  return identity.ruleId + "@" + identity.semanticVersion
}

function freezeInput(input: ConsistencyInputReference): ConsistencyInputReference {
  return Object.freeze({ ...input, fact: Object.freeze({ ...input.fact }), governance: Object.freeze({ ...input.governance }) })
}

function freezeContext(context: RuleEvaluationContext): RuleEvaluationContext {
  return Object.freeze({
    ...context,
    canonicalReference: Object.freeze({ ...context.canonicalReference }),
    orderedInputs: Object.freeze(context.orderedInputs.map(freezeInput)),
  })
}

function freezeConfidence(components: readonly RuleConfidenceComponent[]): readonly RuleConfidenceComponent[] {
  return Object.freeze(components.map((component) => Object.freeze({ ...component, basisCodes: Object.freeze([...component.basisCodes]) })))
}

function freezeDiagnostics(diagnostics: readonly ConsistencyDiagnostic[]): readonly ConsistencyDiagnostic[] {
  return Object.freeze(diagnostics.map((diagnostic) => Object.freeze({
    ...diagnostic,
    inputRoleIds: Object.freeze([...diagnostic.inputRoleIds]),
    boundedValues: Object.freeze(diagnostic.boundedValues.map((value) => Object.freeze({ ...value }))),
  })))
}

function validOutput(output: RuleEvaluatorOutput): boolean {
  const outcomes: readonly ConsistencyResultOutcome[] = ["CONSISTENT", "INCONSISTENT", "PARTIAL", "INDETERMINATE", "NOT_APPLICABLE", "BLOCKED_MISSING_INPUT", "BLOCKED_INVALID_INPUT", "BLOCKED_SUPERSEDED_INPUT", "BLOCKED_FUTURE_KNOWLEDGE"]
  return outcomes.includes(output.outcome)
    && output.confidenceComponents.every((component) => Boolean(component.componentId.trim()) && component.basisCodes.every((code) => Boolean(code.trim())))
    && output.diagnostics.every((diagnostic) => Boolean(diagnostic.diagnosticId.trim()) && Boolean(diagnostic.code.trim()))
}

export class RuleEvaluationRuntime {
  private readonly evaluators: ReadonlyMap<string, RuleEvaluator>

  constructor(private readonly registry: ConsistencyRuleRegistry, evaluators: ReadonlyMap<string, RuleEvaluator>, private readonly clock: RuleRuntimeClock) {
    this.evaluators = new Map(evaluators)
  }

  execute(request: RuleExecutionRequest): RuleExecutionResult {
    const start = this.clock.monotonicMilliseconds()
    const context = freezeContext(request.context)
    if (!context.orderedInputs.length) return this.failure(request, context, canonicalChecksum([]), "INPUTS_REQUIRED", start)
    let digest = ""
    try {
      digest = consistencyInputDigest(context.orderedInputs)
      this.validateRequest(request, context)
    } catch {
      return this.failure(request, context, digest || canonicalChecksum([]), "INVALID_EXECUTION_CONTEXT", start)
    }
    const registered = this.registry.get(request.rule)
    if (!registered) return this.failure(request, context, digest, "RULE_NOT_FOUND", start)
    if (registered.compatibilityVersion !== context.compatibilityVersion) return this.failure(request, context, digest, "INCOMPATIBLE_RULE_VERSION", start)
    if (!this.registry.resolveForExecution(request.rule, context.knowledgeTime, context.compatibilityVersion)) return this.failure(request, context, digest, "RULE_NOT_ACTIVE_AT_KNOWLEDGE_TIME", start)
    const evaluator = this.evaluators.get(ruleKey(request.rule))
    if (!evaluator) return this.failure(request, context, digest, "EVALUATOR_NOT_REGISTERED", start)
    try {
      const output = evaluator(context)
      if (!validOutput(output)) return this.failure(request, context, digest, "INVALID_EVALUATOR_OUTPUT", start)
      const confidenceComponents = freezeConfidence(output.confidenceComponents)
      const diagnostics = freezeDiagnostics(output.diagnostics)
      const outcomeChecksum = canonicalChecksum({ rule: request.rule, datasetIdentity: normalizeIdentifier(context.datasetIdentity), canonicalReference: context.canonicalReference, knowledgeTime: normalizeIsoTimestamp(context.knowledgeTime), orderedInputDigest: digest, outcome: output.outcome, confidenceComponents, diagnostics })
      return Object.freeze({
        ruleId: request.rule.ruleId, ruleVersion: request.rule.semanticVersion, executionId: request.executionId,
        datasetIdentity: context.datasetIdentity, canonicalReference: context.canonicalReference, knowledgeTime: context.knowledgeTime,
        evaluationTime: context.evaluationTime, status: "EVALUATED", executionState: "COMPLETED", outcome: output.outcome,
        confidenceComponents, diagnostics, failureReason: null, orderedInputDigest: digest,
        executionDurationMs: this.duration(start), outcomeChecksum,
      })
    } catch {
      return this.failure(request, context, digest, "EVALUATOR_EXCEPTION", start)
    }
  }

  executeAll(requests: readonly RuleExecutionRequest[]): readonly RuleExecutionResult[] {
    return Object.freeze([...requests]
      .sort((left, right) => ruleKey(left.rule).localeCompare(ruleKey(right.rule)) || left.executionId.localeCompare(right.executionId))
      .map((request) => this.execute(request)))
  }

  replayHistoric(request: RuleExecutionRequest, original: RuleExecutionResult): RuleExecutionResult {
    const digest = consistencyInputDigest(request.context.orderedInputs)
    if (!Object.isFrozen(original) || original.executionId !== request.executionId || original.ruleId !== request.rule.ruleId || original.ruleVersion !== request.rule.semanticVersion || original.orderedInputDigest !== digest || original.knowledgeTime !== request.context.knowledgeTime) throw new Error("HISTORIC_EXECUTION_RECORD_MISMATCH")
    return original
  }

  private validateRequest(request: RuleExecutionRequest, context: RuleEvaluationContext): void {
    if (!request.executionId.trim() || !context.datasetIdentity.trim()) throw new Error("EXECUTION_IDENTITY_REQUIRED")
    const knowledgeTime = Date.parse(context.knowledgeTime)
    const evaluationTime = Date.parse(context.evaluationTime)
    if (!Number.isFinite(knowledgeTime) || !Number.isFinite(evaluationTime) || evaluationTime < knowledgeTime) throw new Error("EXECUTION_TIME_INVALID")
    if (context.canonicalReference.recordVersion < 1 || context.canonicalReference.datasetId !== context.datasetIdentity) throw new Error("CANONICAL_REFERENCE_INVALID")
  }

  private failure(request: RuleExecutionRequest, context: RuleEvaluationContext, digest: string, failureReason: RuleFailureReason, start: number): RuleExecutionResult {
    const outcomeChecksum = canonicalChecksum({ rule: request.rule, datasetIdentity: context.datasetIdentity, canonicalReference: context.canonicalReference, knowledgeTime: context.knowledgeTime, orderedInputDigest: digest, outcome: "INDETERMINATE", failureReason })
    const emptyConfidence: readonly [] = Object.freeze([])
    const emptyDiagnostics: readonly [] = Object.freeze([])
    const result: RuleExecutionResult = {
      ruleId: request.rule.ruleId, ruleVersion: request.rule.semanticVersion, executionId: request.executionId,
      datasetIdentity: context.datasetIdentity, canonicalReference: context.canonicalReference, knowledgeTime: context.knowledgeTime,
      evaluationTime: context.evaluationTime, status: "FAILED", executionState: "FAILED", outcome: "INDETERMINATE",
      confidenceComponents: emptyConfidence, diagnostics: emptyDiagnostics, failureReason, orderedInputDigest: digest,
      executionDurationMs: this.duration(start), outcomeChecksum,
    }
    return Object.freeze(result)
  }

  private duration(start: number): number {
    return Math.max(0, Math.round(this.clock.monotonicMilliseconds() - start))
  }
}
