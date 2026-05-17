// ======================================================
// stores/useMarketStore.ts
// ======================================================

"use client"

import { create } from "zustand"

import type {
  Ticker,
} from "@/types/market"

export interface OrderBookLevel {

  price: number

  qty: number

}

interface MarketStore {

  // ======================================================
  // MARKET
  // ======================================================

  tickers: Record<
    string,
    Ticker
  >

  selectedSymbol: string

  // ======================================================
  // ORDERBOOK
  // ======================================================

  orderbook: {

    bids: OrderBookLevel[]

    asks: OrderBookLevel[]

  } | null

  // ======================================================
  // ACTIONS
  // ======================================================

  updateTicker: (
    ticker: Ticker
  ) => void

  updateBatch: (
    tickers: Ticker[]
  ) => void

  setSelectedSymbol: (
    symbol: string
  ) => void

  setOrderbook: (
    orderbook: {
      bids: OrderBookLevel[]

      asks: OrderBookLevel[]
    }
  ) => void

}

export const useMarketStore =
  create<MarketStore>(
    (set) => ({

      // ======================================================
      // STATE
      // ======================================================

      tickers: {},

      selectedSymbol:
        "BTCUSDT",

      orderbook: null,

      // ======================================================
      // ACTIONS
      // ======================================================

      updateTicker: (
        ticker
      ) =>

        set((state) => ({

          tickers: {

            ...state.tickers,

            [ticker.symbol]:
              ticker,

          },

        })),

      updateBatch: (
        tickers
      ) =>

        set((state) => {

          const updated = {
            ...state.tickers,
          }

          tickers.forEach(
            (ticker) => {

              updated[
                ticker.symbol
              ] = ticker

            }
          )

          return {
            tickers: updated,
          }

        }),

      setSelectedSymbol: (
        symbol
      ) =>

        set({
          selectedSymbol:
            symbol,
        }),

      setOrderbook: (
        orderbook
      ) =>

        set({
          orderbook,
        }),

    })
  )