"use client"

import { useEffect, useRef, useState } from "react"
import { Brain, History, Newspaper, PieChart, Search, Sparkles } from "lucide-react"

import { useSafePolling } from "@/hooks/system/useSafePolling"
import { safeFetchJson } from "@/lib/runtime/safeFetch"

type NarrativeResponse = {
  updatedAt?: number
  heatmap?: Array<{ narrative: string; total: number }>
  topNarratives?: string[]
  counts?: Record<string, number>
  sources?: string[]
}

type PredictionResponse = {
  status?: string
  source?: string
  markets?: Array<{ title: string; probability: number | null; volume: number | null; liquidity: number | null; category: string; attentionRank: number }>
}

type MarketMemoryResponse = {
  status?: string
  reason?: string
  similarCaseCount?: number
  avgReturn7d?: number | null
  avgReturn30d?: number | null
  successRate?: number | null
  dominantOutcome?: string | null
  topMatchedContexts?: string[]
  topSymbolsInMatches?: string[]
  dataCoverage?: { historicalSnapshots?: number; marketOutcomes?: number; symbolsCovered?: number }
}

type HistoricalAnalogsResponse = {
  status?: string
  totalCandidates?: number
  reason?: string
  analogs?: Array<{
    symbol: string
    date: string
    matchedContexts: string[]
    avgReturn7d: number | null
    avgReturn30d: number | null
    successRate: number | null
    dominantOutcome: string | null
  }>
}

