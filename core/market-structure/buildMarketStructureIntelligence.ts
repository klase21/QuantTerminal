import type { RealMarketRotationResponse } from "@/core/marketDataTypes"
import type { SectorId } from "@/core/registry/sectorRegistry"
import type {
  MarketStructureSectorSnapshot,
  SectorDerivativesSnapshot,
  SectorParticipationSnapshot,
  NarrativePropagationSnapshot,
  HistoricalMemorySnapshot,
  StructureState,
} from "@/core/market-structure/marketStructureTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function stateFromScore(score: number): StructureState {
  if (score >= 84) return "CROWDED"
  if (score >= 68) return "EXPANDING"
  if (score >= 48) return "BUILDING"
  if (score >= 30) return "COOLING"
  return "QUIET"
}

function indexBySector<T extends { sector: SectorId }>(items: T[]) {
  return new Map(items.map((item) => [item.sector, item]))
}

export function buildMarketStructureIntelligence(input: {
  rotation?: RealMarketRotationResponse | null
  derivatives: SectorDerivativesSnapshot[]
  participation: SectorParticipationSnapshot[]
  narratives: NarrativePropagationSnapshot[]
  historical: HistoricalMemorySnapshot[]
}): MarketStructureSectorSnapshot[] {
  const derivativeMap = indexBySector(input.derivatives)
  const participationMap = indexBySector(input.participation)
  const narrativeMap = indexBySector(input.narratives)
  const historicalMap = indexBySector(input.historical)

  const sectors = input.derivatives.map((derivatives) => {
    const sector = derivatives.sector
    const participation = participationMap.get(sector)!
    const narrative = narrativeMap.get(sector)!
    const historical = historicalMap.get(sector)!
    const marketStructureScore = clamp(
      derivatives.leverageCrowding * 0.26 +
      participation.participationVelocity * 0.31 +
      narrative.convictionScore * 0.29 +
      historical.replayReadiness * 0.14
    )
    const operatorState = stateFromScore(marketStructureScore)
    const risks = []
    if (derivatives.leverageCrowding >= 78) risks.push("Leverage crowding is elevated")
    if (narrative.extremityScore >= 76) risks.push("Narrative extremity is high")
    if (participation.breadthPersistence < 34 && participation.participationVelocity > 58) risks.push("Participation is narrow")
    if (!risks.length) risks.push("No major structural risk detected")

    const operatorRead = operatorState === "CROWDED"
      ? `${sector} is entering a crowded conviction regime. Treat continuation signals carefully.`
      : operatorState === "EXPANDING"
        ? `${sector} is showing expansion across participation, derivatives, and narrative layers.`
        : operatorState === "BUILDING"
          ? `${sector} is building structure but still needs stronger confirmation.`
          : operatorState === "COOLING"
            ? `${sector} is cooling after weaker participation or leverage pressure.`
            : `${sector} remains quiet with limited confirmation.`

    return {
      sector,
      rank: 0,
      marketStructureScore,
      operatorState,
      derivatives,
      participation,
      narrative,
      historical,
      operatorRead,
      risks,
    } satisfies MarketStructureSectorSnapshot
  })

  return sectors
    .sort((a, b) => b.marketStructureScore - a.marketStructureScore)
    .map((sector, index) => ({ ...sector, rank: index + 1 }))
}
