"use client"

import { useEffect, useMemo, useState } from "react"

import { generateNarrativeSurface } from "@/core/narrative/generateNarrativeSurface"
import { evaluateSignalQuality } from "@/core/signal-quality/evaluateSignalQuality"
import { buildProductizationSurface } from "@/core/productization/buildProductizationSurface"
import SignalProductizationSurface from "@/components/product/SignalProductizationSurface"
import type { NarrativeSurface } from "@/core/narrative/narrativeTypes"
import type { RealMarketRotationResponse } from "@/core/marketDataTypes"

const POLL_MS = 45000

type FetchState = "idle" | "loading" | "live" | "partial" | "error"

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

function formatMetric(value: unknown, digits = 2) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return "--"
  return number.toFixed(digits)
}

function toneClass(tone?: string) {
  switch (tone) {
    case "RISK_ON":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    case "RISK_OFF":
      return "border-red-500/30 bg-red-500/10 text-red-200"
    case "EUPHORIA":
      return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
    case "COMPRESSION":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200"
    default:
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
  }
}

function directionClass(direction?: string) {
  switch (direction) {
    case "INFLOW":
      return "text-emerald-300"
    case "OUTFLOW":
      return "text-red-300"
    case "CHURN":
      return "text-amber-300"
    default:
      return "text-zinc-400"
  }
}

function severityClass(severity?: string) {
  switch (severity) {
    case "CRITICAL":
      return "text-red-300"
    case "HIGH":
      return "text-orange-300"
    case "MEDIUM":
      return "text-amber-300"
    default:
      return "text-zinc-400"
  }
}

