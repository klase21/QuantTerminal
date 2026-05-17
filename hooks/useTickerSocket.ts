// ======================================================
// hooks/useTickerSocket.ts
// ======================================================

"use client"

import { useEffect }
  from "react"

import {
  useTickerStore,
} from "@/stores/useTickerStore"

export default function useTickerSocket() {

  const updateTicker =
    useTickerStore(
      (s) => s.updateTicker
    )

  useEffect(() => {

    const ws =
      new WebSocket(
        "wss://fstream.binance.com/market/ws/!ticker@arr"
      )

    ws.onmessage = (event) => {

      const data =
        JSON.parse(event.data)

      data.forEach((item: any) => {

        updateTicker({

          symbol: item.s,

          price:
            Number(item.c),

          change24h:
            Number(item.P),

          volume24h:
            Number(item.q),

        })

      })

    }

    return () => ws.close()

  }, [updateTicker])

}