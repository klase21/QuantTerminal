import { SECTOR_REGISTRY } from "@/core/registry/sectorRegistry"
import type { HistoricalMemorySnapshot, NarrativePropagationSnapshot, SectorParticipationSnapshot } from "@/core/market-structure/marketStructureTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function buildHistoricalMemory(
  participation: SectorParticipationSnapshot[],
  narratives: NarrativePropagationSnapshot[]
): HistoricalMemorySnapshot[] {
  const participationMap = new Map(participation.map((item) => [item.sector, item]))
  const narrativeMap = new Map(narratives.map((item) => [item.sector, item]))

  return SECTOR_REGISTRY.map((sector) => {
    const part = participationMap.get(sector.id)
    const narrative = narrativeMap.get(sector.id)
    const persistenceScore = clamp((part?.breadthPersistence ?? 0) * 0.45 + (narrative?.narrativeVelocity ?? 0) * 0.55)
    const regimeSimilarity = clamp((narrative?.extremityScore ?? 0) * 0.58 + (part?.relativeStrength ?? 0) * 0.42)
    const replayReadiness = clamp(persistenceScore * 0.52 + regimeSimilarity * 0.48)
    const memoryState = replayReadiness >= 70 ? "FRESH" : replayReadiness >= 38 ? "BUILDING" : "THIN"
    return {
      sector: sector.id,
      persistenceScore,
      regimeSimilarity,
      replayReadiness,
      memoryState,
      events: [
        `${sector.label} persistence ${persistenceScore.toFixed(2)}`,
        `${sector.label} regime similarity ${regimeSimilarity.toFixed(2)}`,
      ],
    }
  })
}
