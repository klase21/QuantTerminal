"use client"

import { useEffect, useMemo, useState } from "react"
import { Newspaper, RefreshCw } from "lucide-react"

type NewsItem = {
  id?: string
  title?: string
  translatedTitle?: string
  source?: string
  sentiment?: "strong_bullish" | "bullish" | "neutral" | "bearish" | "strong_bearish"
  timestamp?: string | number
  narratives?: string[]
  tags?: string[]
}

function sentimentTone(sentiment?: string) {
  if (sentiment === "strong_bullish" || sentiment === "bullish") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
  if (sentiment === "strong_bearish" || sentiment === "bearish") return "border-rose-300/20 bg-rose-400/10 text-rose-100"
  return "border-zinc-700 bg-zinc-950/70 text-zinc-300"
}

function catalystLabel(item: NewsItem) {
  const sentiment = item.sentiment || "neutral"
  if (sentiment.includes("bullish")) return "Bullish catalyst"
  if (sentiment.includes("bearish")) return "Risk catalyst"
  return "Context catalyst"
}

export default function ExecutionCatalystPanel() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [region, setRegion] = useState<"en" | "kr" | "cn">("en")

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`/api/news?region=${region}&translate=true&target=ko`, { cache: "no-store" })
        const data = await res.json()
        if (mounted && Array.isArray(data)) setItems(data)
      } catch (error) {
        console.error("EXECUTION CATALYST ERROR:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [region])

  const catalysts = useMemo(() => {
    const ranked = [...items].sort((a, b) => {
      const weight = (item: NewsItem) => {
        if (item.sentiment === "strong_bullish" || item.sentiment === "strong_bearish") return 3
        if (item.sentiment === "bullish" || item.sentiment === "bearish") return 2
        return 1
      }
      return weight(b) - weight(a)
    })
    return ranked.slice(0, 3)
  }, [items])

  return (
    <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            <Newspaper className="h-3.5 w-3.5" /> Execution Catalysts
          </div>
          <div className="mt-1 text-xs text-zinc-500">Only headlines that may affect execution stay here. Full news lives in Advanced.</div>
        </div>
        <div className="flex items-center gap-2">
          {(["en", "kr", "cn"] as const).map((nextRegion) => (
            <button key={nextRegion} type="button" onClick={() => setRegion(nextRegion)} className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${region === nextRegion ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100" : "border-zinc-800 bg-black/40 text-zinc-500"}`}>
              {nextRegion}
            </button>
          ))}
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-500" /> : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {catalysts.length > 0 ? catalysts.map((item, index) => (
          <div key={`${item.id || item.title || index}`} className={`rounded-2xl border p-3 ${sentimentTone(item.sentiment)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70">{catalystLabel(item)}</div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] opacity-60">{item.source || "news"}</div>
            </div>
            <div className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-zinc-100">{item.translatedTitle || item.title || "No headline available"}</div>
            {item.narratives?.[0] || item.tags?.[0] ? <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">{item.narratives?.[0] || item.tags?.[0]}</div> : null}
          </div>
        )) : <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3 text-xs font-semibold text-zinc-500">No fresh catalyst. Do not force a narrative.</div>}
      </div>
    </section>
  )
}
