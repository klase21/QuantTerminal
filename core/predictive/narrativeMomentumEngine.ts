import type { NarrativeMomentumSignal } from "./predictiveTypes"
import { clamp } from "./tacticalMath"

export function deriveNarrativeMomentum(input?: Partial<NarrativeMomentumSignal>): NarrativeMomentumSignal {
  const velocity = clamp(input?.velocity ?? 68)
  const acceleration = clamp(input?.acceleration ?? 54)
  const saturation = clamp(input?.saturation ?? 62)
  const exhaustionRisk = clamp(Math.round(saturation * 0.55 + Math.max(0, 60 - acceleration) * 0.45))

  const phase: NarrativeMomentumSignal["phase"] =
    exhaustionRisk >= 72
      ? "EXHAUSTION"
      : saturation >= 68
      ? "SATURATION"
      : velocity >= 62 && acceleration >= 52
      ? "EXPANSION"
      : "EARLY"

  return {
    narrative: input?.narrative ?? "RWA / AI rotation",
    velocity,
    acceleration,
    saturation,
    exhaustionRisk,
    phase,
  }
}
