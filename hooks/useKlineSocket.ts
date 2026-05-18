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

    let ws: WebSocket

    async function init() {

      setCandles([])

      // =========================================
      // LOAD HISTORY
      // =========================================

      const res = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=300`
      )

      const data = await res.json()

      const history =
        data.map((k: any) => ({
          time: Math.floor(k[0] / 1000),
          open: Number(k[1]),
          high: Number(k[2]),
          low: Number(k[3]),
          close: Number(k[4]),
        }))

      setCandles(history)

      // =========================================
      // WS
      // =========================================

      ws = new WebSocket(
        `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`
      )

      console.log(
        "CONNECT:",
        symbol,
        interval
      )

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

            copy[
              copy.length - 1
            ] = candle

          } else {

            copy.push(candle)

          }

          return copy.slice(-300)

        })

      }

    }

    init()

    return () => {

      if (
        ws &&
        (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        )
      ) {

        ws.close()

      }

    }

  }, [symbol, interval])

  return candles

}