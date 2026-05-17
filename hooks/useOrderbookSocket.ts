// ======================================================
// hooks/useOrderbookSocket.ts
// ======================================================

"use client"

import { useEffect } from "react"

import {
  useMarketStore,
} from "@/stores/useMarketStore"

export default function useOrderbookSocket() {

  // ======================================================
  // STORE
  // ======================================================

  const selectedSymbol =
    useMarketStore(
      (s) => s.selectedSymbol
    )

  const setOrderbook =
    useMarketStore(
      (s) => s.setOrderbook
    )

  // ======================================================
  // SOCKET
  // ======================================================

  useEffect(() => {

    if (!selectedSymbol) {
      return
    }

    const ws = new WebSocket(

      `wss://fstream.binance.com/ws/${selectedSymbol.toLowerCase()}@depth20@100ms`

    )

    ws.onmessage = (event) => {

      try {

        const data = JSON.parse(
          event.data
        )

        // ======================================================
        // BIDS
        // ======================================================

        const bids =

          data.b?.map(
            (
              [price, quantity]: string[]
            ) => ({

              price:
                Number(price),

              quantity:
                Number(quantity),

            })
          ) || []

        // ======================================================
        // ASKS
        // ======================================================

        const asks =

          data.a?.map(
            (
              [price, quantity]: string[]
            ) => ({

              price:
                Number(price),

              quantity:
                Number(quantity),

            })
          ) || []

        // ======================================================
        // UPDATE STORE
        // ======================================================

        setOrderbook({

          bids,

          asks,

        })

      } catch (err) {

        console.error(
          "Orderbook parse error",
          err
        )

      }

    }

    ws.onerror = (err) => {

      console.error(
        "Orderbook WS Error",
        err
      )

    }

    return () => {

      ws.close()

    }

  }, [

    selectedSymbol,

    setOrderbook,

  ])

}