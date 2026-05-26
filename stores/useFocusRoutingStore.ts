"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type FocusScope =
  | "GLOBAL"
  | "FLOW"
  | "CHARTS"
  | "ORDERBOOK"
  | "ALERTS"

export interface FocusRoutingState {
  activeSymbol: string
  previousSymbol: string
  focusScope: FocusScope

  setActiveSymbol: (symbol: string) => void
  setFocusScope: (scope: FocusScope) => void
}

export const useFocusRoutingStore = create<FocusRoutingState>()(
  persist(
    (set, get) => ({
      activeSymbol: "BTCUSDT",
      previousSymbol: "BTCUSDT",
      focusScope: "GLOBAL",

      setActiveSymbol: (activeSymbol) =>
        set({
          previousSymbol: get().activeSymbol,
          activeSymbol,
        }),

      setFocusScope: (focusScope) =>
        set({
          focusScope,
        }),
    }),
    {
      name: "quantterminal-focus-routing",
    },
  ),
)
