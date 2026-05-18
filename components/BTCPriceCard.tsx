"use client"

import { useMarketStore } from "@/stores/useMarketStore"

export default function BTCPriceCard() {
  const btcPrice = useMarketStore((s) => s.btcPrice)

  return (
    <div className="bg-black border border-zinc-800 rounded-2xl p-5">
      <div className="text-zinc-400 text-sm mb-2">
        BTCUSDT
      </div>

      <div className="text-3xl font-bold text-white">
        $
        {btcPrice
          ? btcPrice.toLocaleString()
          : "Loading..."}
      </div>

      <div className="text-green-400 text-sm mt-2">
        LIVE
      </div>
    </div>
  )
}