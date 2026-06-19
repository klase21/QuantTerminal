"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  BarChart3,
  CalendarDays,
  Database,
  Gauge,
  History,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

type Horizon = "1h" | "4h" | "24h" | "7d"
type Interval = "1h" | "4h" | "1d"

type FeatureVector = {
  return1h: number | null
  return4h: number | null
  return24h: number | null
  volumeZScore: number | null
  realizedVolatility24h: number | null
  distanceSma20: number | null
  distanceSma50: number | null
  fundingRate: number | null
  openInterestChange24h: number | null
}

type MarketState = {
  id: string
  source: string
  symbol: string
  interval: Interval
  timestamp: number
  close: number
  trendRegime: "uptrend" | "downtrend" | "sideways" | "unknown"
  features: FeatureVector
}

type AnalogCase = {
  state: MarketState
  outcome: {
    stateId: string
    symbol: string
    timestamp: number
    returns: Record<Horizon, number | null>
  }
  similarity: number
  comparableFeatures: number
}

type HorizonStats = {
  caseCount: number
  averageReturn: number | null
  winRate: number | null
  bestCase: { stateId: string; timestamp: number; return: number } | null
  worstCase: { stateId: string; timestamp: number; return: number } | null
}

type ExplorerResponse = {
  ok: boolean
  status: "available" | "unavailable"
  source?: string
  symbol?: string
  interval?: Interval
  currentState?: MarketState
  cases?: AnalogCase[]
  statistics?: {
    totalCases: number
    byHorizon: Record<Horizon, HorizonStats>
    dominantOutcome: "up" | "down" | "mixed" | "unavailable"
  }
  search?: {
    candidateCount: number
    minimumComparableFeatures: number
    exclusionWindowMs: number
  }
  diagnostics?: {
    cacheStatus: string
    generatedAt: string | null
    source: string | null
    schemaVersion: string | null
    analogCount: number
  }
  reason?: string
}

