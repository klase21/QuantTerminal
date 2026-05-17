// ======================================================
// store/useOrderbookStore.ts
// ======================================================

"use client"

import { create } from "zustand"
import { OrderbookData } from "@/types/orderbook"

interface OrderbookState extends OrderbookData {
  setOrderbook: (data: OrderbookData) => void
}

const useOrderbookStore = create<OrderbookState>((set) => ({
  bids: [],
  asks: [],

  setOrderbook: (data) =>
    set({
      bids: data.bids,
      asks: data.asks,
    }),
}))

export default useOrderbookStore