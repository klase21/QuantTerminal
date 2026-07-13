import type { RuleIdentity, RuleMetadata } from "./ruleRuntimeContracts"

const SEMANTIC_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

function identityKey(identity: RuleIdentity): string {
  return identity.ruleId + "@" + identity.semanticVersion
}

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new Error("RULE_TIMESTAMP_INVALID")
  return parsed
}

function compareSemanticVersions(left: string, right: string): number {
  const leftMatch = SEMANTIC_VERSION.exec(left)
  const rightMatch = SEMANTIC_VERSION.exec(right)
  if (!leftMatch || !rightMatch) throw new Error("RULE_SEMANTIC_VERSION_INVALID")
  for (let index = 1; index <= 3; index += 1) {
    const difference = Number(leftMatch[index]) - Number(rightMatch[index])
    if (difference) return difference
  }
  return 0
}

function freezeMetadata(metadata: RuleMetadata): RuleMetadata {
  return Object.freeze({
    ...metadata,
    activation: Object.freeze({ ...metadata.activation }),
    supersededBy: metadata.supersededBy ? Object.freeze({ ...metadata.supersededBy }) : null,
    deprecation: metadata.deprecation ? Object.freeze({ ...metadata.deprecation }) : null,
  })
}

function validateMetadata(metadata: RuleMetadata): void {
  if (!metadata.ruleId.trim() || !metadata.owner.trim() || !metadata.compatibilityVersion.trim()) throw new Error("RULE_METADATA_INCOMPLETE")
  compareSemanticVersions(metadata.semanticVersion, metadata.semanticVersion)
  const createdAt = timestamp(metadata.createdAt)
  const activeFrom = metadata.activation.activeFrom === null ? null : timestamp(metadata.activation.activeFrom)
  const activeUntil = metadata.activation.activeUntil === null ? null : timestamp(metadata.activation.activeUntil)
  if (activeFrom !== null && activeUntil !== null && activeUntil <= activeFrom) throw new Error("RULE_ACTIVATION_WINDOW_INVALID")
  if (activeFrom !== null && activeFrom < createdAt) throw new Error("RULE_ACTIVATION_PRECEDES_CREATION")
  if (metadata.activationState === "ACTIVE" && activeFrom === null) throw new Error("ACTIVE_RULE_WINDOW_REQUIRED")
  if (metadata.activationState === "REGISTERED" && (activeFrom !== null || activeUntil !== null)) throw new Error("REGISTERED_RULE_CANNOT_HAVE_ACTIVE_WINDOW")
  if ((metadata.activationState === "DEPRECATED" || metadata.activationState === "SUPERSEDED") && activeUntil === null) throw new Error("INACTIVE_RULE_END_REQUIRED")
  if (metadata.activationState === "SUPERSEDED" && !metadata.supersededBy) throw new Error("SUPERSEDED_RULE_REFERENCE_REQUIRED")
  if (metadata.activationState !== "SUPERSEDED" && metadata.supersededBy) throw new Error("SUPERSESSION_STATE_MISMATCH")
  if (metadata.activationState === "DEPRECATED" && !metadata.deprecation) throw new Error("RULE_DEPRECATION_REQUIRED")
  if (metadata.deprecation && timestamp(metadata.deprecation.deprecatedAt) < createdAt) throw new Error("RULE_DEPRECATION_PRECEDES_CREATION")
}

export class ConsistencyRuleRegistry {
  private readonly entries: readonly RuleMetadata[]
  private readonly byIdentity: ReadonlyMap<string, RuleMetadata>

  constructor(metadata: readonly RuleMetadata[]) {
    const frozen = metadata.map((entry) => {
      validateMetadata(entry)
      return freezeMetadata(entry)
    }).sort((left, right) => left.ruleId.localeCompare(right.ruleId) || compareSemanticVersions(left.semanticVersion, right.semanticVersion))
    const byIdentity = new Map<string, RuleMetadata>()
    for (const entry of frozen) {
      const key = identityKey(entry)
      if (byIdentity.has(key)) throw new Error("DUPLICATE_RULE_IDENTITY")
      byIdentity.set(key, entry)
    }
    for (const entry of frozen) {
      if (!entry.supersededBy) continue
      const successor = byIdentity.get(identityKey(entry.supersededBy))
      if (!successor || successor.ruleId !== entry.ruleId || compareSemanticVersions(successor.semanticVersion, entry.semanticVersion) <= 0) throw new Error("AMBIGUOUS_RULE_SUPERSESSION")
    }
    const activeByRule = new Map<string, RuleMetadata[]>()
    for (const entry of frozen.filter((candidate) => candidate.activationState === "ACTIVE")) {
      const group = activeByRule.get(entry.ruleId) ?? []
      for (const existing of group) {
        const leftStart = timestamp(existing.activation.activeFrom!)
        const leftEnd = existing.activation.activeUntil ? timestamp(existing.activation.activeUntil) : Number.POSITIVE_INFINITY
        const rightStart = timestamp(entry.activation.activeFrom!)
        const rightEnd = entry.activation.activeUntil ? timestamp(entry.activation.activeUntil) : Number.POSITIVE_INFINITY
        if (leftStart < rightEnd && rightStart < leftEnd && existing.compatibilityVersion === entry.compatibilityVersion) throw new Error("AMBIGUOUS_ACTIVE_RULE_WINDOW")
      }
      group.push(entry)
      activeByRule.set(entry.ruleId, group)
    }
    this.entries = Object.freeze(frozen)
    this.byIdentity = byIdentity
  }

  list(): readonly RuleMetadata[] {
    return this.entries
  }

  get(identity: RuleIdentity): RuleMetadata | null {
    return this.byIdentity.get(identityKey(identity)) ?? null
  }

  resolveForExecution(identity: RuleIdentity, knowledgeTime: string, compatibilityVersion: string): RuleMetadata | null {
    const rule = this.get(identity)
    if (!rule || rule.compatibilityVersion !== compatibilityVersion || rule.activationState !== "ACTIVE") return null
    const at = timestamp(knowledgeTime)
    const start = timestamp(rule.activation.activeFrom!)
    const end = rule.activation.activeUntil ? timestamp(rule.activation.activeUntil) : Number.POSITIVE_INFINITY
    return at >= start && at < end ? rule : null
  }
}
