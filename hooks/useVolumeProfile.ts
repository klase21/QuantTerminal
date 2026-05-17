"use client"

import { useEffect, useState } from "react"

interface ProfileLevel {
  price: number
  volume: number
}

export default function useVolumeProfile(
  symbol: string
) {
  const [levels, setLevels] = useState<
    ProfileLevel[]
  >([])

  useEffect(() => {
    const bucket: Record<
      string,
      number
    > = {}

    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`
    )

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      const price = Math.round(
        Number(data.p)
      )

      const qty = Number(data.q)

      bucket[price] =
        (bucket[price] || 0) + qty

      const arr = Object.entries(bucket)
        .map(([price, volume]) => ({
          price: Number(price),
          volume,
        }))
        .sort(
          (a, b) => b.price - a.price
        )
        .slice(0, 80)

      setLevels(arr)
    }

    return () => ws.close()
  }, [symbol])

  return levels
}