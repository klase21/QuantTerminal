"use client"

interface Props {
  buyVolume?: number
  sellVolume?: number
  delta?: number
  cvd?: number
}

export default function CVDPanel({
  buyVolume = 0,
  sellVolume = 0,
  delta = 0,
  cvd = 0,
}: Props) {

  const bullish = cvd >= 0

  const total =
    buyVolume + sellVolume || 1

  const buyPercent =
    (buyVolume / total) * 100

  const sellPercent =
    (sellVolume / total) * 100

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 h-full">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">

        <div>
          <h2 className="font-bold text-lg">
            CVD Flow
          </h2>

          <p className="text-xs text-zinc-500 mt-1">
            Real-Time Aggressive Orders
          </p>
        </div>

        <div
          className={`
            px-3 py-1 rounded-full
            text-xs font-semibold
            border
            ${
              bullish
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }
          `}
        >
          {bullish
            ? "BUY DOMINANCE"
            : "SELL DOMINANCE"}
        </div>

      </div>

      {/* BUY */}
      <div className="mb-5">

        <div className="flex justify-between text-sm mb-2">
          <span>Buy Aggression</span>

          <span className="text-green-400 font-medium">
            {buyVolume.toFixed(3)}
          </span>
        </div>

        <div className="h-3 rounded bg-zinc-800 overflow-hidden">

          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{
              width: `${buyPercent}%`,
            }}
          />

        </div>

      </div>

      {/* SELL */}
      <div className="mb-5">

        <div className="flex justify-between text-sm mb-2">
          <span>Sell Aggression</span>

          <span className="text-red-400 font-medium">
            {sellVolume.toFixed(3)}
          </span>
        </div>

        <div className="h-3 rounded bg-zinc-800 overflow-hidden">

          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{
              width: `${sellPercent}%`,
            }}
          />

        </div>

      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 mt-6">

        <div className="rounded-xl bg-zinc-900 p-4 border border-zinc-800">

          <div className="text-xs text-zinc-500 mb-1">
            Delta
          </div>

          <div
            className={`text-xl font-bold ${
              delta >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {delta.toFixed(3)}
          </div>

        </div>

        <div className="rounded-xl bg-zinc-900 p-4 border border-zinc-800">

          <div className="text-xs text-zinc-500 mb-1">
            CVD
          </div>

          <div
            className={`text-xl font-bold ${
              cvd >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {cvd.toFixed(3)}
          </div>

        </div>

      </div>

    </div>
  )
}