const HORIZONS: Horizon[] = ["1h", "4h", "24h", "7d"]

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function pct(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`
}

function number(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  return value.toLocaleString(undefined, { maximumFractionDigits: digits })
}

function dateTime(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "NO DATA"
  const timestamp = typeof value === "number" ? value : Date.parse(value)
  if (!Number.isFinite(timestamp)) return "NO DATA"
  return new Date(timestamp).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function median(values: Array<number | null>) {
  const usable = values.filter((value): value is number => value !== null && Number.isFinite(value)).sort((a, b) => a - b)
  if (!usable.length) return null
  const middle = Math.floor(usable.length / 2)
  return usable.length % 2 ? usable[middle] : (usable[middle - 1] + usable[middle]) / 2
}

function regimeLabel(value: MarketState["trendRegime"]) {
  if (value === "uptrend") return "Uptrend"
  if (value === "downtrend") return "Downtrend"
  if (value === "sideways") return "Sideways"
  return "Unknown"
}

function outcomeTone(value: number | null | undefined) {
  if (value === null || value === undefined) return "text-zinc-500"
  return value > 0 ? "text-emerald-200" : value < 0 ? "text-rose-200" : "text-zinc-200"
}

function Section({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("min-w-0 max-w-full overflow-hidden border border-zinc-900 bg-zinc-950/75", className)}>
      <div className="flex h-9 items-center gap-2 border-b border-zinc-900 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-zinc-900 bg-black/45 px-2.5 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">{label}</div>
      <div className={cn("mt-1 text-sm font-black uppercase text-zinc-100", tone)}>{value}</div>
    </div>
  )
}

function similarityReasons(current: MarketState, candidate: MarketState) {
  const reasons: string[] = []
  if (current.trendRegime === candidate.trendRegime && current.trendRegime !== "unknown") {
    reasons.push("Trend structure matched")
  }

  const comparisons: Array<{
    current: number | null
    candidate: number | null
    threshold: number
    label: string
  }> = [
    { current: current.features.realizedVolatility24h, candidate: candidate.features.realizedVolatility24h, threshold: 0.75, label: "Volatility profile aligned" },
    { current: current.features.volumeZScore, candidate: candidate.features.volumeZScore, threshold: 0.8, label: "Volume participation similar" },
    { current: current.features.return24h, candidate: candidate.features.return24h, threshold: 2.5, label: "24h momentum aligned" },
    { current: current.features.distanceSma20, candidate: candidate.features.distanceSma20, threshold: 2, label: "Price structure near SMA20" },
    { current: current.features.distanceSma50, candidate: candidate.features.distanceSma50, threshold: 4, label: "Medium-term structure aligned" },
    { current: current.features.fundingRate, candidate: candidate.features.fundingRate, threshold: 0.0005, label: "Funding conditions similar" },
    { current: current.features.openInterestChange24h, candidate: candidate.features.openInterestChange24h, threshold: 3, label: "Participation change aligned" },
  ]

  for (const comparison of comparisons) {
    if (
      comparison.current !== null
      && comparison.candidate !== null
      && Math.abs(comparison.current - comparison.candidate) <= comparison.threshold
    ) {
      reasons.push(comparison.label)
    }
  }
  return reasons.slice(0, 4)
}

function Unavailable({ reason }: { reason: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center border border-zinc-900 bg-zinc-950/65 p-8 text-center">
      <div>
        <Database className="mx-auto h-6 w-6 text-zinc-700" />
        <div className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-300">Historical Intelligence Unavailable</div>
        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">Reason: {reason}</div>
      </div>
    </div>
  )
}

export default function HistoricalIntelligenceExplorer() {
  const [symbolInput, setSymbolInput] = useState("BTCUSDT")
  const [interval, setInterval] = useState<Interval>("1h")
  const [data, setData] = useState<ExplorerResponse | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState<string | null>(null)

  const loadCache = useCallback(async (symbol: string, selectedInterval: Interval) => {
    const normalizedSymbol = symbol.trim().toUpperCase()
    if (!normalizedSymbol) {
      setReason("symbol is required")
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4000)
    setLoading(true)
    setReason(null)
    try {
      const params = new URLSearchParams({ symbol: normalizedSymbol, interval: selectedInterval })
      const response = await fetch(`/api/historical-analog?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
      const payload = await response.json() as ExplorerResponse
      if (!response.ok || !payload.ok || payload.status !== "available") {
        setData(payload)
        setSelectedCaseId(null)
        setReason(payload.diagnostics?.cacheStatus === "missing" ? "cache not generated" : payload.reason ?? "cache unavailable")
        return
      }
      setData(payload)
      setSymbolInput(payload.symbol ?? normalizedSymbol)
      setSelectedCaseId(payload.cases?.[0]?.state.id ?? null)
    } catch {
      if (!controller.signal.aborted) setReason("cache request failed")
      else setReason("cache request timed out")
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCache("BTCUSDT", "1h")
  }, [loadCache])

  const cases = data?.cases ?? []
  const selectedCase = cases.find((item) => item.state.id === selectedCaseId) ?? cases[0] ?? null
  const currentState = data?.currentState ?? null
  const statistics = data?.statistics
  const medians = useMemo(() => Object.fromEntries(
    HORIZONS.map((horizon) => [horizon, median(cases.map((item) => item.outcome.returns[horizon]))]),
  ) as Record<Horizon, number | null>, [cases])
  const matchReasons = currentState && selectedCase
    ? similarityReasons(currentState, selectedCase.state)
    : []

  return (
    <main className="box-border min-h-screen w-full max-w-full overflow-x-hidden bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1900px] gap-3">
        <header className="border border-zinc-900 bg-zinc-950/80 p-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
                <History className="h-4 w-4" />
                Historical Intelligence Explorer
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">
                When has this happened before, and what usually happened next?
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1">
                <span className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-600">Symbol</span>
                <input
                  value={symbolInput}
                  onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
                  className="h-8 w-32 border border-zinc-800 bg-black px-2 text-xs font-black uppercase text-zinc-100 outline-none focus:border-cyan-300/50"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-600">Interval</span>
                <select
                  value={interval}
                  onChange={(event) => setInterval(event.target.value as Interval)}
                  className="h-8 border border-zinc-800 bg-black px-2 text-xs font-black uppercase text-zinc-100 outline-none focus:border-cyan-300/50"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="1h">1H</option>
                  <option value="4h">4H</option>
                  <option value="1d">1D</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void loadCache(symbolInput, interval)}
                disabled={loading}
                className="flex h-8 items-center gap-2 border border-cyan-300/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                {loading ? "Reading Cache" : "Load Intelligence"}
              </button>
            </div>
          </div>
        </header>

        {loading && !data ? (
          <div className="border border-zinc-900 bg-zinc-950/65 p-8 text-center text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">Reading Cached Intelligence</div>
        ) : reason || !data?.ok || data.status !== "available" || !currentState || !statistics ? (
          <Unavailable reason={reason ?? data?.reason ?? "cache unavailable"} />
        ) : (
          <>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,2fr)]">
              <Section title="Current Market State" icon={<Activity className="h-3.5 w-3.5" />}>
                <div className="grid grid-cols-2 gap-2 p-3 md:grid-cols-4 xl:grid-cols-2">
                  <Metric label="Symbol" value={`${currentState.symbol} / ${currentState.interval}`} />
                  <Metric label="Regime" value={regimeLabel(currentState.trendRegime)} tone={currentState.trendRegime === "uptrend" ? "text-emerald-200" : currentState.trendRegime === "downtrend" ? "text-rose-200" : "text-amber-200"} />
                  <Metric label="State Time" value={dateTime(currentState.timestamp)} />
                  <Metric label="Close" value={number(currentState.close)} />
                  <Metric label="1H Return" value={pct(currentState.features.return1h)} tone={outcomeTone(currentState.features.return1h)} />
                  <Metric label="24H Return" value={pct(currentState.features.return24h)} tone={outcomeTone(currentState.features.return24h)} />
                  <Metric label="Volume State" value={currentState.features.volumeZScore === null ? "NO DATA" : `${currentState.features.volumeZScore.toFixed(2)} Z`} />
                  <Metric label="24H Volatility" value={pct(currentState.features.realizedVolatility24h)} />
                </div>
              </Section>

              <Section title="Outcome Summary" icon={<Gauge className="h-3.5 w-3.5" />}>
                <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
                  {HORIZONS.map((horizon) => {
                    const stats = statistics.byHorizon[horizon]
                    return (
                      <div key={horizon} className="border border-zinc-900 bg-black/45 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">{horizon}</span>
                          <span className="text-[9px] font-black uppercase text-zinc-600">{stats.caseCount} cases</span>
                        </div>
                        <div className={cn("mt-2 text-xl font-black", outcomeTone(stats.averageReturn))}>{pct(stats.averageReturn)}</div>
                        <div className="mt-2 grid gap-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">
                          <div className="flex justify-between"><span>Median</span><span className="text-zinc-200">{pct(medians[horizon])}</span></div>
                          <div className="flex justify-between"><span>Win Rate</span><span className="text-zinc-200">{pct(stats.winRate, 1)}</span></div>
                          <div className="flex justify-between"><span>Best</span><span className="text-emerald-200">{pct(stats.bestCase?.return)}</span></div>
                          <div className="flex justify-between"><span>Worst</span><span className="text-rose-200">{pct(stats.worstCase?.return)}</span></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t border-zinc-900 px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">
                  <span>Dominant Outcome <strong className="ml-1 text-amber-200">{statistics.dominantOutcome.toUpperCase()}</strong></span>
                  <span>Source <strong className="ml-1 text-zinc-300">{data.diagnostics?.source ?? data.source}</strong></span>
                  <span>Generated <strong className="ml-1 text-zinc-300">{dateTime(data.diagnostics?.generatedAt)}</strong></span>
                </div>
              </Section>
            </div>

            <div className="grid min-h-[510px] gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(440px,.8fr)]">
              <Section title="Similar Historical Cases" icon={<BarChart3 className="h-3.5 w-3.5" />}>
                <div className="max-h-[640px] overflow-auto">
                  <div className="min-w-[760px]">
                    {cases.map((item, index) => {
                      const selected = item.state.id === selectedCase?.state.id
                      return (
                        <button
                          type="button"
                          key={item.state.id}
                          onClick={() => setSelectedCaseId(item.state.id)}
                          className={cn(
                            "grid w-full grid-cols-[38px_minmax(150px,1fr)_90px_repeat(4,minmax(62px,.5fr))] items-center gap-2 border-b border-zinc-900 px-3 py-2 text-left transition",
                            selected ? "bg-cyan-400/10" : "bg-black/25 hover:bg-zinc-900/45",
                          )}
                        >
                          <span className="text-[10px] font-black text-zinc-600">#{index + 1}</span>
                          <span>
                            <span className="block text-xs font-black text-zinc-100">{dateTime(item.state.timestamp)}</span>
                            <span className="mt-0.5 block text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{regimeLabel(item.state.trendRegime)} · {item.comparableFeatures} signals</span>
                          </span>
                          <span className="text-sm font-black text-cyan-200">{item.similarity.toFixed(1)}%</span>
                          {HORIZONS.map((horizon) => (
                            <span key={horizon} className={cn("text-xs font-black", outcomeTone(item.outcome.returns[horizon]))}>
                              {pct(item.outcome.returns[horizon], 1)}
                              <span className="block text-[8px] uppercase text-zinc-700">{horizon}</span>
                            </span>
                          ))}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </Section>

              <Section title="Case Detail" icon={<Target className="h-3.5 w-3.5" />}>
                {selectedCase ? (
                  <div className="grid gap-3 p-3">
                    <div className="flex items-start justify-between gap-3 border border-zinc-900 bg-black/45 p-3">
                      <div>
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600"><CalendarDays className="h-3.5 w-3.5" /> Historical Period</div>
                        <div className="mt-1 text-lg font-black text-zinc-100">{dateTime(selectedCase.state.timestamp)}</div>
                        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">{regimeLabel(selectedCase.state.trendRegime)} · Close {number(selectedCase.state.close)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">Similarity</div>
                        <div className="mt-1 text-3xl font-black text-cyan-200">{selectedCase.similarity.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">Why It Matched</div>
                      <div className="grid gap-1.5">
                        {(matchReasons.length ? matchReasons : ["Shared feature profile across cached market-state signals"]).map((item) => (
                          <div key={item} className="flex items-center gap-2 border border-zinc-900 bg-black/45 px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-300">
                            <Activity className="h-3.5 w-3.5 text-cyan-300" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">What Happened Next</div>
                      <div className="grid grid-cols-2 gap-2">
                        {HORIZONS.map((horizon) => {
                          const value = selectedCase.outcome.returns[horizon]
                          return (
                            <div key={horizon} className="border border-zinc-900 bg-black/45 p-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">{horizon} Outcome</span>
                                {value !== null && value >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-300" />}
                              </div>
                              <div className={cn("mt-1 text-xl font-black", outcomeTone(value))}>{pct(value)}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Metric label="Volume Z-Score" value={number(selectedCase.state.features.volumeZScore)} />
                      <Metric label="24H Volatility" value={pct(selectedCase.state.features.realizedVolatility24h)} />
                      <Metric label="SMA20 Distance" value={pct(selectedCase.state.features.distanceSma20)} />
                      <Metric label="SMA50 Distance" value={pct(selectedCase.state.features.distanceSma50)} />
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">No cached case selected</div>
                )}
              </Section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
