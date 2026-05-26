"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { MarketMode } from "@/stores/useMarketModeStore"

export type ExecutionStyle = "SCALP" | "SWING" | "RISK_OFF" | "AI_ROTATION"
export type TacticalState =
  | "RISK_ON_EXPANSION"
  | "PERP_EUPHORIA"
  | "FRAGILE_BREAKOUT"
  | "ABSORPTION"
  | "DEFENSIVE_ROTATION"
  | "MIXED"

export type TacticalTimeframe = "1m" | "3m" | "5m" | "15m" | "1h" | "4h" | "1d"

export interface GlobalTacticalContextState {
  primarySymbol: string
  timeframe: TacticalTimeframe
  marketMode: MarketMode
  executionStyle: ExecutionStyle
  tacticalState: TacticalState
  attentionMode: boolean
  setPrimarySymbol: (symbol: string) => void
  setTimeframe: (timeframe: TacticalTimeframe) => void
  setMarketMode: (mode: MarketMode) => void
  setExecutionStyle: (style: ExecutionStyle) => void
  setTacticalState: (state: TacticalState) => void
  setAttentionMode: (enabled: boolean) => void
}

export const tacticalSymbols = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "TRXUSDT",
  "HYPEUSDT",
]

function normalizeSymbol(symbol: string) {
  return (symbol || "BTCUSDT").replace("/", "").toUpperCase()
}

export const useGlobalTacticalContextStore = create<GlobalTacticalContextState>()(
  persist(
    (set) => ({
      primarySymbol: "BTCUSDT",
      timeframe: "5m",
      marketMode: "FUTURES",
      executionStyle: "SCALP",
      tacticalState: "MIXED",
      attentionMode: true,

      setPrimarySymbol: (primarySymbol) =>
        set({
          primarySymbol: normalizeSymbol(primarySymbol),
        }),

      setTimeframe: (timeframe) => set({ timeframe }),
      setMarketMode: (marketMode) => set({ marketMode }),
      setExecutionStyle: (executionStyle) => set({ executionStyle }),
      setTacticalState: (tacticalState) => set({ tacticalState }),
      setAttentionMode: (attentionMode) => set({ attentionMode }),
    }),
    {
      name: "quantterminal-global-tactical-context",
      partialize: (state) => ({
        primarySymbol: state.primarySymbol,
        timeframe: state.timeframe,
        marketMode: state.marketMode,
        executionStyle: state.executionStyle,
        tacticalState: state.tacticalState,
        attentionMode: state.attentionMode,
      }),
    },
  ),
)
