// ======================================================
// hooks/useMarketSocket.ts
// BINANCE FUTURES ALL MARKET TICKER STREAM
// Shared websocket manager prevents StrictMode cleanup races.
// ======================================================

"use client"

import { useEffect } from "react"
import { useMarketStore } from "@/stores/useMarketStore"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

export default function useMarketSocket() {
  const updateTicker = useMarketStore((s) => s.updateTicker)

  useEffect(() => {
    return subscribeJsonStream(
      "wss://fstream.binance.com/market/ws/!ticker@arr",
      (json) => {
        if (!Array.isArray(json)) return
        json.forEach((data) => {
          if (!data.s?.endsWith("USDT")) return
          updateTicker({
            symbol: data.s,
            price: Number(data.c),
            change24h: Number(data.P),
            volume: Number(data.v),
            quoteVolume: Number(data.q),
            exchange: "BINANCE",
            timestamp: Date.now(),
            latency: Date.now() - Number(data.E),
          })
        })
      },
      (status) => {
        if (status === "open") console.log("market websocket connected")
        if (status === "error") console.warn("market websocket error - shared manager will retry")
      },
    )
  }, [updateTicker])
}
