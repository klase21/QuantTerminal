"use client"

<<<<<<< HEAD
import { useEffect, useState } from "react"
=======
import {
  useEffect,
  useRef,
  useState,
} from "react"
>>>>>>> 41de28d (feat(flow): add flow summary cards, whale tracking, delta/cvd metrics, and trade intensity)

interface TradeFlow {
  buyVolume: number
  sellVolume: number
  delta: number
  cvd: number
<<<<<<< HEAD
=======
  trades: any[]
>>>>>>> 41de28d (feat(flow): add flow summary cards, whale tracking, delta/cvd metrics, and trade intensity)
}

export default function useTradeFlowSocket(
  symbol: string
) {
<<<<<<< HEAD
  const [flow, setFlow] =
    useState<TradeFlow>({
      buyVolume: 0,
      sellVolume: 0,
      delta: 0,
      cvd: 0,
    })

  useEffect(() => {
    let cumulative = 0

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@aggTrade`
    )

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      const qty = Number(data.q)

      // m === true
      // seller aggressive
      const isSell = data.m

      let buyVol = 0
      let sellVol = 0

      if (isSell) {
        sellVol = qty
        cumulative -= qty
      } else {
        buyVol = qty
        cumulative += qty
      }

      setFlow({
        buyVolume: buyVol,
        sellVolume: sellVol,
        delta: buyVol - sellVol,
        cvd: cumulative,
      })
    }

    return () => ws.close()
  }, [symbol])

  return flow
=======

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

>>>>>>> 41de28d (feat(flow): add flow summary cards, whale tracking, delta/cvd metrics, and trade intensity)
}