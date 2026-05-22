import type { RealMarketRotationResponse, SectorRotationSnapshot } from "@/core/marketDataTypes"
import type { NarrativeHeatItem, NarrativeSurface, NarrativeValidationItem } from "@/core/narrative/narrativeTypes"
import { average, clamp } from "@/core/shared/metrics"
import type {
  FalsePositiveRisk,
  SignalQualityBreakdown,
  SignalQualityGrade,
  SignalQualityItem,
  SignalQualityReport,
  SignalReliability,
  SignalTrustLabel,
} from "./signalQualityTypes"

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

function trustLabelFromScore(score: number, risk: FalsePositiveRisk): SignalTrustLabel {
  if (score >= 78 && risk === "LOW") return "HIGH_TRUST"
  if (score >= 58 && risk !== "HIGH") return "WATCH"
  return "LOW_QUALITY"
}

function falsePositiveRiskFromScore(score: number, penalties: string[]): FalsePositiveRisk {
  if (score < 52 || penalties.length >= 3) return "HIGH"
  if (score < 70 || penalties.length >= 1) return "MEDIUM"
  return "LOW"
}

function recommendationFromScore(score: number, risk: FalsePositiveRisk): SignalQualityItem["recommendation"] {
  if (score >= 78 && risk === "LOW") return "PROMOTE"
  if (score >= 56 && risk !== "HIGH") return "WATCH"
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
      return 100
    case "FLOW_ONLY":
      return 62
    case "NEWS_ONLY":
      return 40
    case "WEAK":
      return 22
    default:
      return 45
  }
}

function scoreDataQuality(status?: string, stale?: boolean) {
  if (stale) return 35
  switch (status) {
    case "healthy":
      return 92
    case "partial":
      return 68
    case "degraded":
      return 44
    case "error":
      return 15
    default:
      return 55
  }
}

function buildBreakdown(params: {
  heat: NarrativeHeatItem
  sector?: SectorRotationSnapshot
  validation?: NarrativeValidationItem
  dataQualityStatus?: string
  stale?: boolean
}): SignalQualityBreakdown {
  const { heat, sector, validation, dataQualityStatus, stale } = params
  const liquidity = clamp(sector?.rotationScore ?? heat.heat ?? 0)
  const validationScore = clamp(validation?.validationScore ?? scoreValidation(validation?.status))
  const breadth = clamp(sector?.breadth ?? 42)
  const regimeFit = clamp(sector?.regimeFit ?? 50)
  const dataQuality = scoreDataQuality(dataQualityStatus, stale)
  const premiumConfirmation = clamp(sector?.premiumBoost ?? 45)
  const noisePenalty = clamp(
    (validation?.status === "NEWS_ONLY" ? 16 : 0)
      + (validation?.status === "WEAK" ? 24 : 0)
      + (sector && sector.breadth < 35 && sector.rotationScore >= 60 ? 18 : 0)
      + (sector && sector.volumePressure < 35 && heat.heat >= 68 ? 14 : 0)
      + (dataQuality < 50 ? 14 : 0)
  )

  return {
    liquidity,
    validation: validationScore,
    breadth,
    regimeFit,
    dataQuality,
    premiumConfirmation,
    noisePenalty,
  }
}

function buildReasons(params: {
  heat: NarrativeHeatItem
  sector?: SectorRotationSnapshot
  validation?: NarrativeValidationItem
  dataQualityStatus?: string
  stale?: boolean
}) {
  const { heat, sector, validation, dataQualityStatus, stale } = params
  const reasons: string[] = []
  const penalties: string[] = []

  if (heat.heat >= 75) reasons.push("High narrative heat")
  if (validation?.status === "VALIDATED") reasons.push("News buzz confirmed by liquidity flow")
  if (validation?.status === "FLOW_ONLY") reasons.push("Liquidity is moving ahead of headlines")
  if (sector?.confidence && sector.confidence >= 70) reasons.push("Rotation confidence is strong")
  if (sector?.breadth && sector.breadth >= 55) reasons.push("Sector breadth confirms participation")
  if (sector?.premiumBoost && sector.premiumBoost >= 60) reasons.push("Korean retail overlay is supportive")
  if (sector?.regimeFit && sector.regimeFit >= 65) reasons.push("Signal fits current regime")
  if (dataQualityStatus === "healthy" && !stale) reasons.push("Connector health is clean")

  if (validation?.status === "NEWS_ONLY") penalties.push("News heat lacks liquidity confirmation")
  if (validation?.status === "WEAK") penalties.push("Narrative validation remains weak")
  if (sector && sector.breadth < 38 && sector.rotationScore >= 65) penalties.push("Leader-only move risk: weak breadth")
  if (sector && sector.premiumBoost < 35 && sector.volumePressure >= 65) penalties.push("Korean overlay does not confirm global flow")
  if (sector && sector.volumePressure < 35 && heat.heat >= 68) penalties.push("Narrative heat is high but volume pressure is thin")
  if (stale) penalties.push("Source feed is stale")
  if (dataQualityStatus && !["healthy", "partial"].includes(dataQualityStatus)) penalties.push(`Data quality is ${dataQualityStatus}`)

  if (!reasons.length) reasons.push("Signal is visible but not strongly confirmed")
  return { reasons, penalties }
}

