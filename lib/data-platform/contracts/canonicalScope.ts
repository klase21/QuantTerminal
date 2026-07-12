export type ScopeAvailability = "AVAILABLE" | "UNAVAILABLE" | "MISSING" | "STALE" | "EXPERIMENTAL" | "NOT_EVALUATED"
export type ScopeState = "PASS" | "WARN" | "FAIL" | "NOT_APPLICABLE" | "NOT_EVALUATED"

export interface CanonicalScopeEnvelope {
  canonicalScopeId: string
  factWatermark: string | null
  projectionVersion: string | null
  evidencePacketId: string | null
  generatedAt: string
  availability: ScopeAvailability
  coverage: { state: ScopeState; basis: string | null }
  freshness: { state: ScopeState; observedAt: string | null; policyVersion: string | null }
  quality: { state: ScopeState; evaluationId: string | null }
  consistency: { state: ScopeState; resultId: string | null }
  providerCertification: { state: ScopeState; providerId: string | null; registrationVersion: string | null }
  publicationStatus: "PUBLISHED" | "PARTIAL" | "HELD" | "QUARANTINED" | "REJECTED" | "NOT_EVALUATED"
  limitations: readonly string[]
}

export interface ScopeCompatibilityResult { compatible: boolean; reasons: readonly string[] }
export function checkScopeCompatibility(scopes: readonly CanonicalScopeEnvelope[]): ScopeCompatibilityResult {
  const reasons: string[] = []
  const ids = new Set(scopes.map((scope) => scope.canonicalScopeId))
  const watermarks = new Set(scopes.map((scope) => scope.factWatermark).filter(Boolean))
  if (ids.size > 1) reasons.push("CANONICAL_SCOPE_MISMATCH")
  if (watermarks.size > 1) reasons.push("FACT_WATERMARK_MISMATCH")
  return { compatible: reasons.length === 0, reasons }
}
