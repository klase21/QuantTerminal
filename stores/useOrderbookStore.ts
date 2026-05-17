"use client"

import { create } from "zustand"

// ======================================================
// TYPES
// ======================================================

export interface OrderBookLevel {
  price: number
  size: number
}

// ======================================================
// STORE
// ======================================================

interface OrderbookState {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]

  spread: number
  imbalance: number

  setOrderbook: (
    bids: OrderBookLevel[],
    asks: OrderBookLevel[]
  ) => void
}

// ======================================================
// STORE
// ======================================================

const useOrderbookStore =
  create<OrderbookState>((set) => ({

    bids: [],
    asks: [],

    spread: 0,
    imbalance: 0,

    setOrderbook: (bids, asks) => {

      // ======================================================
      // SPREAD
      // ======================================================

      const bestBid =
        bids[0]?.price || 0

      const bestAsk =
        asks[0]?.price || 0

      const spread =
        bestAsk - bestBid

      // ======================================================
      // IMBALANCE
      // ======================================================

      const bidVolume =
        bids.reduce(
          (sum, b) =>
            sum + b.size,
          0
        )

      const askVolume =
        asks.reduce(
          (sum, a) =>
            sum + a.size,
          0
        )

      const imbalance =
        bidVolume + askVolume === 0
          ? 0
          : bidVolume /
            (bidVolume + askVolume)

      set({
        bids,
        asks,
        spread,
        imbalance,
      })
    },
  }))

export default useOrderbookStore