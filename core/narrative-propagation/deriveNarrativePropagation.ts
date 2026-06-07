import { SECTOR_REGISTRY } from "@/core/registry/sectorRegistry"
import type { SectorParticipationSnapshot } from "@/core/market-structure/marketStructureTypes"
import type { SectorDerivativesSnapshot, NarrativePropagationSnapshot, ConvictionState } from "@/core/market-structure/marketStructureTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function conviction(score: number): ConvictionState {
  if (score >= 82) return "EXTREME"
  if (score >= 64) return "HIGH"
  if (score >= 42) return "MEDIUM"
  return "LOW"
}

export function deriveNarrativePropagation(
  participation: SectorParticipationSnapshot[],
  derivatives: SectorDerivativesSnapshot[]
): NarrativePropagationSnapshot[] {
  const participationMap = new Map(participation.map((item) => [item.sector, item]))
  const derivativesMap = new Map(derivatives.map((item) => [item.sector, item]))

  return SECTOR_REGISTRY.map((sector) => {
    const part = participationMap.get(sector.id)
    const deriv = derivativesMap.get(sector.id)
    const narrativeVelocity = clamp((part?.participationVelocity ?? 0) * 0.62 + (part?.relativeStrength ?? 0) * 0.38)
    const regionalSpread = clamp((part?.krRetailHeat ?? 0) * 0.68 + (part?.breadthPersistence ?? 0) * 0.32)
    const extremityScore = clamp((deriv?.leverageCrowding ?? 0) * 0.52 + narrativeVelocity * 0.48)
    const convictionScore = clamp(narrativeVelocity * 0.38 + regionalSpread * 0.24 + extremityScore * 0.38)
    const propagationState = conviction(convictionScore)
    const label = sector.label
    const summary = propagationState === "EXTREME"
      ? `${label} narrative is crowded; liquidity and leverage are moving together.`
      : propagationState === "HIGH"
        ? `${label} narrative has strong propagation with improving participation.`
        : propagationState === "MEDIUM"
          ? `${label} narrative is building but still needs broader confirmation.`
          : `${label} narrative remains quiet or fragmented.`

    return {
      sector: sector.id,
      narrativeVelocity,
      regionalSpread,
      convictionScore,
      extremityScore,
      propagationState,
      summary,
      evidence: [
        `Narrative velocity ${narrativeVelocity.toFixed(2)}`,
        `Regional spread ${regionalSpread.toFixed(2)}`,
        `Extremity ${extremityScore.toFixed(2)}`,
      ],
    }
  })
}
