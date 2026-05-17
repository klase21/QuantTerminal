"use client"

import { useEffect } from "react"
import { useMarketStore } from "@/store/useMarketStore"

export default function useBinanceSocket() {
  const setBtcPrice = useMarketStore((s) => s.setBtcPrice)

  useEffect(() => {
    const ws = new WebSocket(
      "wss://stream.binance.com:9443/ws/btcusdt@trade"
    )

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      const price = parseFloat(data.p)

      setBtcPrice(price)
    }

    ws.onopen = () => {
      console.log("Binance WS Connected")
    }

    ws.onclose = () => {
      console.log("Binance WS Closed")
    }

    return () => {
      ws.close()
    }
  }, [setBtcPrice])
}