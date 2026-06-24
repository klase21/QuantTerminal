import { createEvidenceValidity } from "@/core/evidence-validity"
import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
} from "@/core/intelligence-artifacts"
import type {
  ReserveIntelligenceArtifactMetadata,
  ReserveIntelligenceObservation,
} from "./reserveIntelligenceTypes"
import { validateReserveIntelligenceObservation } from "./reserveIntelligenceValidation"

export function createReserveIntelligenceArtifact(
  observation: ReserveIntelligenceObservation,
): IntelligenceArtifact<ReserveIntelligenceArtifactMetadata> {
  const validation = validateReserveIntelligenceObservation(observation)
  if (!validation.valid) {
    throw new Error(`Invalid Reserve Intelligence observation: ${validation.errors.join(" ")}`)
  }
  const summary = observation.quality === "verified"
    ? `${observation.asset} ${observation.observationType}; absolute reserve change ${observation.absoluteChange}.`
    : `${observation.asset} reserve intelligence unavailable: ${observation.reason ?? "delta unavailable"}.`
  return createIntelligenceArtifact({
    id: observation.observationId,
    type: "reserve_intelligence",
    title: `Binance ${observation.asset} Reserve Intelligence`,
    summary,
    confidence: 0,
    source: {
      system: "reserve-intelligence-v1",
      producerVersion: String(observation.schemaVersion),
      dataset: observation.source,
    },
    generatedAt: observation.generatedAt,
    expiresAt: null,
    validity: createEvidenceValidity({
      observedAt: observation.currentObservedAt,
      generatedAt: observation.generatedAt,
      coverageStatus: observation.quality === "verified" ? "FULL" : "UNAVAILABLE",
      reason: observation.quality === "verified"
        ? "Reserve intelligence is derived from observed reserve deltas."
        : observation.reason ?? "Reserve delta is unavailable.",
    }),
    supportingEvidence: [{
      id: `${observation.observationId}:delta`,
      kind: "calculation",
      title: `Binance ${observation.asset} reserve delta observation`,
      observedAt: observation.currentObservedAt,
      source: observation.source,
      metadata: {
        classification: observation.classification,
        observationType: observation.observationType,
        quantityChange: observation.quantityChange,
        absoluteChange: observation.absoluteChange,
        percentageChange: observation.percentageChange,
        balanceUsdChange: observation.balanceUsdChange,
        previousObservedAt: observation.previousObservedAt,
        quality: observation.quality,
      },
    }],
    metadata: {
      confidenceStatus: "not_calibrated",
      observation,
    },
    tags: [
      "reserve-intelligence",
      "binance",
      observation.asset.toLowerCase(),
      observation.classification,
      observation.observationType,
    ],
    subjects: {
      exchanges: ["binance"],
    },
  })
}
