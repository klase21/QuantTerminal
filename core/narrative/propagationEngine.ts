import type { SectorFuturesSnapshot, FuturesIntelligenceResponse } from "@/core/futuresTypes"
import type { SectorRotationSnapshot } from "@/core/marketDataTypes"
import { clamp } from "@/core/shared/metrics"
import type {
  NewsFusionSurface,
  NarrativeHeatItem,
  NarrativeLifecyclePhase,
  NarrativePropagationLink,
  NarrativePropagationNode,
  NarrativePropagationSurface,
} from "./narrativeTypes"

function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) return 0
  const multiplier = 10 ** digits
  return Math.round(value * multiplier) / multiplier
}

function bySector<T extends { sector: string }>(items: T[]) {
  return new Map(items.map((item) => [item.sector, item]))
}

function phaseFromInputs(input: {
  heat: number
  newsBuzz: number
  validationScore: number
  rotation?: SectorRotationSnapshot
  futures?: SectorFuturesSnapshot
}): NarrativeLifecyclePhase {
  const { heat, newsBuzz, validationScore, rotation, futures } = input
  const breadth = rotation?.breadth ?? 0
  const fundingAbs = (futures?.fundingAbs ?? 0) * 10000
  const crowding = futures?.crowdingScore ?? 0

  if ((rotation?.direction === "OUTFLOW" && heat >= 55) || (rotation?.avgPriceChange ?? 0) < -5) return "COLLAPSE"
  if (heat >= 78 && crowding >= 70 && fundingAbs >= 2.5) return "EUPHORIA"
  if (heat >= 70 && breadth < 45) return "EXHAUSTION"
  if (validationScore >= 62 && heat >= 55) return "EXPANSION"
  if (newsBuzz >= 45 || heat >= 42) return "IGNITION"
  return "DORMANT"
}

function buildNodes(args: {
  heatmap: NarrativeHeatItem[]
  sectors: SectorRotationSnapshot[]
  newsFusion?: NewsFusionSurface
  futures?: FuturesIntelligenceResponse | null
}): NarrativePropagationNode[] {
  const sectorMap = bySector(args.sectors)
  const futuresMap = bySector(args.futures?.sectors ?? [])
  const validationMap = new Map((args.newsFusion?.validation ?? []).map((item) => [item.narrative, item]))
  const signalMap = new Map((args.newsFusion?.signals ?? []).map((item) => [item.narrative, item]))

  return args.heatmap.slice(0, 8).map((heatItem) => {
    const rotation = sectorMap.get(heatItem.narrative)
    const futures = futuresMap.get(heatItem.narrative)
    const validation = validationMap.get(heatItem.narrative)
    const signal = signalMap.get(heatItem.narrative)

    const newsBuzz = validation?.newsBuzz ?? signal?.buzz ?? 0
    const validationScore = validation?.validationScore ?? 0
    const leveragePressure = futures?.leveragePressure ?? 0
    const persistence = clamp(
      heatItem.heat * 0.34 +
        (rotation?.breadth ?? 0) * 0.24 +
        validationScore * 0.24 +
        (rotation?.confidence ?? 0) * 0.18
    )
    const velocity = clamp(
      newsBuzz * 0.32 +
        heatItem.heat * 0.24 +
        (rotation?.volumePressure ?? 0) * 0.24 +
        leveragePressure * 0.2
    )
    const acceleration = clamp(
      Math.max(0, velocity - persistence * 0.52) +
        (rotation?.volatility ?? 0) * 0.22 +
        (futures?.crowdingScore ?? 0) * 0.16
    )
    const synchronization = clamp(
      validationScore * 0.32 +
        (args.newsFusion?.regionalBuzz?.length ?? 0) * 8 +
        (rotation?.premiumBoost ?? 0) * 0.2 +
        (futures?.convictionScore ?? 0) * 0.24
    )
    const phase = phaseFromInputs({ heat: heatItem.heat, newsBuzz, validationScore, rotation, futures })
    const stress = clamp(
      (phase === "EUPHORIA" ? 22 : 0) +
        (phase === "EXHAUSTION" ? 18 : 0) +
        (rotation?.volatility ?? 0) * 0.32 +
        (futures?.crowdingScore ?? 0) * 0.28 +
        Math.max(0, 50 - (rotation?.breadth ?? 50)) * 0.28
    )

    return {
      narrative: heatItem.narrative,
      phase,
      velocity: round(velocity),
      acceleration: round(acceleration),
      persistence: round(persistence),
      synchronization: round(synchronization),
      stress: round(stress),
      regions: signal?.regions ?? [],
      sectors: heatItem.sectors,
      summary: buildNodeSummary({ narrative: heatItem.narrative, phase, rotation, futures, newsBuzz, validationScore }),
    }
  })
}

