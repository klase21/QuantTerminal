"use client"

import { useEffect, useState } from "react"

interface FootprintLevel {
  price: number
  buyVolume: number
  sellVolume: number
  delta: number
  total: number
}

export default function useFootprint(
  symbol: string
) {
  const [levels, setLevels] = useState<
    FootprintLevel[]
  >([])

  useEffect(() => {
    const footprintMap = new Map<
      number,
      FootprintLevel
    >()

    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`
    )

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      const price = Math.floor(
        Number(data.p)
      )

      const qty = Number(data.q)

      const isSell = data.m

      const existing =
        footprintMap.get(price) || {
          price,
          buyVolume: 0,
          sellVolume: 0,
          delta: 0,
          total: 0,
        }

      if (isSell) {
        existing.sellVolume += qty
      } else {
        existing.buyVolume += qty
      }

      existing.delta =
        existing.buyVolume -
        existing.sellVolume

      existing.total =
        existing.buyVolume +
        existing.sellVolume

      footprintMap.set(price, existing)

      const sorted = Array.from(
        footprintMap.values()
      )
        .sort((a, b) => b.price - a.price)
        .slice(0, 30)

      setLevels(sorted)
    }

    return () => ws.close()
  }, [symbol])

  return levels
}