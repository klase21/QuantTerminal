"use client"

import {
  useEffect,
  useState,
} from "react"

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export default function useKlineSocket(
  symbol: string,
  interval = "1m"
) {
  const [candles, setCandles] =
    useState<Candle[]>([])

  useEffect(() => {
    const ws = new WebSocket(
      `wss://fstream.binance.com/market/ws/${symbol.toLowerCase()}@kline_${interval}`
    )
	console.log(ws)

    ws.onmessage = (event) => {
      const msg = JSON.parse(
        event.data
      )

      const k = msg.k

      const candle: Candle = {
        time: Math.floor(k.t / 1000),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
      }

      setCandles((prev) => {
        const copy = [...prev]

        const last =
          copy[copy.length - 1]

        if (
          last &&
          last.time === candle.time
        ) {
          copy[copy.length - 1] =
            candle
        } else {
          copy.push(candle)
        }

        return copy.slice(-300)
      })
    }

    return () => ws.close()
  }, [symbol, interval])

  return candles
}