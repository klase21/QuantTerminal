"use client"

import { useEffect } from "react"
import { useMarketStore } from "@/stores/useMarketStore"

export default function useOrderbookSocket(
  symbol: string
) {
  const setOrderbook = useMarketStore(
    (s) => s.setOrderbook
  )

  useEffect(() => {
    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth20@100ms`
    )

    ws.onopen = () => {
      console.log("ORDERBOOK CONNECTED")
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (!data?.b || !data?.a) return

        const bids = data.b.map(
          (b: string[]) => ({
            price: Number(b[0]),
            qty: Number(b[1]),
          })
        )

        const asks = data.a.map(
          (a: string[]) => ({
            price: Number(a[0]),
            qty: Number(a[1]),
          })
        )



        setOrderbook(bids, asks)

      } catch (err) {
        console.error(err)
      }
    }

    ws.onerror = (err) => {
      console.error("WS ERROR", err)
    }

    ws.onclose = () => {
      console.log("ORDERBOOK CLOSED")
    }

    return () => ws.close()
  }, [symbol, setOrderbook])
}