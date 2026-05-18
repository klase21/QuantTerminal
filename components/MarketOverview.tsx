"use client"

import {
  useMarketStore,
} from "@/stores/useMarketStore"

export default function MarketOverview() {

  const tickers =
    Object.values(
      useMarketStore(
        (s) => s.tickers
      )
    )

  const totalVolume =
    tickers.reduce(
      (acc, t) =>
        acc + (t.volume || 0),
      0
    )

  const gainers =
    tickers.filter(
      (t) =>
        (t.change24h || 0) > 0
    ).length

  const losers =
    tickers.filter(
      (t) =>
        (t.change24h || 0) < 0
    ).length

  return (

    <div
      className="
        rounded-2xl
        border
        border-zinc-800
        bg-zinc-950
        p-4
      "
    >

      <div className="mb-4">
        <h2 className="text-lg font-semibold">
          Market Overview
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3">

        <div className="rounded-xl bg-zinc-900 p-3">
          <div className="text-xs text-zinc-500">
            Markets
          </div>

          <div className="mt-1 text-xl font-bold">
            {tickers.length}
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900 p-3">
          <div className="text-xs text-zinc-500">
            Gainers
          </div>

          <div className="mt-1 text-xl font-bold text-green-400">
            {gainers}
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900 p-3">
          <div className="text-xs text-zinc-500">
            Losers
          </div>

          <div className="mt-1 text-xl font-bold text-red-400">
            {losers}
          </div>
        </div>

      </div>

      <div className="mt-4 rounded-xl bg-zinc-900 p-3">
        <div className="text-xs text-zinc-500">
          Total Volume
        </div>

        <div className="mt-1 text-lg font-bold">
          $
          {(totalVolume / 1_000_000)
            .toFixed(1)}
          M
        </div>
      </div>

    </div>

  )

}