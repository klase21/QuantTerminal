"use client"

import { useEffect, useState } from "react"

export interface Liquidation {
  symbol: string
  side: "LONG" | "SHORT"
  price: number
  qty: number
  value: number
  time: number
}

export default function useLiquidationSocket() {
  const [liquidations, setLiquidations] = useState<
    Liquidation[]
  >([])

  useEffect(() => {
    const ws = new WebSocket(
      "wss://fstream.binance.com/ws/!forceOrder@arr"
    )

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (!Array.isArray(data)) return

      const parsed: Liquidation[] = data.map(
        (liq: any) => {
          const order = liq.o

          return {
            symbol: order.s,

            side:
              order.S === "SELL"
                ? "LONG"
                : "SHORT",

            price: Number(order.p),

            qty: Number(order.q),

            value:
              Number(order.p) *
              Number(order.q),

            time: order.T,
          }
        }
      )

      setLiquidations((prev) => {
        const merged = [
          ...parsed,
          ...prev,
        ]

        return merged.slice(0, 40)
      })
    }

    return () => ws.close()
  }, [])

  return { liquidations }
}