function buildNodeSummary(args: {
  narrative: string
  phase: NarrativeLifecyclePhase
  rotation?: SectorRotationSnapshot
  futures?: SectorFuturesSnapshot
  newsBuzz: number
  validationScore: number
}) {
  const direction = args.rotation?.direction ?? "QUIET"
  const leverage = args.futures?.leverageState ?? "LOW"

  switch (args.phase) {
    case "IGNITION":
      return `${args.narrative} is showing early ignition; news buzz is building before full liquidity confirmation.`
    case "EXPANSION":
      return `${args.narrative} is propagating with ${direction.toLowerCase()} flow and improving validation.`
    case "EUPHORIA":
      return `${args.narrative} is crowded: heat, leverage, and narrative synchronization are elevated.`
    case "EXHAUSTION":
      return `${args.narrative} remains hot, but participation quality is weakening.`
    case "COLLAPSE":
      return `${args.narrative} is losing structure as outflow pressure rises.`
    default:
      return `${args.narrative} is dormant; no durable propagation signal is confirmed.`
  }
}

function buildLinks(nodes: NarrativePropagationNode[], sectors: SectorRotationSnapshot[]): NarrativePropagationLink[] {
  const links: NarrativePropagationLink[] = []
  const sorted = [...nodes].sort((a, b) => b.velocity - a.velocity)
  const top = sorted[0]
  const second = sorted[1]
  const third = sorted[2]

  if (top && second) {
    links.push({
      from: top.narrative,
      to: second.narrative,
      strength: round(clamp((top.velocity + second.synchronization) / 2)),
      reason: "Narrative heat is spilling into adjacent sector pressure.",
    })
  }

  if (top && third && top.phase !== third.phase) {
    links.push({
      from: top.narrative,
      to: third.narrative,
      strength: round(clamp((top.acceleration + third.velocity) / 2)),
      reason: "Lifecycle mismatch creates a cross-current worth monitoring.",
    })
  }

  const outflow = sectors.find((sector) => sector.direction === "OUTFLOW")
  if (top && outflow && outflow.sector !== top.narrative) {
    links.push({
      from: outflow.sector,
      to: top.narrative,
      strength: round(clamp(top.velocity * 0.62 + outflow.volumePressure * 0.38)),
      reason: "Capital rotation pressure suggests flow migration.",
    })
  }

  return links.slice(0, 4)
}

function buildOperatorRead(nodes: NarrativePropagationNode[], links: NarrativePropagationLink[]) {
  const lead = [...nodes].sort((a, b) => b.velocity - a.velocity)[0]
  if (!lead) return "Propagation engine is waiting for live narrative and rotation inputs."

  const phaseText = lead.phase.toLowerCase()
  const linkText = links[0] ? ` Spillover path: ${links[0].from} → ${links[0].to}.` : " No confirmed spillover path yet."
  const risk = lead.stress >= 72
    ? " Stress is elevated; treat follow-through as fragile."
    : lead.persistence >= 68
      ? " Persistence is supportive; monitor for continuation."
      : " Persistence remains unproven; wait for another confirming tick."

  return `${lead.narrative} leads propagation in ${phaseText} phase with velocity ${lead.velocity}. ${linkText}${risk}`
}

function buildLifecycleCounts(nodes: NarrativePropagationNode[]) {
  return nodes.reduce<Record<NarrativeLifecyclePhase, number>>((acc, node) => {
    acc[node.phase] = (acc[node.phase] ?? 0) + 1
    return acc
  }, {
    DORMANT: 0,
    IGNITION: 0,
    EXPANSION: 0,
    EUPHORIA: 0,
    EXHAUSTION: 0,
    COLLAPSE: 0,
  })
}

export function buildNarrativePropagationSurface(args: {
  heatmap: NarrativeHeatItem[]
  sectors: SectorRotationSnapshot[]
  newsFusion?: NewsFusionSurface
  futures?: FuturesIntelligenceResponse | null
}): NarrativePropagationSurface {
  const nodes = buildNodes(args)
  const links = buildLinks(nodes, args.sectors)
  const lead = [...nodes].sort((a, b) => b.velocity - a.velocity)[0]
  const averageVelocity = nodes.length ? nodes.reduce((sum, node) => sum + node.velocity, 0) / nodes.length : 0
  const averageStress = nodes.length ? nodes.reduce((sum, node) => sum + node.stress, 0) / nodes.length : 0

  return {
    ok: nodes.length > 0,
    leadNarrative: lead?.narrative ?? "NONE",
    leadPhase: lead?.phase ?? "DORMANT",
    velocityScore: round(clamp(averageVelocity)),
    stressScore: round(clamp(averageStress)),
    lifecycleCounts: buildLifecycleCounts(nodes),
    nodes,
    links,
    operatorRead: buildOperatorRead(nodes, links),
  }
}
