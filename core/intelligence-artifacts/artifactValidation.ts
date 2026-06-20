import {
  INTELLIGENCE_ARTIFACT_SCHEMA_VERSION,
  type IntelligenceArtifact,
  type IntelligenceArtifactStatus,
  type IntelligenceSupportingEvidence,
} from "@/core/intelligence-artifacts/artifactTypes"

function validDate(value: string) {
  return Number.isFinite(Date.parse(value))
}

function validConfidence(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

function validEvidence(evidence: IntelligenceSupportingEvidence) {
  return (
    Boolean(evidence)
    && typeof evidence.id === "string"
    && Boolean(evidence.id.trim())
    && typeof evidence.kind === "string"
    && Boolean(evidence.kind)
    && typeof evidence.title === "string"
    && Boolean(evidence.title.trim())
    && typeof evidence.source === "string"
    && Boolean(evidence.source.trim())
    && (evidence.observedAt === undefined || validDate(evidence.observedAt))
    && (evidence.confidence === undefined || validConfidence(evidence.confidence))
  )
}

export function validateIntelligenceArtifact(artifact: IntelligenceArtifact) {
  const errors: string[] = []
  if (!artifact || typeof artifact !== "object") {
    return { valid: false, errors: ["Artifact must be an object."] }
  }
  if (artifact.schemaVersion !== INTELLIGENCE_ARTIFACT_SCHEMA_VERSION) {
    errors.push(`Unsupported artifact schema version ${artifact.schemaVersion}.`)
  }
  if (typeof artifact.id !== "string" || !artifact.id.trim()) errors.push("Artifact id is required.")
  if (!artifact.type) errors.push("Artifact type is required.")
  if (typeof artifact.title !== "string" || !artifact.title.trim()) errors.push("Artifact title is required.")
  if (typeof artifact.summary !== "string" || !artifact.summary.trim()) errors.push("Artifact summary is required.")
  if (!validConfidence(artifact.confidence)) errors.push("Artifact confidence must be between 0 and 100.")
  if (!artifact.source || typeof artifact.source !== "object") {
    errors.push("Artifact source is required.")
  } else {
    if (typeof artifact.source.system !== "string" || !artifact.source.system.trim()) {
      errors.push("Artifact source system is required.")
    }
    if (
      typeof artifact.source.producerVersion !== "string"
      || !artifact.source.producerVersion.trim()
    ) {
      errors.push("Artifact producer version is required.")
    }
  }
  if (!validDate(artifact.generatedAt)) errors.push("Artifact generatedAt must be a valid date.")
  if (artifact.expiresAt !== null && !validDate(artifact.expiresAt)) errors.push("Artifact expiresAt must be null or a valid date.")
  if (
    artifact.expiresAt !== null
    && validDate(artifact.generatedAt)
    && validDate(artifact.expiresAt)
    && Date.parse(artifact.expiresAt) <= Date.parse(artifact.generatedAt)
  ) {
    errors.push("Artifact expiresAt must be later than generatedAt.")
  }
  if (!Array.isArray(artifact.supportingEvidence)) errors.push("Artifact supportingEvidence must be an array.")
  else artifact.supportingEvidence.forEach((evidence, index) => {
    if (!validEvidence(evidence)) errors.push(`Artifact evidence at index ${index} is invalid.`)
  })
  if (!artifact.metadata || typeof artifact.metadata !== "object" || Array.isArray(artifact.metadata)) {
    errors.push("Artifact metadata must be an object.")
  }
  return {
    valid: errors.length === 0,
    errors,
  }
}

export function intelligenceArtifactStatus(
  artifact: IntelligenceArtifact,
  options: { now?: Date; archived?: boolean } = {},
): IntelligenceArtifactStatus {
  if (options.archived) return "archived"
  if (!artifact.expiresAt) return "active"
  const expiresAt = Date.parse(artifact.expiresAt)
  const now = options.now?.getTime() ?? Date.now()
  return Number.isFinite(expiresAt) && expiresAt <= now ? "expired" : "active"
}
