import type { RuleActivationState, RuleExecutionState } from "./ruleRuntimeContracts"

const RULE_TRANSITIONS: Readonly<Record<RuleActivationState, readonly RuleActivationState[]>> = Object.freeze({
  REGISTERED: Object.freeze<RuleActivationState[]>(["ACTIVE", "DISABLED"]),
  ACTIVE: Object.freeze<RuleActivationState[]>(["DEPRECATED", "SUPERSEDED", "DISABLED"]),
  DEPRECATED: Object.freeze<RuleActivationState[]>(["SUPERSEDED", "DISABLED"]),
  SUPERSEDED: Object.freeze<RuleActivationState[]>([]),
  DISABLED: Object.freeze<RuleActivationState[]>([]),
})

const EXECUTION_TRANSITIONS: Readonly<Record<RuleExecutionState, readonly RuleExecutionState[]>> = Object.freeze({
  PENDING: Object.freeze<RuleExecutionState[]>(["RUNNING", "FAILED"]),
  RUNNING: Object.freeze<RuleExecutionState[]>(["COMPLETED", "FAILED"]),
  COMPLETED: Object.freeze<RuleExecutionState[]>([]),
  FAILED: Object.freeze<RuleExecutionState[]>([]),
})

export function isLegalRuleTransition(from: RuleActivationState, to: RuleActivationState): boolean {
  return from !== to && RULE_TRANSITIONS[from].includes(to)
}

export function isTerminalRuleState(state: RuleActivationState): boolean {
  return RULE_TRANSITIONS[state].length === 0
}

export function isLegalRuleExecutionTransition(from: RuleExecutionState, to: RuleExecutionState): boolean {
  return from !== to && EXECUTION_TRANSITIONS[from].includes(to)
}
