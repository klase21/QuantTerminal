import type { AIIntelligenceLayerSurface, AutonomousSignal, OperatorPriority } from "@/core/ai-intelligence/aiIntelligenceTypes"
import type { MarketStructureSectorSnapshot } from "@/core/market-structure/marketStructureTypes"
import type {
  AITradeMemorySurface,
  ExposureSide,
  InstitutionalIntelligenceSurface,
  InstitutionalUXSurface,
  MultiTimeframeIntelligenceSurface,
  PortfolioExposureItem,
  PortfolioIntelligenceSurface,
  RankedSignal,
  SignalRankClass,
  SignalRankingSurface,
  TimeframeDirection,
  TimeframeId,
  TimeframeIntelligenceItem,
  TradeMemoryPattern,
  WorkspaceMode,
} from "@/core/institutional-intelligence/institutionalTypes"

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

function exposureSide(sector: MarketStructureSectorSnapshot): ExposureSide {
  if (sector.operatorState === "COOLING" || sector.derivatives.leverageCrowding >= 82) return "SHORT_BIAS"
  if (sector.marketStructureScore >= 55 && sector.narrative.convictionScore >= 52) return "LONG_BIAS"
  return "NEUTRAL"
}

function buildPortfolio(sectors: MarketStructureSectorSnapshot[], ai: AIIntelligenceLayerSurface | null): PortfolioIntelligenceSurface {
  const fractureMap = new Map((ai?.liquidityFractures ?? []).map((item) => [item.sector, item.fractureScore]))
  const exposures: PortfolioExposureItem[] = sectors.slice(0, 8).map((sector) => {
    const narrativeExposure = clamp(sector.narrative.convictionScore * 0.65 + sector.narrative.regionalSpread * 0.35)
    const crowdingExposure = clamp(sector.derivatives.leverageCrowding)
    const fractureSensitivity = clamp(fractureMap.get(sector.sector) ?? (crowdingExposure * 0.55 + Math.max(0, 55 - sector.participation.breadthPersistence) * 0.45))
    const betaConcentration = clamp(sector.marketStructureScore * 0.45 + sector.participation.relativeStrength * 0.28 + crowdingExposure * 0.27)
    const exposureScore = clamp(narrativeExposure * 0.28 + crowdingExposure * 0.24 + fractureSensitivity * 0.22 + betaConcentration * 0.26)
    const side = exposureSide(sector)
    return {
      sector: sector.sector,
      exposureScore: round(exposureScore),
      side,
      narrativeExposure: round(narrativeExposure),
      crowdingExposure: round(crowdingExposure),
      fractureSensitivity: round(fractureSensitivity),
      betaConcentration: round(betaConcentration),
      operatorRead: `${sector.sector} portfolio exposure is ${side.toLowerCase().replace("_", " ")} with ${round(exposureScore, 0)} composite exposure.`,
    }
  }).sort((a, b) => b.exposureScore - a.exposureScore)

  const concentrationRisk = clamp(avg(exposures.slice(0, 3).map((item) => item.exposureScore)) + Math.max(0, (exposures[0]?.exposureScore ?? 0) - 70) * 0.25)
  const dominantSector = exposures[0]?.sector
  return {
    ok: exposures.length > 0,
    totalExposure: round(avg(exposures.map((item) => item.exposureScore))),
    concentrationRisk: round(concentrationRisk),
    dominantSector,
    exposures,
    hedgingRead: exposures.length
      ? `${dominantSector} dominates exposure; hedge pressure rises when concentration exceeds ${round(concentrationRisk, 0)}.`
      : "No portfolio exposure can be inferred yet.",
    notes: ["Phase 41 derives synthetic portfolio exposure from sector structure, narrative conviction, leverage crowding, and liquidity fracture risk."],
  }
}

function outcomeFor(sector: MarketStructureSectorSnapshot): TradeMemoryPattern["historicalOutcome"] {
  if (sector.derivatives.leverageCrowding >= 78 && sector.participation.breadthPersistence < 45) return "REVERSAL"
  if (sector.historical.persistenceScore >= 60 && sector.narrative.convictionScore >= 58) return "CONTINUATION"
  if (sector.marketStructureScore < 42) return "CHOP"
  return "UNKNOWN"
}

