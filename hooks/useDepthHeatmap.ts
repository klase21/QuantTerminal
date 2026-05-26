"use client"

import { useEffect, useRef, useState } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

export interface HeatLevel {
  price: number
  liquidity: number
  side: "bid" | "ask"
}

export interface HeatmapFrame {
  time: number
  bids: HeatLevel[]
  asks: HeatLevel[]
}

export default function useDepthHeatmap(symbol: string) {
  const [frames, setFrames] = useState<HeatmapFrame[]>([])
  const historyRef = useRef<HeatmapFrame[]>([])

  useEffect(() => {
    if (!symbol) return
    historyRef.current = []
    const url = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth20@100ms`
    return subscribeJsonStream(url, (data) => {
      if (!data?.b || !data?.a) return
      const bids = data.b.map((b: string[]) => ({ price: Number(b[0]), liquidity: Number(b[1]), side: "bid" as const }))
      const asks = data.a.map((a: string[]) => ({ price: Number(a[0]), liquidity: Number(a[1]), side: "ask" as const }))
      const frame: HeatmapFrame = { time: Date.now(), bids, asks }
      historyRef.current = [...historyRef.current, frame].slice(-120)
      setFrames([...historyRef.current])
    })
  }, [symbol])

  return frames
}
