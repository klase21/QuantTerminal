// ======================================================
// hooks/useMultiExchangeSocket.ts
// ======================================================

"use client"

import { useEffect } from "react"

import { useExchangeStore }
  from "@/store/useExchangeStore"

export default function useMultiExchangeSocket() {

  const updatePrice =
    useExchangeStore((s) => s.updatePrice)

  useEffect(() => {

    const binance = new WebSocket(
      "wss://stream.binance.com:9443/ws/btcusdt@trade"
    )

    binance.onmessage = (e) => {

      const data = JSON.parse(e.data)

      updatePrice({
        exchange: "BINANCE",
        symbol: "BTCUSDT",
        price: parseFloat(data.p),
      })
    }

    return () => {
      binance.close()
    }

  }, [updatePrice])
}