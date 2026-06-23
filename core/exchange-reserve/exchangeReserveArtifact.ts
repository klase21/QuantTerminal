import { createEvidenceValidity } from "@/core/evidence-validity"
import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
} from "@/core/intelligence-artifacts"
import type {
  ExchangeReserveArtifactMetadata,
  ExchangeReserveSnapshot,
} from "./exchangeReserveTypes"
import { validateExchangeReserveSnapshot } from "./exchangeReserveValidation"

export function createExchangeReserveArtifact(
  snapshot: ExchangeReserveSnapshot,
): IntelligenceArtifact<ExchangeReserveArtifactMetadata> {
  const validation = validateExchangeReserveSnapshot(snapshot)
  if (!validation.valid) {
    throw new Error(`Invalid Exchange Reserve snapshot: ${validation.errors.join(" ")}`)
  }
  return createIntelligenceArtifact({
    id: snapshot.snapshotId,
    type: "exchange_reserve_snapshot",
    title: `Binance ${snapshot.asset} Reserve`,
    summary: `${snapshot.balance} ${snapshot.asset} on ${snapshot.network}; USD value ${snapshot.balanceUsd}.`,
    confidence: 0,
    source: {
      system: "exchange-reserve-v1",
      producerVersion: String(snapshot.schemaVersion),
      dataset: snapshot.source,
    },
    generatedAt: snapshot.generatedAt,
    expiresAt: null,
    validity: createEvidenceValidity({
      observedAt: snapshot.updateTime,
      generatedAt: snapshot.generatedAt,
      coverageStatus: snapshot.quality === "verified" ? "FULL" : "PARTIAL",
      reason: `Exchange Reserve source quality is ${snapshot.quality}.`,
    }),
    supportingEvidence: [{
      id: `${snapshot.snapshotId}:source`,
      kind: "market_data",
      title: `Binance ${snapshot.asset} reserve wallet`,
      observedAt: snapshot.updateTime,
      source: snapshot.source,
      metadata: {
        walletAddress: snapshot.walletAddress,
        network: snapshot.network,
        balance: snapshot.balance,
        balanceUsd: snapshot.balanceUsd,
        quality: snapshot.quality,
      },
    }],
    metadata: {
      confidenceStatus: "not_calibrated",
      snapshot,
    },
    tags: [
      "exchange-reserve",
      "binance",
      snapshot.network.toLowerCase(),
      snapshot.asset.toLowerCase(),
    ],
    subjects: {
      exchanges: ["binance"],
    },
  })
}
