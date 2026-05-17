// ======================================================
// components/LatencyPanel.tsx
// ======================================================

"use client"

import { Ticker } from "@/types/market"

interface Props {
  tickers: Ticker[]
}

export default function LatencyPanel({
  tickers,
}: Props) {

  const latencies =
    tickers.map(
      (t) => t.latency ?? 0
    )

  const avgLatency =
    latencies.length > 0
      ? Math.round(
          latencies.reduce(
            (a, b) => a + b,
            0
          ) / latencies.length
        )
      : 0

  const maxLatency =
    latencies.length > 0
      ? Math.max(...latencies)
      : 0

  return (
    <div
      className="
        bg-black
        border
        border-zinc-800
        rounded-2xl
        p-4
      "
    >
      <div className="text-sm text-zinc-400 mb-3">
        Latency Monitor
      </div>

      <div className="space-y-2">

        <div className="flex justify-between">
          <span className="text-zinc-500">
            Average
          </span>

          <span className="text-white">
            {avgLatency} ms
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500">
            Max
          </span>

          <span className="text-red-400">
            {maxLatency} ms
          </span>
        </div>

      </div>
    </div>
  )
}