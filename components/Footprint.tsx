"use client"

interface Level {
  price: number
  buyVolume: number
  sellVolume: number
  delta: number
  total: number
}

interface Props {
  levels: Level[]
}

export default function Footprint({
  levels,
}: Props) {
  const safeLevels = levels || []

  const max = Math.max(
    ...safeLevels.map((l) => l.total || 0),
    1
  )

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 h-[420px] overflow-hidden flex flex-col">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div>

          <div className="text-lg font-semibold text-zinc-500 mt-1">
            Real-Time Volume Delta
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Buy Pressure
          </div>

          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Sell Pressure
          </div>
        </div>
      </div>

      {/* COLUMN HEADER */}
      <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800 mb-2">
        <div>Price</div>
        <div className="text-right">
          Buy Vol
        </div>
        <div className="text-right">
          Sell Vol
        </div>
        <div className="text-right">
          Delta
        </div>
        <div className="text-right">
          Total
        </div>
      </div>

      {/* LEVELS */}
      <div className="flex-1 overflow-auto space-y-1 pr-1">
        {safeLevels.map((level) => {
          const strength =
            (level.total / max) * 100

          const isBuy =
            level.delta >= 0

          return (
            <div
              key={level.price}
              className="relative overflow-hidden rounded-lg border border-zinc-900 bg-black px-3 py-2"
            >
              {/* HEATMAP BG */}
              <div
                className={`absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-200 ${
                  isBuy
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${strength}%`,
                }}
              />

              {/* CONTENT */}
              <div className="relative z-10 grid grid-cols-5 gap-2 items-center text-sm font-mono">
                
                {/* PRICE */}
                <div className="text-zinc-200">
                  {level.price.toFixed(1)}
                </div>

                {/* BUY */}
                <div className="text-right text-green-400">
                  {level.buyVolume.toFixed(3)}
                </div>

                {/* SELL */}
                <div className="text-right text-red-400">
                  {level.sellVolume.toFixed(3)}
                </div>

                {/* DELTA */}
                <div
                  className={`text-right font-semibold ${
                    isBuy
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {level.delta > 0 ? "+" : ""}
                  {level.delta.toFixed(3)}
                </div>

                {/* TOTAL */}
                <div className="text-right text-zinc-300">
                  {level.total.toFixed(3)}
                </div>
              </div>
            </div>
          )
        })}

        {safeLevels.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-zinc-500">
            Waiting for footprint data...
          </div>
        )}
      </div>
    </div>
  )
}