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

  const setTicker =
    useMarketStore(
      (s) => s.setTicker
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

        // 반드시 배열
        if (
          !Array.isArray(json)
        ) {
          return
        }

        json.forEach(
          (data) => {

            // USDT 페어만
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

            setTicker(
              data.s,
              {

                symbol:
                  data.s,

                price:
                  Number(data.c),

                change:
                  Number(data.P),

                // BASE VOLUME
                volume:
                  Number(data.v),

                // USDT VOLUME
                quoteVolume:
                  Number(data.q),

                latency,

              }
            )

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

  }, [setTicker])

}