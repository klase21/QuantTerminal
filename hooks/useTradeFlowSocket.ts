"use client"

import {
  useEffect,
  useRef,
  useState,
} from "react"

interface TradeFlow {
  buyVolume: number
  sellVolume: number
  delta: number
  cvd: number
  trades: any[]
}

export default function useTradeFlowSocket(
  symbol: string
) {

  const [
    flow,
    setFlow,
  ] = useState<TradeFlow>({
    buyVolume: 0,
    sellVolume: 0,
    delta: 0,
    cvd: 0,
    trades: [],
  })

  const cvdRef =
    useRef(0)

  const buyRef =
    useRef(0)

  const sellRef =
    useRef(0)

  const tradesRef =
    useRef<any[]>([])

  useEffect(() => {

    if (!symbol) return

    let ws: WebSocket | null =
      null

    let mounted = true

    function connect() {

      ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@aggTrade`
      )

      ws.onmessage = (
        event
      ) => {

        if (!mounted) return

        const data =
          JSON.parse(
            event.data
          )

        const price =
          Number(data.p)

        const qty =
          Number(data.q)

        const time =
          data.T

        // m === true
        // seller aggressive

        const isSell =
          data.m

        const side =
          isSell
            ? "sell"
            : "buy"

        // ==================================================
        // VOLUME
        // ==================================================

        if (isSell) {

          sellRef.current += qty

          cvdRef.current -= qty

        } else {

          buyRef.current += qty

          cvdRef.current += qty

        }

        // ==================================================
        // TRADE CACHE
        // ==================================================

        const trade = {
          price,
          qty,
          side,
          time,
          value:
            price * qty,
        }

        tradesRef.current = [
          trade,
          ...tradesRef.current,
        ].slice(0, 200)

        // ==================================================
        // STATE UPDATE
        // ==================================================

        setFlow({
          buyVolume:
            buyRef.current,

          sellVolume:
            sellRef.current,

          delta:
            buyRef.current -
            sellRef.current,

          cvd:
            cvdRef.current,

          trades:
            tradesRef.current,
        })

      }

      ws.onclose = () => {

        if (mounted) {

          setTimeout(
            connect,
            2000
          )

        }

      }

    }

    connect()

    return () => {

      mounted = false

      ws?.close()

    }

  }, [symbol])

  return flow

}