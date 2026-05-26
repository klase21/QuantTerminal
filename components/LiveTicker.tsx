"use client"

import { useEffect, useState } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

interface TickerData {
  symbol: string
  price: string
}

export default function LiveTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([])

  useEffect(() => {
    return subscribeJsonStream("wss://stream.binance.com:9443/ws/!ticker@arr", (data) => {
      if (!Array.isArray(data)) return
      const filtered = data
        .filter((coin: any) => coin.s === "BTCUSDT" || coin.s === "ETHUSDT" || coin.s === "SOLUSDT" || coin.s === "BNBUSDT")
        .map((coin: any) => ({ symbol: coin.s, price: Number(coin.c).toLocaleString() }))
      setTickers(filtered)
    })
  }, [])

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 overflow-hidden">
      <div className="flex gap-6 whitespace-nowrap animate-pulse">
        {tickers.map((ticker) => (
          <div key={ticker.symbol} className="flex items-center gap-2">
            <span className="text-zinc-400 text-sm">{ticker.symbol}</span>
            <span className="text-green-400 font-bold">${ticker.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
