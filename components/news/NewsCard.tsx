import { NewsItem } from "@/services/news/types"

interface Props {
  item: NewsItem
}

export default function NewsCard({
  item,
}: Props) {
  return (
    <a
      href={item.url}
      target="_blank"
      className="block rounded-xl border border-zinc-800 bg-black/40 p-3 transition hover:border-cyan-500"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {item.source}
        </div>

        <div
          className={`text-[10px] px-2 py-1 rounded-full ${
            item.sentiment === "bullish"
              ? "bg-green-500/20 text-green-400"
              : item.sentiment ===
                "bearish"
              ? "bg-red-500/20 text-red-400"
              : "bg-zinc-700 text-zinc-300"
          }`}
        >
          {item.sentiment}
        </div>
      </div>

      <div className="text-sm font-medium text-zinc-100">
        {item.title}
      </div>
    </a>
  )
}