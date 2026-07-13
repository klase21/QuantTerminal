import { CONSISTENCY_RULE_REGISTRY, CONSISTENCY_RULE_SET_REGISTRY, isLegalConsistencyRunTransition, resultBlocksEvidence } from "@/lib/data-platform/consistency"
import { CONSUMER_PROJECTION_REGISTRY, EVIDENCE_PROFILE_REGISTRY, inspectD4Target } from "@/lib/data-platform/evidence-platform"

export const ruleRegistryBounded = CONSISTENCY_RULE_REGISTRY.length > 0 && CONSISTENCY_RULE_REGISTRY.every((rule) => rule.state === "PROPOSED" && rule.limitations.length > 0 && rule.temporalAlignment.noLookahead)
export const ruleSetReferencesResolve = CONSISTENCY_RULE_SET_REGISTRY.every((set) => set.ruleReferences.every((ref) => CONSISTENCY_RULE_REGISTRY.some((rule) => rule.ruleId === ref.ruleId && rule.ruleVersion === ref.ruleVersion)))
export const legalRunTransitions = isLegalConsistencyRunTransition("PENDING", "RUNNING") && isLegalConsistencyRunTransition("RUNNING", "COMPLETED")
export const illegalRunTransitionsFail = !isLegalConsistencyRunTransition("COMPLETED", "RUNNING") && !isLegalConsistencyRunTransition("PENDING", "COMPLETED")
export const blockingAndAdvisorySeparate = resultBlocksEvidence("INCONSISTENT", "BLOCKING") && !resultBlocksEvidence("INCONSISTENT", "ADVISORY")
export const profilesProposedOnly = EVIDENCE_PROFILE_REGISTRY.length > 0 && EVIDENCE_PROFILE_REGISTRY.every((profile) => profile.state === "PROPOSED" && profile.consumerNeutral && profile.limitations.length > 0)
export const projectionsCannotReconstruct = CONSUMER_PROJECTION_REGISTRY.length === 6 && CONSUMER_PROJECTION_REGISTRY.every((projection) => !projection.mayReconstructEvidence && !projection.mayReclassifyEvidence && projection.explainabilityRequired)
export const d4TargetAccepted = inspectD4Target("postgres://redacted@localhost/quantterminal_d4_isolated", undefined, undefined).safe
export const missingD4TargetRejected = !inspectD4Target(undefined, undefined, undefined).safe
export const d2ReuseRejected = !inspectD4Target("postgres://redacted@localhost/quantterminal_d4_isolated", "postgres://redacted@localhost/quantterminal_d4_isolated", undefined).safe
export const d3DatabaseRejected = !inspectD4Target("postgres://redacted@localhost/quantterminal_d3_isolated", undefined, undefined).safe
