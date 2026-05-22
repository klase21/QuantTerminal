import type { SectorAggregate } from "@/lib/rotationEngine"
import type { SectorRotationScore } from "@/types/intelligence"

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0))
}

function normalize(value: number, maxAbs: number) {
  return clamp(50 + (value / maxAbs) * 50)
}

function stateFrom(score: number, momentum: number): SectorRotationScore["state"] {
  if (score >= 72 && momentum >= 55) return "LEADING"
  if (score >= 60 && momentum < 55) return "ACCUMULATING"
  if (score <= 35 && momentum <= 45) return "LAGGING"
  if (score <= 45) return "COOLING"
  return "NEUTRAL"
}

export function scoreSectorRotation(
  sectors: SectorAggregate[] = []
): SectorRotationScore[] {
  const maxVolume = Math.max(
    1,
    ...sectors.map((sector) => Math.abs(sector.volume || 0))
  )

  const maxDominance = Math.max(
    1,
    ...sectors.map((sector) => Math.abs(sector.dominance || 0))
  )

  return sectors
    .map((sector) => {
      const momentumScore = normalize(sector.delta || 0, 12)
      const volumeScore = clamp(((sector.volume || 0) / maxVolume) * 100)
      const breadthScore = clamp(((sector.dominance || 0) / maxDominance) * 100)
      const volatilityScore = clamp(Math.abs(sector.delta || 0) * 8)

      const rotationScore = clamp(
        momentumScore * 0.35 +
          volumeScore * 0.3 +
          breadthScore * 0.2 +
          volatilityScore * 0.15
      )

      const confidence = clamp(
        40 +
          rotationScore * 0.45 +
          Math.min(20, Math.abs(sector.delta || 0) * 1.5)
      )

      return {
        ...sector,
        momentumScore: Number(momentumScore.toFixed(1)),
        volumeScore: Number(volumeScore.toFixed(1)),
        breadthScore: Number(breadthScore.toFixed(1)),
        volatilityScore: Number(volatilityScore.toFixed(1)),
        rotationScore: Number(rotationScore.toFixed(1)),
        confidence: Number(confidence.toFixed(1)),
        state: stateFrom(rotationScore, momentumScore),
      }
    })
    .sort((a, b) => b.rotationScore - a.rotationScore)
}
