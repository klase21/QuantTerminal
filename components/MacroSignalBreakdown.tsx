// ======================================================
// components/MacroSignalBreakdown.tsx
// ======================================================

"use client"

interface Item {
  label: string
  value: number
}

interface Props {
  signals: Item[]
}

export default function MacroSignalBreakdown({
  signals,
}: Props) {
  return (
    <div className="space-y-2">
      {signals.map((signal) => {
        const bullish = signal.value >= 0

        return (
          <div key={signal.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>{signal.label}</span>

              <span
                className={
                  bullish
                    ? "text-emerald-400"
                    : "text-red-400"
                }
              >
                {signal.value}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={
                  bullish
                    ? "h-full bg-emerald-500"
                    : "h-full bg-red-500"
                }
                style={{
                  width: `${Math.min(
                    100,
                    Math.abs(signal.value)
                  )}%`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}