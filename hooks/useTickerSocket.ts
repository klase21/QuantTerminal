// ======================================================
// hooks/useTickerSocket.ts
// Shared ticker stream consumer
// ======================================================

"use client"

import { useEffect } from "react"
import { useTickerStore } from "@/stores/useTickerStore"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

export default function useTickerSocket() {
  const updateTicker = useTickerStore((s) => s.updateTicker)

  useEffect(() => {
    return subscribeJsonStream("wss://fstream.binance.com/market/ws/!ticker@arr", (data) => {
      if (!Array.isArray(data)) return
      data.forEach((item: any) => {
        updateTicker({
          symbol: item.s,
          price: Number(item.c),
          change24h: Number(item.P),
          volume24h: Number(item.q),
        })
      })
    })
  }, [updateTicker])
}
