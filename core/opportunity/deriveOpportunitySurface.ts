import type { GeoNarrativeSurface } from "@/core/geoNarrativeTypes"
import type { SectorRotationSnapshot } from "@/core/marketDataTypes"
import type { NarrativeLifecycleItem } from "@/core/narrative/lifecycleTypes"
import type { NewsFusionSurface } from "@/core/narrative/narrativeTypes"
import { clamp } from "@/core/shared/metrics"
import type { OpportunityBreakdown, OpportunityItem, OpportunityState, OpportunitySurface } from "./opportunityTypes"

function round(value: number) {
  return Math.round(clamp(value))
}

function labelForState(state: OpportunityState) {
  switch (state) {
    case "HIGH_OPPORTUNITY":
      return "High Opportunity"
    case "EMERGING":
      return "Emerging Setup"
    case "WATCHLIST":
      return "Watchlist"
    case "OVERCROWDED":
      return "Overcrowded"
    case "EXITING":
      return "Exiting"
    default:
      return "Suppressed"
  }
}

function convictionForState(state: OpportunityState, confidence: number) {
  if (state === "HIGH_OPPORTUNITY" && confidence >= 78) return "High" as const
  if (state === "HIGH_OPPORTUNITY" || state === "EMERGING") return "Medium" as const
  if (state === "WATCHLIST") return "Low" as const
  return "Avoid" as const
}

function whaleProxy(sector: SectorRotationSnapshot) {
  // Placeholder until true whale flow is attached: strong volume + confidence acts as a conservative proxy.
  return clamp(sector.volumePressure * 0.55 + sector.confidence * 0.30 + sector.premiumBoost * 0.15)
}

function geoScore(sector: SectorRotationSnapshot, geo?: GeoNarrativeSurface, newsFusion?: NewsFusionSurface) {
  const geoHit = geo?.regions?.some((region) => region.leadNarrative === sector.sector)
  const validated = newsFusion?.validation?.find((item) => item.narrative === sector.sector)
  const validationBoost = validated?.status === "VALIDATED" ? 24 : validated?.status === "FLOW_ONLY" ? 12 : 0
  const syncBoost = geo?.diffusion === "GLOBAL_SYNC" ? 18 : geo?.diffusion === "US_TO_KR" || geo?.diffusion === "KR_TO_GLOBAL" ? 12 : 0
  return clamp((geoHit ? 44 : 22) + validationBoost + syncBoost)
}

function crowdingSafety(lifecycle?: NarrativeLifecycleItem) {
  const risk = lifecycle?.crowdRisk ?? 0
  if (lifecycle?.phase === "OVERCROWDED") return 8
  if (lifecycle?.phase === "EXITING") return 18
  return clamp(100 - risk)
}

function buildBreakdown(sector: SectorRotationSnapshot, lifecycle?: NarrativeLifecycleItem, geo?: GeoNarrativeSurface, newsFusion?: NewsFusionSurface): OpportunityBreakdown {
  return {
    liquidity: round(sector.volumePressure),
    breadth: round(sector.breadth),
    participation: round(lifecycle?.velocity ?? sector.rotationScore),
    crowdingSafety: round(crowdingSafety(lifecycle)),
    geoConfirmation: round(geoScore(sector, geo, newsFusion)),
    whaleConfidence: round(whaleProxy(sector)),
    dataQuality: 82,
  }
}

function confirmationsFromBreakdown(b: OpportunityBreakdown) {
  const confirmations: string[] = []
  if (b.liquidity >= 65) confirmations.push("Liquidity confirmed")
  if (b.breadth >= 58) confirmations.push("Breadth participating")
  if (b.participation >= 65) confirmations.push("Participation accelerating")
  if (b.geoConfirmation >= 58) confirmations.push("Regional confirmation present")
  if (b.whaleConfidence >= 64) confirmations.push("Large-flow proxy supportive")
  if (b.crowdingSafety >= 60) confirmations.push("Crowding still manageable")
  return confirmations
}

function suppressionsFromBreakdown(b: OpportunityBreakdown, lifecycle?: NarrativeLifecycleItem, sector?: SectorRotationSnapshot) {
  const suppressions: string[] = []
  if (b.liquidity < 42) suppressions.push("Liquidity is too thin")
  if (b.breadth < 38) suppressions.push("Participation breadth is narrow")
  if (b.crowdingSafety < 28) suppressions.push("Crowding risk is too high")
  if ((lifecycle?.phase === "EXITING") || sector?.direction === "OUTFLOW") suppressions.push("Flow is exiting")
  if (b.geoConfirmation < 28) suppressions.push("No regional confirmation")
  return suppressions
}

