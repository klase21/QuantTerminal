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
  const isAssetLevel = snapshot.scope === "asset_level"
  const identity = isAssetLevel ? snapshot.asset : "Exchange-Level"
  const summary = isAssetLevel
    ? `Holdings ${snapshot.holdings}; inflow ${snapshot.inflow}; outflow ${snapshot.outflow}; net flow ${snapshot.netFlow}.`
    : `Total assets ${snapshot.totalAssetsUsd} USD; 24h net flow ${snapshot.netFlow24hUsd} USD.`
  const evidenceMetadata = isAssetLevel
    ? {
        scope: snapshot.scope,
        holdings: snapshot.holdings,
        inflow: snapshot.inflow,
        outflow: snapshot.outflow,
        netFlow: snapshot.netFlow,
        sourceQuality: snapshot.sourceQuality,
      }
    : {
        scope: snapshot.scope,
        totalAssetsUsd: snapshot.totalAssetsUsd,
        netFlow24hUsd: snapshot.netFlow24hUsd,
        sourceQuality: snapshot.sourceQuality,
      }
  return createIntelligenceArtifact({
    id: snapshot.snapshotId,
    type: "exchange_flow",
    title: `${snapshot.exchange} ${identity} Exchange Flow`,
    summary,
    confidence: 0,
    source: {
      system: "exchange-flow-v2",
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
      title: `${snapshot.exchange} ${identity} holdings and flow snapshot`,
      observedAt: snapshot.timestamp,
      source: snapshot.source,
      metadata: evidenceMetadata,
    }],
    metadata: {
      confidenceStatus: "not_calibrated",
      snapshot,
    },
    tags: [
      "exchange-flow",
      snapshot.scope,
      snapshot.exchange.toLowerCase(),
      ...(isAssetLevel ? [snapshot.asset.toLowerCase()] : []),
    ],
    subjects: {
      symbols: isAssetLevel ? [snapshot.asset] : [],
      exchanges: [snapshot.exchange],
    },
  })
}
