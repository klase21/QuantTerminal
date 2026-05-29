import type { OperatorPriority } from "@/core/ai-intelligence/aiIntelligenceTypes"
import type { InstitutionalIntelligenceSurface, RankedSignal } from "@/core/institutional-intelligence/institutionalTypes"
import type {
  AIOperatorLiveSurface,
  AutonomousHuntSignal,
  AutonomousSignalHunterSurface,
  HunterClass,
  LiveBriefSeverity,
  LiveOperatorBrief,
  NarrativeUniverseLink,
  NarrativeUniverseNode,
  NarrativeUniverseSurface,
  OrbitBand,
  UniverseNodeType,
  WarRoomIntelligenceSurface,
} from "@/core/war-room-intelligence/warRoomTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function avg(values: number[]) {
  const valid = values.filter(Number.isFinite)
  if (!valid.length) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function priority(score: number, defensive = false): OperatorPriority {
  if (score >= 78) return defensive ? "DEFENSIVE" : "ACTIONABLE"
  if (score >= 48) return "WATCH"
  return "IGNORE"
}

function orbit(score: number): OrbitBand {
  if (score >= 82) return "INNER"
  if (score >= 62) return "MIDDLE"
  if (score >= 34) return "OUTER"
  return "ESCAPE"
}

function severityFromPriority(value: OperatorPriority, score: number): LiveBriefSeverity {
  if (value === "DEFENSIVE" || score >= 82) return "RISK"
  if (value === "ACTIONABLE" || score >= 68) return "ACTION"
  if (value === "WATCH" || score >= 42) return "WATCH"
  return "INFO"
}

function polar(index: number, total: number, band: OrbitBand, heat: number) {
  const bandRadius: Record<OrbitBand, number> = {
    INNER: 30,
    MIDDLE: 43,
    OUTER: 56,
    ESCAPE: 68,
  }
  const angle = ((Math.PI * 2) / Math.max(total, 1)) * index - Math.PI / 2
  const wobble = Math.sin(index * 1.7) * 6
  const radius = bandRadius[band] + wobble
  return {
    x: round(50 + Math.cos(angle) * radius * 0.72),
    y: round(50 + Math.sin(angle) * radius * 0.42),
    z: round(clamp(heat * 0.74 + (band === "INNER" ? 18 : band === "MIDDLE" ? 8 : 0))),
  }
}

function nodeFromSignal(signal: RankedSignal, index: number, total: number): NarrativeUniverseNode {
  const score = clamp(signal.actionability * 0.34 + signal.confidence * 0.28 + signal.persistence * 0.18 + Math.max(0, 100 - signal.decayRisk) * 0.2)
  const band = orbit(score)
  const position = polar(index, total, band, score)
  const defensive = signal.class === "DEFENSIVE" || signal.priority === "DEFENSIVE"
  return {
    id: `signal-${signal.id}`,
    label: signal.label,
    type: defensive ? "RISK" : "SIGNAL",
    orbit: band,
    ...position,
    radius: round(7 + score / 14, 1),
    gravity: round(score),
    heat: round(clamp(signal.score ?? score)),
    pulse: round(clamp(signal.confidence * 0.6 + signal.actionability * 0.4)),
    priority: signal.priority,
    summary: signal.read,
  }
}

function nodeTypeForExposure(side: string): UniverseNodeType {
  if (side === "SHORT_BIAS") return "RISK"
  if (side === "LONG_BIAS") return "SECTOR"
  return "NARRATIVE"
}