function stateFromEvidence(args: {
  sector: SectorRotationSnapshot
  lifecycle?: NarrativeLifecycleItem
  breakdown: OpportunityBreakdown
  confirmations: string[]
  suppressions: string[]
  confidence: number
}): OpportunityState {
  const { sector, lifecycle, breakdown, confirmations, suppressions, confidence } = args
  if (sector.direction === "OUTFLOW" || lifecycle?.phase === "EXITING") return "EXITING"
  if (lifecycle?.phase === "OVERCROWDED" || breakdown.crowdingSafety <= 20) return "OVERCROWDED"
  if (suppressions.length >= 2) return "SUPPRESSED"
  if (confidence >= 76 && confirmations.length >= 4 && sector.direction === "INFLOW") return "HIGH_OPPORTUNITY"
  if (confidence >= 62 && confirmations.length >= 3) return "EMERGING"
  if (confidence >= 48 || confirmations.length >= 2) return "WATCHLIST"
  return "SUPPRESSED"
}

function confidenceFromBreakdown(b: OpportunityBreakdown) {
  return clamp(
    b.liquidity * 0.24 +
      b.breadth * 0.20 +
      b.participation * 0.18 +
      b.crowdingSafety * 0.14 +
      b.geoConfirmation * 0.12 +
      b.whaleConfidence * 0.08 +
      b.dataQuality * 0.04
  )
}

function actionForState(state: OpportunityState) {
  switch (state) {
    case "HIGH_OPPORTUNITY":
      return "Promote to operator focus"
    case "EMERGING":
      return "Track for one more confirmation"
    case "WATCHLIST":
      return "Keep visible, do not promote yet"
    case "OVERCROWDED":
      return "Avoid chasing; monitor exhaustion"
    case "EXITING":
      return "Watch for liquidity fade"
    default:
      return "Suppress from main surface"
  }
}

function noteForState(state: OpportunityState, sector: SectorRotationSnapshot, b: OpportunityBreakdown) {
  switch (state) {
    case "HIGH_OPPORTUNITY":
      return `${sector.sector} has enough liquidity, breadth, and participation to clear the opportunity filter.`
    case "EMERGING":
      return `${sector.sector} is forming, but it still needs stronger confirmation before promotion.`
    case "WATCHLIST":
      return `${sector.sector} is worth watching, but the evidence stack is not yet decisive.`
    case "OVERCROWDED":
      return `${sector.sector} is hot, but crowding risk is elevated; follow-through may be fragile.`
    case "EXITING":
      return `${sector.sector} is showing exit pressure. Treat rallies as lower quality until flow improves.`
    default:
      return `${sector.sector} is filtered out because confirmation quality is weak.`
  }
}

function buildItem(sector: SectorRotationSnapshot, lifecycle: NarrativeLifecycleItem | undefined, geo: GeoNarrativeSurface | undefined, newsFusion: NewsFusionSurface | undefined): OpportunityItem {
  const breakdown = buildBreakdown(sector, lifecycle, geo, newsFusion)
  const confirmations = confirmationsFromBreakdown(breakdown)
  const suppressions = suppressionsFromBreakdown(breakdown, lifecycle, sector)
  const confidence = round(confidenceFromBreakdown(breakdown))
  const state = stateFromEvidence({ sector, lifecycle, breakdown, confirmations, suppressions, confidence })
  const label = labelForState(state)
  return {
    narrative: sector.sector,
    state,
    label,
    shortLabel: label,
    conviction: convictionForState(state, confidence),
    confidence,
    headline: `${sector.sector} ${label}`,
    operatorNote: noteForState(state, sector, breakdown),
    action: actionForState(state),
    breakdown,
    confirmations,
    suppressions,
    source: lifecycle ? "mixed" : "rotation",
  }
}

export function deriveOpportunitySurface(args: {
  sectors: SectorRotationSnapshot[]
  lifecycle?: NarrativeLifecycleItem[]
  geoNarrative?: GeoNarrativeSurface
  newsFusion?: NewsFusionSurface
}): OpportunitySurface {
  const { sectors, lifecycle = [], geoNarrative, newsFusion } = args
  const items = sectors.slice(0, 10).map((sector) => {
    const life = lifecycle.find((item) => item.narrative === sector.sector)
    return buildItem(sector, life, geoNarrative, newsFusion)
  })

  const visible = items.filter((item) => item.state !== "SUPPRESSED")
  const suppressed = items.filter((item) => item.state === "SUPPRESSED")
  const lead = visible.find((item) => item.state === "HIGH_OPPORTUNITY") ?? visible.find((item) => item.state === "EMERGING") ?? visible[0] ?? null
  const notes: string[] = []
  if (!items.length) notes.push("Opportunity filter is waiting for live sector rotation data.")
  if (suppressed.length) notes.push(`${suppressed.length} low-quality signals suppressed from the main surface.`)

  return {
    ok: Boolean(items.length),
    generatedAt: new Date().toISOString(),
    lead,
    items: visible,
    suppressed,
    summary: lead
      ? `${lead.narrative} is compressed as ${lead.label.toLowerCase()} with ${lead.confidence} confidence.`
      : "No tradeable opportunity is confirmed yet.",
    notes,
  }
}
