import type { NarrativeHeatItem, NarrativeSurface } from "@/core/narrative/narrativeTypes"

export type EventChainSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface EventChainNode {
  id: string
  label: string
  layer: "MACRO" | "BTC" | "NARRATIVE" | "REGIONAL" | "DERIVATIVES" | "RISK"
  score: number
  severity: EventChainSeverity
  read: string
}

export interface EventChainEdge {
  from: string
  to: string
  strength: number
  read: string
}

export interface EventChainReaction {
  id: string
  title: string
  severity: EventChainSeverity
  confidence: number
  trigger: string
  consequence: string
  operatorRead: string
  nodes: EventChainNode[]
  edges: EventChainEdge[]
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function severity(score: number): EventChainSeverity {
  if (score >= 82) return "CRITICAL"
  if (score >= 68) return "HIGH"
  if (score >= 45) return "MEDIUM"
  return "LOW"
}

function directionRead(item?: NarrativeHeatItem) {
  if (!item) return "Market structure is waiting for a clean lead narrative."
  if (item.direction === "INFLOW") return `${item.narrative} is attracting capital and acting as the market gravity source.`
  if (item.direction === "OUTFLOW") return `${item.narrative} is losing sponsorship and can transmit defensive pressure.`
  if (item.direction === "CHURN") return `${item.narrative} is active but unstable, with rotation risk rising.`
  return `${item.narrative} is active but direction remains mixed.`
}

export function buildEventChainReaction(narrative: NarrativeSurface): EventChainReaction {
  const lead = narrative.heatmap[0]
  const second = narrative.heatmap[1]
  const third = narrative.heatmap[2]
  const heat = numeric(lead?.heat)
  const secondHeat = numeric(second?.heat)
  const stress = numeric(narrative.liquidityStress?.stressScore)
  const crowding = numeric(narrative.liquidityStress?.crowdingRisk)
  const liquidityQuality = numeric(narrative.liquidityStress?.liquidityQuality)
  const reflexivity = numeric(narrative.crossMarketReflexivity?.reflexivityScore)
  const instability = numeric(narrative.crossMarketReflexivity?.instabilityScore)
  const velocity = numeric(narrative.propagation?.velocityScore)
  const propagationStress = numeric(narrative.propagation?.stressScore)
  const regionalStatus = narrative.regionalDivergence.status
  const phase = String(narrative.propagation?.leadPhase ?? "DORMANT")

  const chainScore = clamp(
    heat * 0.26 +
    velocity * 0.18 +
    reflexivity * 0.16 +
    Math.max(stress, propagationStress) * 0.16 +
    crowding * 0.12 +
    instability * 0.12,
  )

  const topNarrative = lead?.narrative ?? "MARKET"
  const title = `${topNarrative} chain reaction ${chainScore >= 68 ? "active" : "watch"}`
  const regionalRead = regionalStatus === "KOREA_STRONG"
    ? "Korean flow is leading global validation."
    : regionalStatus === "GLOBAL_STRONG"
      ? "Global flow is leading Korean confirmation."
      : regionalStatus === "MIXED"
        ? "Regional confirmation is fragmented."
        : "Regional validation is neutral."

  const nodes: EventChainNode[] = [
    {
      id: "macro",
      label: narrative.tone.replace(/_/g, " "),
      layer: "MACRO",
      score: clamp(reflexivity || heat * 0.6),
      severity: severity(reflexivity || heat * 0.6),
      read: `Macro/reflexivity backdrop is ${narrative.tone.replace(/_/g, " ").toLowerCase()}.`,
    },
    {
      id: "btc",
      label: "BTC anchor",
      layer: "BTC",
      score: clamp(secondHeat || heat * 0.74),
      severity: severity(secondHeat || heat * 0.74),
      read: second ? `${second.narrative} is the secondary pressure source.` : "BTC remains the default market anchor.",
    },
    {
      id: "narrative",
      label: topNarrative,
      layer: "NARRATIVE",
      score: heat,
      severity: severity(heat),
      read: directionRead(lead),
    },
    {
      id: "regional",
      label: regionalStatus.replace(/_/g, " "),
      layer: "REGIONAL",
      score: regionalStatus === "MIXED" ? 52 : regionalStatus === "NONE" ? 28 : 72,
      severity: severity(regionalStatus === "MIXED" ? 52 : regionalStatus === "NONE" ? 28 : 72),
      read: regionalRead,
    },
    {
      id: "derivatives",
      label: crowding >= 60 ? "crowding" : "leverage",
      layer: "DERIVATIVES",
      score: clamp(Math.max(crowding, velocity)),
      severity: severity(Math.max(crowding, velocity)),
      read: `Velocity ${Math.round(velocity)} / crowding ${Math.round(crowding)} are shaping derivative pressure.`,
    },
    {
      id: "risk",
      label: stress >= 60 ? "fracture risk" : "risk monitor",
      layer: "RISK",
      score: clamp(Math.max(stress, instability, 100 - liquidityQuality)),
      severity: severity(Math.max(stress, instability, 100 - liquidityQuality)),
      read: `Liquidity stress ${Math.round(stress)} and instability ${Math.round(instability)} define downside transmission risk.`,
    },
  ]

  const edges: EventChainEdge[] = [
    { from: "macro", to: "btc", strength: clamp(reflexivity * 0.55 + heat * 0.25), read: "Macro regime sets the initial beta boundary." },
    { from: "btc", to: "narrative", strength: clamp(secondHeat * 0.45 + heat * 0.45), read: "BTC anchor pressure spills into sector narrative selection." },
    { from: "narrative", to: "regional", strength: clamp(heat * 0.55 + velocity * 0.35), read: "Lead narrative looks for regional confirmation." },
    { from: "regional", to: "derivatives", strength: clamp(velocity * 0.45 + crowding * 0.42), read: "Validated narratives attract leverage and crowding." },
    { from: "derivatives", to: "risk", strength: clamp(Math.max(crowding, stress) * 0.62 + instability * 0.28), read: "Crowding converts expansion into liquidation or fracture risk." },
  ]

  return {
    id: `${topNarrative}-${phase}-${Math.round(chainScore)}`,
    title,
    severity: severity(chainScore),
    confidence: clamp(chainScore),
    trigger: lead ? `${lead.narrative} ${lead.direction.toLowerCase()} with ${phase.toLowerCase()} lifecycle` : "No clear trigger yet",
    consequence: third ? `${third.narrative} may become the next spillover target.` : "Market is waiting for a second-order target.",
    operatorRead: `${topNarrative} is the current chain driver. Watch ${regionalStatus.replace(/_/g, " ").toLowerCase()} validation and derivative crowding for the next move.`,
    nodes,
    edges,
  }
}
