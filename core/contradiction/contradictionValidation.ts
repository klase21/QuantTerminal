import {
  CONTRADICTION_CATEGORIES,
  CONTRADICTION_SCHEMA_VERSION,
  type ContradictionAnalysis,
  type ContradictionEvidence,
} from "./contradictionTypes"

function validDate(value: string | undefined) {
  return value === undefined || Number.isFinite(Date.parse(value))
}

function validEvidence(value: ContradictionEvidence) {
  return (
    Boolean(value)
    && typeof value.evidenceId === "string"
    && Boolean(value.evidenceId.trim())
    && typeof value.kind === "string"
    && Boolean(value.kind)
    && typeof value.title === "string"
    && Boolean(value.title.trim())
    && typeof value.summary === "string"
    && Boolean(value.summary.trim())
    && typeof value.source === "string"
    && Boolean(value.source.trim())
    && validDate(value.observedAt)
    && (value.sourceArtifactId === undefined || Boolean(value.sourceArtifactId.trim()))
  )
}

export function isContradictionAnalysis(value: unknown): value is ContradictionAnalysis {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const candidate = value as Partial<ContradictionAnalysis>
  return (
    candidate.schemaVersion === CONTRADICTION_SCHEMA_VERSION
    && typeof candidate.contradictionId === "string"
    && Boolean(candidate.contradictionId.trim())
    && CONTRADICTION_CATEGORIES.includes(candidate.category as ContradictionAnalysis["category"])
    && Array.isArray(candidate.supportingEvidence)
    && candidate.supportingEvidence.every(validEvidence)
    && Array.isArray(candidate.contradictingEvidence)
    && candidate.contradictingEvidence.every(validEvidence)
    && typeof candidate.generatedAt === "string"
    && Number.isFinite(Date.parse(candidate.generatedAt))
    && Array.isArray(candidate.sourceArtifactIds)
    && candidate.sourceArtifactIds.every((id) => typeof id === "string" && Boolean(id.trim()))
  )
}
