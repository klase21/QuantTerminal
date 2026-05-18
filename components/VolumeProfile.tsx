"use client"

interface Level {
  price: number
  volume: number
}

interface Props {
  levels: Level[]
}

export default function VolumeProfile({
  levels,
}: Props) {
  const maxVolume = Math.max(
    ...levels.map((l) => l.volume),
    1
  )

  const poc =
    levels.reduce((max, current) =>
      current.volume > max.volume
        ? current
        : max
    , levels[0])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 h-[420px] overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">

        <div>
          <div className="text-lg font-semibold text-zinc-500 mt-1">
            Futures Volume Distribution
          </div>
        </div>

        {poc && (
          <div className="text-right">
            <div className="text-xs text-zinc-500">
              POC
            </div>

            <div className="text-orange-400 font-bold">
              {poc.price.toLocaleString()}
            </div>
          </div>
        )}

      </div>

      {/* LEVELS */}
      <div className="space-y-[2px] overflow-auto h-[340px]">

        {levels.map((level) => {
          const intensity =
            level.volume / maxVolume

          return (
            <div
              key={level.price}
              className="relative h-6 rounded overflow-hidden bg-zinc-900"
            >

              {/* HISTOGRAM */}
              <div
                className="absolute right-0 top-0 h-full bg-blue-500"
                style={{
                  width: `${
                    intensity * 100
                  }%`,
                  opacity:
                    0.25 + intensity,
                }}
              />

              {/* PRICE + VOL */}
              <div className="relative z-10 flex items-center justify-between h-full px-2 text-xs">

                <div className="text-zinc-300">
                  {level.price.toLocaleString()}
                </div>

                <div className="text-blue-300">
                  {level.volume.toFixed(2)}
                </div>

              </div>

            </div>
          )
        })}

      </div>
    </div>
  )
}