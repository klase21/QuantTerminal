import type { RealMarketRotationResponse, SectorRotationSnapshot } from "@/core/marketDataTypes"
import type { NarrativeHeatItem, NarrativeSurface, NarrativeValidationItem } from "@/core/narrative/narrativeTypes"
import { average, clamp } from "@/core/shared/metrics"
import type { FalsePositiveRisk, SignalQualityGrade, SignalQualityItem, SignalQualityReport, SignalReliability } from "./signalQualityTypes"

function gradeFromScore(score: number): SignalQualityGrade {
  if (score >= 82) return "A"
  if (score >= 68) return "B"
  if (score >= 52) return "C"
  return "D"
}

function reliabilityFromScore(score: number): SignalReliability {
  if (score >= 74) return "HIGH"
  if (score >= 55) return "MEDIUM"
  return "LOW"
}

function falsePositiveRiskFromScore(score: number, penalties: string[]): FalsePositiveRisk {
  if (score < 52 || penalties.length >= 3) return "HIGH"
  if (score < 70 || penalties.length >= 1) return "MEDIUM"
  return "LOW"
}

function recommendationFromScore(score: number, risk: FalsePositiveRisk): SignalQualityItem["recommendation"] {
  if (score >= 76 && risk !== "HIGH") return "PROMOTE"
  if (score >= 52) return "WATCH"
  return "SUPPRESS"
}

function normalizeKey(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

function matchSector(heat: NarrativeHeatItem, sectors: SectorRotationSnapshot[]) {
  const key = normalizeKey(heat.narrative)
  return sectors.find((sector) => normalizeKey(sector.sector) === key)
    ?? sectors.find((sector) => heat.sectors.some((candidate) => normalizeKey(candidate) === normalizeKey(sector.sector)))
}

function validationForHeat(heat: NarrativeHeatItem, validations: NarrativeValidationItem[]) {
  const key = normalizeKey(heat.narrative)
  return validations.find((item) => normalizeKey(item.narrative) === key)
}

function scoreValidation(status?: NarrativeValidationItem["status"]) {
  switch (status) {
    case "VALIDATED":
      return 24
    case "FLOW_ONLY":
      return 10
    case "NEWS_ONLY":
      return 4
    case "WEAK":
      return -8
    default:
      return 0
  }
}

function buildReasons(params: {
  heat: NarrativeHeatItem
  sector?: SectorRotationSnapshot
  validation?: NarrativeValidationItem
  dataQualityStatus?: string
}) {
  const { heat, sector, validation, dataQualityStatus } = params
  const reasons: string[] = []
  const penalties: string[] = []

  if (heat.heat >= 75) reasons.push("High narrative heat")
  if (validation?.status === "VALIDATED") reasons.push("News buzz confirmed by liquidity flow")
  if (validation?.status === "FLOW_ONLY") reasons.push("Liquidity is moving ahead of headlines")
  if (sector?.confidence && sector.confidence >= 70) reasons.push("Rotation confidence is strong")
  if (sector?.breadth && sector.breadth >= 55) reasons.push("Sector breadth confirms participation")
  if (sector?.premiumBoost && sector.premiumBoost >= 60) reasons.push("Korean retail overlay is supportive")
  if (sector?.regimeFit && sector.regimeFit >= 65) reasons.push("Signal fits current regime")

  if (validation?.status === "NEWS_ONLY") penalties.push("News heat lacks liquidity confirmation")
  if (validation?.status === "WEAK") penalties.push("Narrative validation remains weak")
  if (sector && sector.breadth < 38 && sector.rotationScore >= 65) penalties.push("Leader-only move risk: weak breadth")
  if (sector && sector.premiumBoost < 35 && sector.volumePressure >= 65) penalties.push("Korean overlay does not confirm global flow")
  if (dataQualityStatus && !["healthy", "partial"].includes(dataQualityStatus)) penalties.push(`Data quality is ${dataQualityStatus}`)

  if (!reasons.length) reasons.push("Signal is visible but not strongly confirmed")
  return { reasons, penalties }
}

export function evaluateSignalQuality(
  narrative: NarrativeSurface,
  rotationData: RealMarketRotationResponse | null
): SignalQualityReport {
  const validations = narrative.newsFusion?.validation ?? []
  const sectors = rotationData?.sectors ?? narrative.sourceSectors ?? []
  const dataQualityStatus = rotationData?.dataQuality?.status
  const heatItems = narrative.heatmap.slice(0, 8)

  const items: SignalQualityItem[] = heatItems.map((heat, index) => {
    const sector = matchSector(heat, sectors)
    const validation = validationForHeat(heat, validations)
    const { reasons, penalties } = buildReasons({ heat, sector, validation, dataQualityStatus })

    const base = clamp(
      heat.heat * 0.24
      + (sector?.rotationScore ?? heat.heat) * 0.24
      + (sector?.confidence ?? 50) * 0.14
      + (sector?.breadth ?? 45) * 0.12
      + (sector?.regimeFit ?? 50) * 0.10
      + (validation?.validationScore ?? 45) * 0.16
      + scoreValidation(validation?.status)
      - penalties.length * 7
      - index * 1.5
    )

    const grade = gradeFromScore(base)
    const reliability = reliabilityFromScore(base)
    const falsePositiveRisk = falsePositiveRiskFromScore(base, penalties)
    const recommendation = recommendationFromScore(base, falsePositiveRisk)

    return {
      id: `quality-${normalizeKey(heat.narrative) || index}`,
      narrative: heat.narrative,
      qualityScore: base,
      grade,
      reliability,
      falsePositiveRisk,
      validationStatus: validation?.status ?? "ROTATION_ONLY",
      newsBuzz: validation?.newsBuzz ?? 0,
      liquidityHeat: validation?.liquidityHeat ?? heat.heat,
      reasons,
      penalties,
      recommendation,
    }
  })

  const sorted = items.sort((a, b) => b.qualityScore - a.qualityScore)
  const promoted = sorted.filter((item) => item.recommendation === "PROMOTE")
  const watch = sorted.filter((item) => item.recommendation === "WATCH")
  const suppressed = sorted.filter((item) => item.recommendation === "SUPPRESS")
  const overallScore = clamp(average(sorted.slice(0, 5).map((item) => item.qualityScore)))
  const overallRisk = falsePositiveRiskFromScore(overallScore, sorted.flatMap((item) => item.penalties).slice(0, 3))

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    reliability: reliabilityFromScore(overallScore),
    falsePositiveRisk: overallRisk,
    promoted,
    watch,
    suppressed,
    notes: [
      "Signal quality blends liquidity, news validation, breadth, premium confirmation, regime fit, and data quality.",
      "PROMOTE means the signal can graduate from lab visibility into the user-facing signal inbox.",
    ],
  }
}
