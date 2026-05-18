// ======================================================
// store/useOrderbookStore.ts
// ======================================================

"use client"

import { create } from "zustand"
import { OrderbookData } from "@/types/orderbook"


export interface Level {
	price : number
	qty : number
}

interface OrderbookState extends OrderbookData {
  bids : Level[]
  asks : Level[]
  spread : number
  imbalance : number
  
  setOrderbook: (data: OrderbookData) => void
}

const useOrderbookStore = create<OrderbookState>((set) => ({
  bids: [],
  asks: [],
  spread: 0,
  imbalance: 0,

  setOrderbook: (data) =>
    set({
      bids: data.bids,
      asks: data.asks,
	  
	  spread:  (data.asks[0]?.price || 0) - (data.bids[0]?.price || 0),
	  imbalance: data.imbalance || 0,
    }),
}))

export default useOrderbookStore