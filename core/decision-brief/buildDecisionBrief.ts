import { aggregateEvidenceValidity } from "@/core/evidence-validity"
import type { InvestigationThesis } from "@/types/investigationThesis"
import type { IntelligenceArtifact } from "@/core/intelligence-artifacts/artifactTypes"
import {
  DECISION_BRIEF_SCHEMA_VERSION,
  type DecisionBrief,
  type DecisionBriefCurrentView,
  type DecisionBriefEvidenceSource,
} from "./decisionBriefTypes"

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function factors(
  sources: DecisionBriefEvidenceSource[],
  side: "supportingEvidence" | "contradictingEvidence",
) {
  return unique(sources.flatMap((source) => (
    source.contradiction?.[side].map((evidence) => evidence.title) ?? []
  ))).slice(0, 5)
}

function evidenceCount(
  sources: DecisionBriefEvidenceSource[],
  side: "supportingEvidence" | "contradictingEvidence",
) {
  return sources.reduce(
    (total, source) => total + (source.contradiction?.[side].length ?? 0),
    0,
  )
}

function currentView(input: {
  thesis: InvestigationThesis
  sourceCount: number
  coverageStatus: DecisionBrief["coverageStatus"]
  supportingEvidenceCount: number
  contradictingEvidenceCount: number
}): DecisionBriefCurrentView {
  if (input.thesis.status !== "active") return "undetermined"
  if (
    input.sourceCount === 0
    || input.coverageStatus === "UNAVAILABLE"
    || (input.supportingEvidenceCount === 0 && input.contradictingEvidenceCount === 0)
  ) {
    return "insufficient_evidence"
  }
  if (input.supportingEvidenceCount > 0 && input.contradictingEvidenceCount > 0) {
    return "mixed"
  }
  if (input.supportingEvidenceCount > 0) return "bullish_lean"
  if (input.contradictingEvidenceCount > 0) return "bearish_lean"
  return "undetermined"
}

function requiredNextValidation(input: {
  sourceCount: number
  freshnessStatus: DecisionBrief["freshnessStatus"]
  coverageStatus: DecisionBrief["coverageStatus"]
  supportingEvidenceCount: number
  contradictingEvidenceCount: number
}) {
  const required: string[] = []
  if (input.sourceCount === 0) {
    required.push("Load prepared intelligence artifacts for the active investigation.")
  }
  if (input.freshnessStatus === "STALE" || input.freshnessStatus === "EXPIRED") {
    required.push("Validate the investigation against a current evidence observation.")
  } else if (input.freshnessStatus === "UNKNOWN") {
    required.push("Verify the observation time of the available evidence.")
  }
  if (input.coverageStatus === "PARTIAL") {
    required.push("Validate the missing evidence coverage before interpreting the brief.")
  } else if (input.coverageStatus === "UNAVAILABLE") {
    required.push("Obtain usable evidence coverage for the active investigation.")
  } else if (input.coverageStatus === "UNKNOWN") {
    required.push("Verify the coverage represented by the source artifacts.")
  }
  if (input.supportingEvidenceCount === 0) {
    required.push("Validate whether any prepared evidence supports the thesis.")
  }
  if (input.contradictingEvidenceCount === 0) {
    required.push("Validate whether any prepared evidence contradicts the thesis.")
  }
  return unique(required)
}

export function buildDecisionBrief(input: {
  thesis: InvestigationThesis
  sources: DecisionBriefEvidenceSource[]
  generatedAt?: string | number | Date
}): DecisionBrief {
  const generatedAt = new Date(input.generatedAt ?? Date.now())
  if (!Number.isFinite(generatedAt.getTime())) {
    throw new Error("Decision Brief generatedAt is invalid.")
  }

  const sources = [...input.sources]
    .filter((source) => Boolean(source.artifactId.trim()))
    .sort((left, right) => left.artifactId.localeCompare(right.artifactId))
  const sourceArtifactIds = unique(sources.map((source) => source.artifactId)).sort()
  const validity = aggregateEvidenceValidity(
    sources.map((source) => source.validity),
    generatedAt,
    "Decision Brief uses the most conservative source evidence validity.",
  )
  const supportingEvidenceCount = evidenceCount(sources, "supportingEvidence")
  const contradictingEvidenceCount = evidenceCount(sources, "contradictingEvidence")

  return {
    schemaVersion: DECISION_BRIEF_SCHEMA_VERSION,
    decisionBriefId: `decision-brief:${input.thesis.thesisId}`,
    investigationThesisId: input.thesis.thesisId,
    generatedAt: generatedAt.toISOString(),
    currentView: currentView({
      thesis: input.thesis,
      sourceCount: sources.length,
      coverageStatus: validity.coverageStatus,
      supportingEvidenceCount,
      contradictingEvidenceCount,
    }),
    freshnessStatus: validity.freshnessStatus,
    coverageStatus: validity.coverageStatus,
    supportingEvidenceCount,
    contradictingEvidenceCount,
    keySupportingFactors: factors(sources, "supportingEvidence"),
    keyContradictingFactors: factors(sources, "contradictingEvidence"),
    requiredNextValidation: requiredNextValidation({
      sourceCount: sources.length,
      freshnessStatus: validity.freshnessStatus,
      coverageStatus: validity.coverageStatus,
      supportingEvidenceCount,
      contradictingEvidenceCount,
    }),
    sourceArtifactIds,
  }
}

export function decisionBriefSourcesFromArtifacts(
  artifacts: IntelligenceArtifact[],
): DecisionBriefEvidenceSource[] {
  return artifacts
    .map((artifact) => ({
      artifactId: artifact.id,
      validity: artifact.validity,
      contradiction: artifact.contradiction,
    }))
    .sort((left, right) => left.artifactId.localeCompare(right.artifactId))
}
