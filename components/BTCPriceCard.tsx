"use client"

import { useMarketStore } from "@/stores/useMarketStore"

export default function BTCPriceCard() {

  const btcPrice =
    useMarketStore(
      (s) =>
        s.tickers["BTCUSDT"]?.price || 0
    )

  const change24h =
    useMarketStore(
      (s) =>
        s.tickers["BTCUSDT"]
          ?.change24h || 0
    )

  return (

    <div
      className="
        bg-black
        border
        border-zinc-800
        rounded-2xl
        p-5
      "
    >

      <div
        className="
          text-zinc-500
          text-sm
          mb-2
        "
      >
        BTCUSDT
      </div>

      <div
        className="
          text-3xl
          font-bold
          text-white
        "
      >
        $
        {btcPrice.toLocaleString()}
      </div>

      <div
        className={`
          mt-2
          text-sm
          font-medium
          ${
            change24h >= 0
              ? "text-green-500"
              : "text-red-500"
          }
        `}
      >

        {change24h >= 0
          ? "+"
          : ""}

        {change24h.toFixed(2)}%

      </div>

    </div>

  )

}