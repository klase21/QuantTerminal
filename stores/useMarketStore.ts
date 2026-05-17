"use client"

import { create } from "zustand"
import type { Ticker } from "@/types/market"

export interface OrderBookLevel {

  price: number

  quantity: number

}

export interface OrderBook {

  bids: OrderBookLevel[]

  asks: OrderBookLevel[]

}

interface MarketStore {

  // ======================================================
  // MARKET
  // ======================================================

  tickers:
    Record<string, Ticker>

  selectedSymbol: string

  orderbook: OrderBook | null

  // ======================================================
  // ACTIONS
  // ======================================================

  setSelectedSymbol:
    (symbol: string) => void

  updateTicker:
    (ticker: Ticker) => void

  updateBatch:
    (tickers: Ticker[]) => void

  setOrderbook:
    (orderbook: OrderBook) => void

}

export const useMarketStore =
  create<MarketStore>((set) => ({

    // ======================================================
    // INITIAL STATE
    // ======================================================

    tickers: {},

    selectedSymbol: "BTCUSDT",

    orderbook: null,

    // ======================================================
    // ACTIONS
    // ======================================================

    setSelectedSymbol:
      (symbol) =>

        set({
          selectedSymbol: symbol,
        }),

    updateTicker:
      (ticker) =>

        set((state) => ({

          tickers: {

            ...state.tickers,

            [ticker.symbol]:
              ticker,

          },

        })),

    updateBatch:
      (tickers) =>

        set((state) => {

          const merged = {
            ...state.tickers,
          }

          tickers.forEach(
            (ticker) => {

              merged[
                ticker.symbol
              ] = ticker

            }
          )

          return {
            tickers: merged,
          }

        }),

    setOrderbook:
      (orderbook) =>

        set({
          orderbook,
        }),

  }))