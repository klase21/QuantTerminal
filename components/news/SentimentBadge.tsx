import { Sentiment } from "@/lib/news/types"

interface Props {
  sentiment: Sentiment
}

export default function SentimentBadge({
  sentiment,
}: Props) {
  const colorMap = {
    strong_bullish:
      "bg-green-500",
    bullish: "bg-green-400",
    neutral: "bg-zinc-500",
    bearish: "bg-red-400",
    strong_bearish:
      "bg-red-600",
  }

  return (
    <div
      className={`rounded px-2 py-1 text-xs text-white ${colorMap[sentiment]}`}
    >
      {sentiment}
    </div>
  )
}