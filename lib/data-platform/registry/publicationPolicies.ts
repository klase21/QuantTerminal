export interface PublicationPolicyDefinition { policyId: string; version: string; state: "APPROVED" | "PROPOSED"; allowPartial: boolean; allowExperimental: boolean; requiresConsistency: boolean }
export const PUBLICATION_POLICIES = [
  { policyId: "fact-strict", version: "1.0.0", state: "APPROVED", allowPartial: false, allowExperimental: false, requiresConsistency: true },
  { policyId: "context-proposed", version: "1.0.0", state: "PROPOSED", allowPartial: true, allowExperimental: false, requiresConsistency: true },
  { policyId: "experimental-derived", version: "1.0.0", state: "APPROVED", allowPartial: false, allowExperimental: true, requiresConsistency: true },
] as const satisfies readonly PublicationPolicyDefinition[]
