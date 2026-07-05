import {
  EVIDENCE_COVERAGE_STATUSES,
  type EvidenceCoverageStatus,
  type EvidencePacket,
  type EvidencePacketBuildResult,
  type EvidencePacketDataset,
  type EvidencePacketLoadResult,
  type EvidenceReadiness,
} from "@/lib/evidence/evidencePacket"
import {
  adaptResearchRepositoryCoverage,
  type ResearchRepositorySummaryRow,
} from "@/lib/research/researchRepositoryAdapter"
import {
  loadResearchRepositoryCoverage,
  type ResearchRepositoryCoverageResponse,
} from "@/lib/research/researchRepositoryClient"

function coverageStatus(value: string): EvidenceCoverageStatus | null {
  return EVIDENCE_COVERAGE_STATUSES.includes(value as EvidenceCoverageStatus)
    ? value as EvidenceCoverageStatus
    : null
}

function limitationsFor(row: ResearchRepositorySummaryRow, status: EvidenceCoverageStatus): readonly string[] {
  const limitations: string[] = []
  if (status === "PARTIAL") limitations.push(`${row.dataset} coverage is partial; absent intervals remain unavailable.`)
  if (status === "MISSING") limitations.push(`${row.dataset} evidence is missing; no market-state implication may be inferred.`)
  if (status === "UNAVAILABLE") limitations.push(`${row.dataset} evidence is unavailable.`)
  if (status === "EXPERIMENTAL" || !row.canonical) limitations.push(`${row.dataset} is experimental and must not be treated as canonical truth.`)
  if (status === "VARIABLE") limitations.push(`${row.dataset} record count is availability metadata only; event-stream completeness is not inferred.`)
  if (!row.verified) limitations.push(`${row.dataset} provider evidence is not verified.`)
  return Object.freeze(limitations)
}

function readiness(datasets: readonly EvidencePacketDataset[]): EvidenceReadiness {
  const canonicalAvailable = datasets.filter((dataset) => dataset.canonical
    && dataset.actualRecords > 0
    && dataset.coverageStatus !== "MISSING"
    && dataset.coverageStatus !== "UNAVAILABLE")
  const completeCanonical = canonicalAvailable.filter((dataset) => dataset.coverageStatus === "COMPLETE")
  const constrained = datasets.some((dataset) => dataset.coverageStatus !== "COMPLETE" || !dataset.canonical)
  if (!canonicalAvailable.length) return "INSUFFICIENT"
  if (!completeCanonical.length) return "DEGRADED"
  return constrained ? "PARTIAL" : "READY"
}

export function buildEvidencePacket(
  projection: ResearchRepositoryCoverageResponse,
): EvidencePacketBuildResult {
  const adapted = adaptResearchRepositoryCoverage(projection)
  if (adapted.status !== "SUCCESS") {
    return Object.freeze({ status: "INVALID_PROJECTION", reason: adapted.reason })
  }

  const datasets: EvidencePacketDataset[] = []
  for (const row of adapted.value.rows) {
    const status = coverageStatus(row.coverageStatus)
    if (!status || !Number.isFinite(Date.parse(row.computedAt))) {
      return Object.freeze({ status: "INVALID_PROJECTION", reason: `${row.dataset} coverage status or computation timestamp is invalid.` })
    }
    datasets.push(Object.freeze({
      dataset: row.dataset,
      coverageStatus: status,
      actualRecords: row.actualRecords,
      expectedRecords: row.expectedRecords,
      coveragePercent: row.coveragePercent,
      resolution: row.resolution,
      coverageMode: row.coverageMode,
      providerTier: row.providerTier,
      canonical: row.canonical,
      verified: row.verified,
      confidence: row.confidence,
      firstObservedAt: row.firstObservedAt,
      lastObservedAt: row.lastObservedAt,
      limitations: limitationsFor(row, status),
    }))
  }

  const generatedAt = datasets.length
    ? new Date(Math.max(...adapted.value.rows.map((row) => Date.parse(row.computedAt)))).toISOString()
    : null
  if (!generatedAt) {
    return Object.freeze({ status: "INVALID_PROJECTION", reason: "Evidence Packet requires projection computation timestamps." })
  }

  const missingEvidence = datasets
    .filter((dataset) => dataset.coverageStatus === "MISSING" || dataset.coverageStatus === "UNAVAILABLE")
    .map((dataset) => dataset.dataset)
  const experimentalEvidence = datasets
    .filter((dataset) => dataset.coverageStatus === "EXPERIMENTAL" || !dataset.canonical)
    .map((dataset) => dataset.dataset)
  const canonicalEvidence = datasets
    .filter((dataset) => dataset.canonical && dataset.actualRecords > 0
      && dataset.coverageStatus !== "MISSING" && dataset.coverageStatus !== "UNAVAILABLE")
    .map((dataset) => dataset.dataset)
  const warnings = datasets.flatMap((dataset) => dataset.limitations)

  const packet: EvidencePacket = Object.freeze({
    symbol: adapted.value.symbol,
    utcDay: adapted.value.utcDay,
    generatedAt,
    evidenceReadiness: readiness(datasets),
    datasets: Object.freeze(datasets),
    missingEvidence: Object.freeze(missingEvidence),
    experimentalEvidence: Object.freeze(experimentalEvidence),
    canonicalEvidence: Object.freeze(canonicalEvidence),
    warnings: Object.freeze(warnings),
  })
  return Object.freeze({ status: "SUCCESS", value: packet })
}

export async function loadEvidencePacket(input: {
  readonly symbol: string
  readonly utcDay: string
  readonly signal?: AbortSignal
  readonly fetchImpl?: typeof fetch
}): Promise<EvidencePacketLoadResult> {
  const projection = await loadResearchRepositoryCoverage(input)
  if (projection.status !== "AVAILABLE") return projection
  return buildEvidencePacket(projection.value)
}
