"use client"

import { useEffect, useState } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

export interface Liquidation {
  symbol: string
  side: "LONG" | "SHORT"
  price: number
  qty: number
  value: number
  time: number
}

export default function useLiquidationSocket() {
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])

  useEffect(() => {
    return subscribeJsonStream("wss://fstream.binance.com/market/ws/!forceOrder@arr", (data) => {
      const rows = Array.isArray(data) ? data : [data]
      const parsed: Liquidation[] = rows
        .map((liq: any) => {
          const order = liq?.o
          if (!order) return null
          const price = Number(order.p)
          const qty = Number(order.q)
          return {
            symbol: order.s,
            side: order.S === "SELL" ? "LONG" : "SHORT",
            price,
            qty,
            value: price * qty,
            time: Number(order.T || Date.now()),
          }
        })
        .filter(Boolean) as Liquidation[]
      if (!parsed.length) return
      setLiquidations((prev) => [...parsed, ...prev].slice(0, 40))
    })
  }, [])

  return { liquidations }
}