type MacroResponse = {
  updatedAt?: number
  items?: Array<{ symbol?: string; change?: string; signal?: string; tone?: string; updatedAt?: number }>
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function Card({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-zinc-900 bg-zinc-950/80 p-3", className)}>
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded border border-zinc-900 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
      <span className="text-zinc-300">{title}</span>
      <span className="ml-2 text-zinc-600">Reason: {reason}</span>
    </div>
  )
}

function pct(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}

function compactUsd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function heatState(total: number) {
  if (total >= 200) return "Very Hot"
  if (total >= 120) return "Hot"
  if (total >= 40) return "Neutral"
  return "Quiet"
}

function time(value?: number) {
  if (!value) return "NO DATA"
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

function attentionLabel(market: PredictionResponse["markets"][number] | undefined) {
  if (!market) return "Unavailable"
  if ((market.volume ?? 0) >= 1_000_000 || (market.liquidity ?? 0) >= 1_000_000) return "High Attention"
  if ((market.volume ?? 0) >= 100_000 || (market.liquidity ?? 0) >= 100_000) return "Active"
  return "Developing"
}

export default function ResearchPage() {
  const narratives = useSafePolling<NarrativeResponse>("/api/narratives?range=24h", 60000, { label: "research-narratives", timeoutMs: 12000, retries: 1 })
  const predictions = useSafePolling<PredictionResponse>("/api/research/prediction-markets", 60000, { label: "research-predictions", timeoutMs: 12000, retries: 1 })
  const memory = useSafePolling<MarketMemoryResponse>("/api/dashboard/market-memory?symbol=BTCUSDT&interval=1h", 60000, { label: "research-memory", timeoutMs: 12000, retries: 1, enabled: false })
  const analogs = useSafePolling<HistoricalAnalogsResponse>("/api/research/historical-analogs?symbol=BTCUSDT&interval=1h&limit=12", 60000, { label: "research-analogs", timeoutMs: 12000, retries: 1, enabled: false })
  const macro = useSafePolling<MacroResponse>("/api/macro", 60000, { label: "research-macro", timeoutMs: 12000, retries: 1 })
  const [manualMemory, setManualMemory] = useState<MarketMemoryResponse | null>(null)
  const [manualMemoryLoading, setManualMemoryLoading] = useState(false)
  const [manualMemoryError, setManualMemoryError] = useState<string | null>(null)
  const [manualAnalogs, setManualAnalogs] = useState<HistoricalAnalogsResponse | null>(null)
  const [manualAnalogsLoading, setManualAnalogsLoading] = useState(false)
  const [manualAnalogsError, setManualAnalogsError] = useState<string | null>(null)
  const manualControllers = useRef<AbortController[]>([])

  useEffect(() => {
    return () => {
      manualControllers.current.forEach((controller) => controller.abort())
      manualControllers.current = []
    }
  }, [])

  async function loadMarketMemory() {
    const controller = new AbortController()
    manualControllers.current.push(controller)
    setManualMemoryLoading(true)
    setManualMemoryError(null)
    const result = await safeFetchJson<MarketMemoryResponse>("/api/dashboard/market-memory?symbol=BTCUSDT&interval=1h", {
      signal: controller.signal,
      timeoutMs: 12000,
      retries: 0,
      label: "research-memory-manual",
      cache: "no-store",
    })
    if (controller.signal.aborted) return
    setManualMemoryLoading(false)
    if (result.ok) setManualMemory(result.data)
    else setManualMemoryError(result.error)
  }

  async function loadHistoricalExplorer() {
    const controller = new AbortController()
    manualControllers.current.push(controller)
    setManualAnalogsLoading(true)
    setManualAnalogsError(null)
    const result = await safeFetchJson<HistoricalAnalogsResponse>("/api/research/historical-analogs?symbol=BTCUSDT&interval=1h&limit=12", {
      signal: controller.signal,
      timeoutMs: 12000,
      retries: 0,
      label: "research-analogs-manual",
      cache: "no-store",
    })
    if (controller.signal.aborted) return
    setManualAnalogsLoading(false)
    if (result.ok) setManualAnalogs(result.data)
    else setManualAnalogsError(result.error)
  }

  const topNarratives = narratives.data?.heatmap?.slice(0, 8) ?? []
  const predictionMarkets = predictions.data?.markets?.slice(0, 8) ?? []
  const memoryData = manualMemory ?? memory.data
  const analogRows = (manualAnalogs ?? analogs.data)?.analogs?.slice(0, 8) ?? []
  const informationItems = [
    ...(macro.data?.items?.slice(0, 3).map((item) => ({ label: `${item.symbol ?? "MACRO"} ${item.change ?? ""}`.trim(), tag: item.signal ?? item.tone ?? "MACRO", time: time(item.updatedAt ?? macro.data?.updatedAt) })) ?? []),
    ...(narratives.data?.topNarratives?.slice(0, 3).map((item) => ({ label: `${item} Heat`, tag: "NARRATIVE", time: time(narratives.data?.updatedAt) })) ?? []),
  ]
  const strongestNarrative = topNarratives[0]
  const topPrediction = predictionMarkets[0]
  const topAnalog = analogRows[0]

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Research Brief" icon={<Brain className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded border border-zinc-900 bg-black/45 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Strongest Narrative</div>
              <div className="mt-1 text-sm font-black uppercase text-white">{strongestNarrative?.narrative ?? "Unavailable"}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{strongestNarrative ? heatState(strongestNarrative.total) : narratives.error ?? "No narrative heat"}</div>
            </div>
            <div className="rounded border border-zinc-900 bg-black/45 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Prediction Attention</div>
              <div className="mt-1 truncate text-sm font-black uppercase text-white">{topPrediction?.title ?? "Unavailable"}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{attentionLabel(topPrediction)}</div>
            </div>
            <div className="rounded border border-zinc-900 bg-black/45 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Historical Signal</div>
              <div className="mt-1 text-sm font-black uppercase text-white">{topAnalog?.dominantOutcome ?? memoryData?.dominantOutcome ?? "Unavailable"}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{topAnalog ? `${topAnalog.symbol} ${topAnalog.date}` : "Manual load disabled"}</div>
            </div>
            <div className="rounded border border-zinc-900 bg-black/45 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Information Heat</div>
              <div className="mt-1 text-sm font-black uppercase text-white">{informationItems.length ? `${informationItems.length} Active Items` : "Unavailable"}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{informationItems[0]?.time ?? "No flow data"}</div>
            </div>
          </div>
        </Card>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_460px]">
          <Card title="Narrative Intelligence" icon={<Newspaper className="h-3.5 w-3.5" />}>
            {topNarratives.length ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {topNarratives.map((item) => (
                  <div key={item.narrative} className="rounded border border-zinc-900 bg-black/45 p-2">
                    <div className="text-sm font-black uppercase text-white">{item.narrative}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{heatState(item.total)}</div>
                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{Math.round(item.total).toLocaleString()} articles</div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason={narratives.error ?? "Narrative heatmap returned no tagged items."} />}
          </Card>

          <Card title="Prediction Markets" icon={<PieChart className="h-3.5 w-3.5" />}>
            {predictionMarkets.length ? (
              <div className="grid gap-1.5">
                {predictionMarkets.slice(0, 5).map((market) => (
                  <div key={`${market.attentionRank}-${market.title}`} className="grid grid-cols-[1fr_auto] gap-2 rounded border border-zinc-900 bg-black/45 p-2">
                    <div>
                      <div className="text-xs font-black uppercase text-white">{market.title}</div>
                      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{market.category} / {compactUsd(market.volume ?? market.liquidity)}</div>
                    </div>
                    <div className="text-lg font-black text-emerald-100">{market.probability === null ? "NO DATA" : `${Math.round(market.probability)}%`}</div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason={predictions.data?.status ?? predictions.error ?? "No attention markets available."} />}
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card title="Market Memory" icon={<Brain className="h-3.5 w-3.5" />}>
            {memoryData?.status === "available" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Similar Environments</div>
                  <div className="mt-1 text-lg font-black text-white">{memoryData.similarCaseCount ?? "NO DATA"}</div>
                </div>
                <div className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Success Rate</div>
                  <div className="mt-1 text-lg font-black text-emerald-100">{memoryData.successRate === null || memoryData.successRate === undefined ? "NO DATA" : `${Math.round(memoryData.successRate)}%`}</div>
                </div>
                <div className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Avg 7D</div>
                  <div className="mt-1 text-lg font-black text-cyan-100">{pct(memoryData.avgReturn7d)}</div>
                </div>
                <div className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Avg 30D</div>
                  <div className="mt-1 text-lg font-black text-cyan-100">{pct(memoryData.avgReturn30d)}</div>
                </div>
                <div className="col-span-2 rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                  Context: {(memoryData.topMatchedContexts ?? []).slice(0, 3).join(" / ") || "NO DATA"}
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <EmptyState title="Manual Load Required" reason={manualMemoryError ?? "Market memory auto-load is disabled during stabilization."} />
                <button
                  type="button"
                  onClick={() => void loadMarketMemory()}
                  disabled={manualMemoryLoading}
                  className="w-fit rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:cursor-wait disabled:opacity-50"
                >
                  {manualMemoryLoading ? "Loading Market Memory" : "Load Market Memory"}
                </button>
              </div>
            )}
          </Card>

          <Card title="Historical Explorer" icon={<History className="h-3.5 w-3.5" />}>
            {analogRows.length ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {analogRows.map((item) => (
                  <div key={`${item.symbol}-${item.date}`} className="rounded border border-zinc-900 bg-black/45 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-black text-white">{item.symbol}</div>
                      <div className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{item.date}</div>
                    </div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">{item.matchedContexts.slice(0, 3).join(" / ") || "NO CONTEXT"}</div>
                    <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[0.1em]">
                      <span className="text-cyan-100">7D {pct(item.avgReturn7d)}</span>
                      <span className="text-emerald-100">{item.successRate === null ? "NO RATE" : `${Math.round(item.successRate)}%`}</span>
                    </div>
                    <div className="mt-2 rounded border border-zinc-900 bg-zinc-950 px-2 py-1 text-center text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                      Replay Coordinates Required
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Manual Load Required" reason={manualAnalogsError ?? "Historical context is disabled until loaded."} />}
            {!analogRows.length ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => void loadHistoricalExplorer()}
                  disabled={manualAnalogsLoading}
                  className="rounded border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:cursor-wait disabled:opacity-50"
                >
                  {manualAnalogsLoading ? "Loading Historical Explorer" : "Load Historical Explorer"}
                </button>
                {manualAnalogsError ? <div className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{manualAnalogsError}</div> : null}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card title="Information Flow" icon={<Sparkles className="h-3.5 w-3.5" />}>
            {informationItems.length ? (
              <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                {informationItems.map((item) => (
                  <div key={`${item.time}-${item.label}-${item.tag}`} className="flex items-center justify-between gap-2 rounded border border-zinc-900 bg-black/45 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className="text-zinc-500">{item.time}</span>
                    <span className="text-white">{item.label}</span>
                    <span className="text-cyan-100">{item.tag}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason="Macro and narrative flow returned no current items." />}
          </Card>

          <Card title="Research Summary" icon={<Search className="h-3.5 w-3.5" />}>
            <div className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
              <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">Narratives: {topNarratives[0]?.narrative ?? "Unavailable"}</div>
              <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">Prediction Attention: {predictionMarkets[0]?.title ?? "Unavailable"}</div>
              <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">Memory Cases: Disabled</div>
              <div className="rounded border border-zinc-900 bg-black/45 p-2 text-zinc-300">Historical Analogs: Disabled</div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
