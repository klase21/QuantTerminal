// ======================================================
// PHASE 2 — LIQUIDATION FEED
// store/useLiquidationStore.ts
// ======================================================

"use client"

import { create } from "zustand"

interface Liquidation {
  side: string
  price: number
  quantity: number
}

interface LiquidationState {
  liquidations: Liquidation[]

  addLiquidation: (
    liquidation: Liquidation
  ) => void
}

export const useLiquidationStore =
  create<LiquidationState>((set) => ({
    liquidations: [],

    addLiquidation: (liquidation) =>
      set((state) => ({
        liquidations: [
          liquidation,
          ...state.liquidations
        ].slice(0, 30),
      })),
  }))