function validationClass(status?: string) {
  switch (status) {
    case "VALIDATED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "NEWS_ONLY":
      return "border-blue-500/25 bg-blue-500/10 text-blue-200"
    case "FLOW_ONLY":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

export default function NarrativeIntelligenceSurface() {
  const [rotationData, setRotationData] = useState<RealMarketRotationResponse | null>(null)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [fetchState, setFetchState] = useState<FetchState>("idle")
  const [newsState, setNewsState] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        setFetchState((prev) => (prev === "idle" ? "loading" : prev))
        const response = await fetch("/api/market/sector-rotation", { cache: "no-store" })
        const payload = (await response.json()) as RealMarketRotationResponse
        if (!alive) return
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.notes?.[0] ?? `narrative source returned ${response.status}`)
        }
        setRotationData(payload)
        setFetchState(payload.mode === "partial" ? "partial" : "live")
        setError(null)
      } catch (err) {
        if (!alive) return
        setFetchState("error")
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    load()
    timer = setInterval(load, POLL_MS)

    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    const loadNews = async () => {
      try {
        setNewsState((prev) => (prev === "idle" ? "loading" : prev))
        const regions = ["kr", "en", "cn"]
        const responses = await Promise.all(
          regions.map(async (region) => {
            const response = await fetch(`/api/news?region=${region}&translate=false`, { cache: "no-store" })
            if (!response.ok) return [] as NewsItem[]
            const payload = await response.json()
            return Array.isArray(payload) ? payload.slice(0, 20) as NewsItem[] : []
          })
        )
        if (!alive) return
        setNewsItems(responses.flat())
        setNewsState("live")
      } catch (err) {
        if (!alive) return
        setNewsState("error")
      }
    }

    loadNews()
    timer = setInterval(loadNews, POLL_MS)

    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  }, [])

  const narrative = useMemo<NarrativeSurface>(() => generateNarrativeSurface(rotationData, newsItems), [rotationData, newsItems])
  const signalQuality = useMemo(() => evaluateSignalQuality(narrative, rotationData), [narrative, rotationData])
  const productSurface = useMemo(() => buildProductizationSurface(narrative, signalQuality), [narrative, signalQuality])
  const topHeat = narrative.heatmap[0]
  const secondHeat = narrative.heatmap[1]
  const statusLabel = fetchState === "live" ? "LIVE" : fetchState.toUpperCase()

  return (
    <section className="shrink-0 border-b border-zinc-900 bg-black px-4 py-3">
      <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-zinc-950/80 p-4 shadow-[0_0_40px_rgba(139,92,246,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.16),transparent_38%),radial-gradient(circle_at_90%_15%,rgba(34,211,238,0.10),transparent_34%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.34em] text-violet-300/80">
                  Narrative Intelligence
                </div>
                <div className="mt-2 text-2xl font-black uppercase tracking-[0.14em] text-white">
                  {narrative.regime.replaceAll("_", " ")}
                </div>
              </div>
              <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${toneClass(narrative.tone)}`}>
                {narrative.tone}
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {narrative.marketSummary}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-zinc-800 bg-black/45 p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Lead Story</div>
                <div className="mt-1 truncate text-sm font-black text-violet-200">{topHeat?.narrative ?? "--"}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/45 p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Heat</div>
                <div className="mt-1 text-sm font-black text-fuchsia-200">{formatMetric(topHeat?.heat)}%</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/45 p-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">News Fusion</div>
                <div className="mt-1 text-sm font-black text-cyan-200">{newsState === "live" ? `${narrative.newsFusion?.totalNews ?? 0} ITEMS` : newsState.toUpperCase()}</div>
              </div>
            </div>

            {error ? (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              Narrative Heatmap
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
              Compressed
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {(narrative.heatmap.length ? narrative.heatmap.slice(0, 6) : [null, null, null]).map((item, index) => {
              const width = item ? Math.min(100, Math.max(0, item.heat)) : 6
              return (
                <div key={item?.narrative ?? `narrative-placeholder-${index}`} className="grid grid-cols-[68px_1fr_54px] items-center gap-2">
                  <div className={`truncate text-xs font-bold uppercase ${directionClass(item?.direction)}`}>
                    {item?.narrative ?? "--"}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                    <div className="h-full rounded-full bg-violet-400/80 transition-all duration-700" style={{ width: `${width}%` }} />
                  </div>
                  <div className="text-right text-xs font-bold text-zinc-400">{formatMetric(item?.heat)}</div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Regional Divergence</div>
            <div className="mt-1 text-xs font-bold uppercase text-cyan-200">{narrative.regionalDivergence.status}</div>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{narrative.regionalDivergence.summary}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
            Operator Commentary
          </div>
          <div className="mt-3 space-y-2">
            {narrative.operatorCommentary.slice(0, 3).map((commentary) => (
              <div key={commentary.title} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase text-zinc-200">{commentary.title}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${severityClass(commentary.severity)}`}>
                    {commentary.severity}
                  </div>
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{commentary.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
            Story Timeline
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {narrative.storyTimeline.slice(0, 3).map((step, index) => (
              <div key={step.id} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Step {index + 1}</div>
                  <div className="text-[10px] font-bold text-violet-300">{formatMetric(step.intensity)}</div>
                </div>
                <div className="mt-2 text-xs font-black uppercase text-zinc-100">{step.title}</div>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
            Event Compression
          </div>
          <div className="mt-3 space-y-2">
            {narrative.compression.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div>
                  <div className="text-xs font-bold uppercase text-zinc-200">{item.label}</div>
                  <div className="mt-1 text-[11px] text-zinc-500">{item.compressedInto}</div>
                </div>
                <div className="text-sm font-black text-violet-200">{item.rawEvents}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              News Fusion Validation
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
              {narrative.newsFusion?.divergence.status ?? "SCANNING"}
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            {narrative.newsFusion?.divergence.summary ?? "Waiting for news and liquidity validation."}
          </p>
          <div className="mt-3 space-y-2">
            {(narrative.newsFusion?.validation ?? []).slice(0, 4).map((item) => (
              <div key={item.narrative} className="grid grid-cols-[78px_1fr_74px] items-center gap-2 rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div>
                  <div className="text-xs font-black uppercase text-zinc-100">{item.narrative}</div>
                  <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${validationClass(item.status)}`}>
                    {item.status}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] uppercase text-zinc-500">News</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-900">
                      <div className="h-full rounded-full bg-blue-400/80" style={{ width: `${Math.min(100, Math.max(0, item.newsBuzz))}%` }} />
                    </div>
                    <span className="w-9 text-right text-[10px] text-zinc-400">{formatMetric(item.newsBuzz, 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] uppercase text-zinc-500">Flow</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-900">
                      <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${Math.min(100, Math.max(0, item.liquidityHeat))}%` }} />
                    </div>
                    <span className="w-9 text-right text-[10px] text-zinc-400">{formatMetric(item.liquidityHeat, 0)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Score</div>
                  <div className="text-sm font-black text-violet-200">{formatMetric(item.validationScore)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
            News Narrative Heat
          </div>
          <div className="mt-3 space-y-2">
            {(narrative.newsFusion?.signals ?? []).slice(0, 6).map((signal) => (
              <div key={signal.narrative} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase text-zinc-100">{signal.narrative}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{signal.regions.join("/") || "--"}</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900">
                    <div className="h-full rounded-full bg-blue-400/80" style={{ width: `${Math.min(100, Math.max(0, signal.buzz))}%` }} />
                  </div>
                  <div className="w-10 text-right text-xs font-bold text-blue-200">{formatMetric(signal.buzz, 0)}</div>
                </div>
                {signal.topHeadline ? (
                  <div className="mt-2 line-clamp-1 text-[11px] text-zinc-500">{signal.topHeadline}</div>
                ) : null}
              </div>
            ))}
            {!(narrative.newsFusion?.signals.length) ? (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">
                Waiting for tagged news narratives.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
            Regional News Pulse
          </div>
          <div className="mt-3 space-y-2">
            {(narrative.newsFusion?.regionalBuzz ?? []).map((region) => (
              <div key={region.region} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase text-zinc-100">{region.region}</div>
                  <div className="text-sm font-black text-cyan-200">{region.count}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(region.topNarratives.length ? region.topNarratives : ["NO TAG"]).map((tag) => (
                    <span key={tag} className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SignalProductizationSurface quality={signalQuality} product={productSurface} />

    </section>
  )
}
