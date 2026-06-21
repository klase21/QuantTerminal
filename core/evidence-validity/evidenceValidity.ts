import {
  EVIDENCE_COVERAGE_STATUSES,
  EVIDENCE_FRESHNESS_STATUSES,
  EVIDENCE_VALIDITY_SCHEMA_VERSION,
  type EvidenceCoverageStatus,
  type EvidenceFreshnessStatus,
  type EvidenceValidity,
  type EvidenceValidityInput,
} from "./evidenceValidityTypes"

const FRESHNESS_RANK: Record<EvidenceFreshnessStatus, number> = {
  VALID: 0,
  UNKNOWN: 1,
  STALE: 2,
  EXPIRED: 3,
}

const COVERAGE_RANK: Record<EvidenceCoverageStatus, number> = {
  FULL: 0,
  UNKNOWN: 1,
  PARTIAL: 2,
  UNAVAILABLE: 3,
}

function timestamp(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.getTime() : null
}

function iso(value: string | number | Date | null | undefined) {
  const valueTimestamp = timestamp(value)
  return valueTimestamp === null ? null : new Date(valueTimestamp).toISOString()
}

export function isEvidenceValidity(value: unknown): value is EvidenceValidity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const candidate = value as Partial<EvidenceValidity>
  return (
    candidate.schemaVersion === EVIDENCE_VALIDITY_SCHEMA_VERSION
    && (candidate.observedAt === null || iso(candidate.observedAt) !== null)
    && iso(candidate.generatedAt) !== null
    && EVIDENCE_FRESHNESS_STATUSES.includes(candidate.freshnessStatus as EvidenceFreshnessStatus)
    && EVIDENCE_COVERAGE_STATUSES.includes(candidate.coverageStatus as EvidenceCoverageStatus)
    && (candidate.reason === undefined || typeof candidate.reason === "string")
  )
}

export function createEvidenceValidity(input: EvidenceValidityInput): EvidenceValidity {
  const generatedAt = iso(input.generatedAt)
  if (!generatedAt) throw new Error("Evidence validity generatedAt is invalid.")

  const observedAt = iso(input.observedAt)
  const now = timestamp(input.now) ?? Date.now()
  const expiresAt = timestamp(input.expiresAt)
  const observedTimestamp = timestamp(observedAt)
  let freshnessStatus: EvidenceFreshnessStatus = "UNKNOWN"

  if (expiresAt !== null && expiresAt <= now) {
    freshnessStatus = "EXPIRED"
  } else if (
    observedTimestamp !== null
    && observedTimestamp <= now
    && Number.isFinite(input.freshnessWindowMs)
    && (input.freshnessWindowMs as number) >= 0
  ) {
    freshnessStatus = now - observedTimestamp <= (input.freshnessWindowMs as number)
      ? "VALID"
      : "STALE"
  }

  return {
    schemaVersion: EVIDENCE_VALIDITY_SCHEMA_VERSION,
    observedAt,
    generatedAt,
    freshnessStatus,
    coverageStatus: input.coverageStatus ?? "UNKNOWN",
    reason: input.reason,
  }
}

export function legacyEvidenceValidity(input: {
  generatedAt: string | number | Date
  observedAt?: string | number | Date | null
  reason?: string
}): EvidenceValidity {
  return createEvidenceValidity({
    generatedAt: input.generatedAt,
    observedAt: input.observedAt,
    coverageStatus: "UNKNOWN",
    reason: input.reason ?? "Legacy intelligence does not include an explicit validity assessment.",
  })
}

export function aggregateEvidenceValidity(
  values: EvidenceValidity[],
  generatedAt: string | number | Date,
  reason?: string,
): EvidenceValidity {
  if (!values.length) {
    return legacyEvidenceValidity({
      generatedAt,
      reason: reason ?? "No supporting evidence validity metadata is available.",
    })
  }

  const observedAt = values
    .map((value) => timestamp(value.observedAt))
    .filter((value): value is number => value !== null)
    .sort((left, right) => right - left)[0]
  const freshnessStatus = [...values]
    .sort((left, right) => FRESHNESS_RANK[right.freshnessStatus] - FRESHNESS_RANK[left.freshnessStatus])[0]
    .freshnessStatus
  const coverageStatus = [...values]
    .sort((left, right) => COVERAGE_RANK[right.coverageStatus] - COVERAGE_RANK[left.coverageStatus])[0]
    .coverageStatus
  const generated = iso(generatedAt)
  if (!generated) throw new Error("Aggregated evidence validity generatedAt is invalid.")

  return {
    schemaVersion: EVIDENCE_VALIDITY_SCHEMA_VERSION,
    observedAt: observedAt === undefined ? null : new Date(observedAt).toISOString(),
    generatedAt: generated,
    freshnessStatus,
    coverageStatus,
    reason,
  }
}
