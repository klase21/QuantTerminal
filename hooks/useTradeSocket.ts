"use client"

import { useEffect, useState } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

export interface Trade {
  price: number
  qty: number
  side: "buy" | "sell"
  time: number
}

export default function useTradeSocket(symbol: string) {
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    if (!symbol) return
    const url = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`
    return subscribeJsonStream(url, (data) => {
      const trade: Trade = {
        price: Number(data.p),
        qty: Number(data.q),
        side: data.m ? "sell" : "buy",
        time: data.T,
      }
      if (!Number.isFinite(trade.price) || !Number.isFinite(trade.qty)) return
      setTrades((prev) => [trade, ...prev].slice(0, 40))
    })
  }, [symbol])

  return { trades }
}
