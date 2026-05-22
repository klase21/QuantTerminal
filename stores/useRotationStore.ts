import { create } from "zustand"
import { aggregateSectorData, SectorAggregate } from "@/lib/rotationEngine"
import { scoreSectorRotation } from "@/core/rotation/scoreSectorRotation"
import type { SectorRotationScore } from "@/types/intelligence"

export type RotationState = {
  /** Raw aggregate output used by legacy rotation panels. */
  sectors: SectorAggregate[]

  /** Interpreted/scored sector output used by regime/alert intelligence. */
  scoredSectors: SectorRotationScore[]

  update: (frames: any[]) => void
}

export const useRotationStore = create<RotationState>((set) => ({
  sectors: [],
  scoredSectors: [],
  update: (frames) => {
    const sectors = aggregateSectorData(frames)
    const scoredSectors = scoreSectorRotation(sectors)

    set({
      sectors,
      scoredSectors,
    })
  },
}))
