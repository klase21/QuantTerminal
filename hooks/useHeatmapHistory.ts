// ======================================================
// hooks/useHeatmapHistory.ts
// ======================================================

"use client"

import { useEffect, useState } from "react"

interface OrderBookLevel {
  price: number
  quantity: number
}

interface HeatmapLevel {
  price: number
  liquidity: number
  side: "bid" | "ask"
}

interface HeatmapFrame {
  time: number
  levels: HeatmapLevel[]
}

const MAX_FRAMES = 300

export function useHeatmapHistory(
  bids: OrderBookLevel[],
  asks: OrderBookLevel[]
) {
  const [frames, setFrames] = useState<HeatmapFrame[]>([])

  useEffect(() => {
    if (!bids.length || !asks.length) return

    const levels: HeatmapLevel[] = [
      ...bids.slice(0, 25).map((bid) => ({
        price: bid.price,
        liquidity: bid.quantity,
        side: "bid" as const,
      })),

      ...asks.slice(0, 25).map((ask) => ({
        price: ask.price,
        liquidity: ask.quantity,
        side: "ask" as const,
      })),
    ]

    const frame: HeatmapFrame = {
      time: Date.now(),
      levels,
    }

    setFrames((prev) => {
      const next = [...prev, frame]

      if (next.length > MAX_FRAMES) {
        next.shift()
      }

      return next
    })
  }, [bids, asks])

  return frames
}