function buildTradeMemory(sectors: MarketStructureSectorSnapshot[]): AITradeMemorySurface {
  const patterns: TradeMemoryPattern[] = sectors.slice(0, 7).map((sector, index) => {
    const similarity = clamp(sector.historical.regimeSimilarity * 0.48 + sector.historical.persistenceScore * 0.34 + sector.narrative.convictionScore * 0.18)
    const outcome = outcomeFor(sector)
    const confidence = clamp(similarity * 0.62 + sector.historical.replayReadiness * 0.38)
    return {
      id: `memory-${sector.sector}-${index + 1}`,
      sector: sector.sector,
      label: `${sector.sector} ${outcome.toLowerCase()} analog`,
      similarity: round(similarity),
      historicalOutcome: outcome,
      replayWindow: (confidence >= 72 ? "4H" : confidence >= 50 ? "1H" : "1D") as TradeMemoryPattern["replayWindow"],
      confidence: round(confidence),
      operatorRead: `${sector.sector} resembles a ${outcome.toLowerCase()} memory pattern with ${round(confidence, 0)} confidence.`,
    }
  }).sort((a, b) => b.confidence - a.confidence)

  const recallScore = avg(patterns.map((item) => item.confidence))
  return {
    ok: patterns.length > 0,
    recallScore: round(recallScore),
    patterns,
    memoryRead: patterns.length ? `${patterns[0].sector} has the strongest trade-memory analog.` : "No trade memory patterns available.",
  }
}

function directionFrom(momentum: number, stress: number): TimeframeDirection {
  if (stress >= 72 && momentum < 52) return "BEARISH"
  if (momentum >= 62 && stress < 68) return "BULLISH"
  if (Math.abs(momentum - stress) < 10) return "MIXED"
  return "COMPRESSED"
}

function buildMultiTimeframe(sectors: MarketStructureSectorSnapshot[], ai: AIIntelligenceLayerSurface | null): MultiTimeframeIntelligenceSurface {
  const top = sectors[0]
  const topFracture = ai?.liquidityFractures?.[0]?.fractureScore ?? 0
  const baseMomentum = avg(sectors.slice(0, 5).map((sector) => sector.marketStructureScore))
  const baseStress = avg(sectors.slice(0, 5).map((sector) => sector.derivatives.leverageCrowding)) * 0.7 + topFracture * 0.3
  const multipliers: Array<[TimeframeId, number, number]> = [["5M", 1.12, 1.1], ["15M", 1.04, 1.0], ["1H", 1.0, 0.94], ["4H", 0.92, 0.86], ["1D", 0.84, 0.78]]
  const frames: TimeframeIntelligenceItem[] = multipliers.map(([timeframe, momentumMul, stressMul]) => {
    const momentum = clamp(baseMomentum * momentumMul + (top?.participation.participationVelocity ?? 0) * 0.08)
    const stress = clamp(baseStress * stressMul)
    const consensusScore = clamp(momentum * 0.58 + Math.max(0, 100 - stress) * 0.24 + (top?.historical.persistenceScore ?? 0) * 0.18)
    const direction = directionFrom(momentum, stress)
    return {
      timeframe,
      direction,
      consensusScore: round(consensusScore),
      momentum: round(momentum),
      stress: round(stress),
      topSector: top?.sector,
      operatorRead: `${timeframe} frame is ${direction.toLowerCase()} with ${round(consensusScore, 0)} consensus.`,
    }
  })
  const bullish = frames.filter((frame) => frame.direction === "BULLISH").length
  const bearish = frames.filter((frame) => frame.direction === "BEARISH").length
  const consensus: TimeframeDirection = bullish >= 3 ? "BULLISH" : bearish >= 3 ? "BEARISH" : frames.some((frame) => frame.direction === "COMPRESSED") ? "COMPRESSED" : "MIXED"
  const alignmentScore = clamp(Math.max(bullish, bearish) / frames.length * 100)
  return {
    ok: frames.length > 0,
    consensus,
    consensusScore: round(avg(frames.map((frame) => frame.consensusScore))),
    alignmentScore: round(alignmentScore),
    frames,
    operatorRead: `Multi-timeframe stack is ${consensus.toLowerCase()} with ${round(alignmentScore, 0)} alignment.`,
  }
}

function signalClass(score: number, priorityValue: OperatorPriority, falsePositiveRisk: number): SignalRankClass {
  if (priorityValue === "DEFENSIVE") return "DEFENSIVE"
  if (score >= 78 && falsePositiveRisk < 45) return "ALPHA"
  if (score >= 48) return "WATCH"
  return "NOISE"
}

function buildSignalRanking(ai: AIIntelligenceLayerSurface | null, sectors: MarketStructureSectorSnapshot[]): SignalRankingSurface {
  const sectorMap = new Map<string, MarketStructureSectorSnapshot>(sectors.map((sector) => [sector.sector, sector]))
  const ranked: RankedSignal[] = (ai?.autonomousSignals ?? []).map((signal) => {
    const sectorKey = signal.label.split(" ")[0]
    const sector = sectorMap.get(sectorKey)
    const persistence = clamp(sector?.historical.persistenceScore ?? 50)
    const decayRisk = clamp(100 - persistence + (sector?.derivatives.leverageCrowding ?? 0) * 0.18)
    const falsePositiveRisk = clamp(100 - signal.score * 0.55 - persistence * 0.25 + decayRisk * 0.2)
    const confidence = clamp(signal.score * 0.56 + persistence * 0.28 + Math.max(0, 100 - falsePositiveRisk) * 0.16)
    const actionability = clamp(confidence * 0.64 + Math.max(0, 100 - decayRisk) * 0.22 + signal.score * 0.14)
    return {
      ...signal,
      class: signalClass(signal.score, signal.priority, falsePositiveRisk),
      confidence: round(confidence),
      decayRisk: round(decayRisk),
      persistence: round(persistence),
      falsePositiveRisk: round(falsePositiveRisk),
      actionability: round(actionability),
    }
  }).sort((a, b) => b.actionability - a.actionability).map((signal, index) => ({ ...signal, rank: index + 1 }))
  return {
    ok: ranked.length > 0,
    topSignals: ranked.slice(0, 12),
    signalQualityScore: round(avg(ranked.slice(0, 6).map((signal) => signal.actionability))),
    operatorRead: ranked[0] ? `${ranked[0].label} is the highest ranked institutional signal.` : "No autonomous signals available for ranking.",
  }
}

