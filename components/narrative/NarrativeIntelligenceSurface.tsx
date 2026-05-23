"use client"

import { useEffect, useMemo, useState } from "react"

import { generateNarrativeSurface } from "@/core/narrative/generateNarrativeSurface"
import {
  appendHistoricalSnapshot,
  buildHistoricalMemorySurface,
  buildHistoricalSnapshot,
} from "@/core/memory/historicalMemoryEngine"
import type { HistoricalRegimeSnapshot } from "@/core/memory/historicalMemoryTypes"
import type { NarrativeSurface } from "@/core/narrative/narrativeTypes"
import type { RealMarketRotationResponse } from "@/core/marketDataTypes"
import type { FuturesIntelligenceResponse } from "@/core/futuresTypes"

const POLL_MS = 45000
const MEMORY_STORAGE_KEY = "quantterminal.historical-memory.v1"

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

function formatShortTime(value?: string) {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  return date.toLocaleString("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function memoryBiasLabel(value?: string) {
  switch (value) {
    case "MATCH":
      return "Historical Match"
    case "RHYME":
      return "Market Rhyme"
    case "DIVERGENT":
      return "Regime Discovery"
    case "INSUFFICIENT_HISTORY":
      return "Memory Warming"
    default:
      return formatEnumLabel(value)
  }
}

function memoryBiasClass(value?: string) {
  switch (value) {
    case "MATCH":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "RHYME":
      return "border-cyan-500/25 bg-cyan-500/10 text-cyan-200"
    case "DIVERGENT":
      return "border-orange-500/25 bg-orange-500/10 text-orange-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function formatEnumLabel(value?: string) {
  if (!value) return "--"
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
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


function formatValidationStatus(value?: string) {
  switch (value) {
    case "VALIDATED":
      return "Narrative Confirmed"
    case "NEWS_ONLY":
      return "News Momentum"
    case "FLOW_ONLY":
      return "Liquidity Expansion"
    case "WEAK":
      return "Weak Signal"
    default:
      return formatEnumLabel(value)
  }
}


function stressRegimeLabel(value?: string) {
  switch (value) {
    case "HEALTHY_EXPANSION":
      return "Healthy Expansion"
    case "SPECULATIVE_EXPANSION":
      return "Speculative Expansion"
    case "LIQUIDITY_STRESS":
      return "Liquidity Stress"
    case "DEFENSIVE_WITHDRAWAL":
      return "Defensive Withdrawal"
    case "COMPRESSION":
      return "Compression"
    case "FRAGILE_ROTATION":
      return "Fragile Rotation"
    case "MARKET_SCAN":
      return "Market Scan"
    default:
      return formatEnumLabel(value)
  }
}

function stressRegimeClass(value?: string) {
  switch (value) {
    case "HEALTHY_EXPANSION":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "SPECULATIVE_EXPANSION":
      return "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200"
    case "LIQUIDITY_STRESS":
      return "border-orange-500/25 bg-orange-500/10 text-orange-200"
    case "DEFENSIVE_WITHDRAWAL":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    case "COMPRESSION":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200"
    case "FRAGILE_ROTATION":
      return "border-sky-500/25 bg-sky-500/10 text-sky-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function reflexivityRegimeLabel(value?: string) {
  switch (value) {
    case "SELF_REINFORCING_EXPANSION":
      return "Self-Reinforcing Expansion"
    case "REFLEXIVE_OVERHEAT":
      return "Reflexive Overheat"
    case "DEFENSIVE_FEEDBACK":
      return "Defensive Feedback"
    case "BETA_ROTATION":
      return "Beta Rotation"
    case "FRAGILE_FEEDBACK":
      return "Fragile Feedback"
    case "NEUTRAL_PROPAGATION":
      return "Neutral Propagation"
    default:
      return formatEnumLabel(value)
  }
}

function reflexivityClass(value?: string) {
  switch (value) {
    case "SELF_REINFORCING_EXPANSION":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "REFLEXIVE_OVERHEAT":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    case "DEFENSIVE_FEEDBACK":
      return "border-orange-500/25 bg-orange-500/10 text-orange-200"
    case "BETA_ROTATION":
      return "border-cyan-500/25 bg-cyan-500/10 text-cyan-200"
    case "FRAGILE_FEEDBACK":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function nodeStateClass(value?: string) {
  switch (value) {
    case "LEADING":
      return "text-emerald-300"
    case "EXPANDING":
      return "text-cyan-300"
    case "STRESSED":
      return "text-orange-300"
    case "WITHDRAWING":
      return "text-red-300"
    default:
      return "text-zinc-400"
  }
}

function driverClass(value?: string) {
  switch (value) {
    case "SUPPORT":
      return "text-emerald-300"
    case "RISK":
      return "text-orange-300"
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
  const [futuresData, setFuturesData] = useState<FuturesIntelligenceResponse | null>(null)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [fetchState, setFetchState] = useState<FetchState>("idle")
  const [newsState, setNewsState] = useState<FetchState>("idle")
  const [futuresState, setFuturesState] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [memoryHistory, setMemoryHistory] = useState<HistoricalRegimeSnapshot[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MEMORY_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setMemoryHistory(parsed.filter((item) => item && typeof item.timestamp === "string"))
      }
    } catch {
      setMemoryHistory([])
    }
  }, [])


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

    const loadFutures = async () => {
      try {
        setFuturesState((prev) => (prev === "idle" ? "loading" : prev))
        const response = await fetch("/api/market/futures-intelligence", { cache: "no-store" })
        const payload = (await response.json()) as FuturesIntelligenceResponse
        if (!alive) return
        if (!response.ok || payload.ok === false) {
          setFuturesState("partial")
          return
        }
        setFuturesData(payload)
        setFuturesState(payload.mode === "partial" ? "partial" : "live")
      } catch (err) {
        if (!alive) return
        setFuturesState("error")
      }
    }

    loadFutures()
    timer = setInterval(loadFutures, POLL_MS)

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

  const narrative = useMemo<NarrativeSurface>(() => generateNarrativeSurface(rotationData, newsItems, futuresData), [rotationData, newsItems, futuresData])
  const currentMemorySnapshot = useMemo(() => buildHistoricalSnapshot(narrative, futuresData), [narrative, futuresData])

  useEffect(() => {
    if (!narrative.ok) return
    setMemoryHistory((prev) => {
      const next = appendHistoricalSnapshot(prev, currentMemorySnapshot)
      if (next !== prev) {
        try {
          window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Local memory is best effort; the terminal should keep running without persistence.
        }
      }
      return next
    })
  }, [currentMemorySnapshot, narrative.ok])

  const historicalMemory = useMemo(
    () => buildHistoricalMemorySurface(currentMemorySnapshot, memoryHistory),
    [currentMemorySnapshot, memoryHistory]
  )

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
            <div className="mt-1 text-xs font-bold uppercase text-cyan-200">{formatEnumLabel(narrative.regionalDivergence.status)}</div>
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
                    {formatEnumLabel(commentary.severity)}
                  </div>
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{commentary.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-violet-500/20 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                Narrative Propagation
              </div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-violet-100">
                {narrative.propagation?.leadNarrative ?? "Scanning"} · {formatEnumLabel(narrative.propagation?.leadPhase)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Velocity / Stress</div>
              <div className="text-sm font-black text-cyan-200">
                {formatMetric(narrative.propagation?.velocityScore, 0)} / {formatMetric(narrative.propagation?.stressScore, 0)}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            {narrative.propagation?.operatorRead ?? "Waiting for narrative propagation data."}
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {(narrative.propagation?.nodes ?? []).slice(0, 3).map((node) => (
              <div key={node.narrative} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-black uppercase text-zinc-100">{node.narrative}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">{formatEnumLabel(node.phase)}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  <div>Velocity <span className="font-bold text-cyan-200">{formatMetric(node.velocity, 0)}</span></div>
                  <div>Persist <span className="font-bold text-emerald-200">{formatMetric(node.persistence, 0)}</span></div>
                  <div>Sync <span className="font-bold text-fuchsia-200">{formatMetric(node.synchronization, 0)}</span></div>
                  <div>Stress <span className="font-bold text-amber-200">{formatMetric(node.stress, 0)}</span></div>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-zinc-500">{node.summary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              Propagation Graph
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              {futuresState === "live" ? "Futures Coupled" : `Futures ${futuresState.toUpperCase()}`}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {(narrative.propagation?.links ?? []).slice(0, 4).map((link) => (
              <div key={`${link.from}-${link.to}`} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase text-zinc-100">{link.from} → {link.to}</div>
                  <div className="text-xs font-black text-violet-200">{formatMetric(link.strength, 0)}</div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-violet-400/80" style={{ width: `${Math.min(100, Math.max(0, link.strength))}%` }} />
                </div>
                <p className="mt-2 text-[11px] leading-4 text-zinc-500">{link.reason}</p>
              </div>
            ))}
            {!(narrative.propagation?.links.length) ? (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">
                No confirmed propagation path yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>


      <div className="mt-3 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-orange-500/20 bg-zinc-950/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                Stress / Liquidity Regime
              </div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-orange-100">
                {stressRegimeLabel(narrative.liquidityStress?.regime)}
              </div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${stressRegimeClass(narrative.liquidityStress?.regime)}`}>
              Stress {formatMetric(narrative.liquidityStress?.stressScore, 0)}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            {narrative.liquidityStress?.operatorRead ?? "Waiting for stress and liquidity inputs."}
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Quality</div>
              <div className="mt-1 text-sm font-black text-emerald-200">{formatMetric(narrative.liquidityStress?.liquidityQuality, 0)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Crowding</div>
              <div className="mt-1 text-sm font-black text-fuchsia-200">{formatMetric(narrative.liquidityStress?.crowdingRisk, 0)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Withdrawal</div>
              <div className="mt-1 text-sm font-black text-red-200">{formatMetric(narrative.liquidityStress?.withdrawalRisk, 0)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Spread Risk</div>
              <div className="mt-1 text-sm font-black text-amber-200">{formatMetric(narrative.liquidityStress?.spreadRiskProxy, 0)}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {(narrative.liquidityStress?.drivers ?? []).map((driver) => (
              <div key={driver.label} className="grid grid-cols-[118px_1fr_50px] items-center gap-2">
                <div className={`truncate text-[10px] font-bold uppercase tracking-[0.12em] ${driverClass(driver.direction)}`}>{driver.label}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-orange-400/80" style={{ width: `${Math.min(100, Math.max(0, driver.value))}%` }} />
                </div>
                <div className="text-right text-[10px] font-bold text-zinc-400">{formatMetric(driver.value, 0)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              Sector Stress Desk
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Top 4
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {(narrative.liquidityStress?.sectors ?? []).slice(0, 4).map((sector) => (
              <div key={sector.sector} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase text-zinc-100">{sector.sector}</div>
                  <div className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${stressRegimeClass(sector.regime)}`}>
                    {stressRegimeLabel(sector.regime)}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-zinc-500">{sector.operatorRead}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  <div>Stress <span className="font-bold text-orange-200">{formatMetric(sector.stressScore, 0)}</span></div>
                  <div>Quality <span className="font-bold text-emerald-200">{formatMetric(sector.liquidityQuality, 0)}</span></div>
                  <div>Crowding <span className="font-bold text-fuchsia-200">{formatMetric(sector.crowdingRisk, 0)}</span></div>
                </div>
              </div>
            ))}
            {!(narrative.liquidityStress?.sectors.length) ? (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">
                Waiting for sector stress data.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-cyan-500/20 bg-zinc-950/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                Cross-Market Reflexivity
              </div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-cyan-100">
                {reflexivityRegimeLabel(narrative.crossMarketReflexivity?.regime)}
              </div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${reflexivityClass(narrative.crossMarketReflexivity?.regime)}`}>
              Reflexivity {formatMetric(narrative.crossMarketReflexivity?.reflexivityScore, 0)}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            {narrative.crossMarketReflexivity?.operatorRead ?? "Waiting for cross-market reflexivity inputs."}
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Instability</div>
              <div className="mt-1 text-sm font-black text-orange-200">{formatMetric(narrative.crossMarketReflexivity?.instabilityScore, 0)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 md:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Beta Rotation Path</div>
              <div className="mt-1 truncate text-sm font-black text-cyan-200">
                {(narrative.crossMarketReflexivity?.betaRotationPath.length ? narrative.crossMarketReflexivity.betaRotationPath : ["BTC", "ETH", "ALT"]).join(" → ")}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {(narrative.crossMarketReflexivity?.nodes ?? []).slice(0, 4).map((node) => (
              <div key={node.id} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-black uppercase text-zinc-100">{node.label}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-[0.14em] ${nodeStateClass(node.state)}`}>{formatEnumLabel(node.state)}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  <div>Score <span className="font-bold text-cyan-200">{formatMetric(node.score, 0)}</span></div>
                  <div>Risk <span className="font-bold text-orange-200">{formatMetric(node.risk, 0)}</span></div>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-zinc-500">{node.operatorRead}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              Dependency Graph
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Top Links</div>
          </div>
          <div className="mt-3 space-y-2">
            {(narrative.crossMarketReflexivity?.dependencies ?? []).slice(0, 5).map((link) => (
              <div key={`${link.from}-${link.to}-${link.type}`} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-black uppercase text-zinc-100">{link.from} → {link.to}</div>
                  <div className="text-xs font-black text-cyan-200">{formatMetric(link.strength, 0)}</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-900">
                    <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.min(100, Math.max(0, link.strength))}%` }} />
                  </div>
                  <div className="w-20 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">{formatEnumLabel(link.type)}</div>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-zinc-500">{link.read}</p>
              </div>
            ))}
            {!(narrative.crossMarketReflexivity?.dependencies.length) ? (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">
                No confirmed cross-market dependency yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-emerald-500/20 bg-zinc-950/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                Historical Intelligence Memory
              </div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-emerald-100">
                {memoryBiasLabel(historicalMemory.bias)}
              </div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${memoryBiasClass(historicalMemory.bias)}`}>
              Samples {historicalMemory.sampleSize}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            {historicalMemory.operatorRead}
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Best Match</div>
              <div className="mt-1 truncate text-sm font-black text-emerald-200">
                {historicalMemory.bestMatch?.snapshot.leadNarrative ?? "Warming"}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">
                {formatShortTime(historicalMemory.bestMatch?.snapshot.timestamp)}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Similarity</div>
              <div className="mt-1 text-sm font-black text-cyan-200">
                {formatMetric(historicalMemory.bestMatch?.similarity, 0)}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">local memory score</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Persistent Narrative</div>
              <div className="mt-1 truncate text-sm font-black text-violet-200">
                {historicalMemory.persistence[0]?.narrative ?? "--"}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">
                Score {formatMetric(historicalMemory.persistence[0]?.persistenceScore, 0)}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {historicalMemory.matches.slice(0, 3).map((match) => (
              <div key={match.snapshot.id} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-black uppercase text-zinc-100">
                    {match.snapshot.leadNarrative} · {match.snapshot.regime.replaceAll("_", " ")}
                  </div>
                  <div className="text-xs font-black text-emerald-200">{formatMetric(match.similarity, 0)}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(match.matchedOn.length ? match.matchedOn : ["structure"]).slice(0, 4).map((tag) => (
                    <span key={`${match.snapshot.id}-${tag}`} className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-zinc-500">{match.operatorRead}</p>
              </div>
            ))}
            {!historicalMemory.matches.length ? (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">
                Memory is collecting live snapshots. Historical rhymes will appear after a few regime observations.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              Regime Memory Tape
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Transitions</div>
          </div>
          <div className="mt-3 space-y-2">
            {historicalMemory.transitions.slice(0, 4).map((transition) => (
              <div key={`${transition.from}-${transition.to}`} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-black uppercase text-zinc-100">
                    {transition.from.replaceAll("_", " ")} → {transition.to.replaceAll("_", " ")}
                  </div>
                  <div className="text-xs font-black text-cyan-200">{formatMetric(transition.probability, 0)}%</div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.min(100, Math.max(0, transition.probability))}%` }} />
                </div>
                <p className="mt-2 text-[11px] leading-4 text-zinc-500">{transition.operatorRead}</p>
              </div>
            ))}
            {!historicalMemory.transitions.length ? (
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">
                Transition memory needs more regime changes before probability estimates are useful.
              </div>
            ) : null}
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
              {formatEnumLabel(narrative.newsFusion?.divergence.status ?? "SCANNING")}
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
                    {formatValidationStatus(item.status)}
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
              <div key={formatEnumLabel(region.region)} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase text-zinc-100">{formatEnumLabel(region.region)}</div>
                  <div className="text-sm font-black text-cyan-200">{region.count}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(region.topNarratives.length ? region.topNarratives : ["NO TAG"]).map((tag) => (
                    <span key={formatEnumLabel(tag)} className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                      {formatEnumLabel(tag)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  )
}
