// ======================================================
// components/MacroSentimentGauge.tsx
// ======================================================

"use client"

interface Props {
  score: number
}

export default function MacroSentimentGauge({
  score,
}: Props) {
  const normalized = Math.max(
    -100,
    Math.min(100, score)
  )

  const width = ((normalized + 100) / 200) * 100

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`
            h-full rounded-full transition-all duration-500
            ${
              normalized >= 0
                ? "bg-emerald-500"
                : "bg-red-500"
            }
          `}
          style={{
            width: `${width}%`,
          }}
        />
      </div>

      <div className="mt-2 text-center text-sm font-semibold">
        Sentiment Score: {score}
      </div>
    </div>
  )
}