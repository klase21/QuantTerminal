"use client"

import { useEffect, useState } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export default function useKlineSocket(symbol: string, interval = "1m") {
  const [candles, setCandles] = useState<Candle[]>([])

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | null = null

    async function init() {
      setCandles([])
      try {
        const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=300`, { cache: "no-store" })
        const data = await res.json()
        if (!mounted || !Array.isArray(data)) return
        setCandles(data.map((k: any) => ({
          time: Math.floor(k[0] / 1000),
          open: Number(k[1]),
          high: Number(k[2]),
          low: Number(k[3]),
          close: Number(k[4]),
          volume: Number(k[5]),
        })))
      } catch (error) {
        console.warn("Kline history load failed", error)
      }

      if (!mounted) return
      unsubscribe = subscribeJsonStream(
        `wss://fstream.binance.com/market/ws/${symbol.toLowerCase()}@kline_${interval}`,
        (msg) => {
          const k = msg?.k
          if (!k) return
          const candle: Candle = {
            time: Math.floor(k.t / 1000),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
            volume: Number(k.v),
          }
          setCandles((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last && last.time === candle.time) copy[copy.length - 1] = candle
            else copy.push(candle)
            return copy.slice(-300)
          })
        },
      )
    }

    init()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [symbol, interval])

  return candles
}
