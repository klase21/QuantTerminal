"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type MarketMode = "FUTURES" | "SPOT" | "HYBRID"

interface MarketModeState {
  marketMode: MarketMode
  setMarketMode: (mode: MarketMode) => void
}

export const useMarketModeStore = create<MarketModeState>()(
  persist(
    (set) => ({
      marketMode: "FUTURES",
      setMarketMode: (marketMode) => set({ marketMode }),
    }),
    {
      name: "quantterminal-market-mode",
    },
  ),
)
