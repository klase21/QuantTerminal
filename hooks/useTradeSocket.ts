"use client"

import { useEffect, useState } from "react"

export interface Trade {
  price: number
  qty: number
  side: "buy" | "sell"
  time: number
}

export default function useTradeSocket(
  symbol: string
) {
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`
    )

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      const trade: Trade = {
        price: Number(data.p),
        qty: Number(data.q),
        side: data.m ? "sell" : "buy",
        time: data.T,
      }

      setTrades((prev) => {
        const updated = [trade, ...prev]

        return updated.slice(0, 40)
      })
    }

    return () => ws.close()
  }, [symbol])

  return { trades }
}