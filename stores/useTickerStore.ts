// ======================================================
// stores/useTickerStore.ts
// ======================================================

import { create }
  from "zustand"

export interface TickerItem {

  symbol: string

  price: number

  change24h: number

  volume24h: number

}

interface TickerStore {

  tickers: TickerItem[]

  setTickers:
    (tickers: TickerItem[]) => void

  updateTicker:
    (ticker: TickerItem) => void

}

export const useTickerStore =
  create<TickerStore>((set) => ({

    tickers: [],

    setTickers: (tickers) =>

      set({ tickers }),

    updateTicker: (ticker) =>

      set((state) => {

        const exists =
          state.tickers.find(
            (t) =>
              t.symbol ===
              ticker.symbol
          )

        if (!exists) {

          return {

            tickers: [
              ...state.tickers,
              ticker,
            ],

          }

        }

        return {

          tickers:
            state.tickers.map((t) =>

              t.symbol ===
              ticker.symbol
                ? ticker
                : t

            ),

        }

      }),

  }))