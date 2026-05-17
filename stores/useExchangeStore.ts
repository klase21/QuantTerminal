// ======================================================
// PHASE 3 — MULTI EXCHANGE ENGINE
// store/useExchangeStore.ts
// ======================================================

"use client"

import { create } from "zustand"

interface ExchangeTicker {
  exchange: string
  symbol: string
  price: number
}

interface ExchangeState {
  prices: ExchangeTicker[]

  updatePrice: (
    ticker: ExchangeTicker
  ) => void
}

export const useExchangeStore =
  create<ExchangeState>((set) => ({
    prices: [],

    updatePrice: (ticker) =>
      set((state) => {

        const filtered =
          state.prices.filter(
            (p) =>
              !(
                p.exchange === ticker.exchange &&
                p.symbol === ticker.symbol
              )
          )

        return {
          prices: [
            ...filtered,
            ticker,
          ],
        }
      }),
  }))