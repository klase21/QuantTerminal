"use client"

import { useEffect, useMemo, useState } from "react"
import { generateNarrativeSurface } from "@/core/narrative/generateNarrativeSurface"
import { evaluateSignalQuality } from "@/core/signal-quality/evaluateSignalQuality"
import { buildProductizationSurface } from "@/core/productization/buildProductizationSurface"
import SignalProductizationSurface from "@/components/product/SignalProductizationSurface"
import type { RealMarketRotationResponse } from "@/core/marketDataTypes"

type NewsItem = {
  title?: string
  translatedTitle?: string
  source?: string
  region?: string
  sentiment?: string
  importance?: number
  narratives?: string[]
  timestamp?: number
}

export default function SignalInboxWorkspace() {
  const [rotationData, setRotationData] = useState<RealMarketRotationResponse | null>(null)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const [rotationResponse, ...newsResponses] = await Promise.all([
          fetch("/api/market/sector-rotation", { cache: "no-store" }),
          fetch("/api/news?region=kr&translate=false", { cache: "no-store" }),
          fetch("/api/news?region=en&translate=false", { cache: "no-store" }),
          fetch("/api/news?region=cn&translate=false", { cache: "no-store" }),
        ])
        const rotationPayload = (await rotationResponse.json()) as RealMarketRotationResponse
        const newsPayloads = await Promise.all(
          newsResponses.map(async (response) => {
            if (!response.ok) return [] as NewsItem[]
            const payload = await response.json()
            return Array.isArray(payload) ? (payload.slice(0, 20) as NewsItem[]) : []
          })
        )
        if (!alive) return
        if (!rotationResponse.ok || rotationPayload.ok === false) {
          throw new Error(rotationPayload.notes?.[0] ?? `signal source returned ${rotationResponse.status}`)
        }
        setRotationData(rotationPayload)
        setNewsItems(newsPayloads.flat())
        setError(null)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    load()
    const timer = setInterval(load, 45000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const narrative = useMemo(() => generateNarrativeSurface(rotationData, newsItems), [rotationData, newsItems])
  const quality = useMemo(() => evaluateSignalQuality(narrative, rotationData), [narrative, rotationData])
  const product = useMemo(() => buildProductizationSurface(narrative, quality), [narrative, quality])

  return (
    <section className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-violet-300/80">Signal Inbox</div>
        <div className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-white">Productized Alert Surface</div>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
          Signal quality, saved views, watchlists and explanation drawer previews are now first-class workspace surfaces instead of being buried inside the old Regime Lab.
        </p>
        {error ? <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div> : null}
      </div>
      <SignalProductizationSurface quality={quality} product={product} />
    </section>
  )
}
