"use client"

import { useEffect, useState } from "react"

interface TradeFlow {
  buyVolume: number
  sellVolume: number
  delta: number
  cvd: number
}

export default function useTradeFlowSocket(
  symbol: string
) {
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
}