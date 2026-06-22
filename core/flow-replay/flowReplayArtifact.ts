import { createEvidenceValidity } from "@/core/evidence-validity"
import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
  type IntelligenceSupportingEvidence,
} from "@/core/intelligence-artifacts"
import {
  type FlowReplayArtifactMetadata,
  type FlowReplayEvidence,
} from "./flowReplayTypes"

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
}

function supportingEvidence(
  flowReplay: FlowReplayEvidence,
): IntelligenceSupportingEvidence[] {
  return flowReplay.supportingEvidence.map((source) => ({
    id: source.sourceId,
    kind: "market_data",
    title: source.kind.replace(/_/g, " "),
    summary: source.summary,
    observedAt: source.observedAt ?? undefined,
    source: source.source,
    metadata: {
      quality: source.quality,
      reason: source.reason,
      metrics: source.metrics,
    },
  }))
}

export function createFlowReplayArtifact(
  flowReplay: FlowReplayEvidence,
): IntelligenceArtifact<FlowReplayArtifactMetadata> {
  const movement = flowReplay.whatMoved
  const movementSummary = movement
    ? `${movement.direction} ${formatPercent(movement.returnPercent)} with a ${formatPercent(movement.rangePercent)} intrahour range`
    : "price movement unavailable"
  const degradedKinds = flowReplay.degradedEvidence.map((item) => item.kind)
  const unavailableKinds = flowReplay.unavailableEvidence.map((item) => item.kind)
  const limitations = [
    degradedKinds.length ? `degraded: ${degradedKinds.join(", ")}` : null,
    unavailableKinds.length ? `unavailable: ${unavailableKinds.join(", ")}` : null,
  ].filter(Boolean).join("; ")

  return createIntelligenceArtifact({
    id: flowReplay.flowReplayId,
    type: "replay_intelligence",
    title: `${flowReplay.context.symbol} Flow Replay ${flowReplay.context.date} ${String(flowReplay.context.hour).padStart(2, "0")}:00 UTC`,
    summary: `${movementSummary}. ${limitations || "All prepared evidence sources are available."}`,
    confidence: 0,
    source: {
      system: "flow-replay-v1",
      producerVersion: String(flowReplay.schemaVersion),
      dataset: "prepared-replay-evidence",
      references: flowReplay.sources.map((item) => item.source),
    },
    generatedAt: flowReplay.generatedAt,
    expiresAt: null,
    validity: createEvidenceValidity({
      observedAt: flowReplay.context.windowEnd,
      generatedAt: flowReplay.generatedAt,
      coverageStatus: flowReplay.unavailableEvidence.length > 0
        || flowReplay.degradedEvidence.length > 0
        ? "PARTIAL"
        : "FULL",
      reason: "Flow Replay reports prepared evidence only and does not claim deterministic full orderbook reconstruction.",
    }),
    supportingEvidence: supportingEvidence(flowReplay),
    metadata: {
      confidenceStatus: "not_calibrated",
      flowReplay,
    },
    tags: [
      "flow-replay",
      "replay-evidence",
      flowReplay.context.symbol.toLowerCase(),
      flowReplay.context.timeframe,
    ],
    subjects: {
      symbols: [flowReplay.context.symbol],
      exchanges: [flowReplay.context.exchange],
    },
  })
}
