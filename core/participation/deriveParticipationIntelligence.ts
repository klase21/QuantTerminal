import { SECTOR_REGISTRY } from "@/core/registry/sectorRegistry"
import type { RealMarketRotationResponse, SectorRotationSnapshot } from "@/core/marketDataTypes"
import type { SectorParticipationSnapshot, StructureState } from "@/core/market-structure/marketStructureTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function stateFromParticipation(score: number): StructureState {
  if (score >= 82) return "CROWDED"
  if (score >= 66) return "EXPANDING"
  if (score >= 46) return "BUILDING"
  if (score >= 28) return "COOLING"
  return "QUIET"
}

function bySector(rotation?: RealMarketRotationResponse | null) {
  return new Map((rotation?.sectors ?? []).map((sector) => [sector.sector, sector]))
}

export function deriveParticipationIntelligence(rotation?: RealMarketRotationResponse | null): SectorParticipationSnapshot[] {
  const sectorMap = bySector(rotation)
  const topScore = Math.max(1, ...(rotation?.sectors ?? []).map((sector) => sector.rotationScore))

  return SECTOR_REGISTRY.map((definition) => {
    const sector = sectorMap.get(definition.id) as SectorRotationSnapshot | undefined
    const returnScore = clamp(((sector?.avgPriceChange ?? 0) + 10) * 5)
    const volumeScore = clamp(sector?.volumePressure ?? 0)
    const breadthPersistence = clamp((sector?.breadth ?? 0) * 0.85 + (sector?.positiveCount ?? 0) * 2)
    const relativeStrength = clamp(((sector?.rotationScore ?? 0) / topScore) * 100)
    const krRetailHeat = clamp((sector?.premiumBoost ?? 0) * 0.8 + (sector?.volumeShare ?? 0) * 1.4)
    const participationVelocity = clamp(
      returnScore * 0.22 +
      volumeScore * 0.28 +
      breadthPersistence * 0.24 +
      relativeStrength * 0.18 +
      krRetailHeat * 0.08
    )
    const state = stateFromParticipation(participationVelocity)

    return {
      sector: definition.id,
      returnScore,
      volumeScore,
      breadthPersistence,
      relativeStrength,
      krRetailHeat,
      participationVelocity,
      state,
      evidence: sector
        ? [
            `${sector.positiveCount}/${sector.assetCount} assets positive`,
            `${sector.volumeShare.toFixed(2)}% sector volume share`,
            `${sector.avgPriceChange.toFixed(2)}% average return`,
          ]
        : ["No live mapped assets yet", "Waiting for sector rotation feed"],
    }
  })
}