function buildUniverse(input: InstitutionalIntelligenceSurface | null): NarrativeUniverseSurface {
  const signals = input?.signalRanking.topSignals ?? []
  const exposures = input?.portfolio.exposures ?? []
  const signalNodes = signals.slice(0, 8).map((signal, index) => nodeFromSignal(signal, index, Math.max(8, signals.length)))
  const exposureNodes: NarrativeUniverseNode[] = exposures.slice(0, 6).map((exposure, index) => {
    const score = clamp(exposure.exposureScore * 0.46 + exposure.narrativeExposure * 0.24 + exposure.betaConcentration * 0.18 + exposure.crowdingExposure * 0.12)
    const band = orbit(score)
    const position = polar(index + signalNodes.length, Math.max(12, signalNodes.length + exposures.length), band, score)
    return {
      id: `sector-${exposure.sector}`,
      label: exposure.sector,
      type: nodeTypeForExposure(exposure.side),
      orbit: band,
      ...position,
      radius: round(8 + score / 16, 1),
      gravity: round(score),
      heat: round(exposure.exposureScore),
      pulse: round(clamp(exposure.crowdingExposure * 0.55 + exposure.fractureSensitivity * 0.45)),
      priority: priority(score, exposure.side === "SHORT_BIAS"),
      summary: exposure.operatorRead,
    }
  })
  const core: NarrativeUniverseNode = {
    id: "core-market",
    label: input?.portfolio.dominantSector ? `${input.portfolio.dominantSector} CORE` : "MARKET CORE",
    type: "CORE",
    orbit: "INNER",
    x: 50,
    y: 50,
    z: 100,
    radius: 16,
    gravity: round(clamp(input?.signalRanking.signalQualityScore ?? 0)),
    heat: round(clamp(input?.portfolio.concentrationRisk ?? 0)),
    pulse: round(clamp(input?.multiTimeframe.consensusScore ?? 0)),
    priority: priority(input?.portfolio.concentrationRisk ?? 0, (input?.portfolio.concentrationRisk ?? 0) >= 72),
    summary: input?.ux.operatorLayoutRead ?? "War room core is waiting for institutional intelligence.",
  }
  const nodes = [core, ...signalNodes, ...exposureNodes]
  const links: NarrativeUniverseLink[] = nodes.slice(1).map((node) => ({
    id: `core-${node.id}`,
    from: core.id,
    to: node.id,
    strength: round(clamp(node.gravity * 0.62 + node.pulse * 0.38)),
    latency: round(clamp(100 - node.z)),
    contagion: round(clamp(node.heat * 0.46 + node.pulse * 0.54)),
    summary: `${node.label} is orbiting the market core with ${round(node.gravity, 0)} gravity and ${round(node.pulse, 0)} pulse.`,
  }))
  const crossLinks = signalNodes.slice(0, 4).flatMap((signalNode, index) => {
    const sectorNode = exposureNodes[index % Math.max(1, exposureNodes.length)]
    if (!sectorNode) return []
    return [{
      id: `${signalNode.id}-${sectorNode.id}`,
      from: signalNode.id,
      to: sectorNode.id,
      strength: round(clamp((signalNode.gravity + sectorNode.gravity) / 2)),
      latency: round(clamp(Math.abs(signalNode.z - sectorNode.z))),
      contagion: round(clamp((signalNode.pulse + sectorNode.pulse) / 2)),
      summary: `${signalNode.label} is transmitting pressure into ${sectorNode.label}.`,
    }]
  })
  const allLinks = [...links, ...crossLinks]
  const leadNode = nodes.slice(1).sort((a, b) => b.gravity - a.gravity)[0] ?? core
  const gravityScore = round(avg(nodes.map((node) => node.gravity)))
  const contagionScore = round(avg(allLinks.map((link) => link.contagion)))
  return {
    ok: nodes.length > 1,
    leadNode,
    nodes,
    links: allLinks,
    gravityScore,
    contagionScore,
    orbitRead: leadNode
      ? `${leadNode.label} is the dominant orbit with ${round(leadNode.gravity, 0)} gravity and ${round(contagionScore, 0)} contagion pressure.`
      : "Narrative universe is waiting for ranked signals.",
  }
}

function buildLiveOperator(input: InstitutionalIntelligenceSurface | null, universe: NarrativeUniverseSurface): AIOperatorLiveSurface {
  const signals = input?.signalRanking.topSignals ?? []
  const topSignals = signals.slice(0, 5)
  const now = new Date().toISOString()
  const briefs: LiveOperatorBrief[] = topSignals.map((signal, index) => {
    const score = clamp(signal.actionability * 0.38 + signal.confidence * 0.24 + signal.persistence * 0.18 + Math.max(0, 100 - signal.falsePositiveRisk) * 0.2)
    const severity = severityFromPriority(signal.priority, score)
    return {
      id: `brief-${signal.id}`,
      timestamp: now,
      severity,
      priority: signal.priority,
      title: signal.label,
      read: signal.read,
      evidence: [
        `actionability ${round(signal.actionability, 0)}`,
        `confidence ${round(signal.confidence, 0)}`,
        `persistence ${round(signal.persistence, 0)}`,
      ],
      ttlSeconds: Math.max(45, 240 - index * 25),
    }
  })
  if (universe.leadNode && briefs.length < 6) {
    briefs.push({
      id: `brief-universe-${universe.leadNode.id}`,
      timestamp: now,
      severity: severityFromPriority(universe.leadNode.priority, universe.leadNode.gravity),
      priority: universe.leadNode.priority,
      title: `Universe lead: ${universe.leadNode.label}`,
      read: universe.orbitRead,
      evidence: [`gravity ${round(universe.leadNode.gravity, 0)}`, `contagion ${round(universe.contagionScore, 0)}`],
      ttlSeconds: 180,
    })
  }
  const urgencyScore = round(clamp(avg(briefs.map((brief) => brief.priority === "DEFENSIVE" ? 88 : brief.priority === "ACTIONABLE" ? 76 : brief.priority === "WATCH" ? 52 : 22))))
  return {
    ok: briefs.length > 0,
    status: briefs.length ? "LIVE" : input ? "WARMING" : "IDLE",
    headline: briefs[0]?.title ?? "AI operator is waiting for signal flow.",
    briefs,
    speechQueue: briefs.slice(0, 4).map((brief) => `${brief.title}. ${brief.read}`),
    urgencyScore,
    operatorRead: briefs.length
      ? `${briefs.length} live briefs queued. Urgency is ${round(urgencyScore, 0)} with ${briefs.filter((brief) => brief.severity === "RISK" || brief.severity === "ACTION").length} high-priority reads.`
      : "Operator live mode has no current brief.",
  }
}

