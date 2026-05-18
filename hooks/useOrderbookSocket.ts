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

    const stream =
      `${selectedSymbol.toLowerCase()}@depth20@500ms`

    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/${stream}`
    )

    console.log(
      "ORDERBOOK CONNECT:",
      stream
    )

    ws.onopen = () => {

      console.log(
        "ORDERBOOK CONNECTED"
      )

    }

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

    ws.onclose = (event) => {

      console.log(
        "ORDERBOOK CLOSED",
		event.code,
		event.reason
      )

    }

    return () => {
	  if (
		ws.readyState === WebSocket.OPEN ||
		ws.readyState === WebSocket.CONNECTING
	  ) {
		ws.close()
	  }

	}

  }, [

    selectedSymbol,

    setOrderbook,

  ])

}