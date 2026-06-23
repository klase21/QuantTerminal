import { createEvidenceValidity } from "@/core/evidence-validity"
import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
} from "@/core/intelligence-artifacts"
import type {
  ExchangeReserveDelta,
  ExchangeReserveDeltaArtifactMetadata,
} from "./exchangeReserveDeltaTypes"
import { validateExchangeReserveDelta } from "./exchangeReserveDeltaValidation"

export function createExchangeReserveDeltaArtifact(
  delta: ExchangeReserveDelta,
): IntelligenceArtifact<ExchangeReserveDeltaArtifactMetadata> {
  const validation = validateExchangeReserveDelta(delta)
  if (!validation.valid) {
    throw new Error(`Invalid Exchange Reserve Delta: ${validation.errors.join(" ")}`)
  }
  const summary = delta.status === "available"
    ? `${delta.asset} reserve changed by ${delta.balanceDelta} units and ${delta.balanceUsdDelta} USD.`
    : `${delta.asset} reserve delta unavailable: ${delta.reason ?? "previous snapshot unavailable"}.`
  return createIntelligenceArtifact({
    id: delta.deltaId,
    type: "exchange_reserve_delta",
    title: `Binance ${delta.asset} Reserve Delta`,
    summary,
    confidence: 0,
    source: {
      system: "exchange-reserve-delta-v1",
      producerVersion: String(delta.schemaVersion),
      dataset: delta.source,
    },
    generatedAt: delta.generatedAt,
    expiresAt: null,
    validity: createEvidenceValidity({
      observedAt: delta.currentObservedAt,
      generatedAt: delta.generatedAt,
      coverageStatus: delta.status === "available" ? "FULL" : "UNAVAILABLE",
      reason: delta.status === "available"
        ? "Reserve delta is derived from two observed reserve snapshots."
        : delta.reason ?? "Previous reserve snapshot is unavailable.",
    }),
    supportingEvidence: [{
      id: `${delta.deltaId}:current`,
      kind: "market_data",
      title: `Binance ${delta.asset} current reserve aggregate`,
      observedAt: delta.currentObservedAt,
      source: delta.source,
      metadata: {
        balance: delta.currentBalance,
        balanceUsd: delta.currentBalanceUsd,
      },
    }, ...(delta.previousObservedAt === null ? [] : [{
      id: `${delta.deltaId}:previous`,
      kind: "market_data" as const,
      title: `Binance ${delta.asset} previous reserve aggregate`,
      observedAt: delta.previousObservedAt,
      source: delta.source,
      metadata: {
        balance: delta.previousBalance,
        balanceUsd: delta.previousBalanceUsd,
      },
    }])],
    metadata: {
      confidenceStatus: "not_calibrated",
      delta,
    },
    tags: ["exchange-reserve-delta", "binance", delta.asset.toLowerCase()],
    subjects: {
      exchanges: ["binance"],
    },
  })
}
