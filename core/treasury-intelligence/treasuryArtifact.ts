import { createEvidenceValidity } from "@/core/evidence-validity"
import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
} from "@/core/intelligence-artifacts"
import type {
  TreasuryArtifactMetadata,
  TreasurySnapshot,
} from "./treasuryTypes"
import { validateTreasurySnapshot } from "./treasuryValidation"

export function createTreasurySnapshotArtifact(
  snapshot: TreasurySnapshot,
): IntelligenceArtifact<TreasuryArtifactMetadata> {
  const validation = validateTreasurySnapshot(snapshot)
  if (!validation.valid) {
    throw new Error(`Invalid Treasury snapshot: ${validation.errors.join(" ")}`)
  }
  return createIntelligenceArtifact({
    id: snapshot.snapshotId,
    type: "treasury_snapshot",
    title: `${snapshot.holder} ${snapshot.asset} Treasury`,
    summary: `${snapshot.holder} holds ${snapshot.holdings} ${snapshot.asset}.`,
    confidence: 0,
    source: {
      system: "treasury-intelligence-v1",
      producerVersion: String(snapshot.schemaVersion),
      dataset: snapshot.source,
    },
    generatedAt: snapshot.generatedAt,
    expiresAt: null,
    validity: createEvidenceValidity({
      observedAt: snapshot.timestamp,
      generatedAt: snapshot.generatedAt,
      coverageStatus: snapshot.quality === "verified" ? "FULL" : "PARTIAL",
      reason: `Treasury source quality is ${snapshot.quality}.`,
    }),
    supportingEvidence: [{
      id: `${snapshot.snapshotId}:source`,
      kind: "market_data",
      title: `${snapshot.holder} ${snapshot.asset} treasury holdings`,
      observedAt: snapshot.timestamp,
      source: snapshot.source,
      metadata: {
        holderType: snapshot.holderType,
        holdings: snapshot.holdings,
        holdingsValueUsd: snapshot.holdingsValueUsd,
        changeAmount: snapshot.changeAmount,
        changePercent: snapshot.changePercent,
        quality: snapshot.quality,
      },
    }],
    metadata: {
      confidenceStatus: "not_calibrated",
      snapshot,
    },
    tags: [
      "treasury",
      snapshot.holderType.toLowerCase(),
      snapshot.asset.toLowerCase(),
    ],
    subjects: {
      symbols: [snapshot.asset],
    },
  })
}
