import type { CanonicalFactReference } from "@/lib/data-platform/persistence"
import type { ConsistencyDiagnostic, ConsistencyInputReference, ConsistencyResultOutcome, RuleCategory } from "./contracts"

export type RuleActivationState = "REGISTERED" | "ACTIVE" | "DEPRECATED" | "SUPERSEDED" | "DISABLED"
export type RuleExecutionState = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
export type RuleExecutionStatus = "EVALUATED" | "FAILED"

export interface RuleIdentity {
  readonly ruleId: string
  readonly semanticVersion: string
}

export interface RuleVersion extends RuleIdentity {
  readonly compatibilityVersion: string
}

export interface RuleActivation {
  readonly activeFrom: string | null
  readonly activeUntil: string | null
}

export interface RuleDeprecation {
  readonly deprecatedAt: string
  readonly reasonCode: string
}

export interface RuleMetadata extends RuleVersion {
  readonly owner: string
  readonly category: RuleCategory
  readonly activationState: RuleActivationState
  readonly activation: RuleActivation
  readonly createdAt: string
  readonly supersededBy: RuleIdentity | null
  readonly deprecation: RuleDeprecation | null
}

export interface RuleEvaluationContext {
  readonly datasetIdentity: string
  readonly canonicalReference: CanonicalFactReference
  readonly knowledgeTime: string
  readonly evaluationTime: string
  readonly compatibilityVersion: string
  readonly orderedInputs: readonly ConsistencyInputReference[]
}

export interface RuleExecutionRequest {
  readonly executionId: string
  readonly rule: RuleIdentity
  readonly context: RuleEvaluationContext
}

export interface RuleConfidenceComponent {
  readonly componentId: string
  readonly status: "SATISFIED" | "UNSATISFIED" | "NOT_EVALUATED"
  readonly basisCodes: readonly string[]
}

export type RuleFailureReason =
  | "RULE_NOT_FOUND"
  | "RULE_NOT_ACTIVE_AT_KNOWLEDGE_TIME"
  | "INCOMPATIBLE_RULE_VERSION"
  | "INPUTS_REQUIRED"
  | "INVALID_EXECUTION_CONTEXT"
  | "EVALUATOR_NOT_REGISTERED"
  | "EVALUATOR_EXCEPTION"
  | "INVALID_EVALUATOR_OUTPUT"

interface RuleExecutionResultBase {
  readonly ruleId: string
  readonly ruleVersion: string
  readonly executionId: string
  readonly datasetIdentity: string
  readonly canonicalReference: CanonicalFactReference
  readonly knowledgeTime: string
  readonly evaluationTime: string
  readonly orderedInputDigest: string
  readonly executionDurationMs: number
  readonly outcomeChecksum: string
}

export type RuleExecutionResult =
  | RuleExecutionResultBase & {
      readonly status: "EVALUATED"
      readonly executionState: "COMPLETED"
      readonly outcome: ConsistencyResultOutcome
      readonly confidenceComponents: readonly RuleConfidenceComponent[]
      readonly diagnostics: readonly ConsistencyDiagnostic[]
      readonly failureReason: null
    }
  | RuleExecutionResultBase & {
      readonly status: "FAILED"
      readonly executionState: "FAILED"
      readonly outcome: "INDETERMINATE"
      readonly confidenceComponents: readonly []
      readonly diagnostics: readonly []
      readonly failureReason: RuleFailureReason
    }

export interface RuleEvaluatorOutput {
  readonly outcome: ConsistencyResultOutcome
  readonly confidenceComponents: readonly RuleConfidenceComponent[]
  readonly diagnostics: readonly ConsistencyDiagnostic[]
}

export type RuleEvaluator = (context: RuleEvaluationContext) => RuleEvaluatorOutput

export interface RuleRuntimeClock {
  readonly monotonicMilliseconds: () => number
}
