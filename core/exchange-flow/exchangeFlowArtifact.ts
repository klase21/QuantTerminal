import { createEvidenceValidity } from "@/core/evidence-validity"
import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
} from "@/core/intelligence-artifacts"
import {
  type ExchangeFlowArtifactMetadata,
  type ExchangeFlowSnapshot,
} from "./exchangeFlowTypes"
import { validateExchangeFlowSnapshot } from "./exchangeFlowValidation"

export function createExchangeFlowArtifact(
  snapshot: ExchangeFlowSnapshot,
): IntelligenceArtifact<ExchangeFlowArtifactMetadata> {
  const validation = validateExchangeFlowSnapshot(snapshot)
  if (!validation.valid) {
    throw new Error(`Invalid Exchange Flow snapshot: ${validation.errors.join(" ")}`)
  }
  return createIntelligenceArtifact({
    id: snapshot.snapshotId,
    type: "exchange_flow",
    title: `${snapshot.exchange} ${snapshot.asset} Exchange Flow`,
    summary: `Holdings ${snapshot.holdings}; inflow ${snapshot.inflow}; outflow ${snapshot.outflow}; net flow ${snapshot.netFlow}.`,
    confidence: 0,
    source: {
      system: "exchange-flow-v1",
      producerVersion: String(snapshot.schemaVersion),
      dataset: snapshot.source,
    },
    generatedAt: snapshot.generatedAt,
    expiresAt: null,
    validity: createEvidenceValidity({
      observedAt: snapshot.timestamp,
      generatedAt: snapshot.generatedAt,
      coverageStatus: snapshot.sourceQuality === "verified" ? "FULL" : "PARTIAL",
      reason: `Exchange Flow source quality is ${snapshot.sourceQuality}.`,
    }),
    supportingEvidence: [{
      id: `${snapshot.snapshotId}:source`,
      kind: "market_data",
      title: `${snapshot.exchange} ${snapshot.asset} holdings and flow snapshot`,
      observedAt: snapshot.timestamp,
      source: snapshot.source,
      metadata: {
        holdings: snapshot.holdings,
        inflow: snapshot.inflow,
        outflow: snapshot.outflow,
        netFlow: snapshot.netFlow,
        sourceQuality: snapshot.sourceQuality,
      },
    }],
    metadata: {
      confidenceStatus: "not_calibrated",
      snapshot,
    },
    tags: [
      "exchange-flow",
      snapshot.exchange.toLowerCase(),
      snapshot.asset.toLowerCase(),
    ],
    subjects: {
      symbols: [snapshot.asset],
      exchanges: [snapshot.exchange],
    },
  })
}
