import {
  INTELLIGENCE_ARTIFACT_SCHEMA_VERSION,
  type IntelligenceArtifact,
  type IntelligenceArtifactStatus,
  type IntelligenceSupportingEvidence,
} from "@/core/intelligence-artifacts/artifactTypes"
import { isEvidenceValidity } from "@/core/evidence-validity"
import {
  INVESTIGATION_THESIS_STATUSES,
  INVESTIGATION_THESIS_VERSION,
} from "@/types/investigationThesis"
import { isContradictionAnalysis } from "@/core/contradiction"

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

function validThesis(value: IntelligenceArtifact["thesis"]) {
  if (value === undefined) return true
  return (
    value.thesisVersion === INVESTIGATION_THESIS_VERSION
    && typeof value.thesisId === "string"
    && Boolean(value.thesisId.trim())
    && typeof value.title === "string"
    && Boolean(value.title.trim())
    && typeof value.question === "string"
    && Boolean(value.question.trim())
    && typeof value.decisionHorizon === "string"
    && Boolean(value.decisionHorizon.trim())
    && INVESTIGATION_THESIS_STATUSES.includes(value.status)
    && validDate(value.createdAt)
    && validDate(value.updatedAt)
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
  if (!isEvidenceValidity(artifact.validity)) errors.push("Artifact validity metadata is invalid.")
  else if (artifact.validity.generatedAt !== artifact.generatedAt) {
    errors.push("Artifact validity generatedAt must match artifact generatedAt.")
  }
  if (!validThesis(artifact.thesis)) errors.push("Artifact thesis metadata is invalid.")
  if (artifact.contradiction !== undefined && !isContradictionAnalysis(artifact.contradiction)) {
    errors.push("Artifact contradiction metadata is invalid.")
  }
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
