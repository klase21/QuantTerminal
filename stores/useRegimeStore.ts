"use client"

import { create } from "zustand"
import { calculateMarketRegime } from "@/core/regime/calculateMarketRegime"
import type {
  MarketRegime,
  SectorRotationScore,
  UpbitDataLabSnapshot,
} from "@/types/intelligence"

type RegimeStore = {
  snapshot?: UpbitDataLabSnapshot
  regime: MarketRegime
  sectors: SectorRotationScore[]
  updateSnapshot: (snapshot: UpbitDataLabSnapshot) => void
  updateSectors: (sectors: SectorRotationScore[]) => void
  recalculate: () => void
}

export const useRegimeStore = create<RegimeStore>((set, get) => ({
  snapshot: undefined,
  sectors: [],
  regime: calculateMarketRegime(),

  updateSnapshot: (snapshot) =>
    set((state) => ({
      snapshot,
      regime: calculateMarketRegime({
        snapshot,
        sectorScores: state.sectors,
      }),
    })),

  updateSectors: (sectors) =>
    set((state) => ({
      sectors,
      regime: calculateMarketRegime({
        snapshot: state.snapshot,
        sectorScores: sectors,
      }),
    })),

  recalculate: () => {
    const state = get()
    set({
      regime: calculateMarketRegime({
        snapshot: state.snapshot,
        sectorScores: state.sectors,
      }),
    })
  },
}))
