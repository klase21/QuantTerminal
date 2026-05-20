
import { create } from "zustand"
import { aggregateSectorData, SectorAggregate } from "@/lib/rotationEngine"

type RotationState = {
  sectors: SectorAggregate[]
  update: (frames: any[]) => void
}

export const useRotationStore = create<RotationState>((set) => ({
  sectors: [],
  update: (frames) =>
    set({
      sectors: aggregateSectorData(frames),
    }),
}))
