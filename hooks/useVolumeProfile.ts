"use client"

import { useEffect, useRef, useState } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

interface ProfileLevel {
  price: number
  volume: number
}

export default function useVolumeProfile(symbol: string) {
  const [levels, setLevels] = useState<ProfileLevel[]>([])
  const bucketRef = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!symbol) return
    bucketRef.current = {}
    const url = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`
    return subscribeJsonStream(url, (data) => {
      const price = Math.round(Number(data.p))
      const qty = Number(data.q)
      if (!Number.isFinite(price) || !Number.isFinite(qty)) return
      bucketRef.current[price] = (bucketRef.current[price] || 0) + qty
      setLevels(Object.entries(bucketRef.current)
        .map(([price, volume]) => ({ price: Number(price), volume }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 80))
    })
  }, [symbol])

  return levels
}