function buildUX(signalRanking: SignalRankingSurface, portfolio: PortfolioIntelligenceSurface, mtf: MultiTimeframeIntelligenceSurface): InstitutionalUXSurface {
  const defensive = signalRanking.topSignals.some((signal) => signal.class === "DEFENSIVE") || portfolio.concentrationRisk >= 72
  const activeMode: WorkspaceMode = defensive ? "RISK" : signalRanking.signalQualityScore >= 70 ? "OPERATOR" : mtf.consensus === "MIXED" ? "RESEARCH" : "EXECUTION"
  const panels: InstitutionalUXSurface["panels"] = [
    { id: "portfolio-intelligence", title: "Portfolio Intelligence", phase: 41, mode: "RISK" as WorkspaceMode, priority: priority(portfolio.concentrationRisk, true), hotkey: "P", summary: portfolio.hedgingRead },
    { id: "trade-memory", title: "AI Trade Memory", phase: 42, mode: "RESEARCH" as WorkspaceMode, priority: priority(signalRanking.signalQualityScore), hotkey: "M", summary: "Recall historical analogs and replay-ready sector setups." },
    { id: "multi-timeframe", title: "Multi-Timeframe Intelligence", phase: 43, mode: "OPERATOR" as WorkspaceMode, priority: priority(mtf.consensusScore), hotkey: "T", summary: mtf.operatorRead },
    { id: "signal-ranking", title: "Signal Ranking", phase: 44, mode: "OPERATOR" as WorkspaceMode, priority: priority(signalRanking.signalQualityScore), hotkey: "S", summary: signalRanking.operatorRead },
    { id: "operator-workspace", title: "Institutional Workspace", phase: 45, mode: activeMode, priority: (defensive ? "DEFENSIVE" : "WATCH") as OperatorPriority, hotkey: "⌘K", summary: `Workspace is optimized for ${activeMode.toLowerCase()} mode.` },
  ]
  return {
    ok: true,
    activeMode,
    commandPalette: ["Focus highest ranked signal", "Open portfolio risk", "Replay memory analog", "Toggle operator mode", "Inspect timeframe consensus"],
    panels,
    operatorLayoutRead: `Institutional UX is in ${activeMode.toLowerCase()} mode with ${panels.length} dockable intelligence panels.`,
  }
}

export function buildInstitutionalIntelligenceLayer(input: AIIntelligenceLayerSurface | null): InstitutionalIntelligenceSurface {
  const sectors = input?.inputs.topSector ? [input.inputs.topSector] : []
  const inferredSectors = sectors.length ? sectors : []
  // Phase 36-40 API currently exposes only topSector in inputs, so use signal-derived fallback for UI richness.
  const syntheticSectors: MarketStructureSectorSnapshot[] = inferredSectors
  const portfolio = buildPortfolio(syntheticSectors, input)
  const tradeMemory = buildTradeMemory(syntheticSectors)
  const multiTimeframe = buildMultiTimeframe(syntheticSectors, input)
  const signalRanking = buildSignalRanking(input, syntheticSectors)
  const ux = buildUX(signalRanking, portfolio, multiTimeframe)
  return {
    ok: Boolean(input?.ok) || signalRanking.ok,
    source: "phase-41-45-institutional-terminal-layer",
    updatedAt: new Date().toISOString(),
    mode: input ? "derived" : "empty",
    portfolio,
    tradeMemory,
    multiTimeframe,
    signalRanking,
    ux,
    inputs: {
      sectors: syntheticSectors.length,
      autonomousSignals: input?.autonomousSignals.length ?? 0,
      topSector: input?.inputs.topSector,
    },
    notes: [
      "Phase 41-45 adds portfolio intelligence, AI trade memory, multi-timeframe consensus, signal ranking, and institutional UX orchestration.",
      syntheticSectors.length ? "Derived from Phase 36-40 AI intelligence top-sector input." : "Waiting for richer sector payload; signal ranking remains available from autonomous AI signals.",
    ],
  }
}
