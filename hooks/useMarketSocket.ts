// ======================================================
// hooks/useMarketSocket.ts
// BINANCE FUTURES ALL MARKET TICKER STREAM
// ======================================================

"use client"

import {
  useEffect,
  useRef,
} from "react"

import {
  useMarketStore,
} from "@/stores/useMarketStore"

export default function useMarketSocket() {

  // ======================================================
  // STORE
  // ======================================================

  const updateTicker  =
    useMarketStore(
      (s) => s.updateTicker 
    )

  // ======================================================
  // WS REF
  // ======================================================

  const wsRef =
    useRef<WebSocket | null>(
      null
    )

  // ======================================================
  // SOCKET
  // ======================================================

  useEffect(() => {

    // ALL FUTURES TICKERS
    const ws =
      new WebSocket(
        "wss://fstream.binance.com/market/ws/!ticker@arr"
      )

    wsRef.current = ws

    // ======================================================
    // OPEN
    // ======================================================

    ws.onopen = () => {

      console.log(
        "market websocket connected"
      )

    }

    // ======================================================
    // MESSAGE
    // ======================================================

    ws.onmessage = (
      event
    ) => {

      try {

        const json =
          JSON.parse(
            event.data
          )

        // Always keep as an array.
        if (
          !Array.isArray(json)
        ) {
          return
        }

        json.forEach(
          (data) => {

            // USDT pairs only.
            if (
              !data.s?.endsWith(
                "USDT"
              )
            ) {
              return
            }

            const latency =
              Date.now() -
              Number(data.E)

			updateTicker({
			  symbol: data.s,

			  price: Number(data.c),

			  change24h: Number(data.P),

			  volume: Number(data.v),

			  quoteVolume: Number(data.q),

			  exchange: "BINANCE",

			  timestamp: Date.now(),

			  latency:
				Date.now() - data.E,
			})

          }
        )

      } catch (err) {

        console.error(
          "market parse error",
          err
        )

      }

    }

    // ======================================================
    // ERROR
    // ======================================================

    ws.onerror = (
      err
    ) => {

      console.error(
        "market websocket error",
        err
      )

    }

    // ======================================================
    // CLOSE
    // ======================================================

    ws.onclose = () => {

      console.log(
        "market websocket disconnected"
      )

    }

    // ======================================================
    // CLEANUP
    // ======================================================

    return () => {

      if (
        wsRef.current &&
        wsRef.current.readyState ===
          WebSocket.OPEN
      ) {

        wsRef.current.close()

      }

    }

  }, [updateTicker])

}