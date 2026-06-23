import { createEvidenceValidity } from "@/core/evidence-validity"
import {
  createIntelligenceArtifact,
  type IntelligenceArtifact,
} from "@/core/intelligence-artifacts"
import type { EtfArtifactMetadata, EtfSnapshot } from "./etfTypes"
import { validateEtfSnapshot } from "./etfValidation"

function evidenceSummary(snapshot: EtfSnapshot) {
  const facts: string[] = []
  if (snapshot.netInflowUsd !== null) facts.push(`net inflow USD ${snapshot.netInflowUsd}`)
  if (snapshot.inflowUsd !== null) facts.push(`inflow USD ${snapshot.inflowUsd}`)
  if (snapshot.outflowUsd !== null) facts.push(`outflow USD ${snapshot.outflowUsd}`)
  if (snapshot.holdings !== null) facts.push(`holdings ${snapshot.holdings}`)
  if (snapshot.holdingsValueUsd !== null) {
    facts.push(`holdings value USD ${snapshot.holdingsValueUsd}`)
  }
  return facts.length
    ? `${snapshot.asset} ETF: ${facts.join("; ")}.`
    : `${snapshot.asset} ETF snapshot observed at ${snapshot.timestamp}.`
}

export function createEtfSnapshotArtifact(
  snapshot: EtfSnapshot,
): IntelligenceArtifact<EtfArtifactMetadata> {
  const validation = validateEtfSnapshot(snapshot)
  if (!validation.valid) {
    throw new Error(`Invalid ETF snapshot: ${validation.errors.join(" ")}`)
  }
  return createIntelligenceArtifact({
    id: snapshot.snapshotId,
    type: "etf_snapshot",
    title: `${snapshot.asset} ETF Snapshot`,
    summary: evidenceSummary(snapshot),
    confidence: 0,
    source: {
      system: "etf-intelligence-v1",
      producerVersion: String(snapshot.schemaVersion),
      dataset: snapshot.source,
    },
    generatedAt: snapshot.generatedAt,
    expiresAt: null,
    validity: createEvidenceValidity({
      observedAt: snapshot.timestamp,
      generatedAt: snapshot.generatedAt,
      coverageStatus: snapshot.quality === "verified" ? "FULL" : "PARTIAL",
      reason: `ETF source quality is ${snapshot.quality}.`,
    }),
    supportingEvidence: [{
      id: `${snapshot.snapshotId}:source`,
      kind: "market_data",
      title: `${snapshot.asset} ETF source snapshot`,
      observedAt: snapshot.timestamp,
      source: snapshot.source,
      metadata: {
        netInflowUsd: snapshot.netInflowUsd,
        inflowUsd: snapshot.inflowUsd,
        outflowUsd: snapshot.outflowUsd,
        holdings: snapshot.holdings,
        holdingsValueUsd: snapshot.holdingsValueUsd,
        quality: snapshot.quality,
      },
    }],
    metadata: {
      confidenceStatus: "not_calibrated",
      snapshot,
    },
    tags: ["etf", snapshot.asset.toLowerCase()],
    subjects: {
      symbols: [snapshot.asset],
    },
  })
}
