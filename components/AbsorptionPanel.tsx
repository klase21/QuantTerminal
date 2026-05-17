"use client"

interface AbsorptionEvent {
  price: number
  side: "buy" | "sell"
  volume: number
  time: number
}

interface Props {
  events: AbsorptionEvent[]
}

export default function AbsorptionPanel({
  events,
}: Props) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 h-[320px] overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white">
          Absorption Detector
        </h2>

        <div className="text-xs text-zinc-400">
          Large passive fills
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto h-[260px]">
        {events.length === 0 && (
          <div className="text-zinc-500 text-sm">
            Waiting for absorption...
          </div>
        )}

        {events.map((e, i) => (
          <div
            key={i}
            className="
              flex items-center justify-between
              text-xs rounded-lg px-3 py-2
              border border-zinc-800
              bg-zinc-950
            "
          >
            <div className="flex flex-col">
              <span
                className={
                  e.side === "buy"
                    ? "text-green-400 font-semibold"
                    : "text-red-400 font-semibold"
                }
              >
                {e.side.toUpperCase()}
              </span>

              <span className="text-zinc-500">
                {new Date(
                  e.time
                ).toLocaleTimeString()}
              </span>
            </div>

            <div className="text-right">
              <div className="text-white font-mono">
                {e.price.toFixed(2)}
              </div>

              <div className="text-yellow-400">
                Vol: {e.volume.toFixed(3)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}