function hunterClass(signal: RankedSignal): HunterClass {
  if (signal.class === "DEFENSIVE" || signal.priority === "DEFENSIVE") return "FRACTURE"
  if (signal.falsePositiveRisk >= 58 && signal.confidence >= 58) return "DIVERGENCE"
  if (signal.persistence >= 70 && signal.actionability >= 64) return "ROTATION"
  if (signal.actionability >= 76) return "OPPORTUNITY"
  return "ANOMALY"
}

function buildHunter(input: InstitutionalIntelligenceSurface | null): AutonomousSignalHunterSurface {
  const signals = input?.signalRanking.topSignals ?? []
  const hunts: AutonomousHuntSignal[] = signals.slice(0, 10).map((signal) => {
    const anomalyScore = clamp(signal.actionability * 0.4 + Math.abs(signal.confidence - signal.decayRisk) * 0.28 + signal.persistence * 0.32)
    const stealthScore = clamp(Math.max(0, signal.confidence - signal.actionability) * 0.42 + Math.max(0, 100 - signal.score) * 0.18 + signal.falsePositiveRisk * 0.4)
    const confirmationScore = clamp(signal.confidence * 0.44 + signal.persistence * 0.34 + Math.max(0, 100 - signal.falsePositiveRisk) * 0.22)
    const score = clamp(anomalyScore * 0.38 + stealthScore * 0.18 + confirmationScore * 0.44)
    const huntPriority = priority(score, signal.class === "DEFENSIVE")
    return {
      id: `hunt-${signal.id}`,
      class: hunterClass(signal),
      sourceSignal: signal,
      label: signal.label,
      target: signal.type,
      score: round(score),
      anomalyScore: round(anomalyScore),
      stealthScore: round(stealthScore),
      confirmationScore: round(confirmationScore),
      priority: huntPriority,
      action: (score >= 80 ? "ESCALATE" : score >= 58 ? "INVESTIGATE" : score >= 38 ? "MONITOR" : "IGNORE") as AutonomousHuntSignal["action"],
      read: `${signal.label} hunt score ${round(score, 0)}: ${signal.read}`,
    }
  }).sort((a, b) => b.score - a.score)
  const huntScore = round(avg(hunts.slice(0, 5).map((hunt) => hunt.score)))
  return {
    ok: hunts.length > 0,
    activeHunts: hunts,
    huntScore,
    topHunt: hunts[0],
    operatorRead: hunts[0]
      ? `${hunts[0].label} is the top autonomous hunt with ${round(hunts[0].score, 0)} score and ${hunts[0].action.toLowerCase()} action.`
      : "Autonomous hunter is waiting for ranked signals.",
  }
}

export function buildWarRoomIntelligenceLayer(input: InstitutionalIntelligenceSurface | null): WarRoomIntelligenceSurface {
  const universe = buildUniverse(input)
  const liveOperator = buildLiveOperator(input, universe)
  const signalHunter = buildHunter(input)
  return {
    ok: Boolean(input?.ok) || universe.ok || signalHunter.ok,
    source: "phase-46-48-war-room-intelligence-layer",
    updatedAt: new Date().toISOString(),
    mode: input ? "derived" : "empty",
    universe,
    liveOperator,
    signalHunter,
    inputs: {
      sectors: input?.inputs.sectors ?? 0,
      rankedSignals: input?.signalRanking.topSignals.length ?? 0,
      sourceMode: input?.mode,
    },
    notes: [
      "Alert OS6 builds a tactical narrative universe from ranked signals and portfolio exposure.",
      "Alert OS7 converts ranked intelligence into live operator briefs and speech queue items.",
      "Alert OS8 runs autonomous signal hunting over actionability, confidence, persistence, and false-positive risk.",
    ],
  }
}