function cooldownGroupFor(narrative: string, status?: string) {
  return `${normalizeKey(narrative) || "UNKNOWN"}:${status ?? "ROTATION_ONLY"}`
}

function operatorAction(item: Pick<SignalQualityItem, "recommendation" | "falsePositiveRisk" | "reliability" | "validationStatus" | "penalties" | "reasons">) {
  if (item.recommendation === "PROMOTE") {
    return item.validationStatus === "VALIDATED"
      ? "Narrative and liquidity are aligned. Promote to the primary signal rail."
      : "Market flow is strong enough for active monitoring and inbox promotion."
  }
  if (item.falsePositiveRisk === "HIGH") return "Suppress until liquidity, breadth, or data quality improves."
  if (item.penalties.some((penalty) => penalty.toLowerCase().includes("breadth"))) {
    return "Participation remains narrow. Wait for broader sector confirmation."
  }
  if (item.validationStatus === "FLOW_ONLY") return "Liquidity is leading headlines. Watch for narrative confirmation."
  if (item.validationStatus === "NEWS_ONLY") return "News momentum is visible, but flow confirmation is still weak."
  if (item.reliability === "MEDIUM") return "Monitor for another confirming tick before promotion."
  return item.reasons[0] ?? "Keep visible as low-priority context only."
}

export function evaluateSignalQuality(
  narrative: NarrativeSurface,
  rotationData: RealMarketRotationResponse | null
): SignalQualityReport {
  const validations = narrative.newsFusion?.validation ?? []
  const sectors = rotationData?.sectors ?? narrative.sourceSectors ?? []
  const dataQualityStatus = rotationData?.dataQuality?.status
  const stale = Boolean(rotationData?.dataQuality?.stale)
  const heatItems = narrative.heatmap.slice(0, 10)
  const seen = new Map<string, number>()

  const items: SignalQualityItem[] = heatItems.map((heat, index) => {
    const sector = matchSector(heat, sectors)
    const validation = validationForHeat(heat, validations)
    const { reasons, penalties } = buildReasons({ heat, sector, validation, dataQualityStatus, stale })
    const breakdown = buildBreakdown({ heat, sector, validation, dataQualityStatus, stale })
    const group = cooldownGroupFor(heat.narrative, validation?.status)
    const duplicateCount = seen.get(group) ?? 0
    seen.set(group, duplicateCount + 1)

    if (duplicateCount > 0) penalties.push("Duplicate narrative suppressed into existing cooldown group")

    const score = clamp(
      breakdown.liquidity * 0.24
        + breakdown.validation * 0.20
        + (sector?.confidence ?? 50) * 0.13
        + breakdown.breadth * 0.13
        + breakdown.regimeFit * 0.12
        + breakdown.premiumConfirmation * 0.08
        + breakdown.dataQuality * 0.10
        - breakdown.noisePenalty * 0.55
        - penalties.length * 4
        - index * 1.2
        - duplicateCount * 12
    )

    const grade = gradeFromScore(score)
    const reliability = reliabilityFromScore(score)
    const falsePositiveRisk = falsePositiveRiskFromScore(score, penalties)
    const recommendation = recommendationFromScore(score, falsePositiveRisk)
    const trustLabel = trustLabelFromScore(score, falsePositiveRisk)

    const item: SignalQualityItem = {
      id: `quality-${normalizeKey(heat.narrative) || index}`,
      narrative: heat.narrative,
      qualityScore: score,
      grade,
      reliability,
      trustLabel,
      falsePositiveRisk,
      validationStatus: validation?.status ?? "ROTATION_ONLY",
      newsBuzz: validation?.newsBuzz ?? 0,
      liquidityHeat: validation?.liquidityHeat ?? heat.heat,
      reasons,
      penalties,
      recommendation,
      breakdown,
      cooldownGroup: group,
      operatorAction: "",
    }

    item.operatorAction = operatorAction(item)
    return item
  })

  const sorted = items.sort((a, b) => b.qualityScore - a.qualityScore)
  const promoted = sorted.filter((item) => item.recommendation === "PROMOTE")
  const watch = sorted.filter((item) => item.recommendation === "WATCH")
  const suppressed = sorted.filter((item) => item.recommendation === "SUPPRESS")
  const overallScore = clamp(average(sorted.slice(0, 5).map((item) => item.qualityScore)))
  const allPenalties = sorted.flatMap((item) => item.penalties)
  const overallRisk = falsePositiveRiskFromScore(overallScore, allPenalties.slice(0, 4))

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    reliability: reliabilityFromScore(overallScore),
    falsePositiveRisk: overallRisk,
    promoted,
    watch,
    suppressed,
    noiseSuppressed: suppressed.length,
    topPenalties: Array.from(new Set(allPenalties)).slice(0, 5),
    notes: [
      "Signal quality now applies noise penalties, duplicate suppression, breadth confirmation, data quality weighting, and regime fit.",
      "PROMOTE requires strong confirmation. WATCH means visible but not alert-worthy. SUPPRESS keeps noisy signals out of primary surfaces.",
    ],
  }
}
