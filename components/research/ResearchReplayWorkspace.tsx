"use client"

import { useEffect, useMemo, useState } from "react"
import type { RealMarketRotationResponse } from "@/core/marketDataTypes"
import { generateNarrativeSurface } from "@/core/narrative/generateNarrativeSurface"
import { deriveHistoricalReplaySurface } from "@/core/replay/deriveHistoricalReplay"
import type { ReplayWindow } from "@/core/replay/historicalReplayTypes"

const WINDOWS: ReplayWindow[] = ["30D", "90D", "180D"]
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

function metric(value: unknown, digits = 0) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return "--"
  return number.toFixed(digits)
}

function lifecycleClass(phase?: string) {
  switch (phase) {
    case "EARLY":
      return "border-blue-500/25 bg-blue-500/10 text-blue-200"
    case "EXPANDING":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "VIRAL":
      return "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200"
    case "OVERCROWDED":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    case "EXITING":
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
    default:
      return "border-zinc-800 bg-zinc-900 text-zinc-400"
  }
}

function replayStateClass(state?: string) {
  switch (state) {
    case "Accelerating":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "Overheated":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    case "Forming":
      return "border-blue-500/25 bg-blue-500/10 text-blue-200"
    case "Fading":
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
    default:
      return "border-zinc-800 bg-zinc-900 text-zinc-400"
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

export default function ResearchReplayWorkspace() {
  const [rotationData, setRotationData] = useState<RealMarketRotationResponse | null>(null)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [state, setState] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [window, setWindow] = useState<ReplayWindow>("90D")
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    async function load() {
      try {
        setState((prev) => (prev === "idle" ? "loading" : prev))
        const response = await fetch("/api/market/sector-rotation", { cache: "no-store" })
        const payload = (await response.json()) as RealMarketRotationResponse
        if (!alive) return
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.notes?.[0] ?? `sector rotation returned ${response.status}`)
        }
        setRotationData(payload)
        setState(payload.mode === "partial" ? "partial" : "live")
        setError(null)
      } catch (err) {
        if (!alive) return
        setState("error")
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

    async function loadNews() {
      try {
        const regions = ["kr", "en", "cn"]
        const responses = await Promise.all(
          regions.map(async (region) => {
            const response = await fetch(`/api/news?region=${region}&translate=false`, { cache: "no-store" })
            if (!response.ok) return [] as NewsItem[]
            const payload = await response.json()
            return Array.isArray(payload) ? (payload.slice(0, 16) as NewsItem[]) : []
          })
        )
        if (!alive) return
        setNewsItems(responses.flat())
      } catch {
        if (!alive) return
        setNewsItems([])
      }
    }

    loadNews()
    return () => {
      alive = false
    }
  }, [])

  const narrative = useMemo(() => generateNarrativeSurface(rotationData, newsItems), [rotationData, newsItems])
  const replay = useMemo(() => deriveHistoricalReplaySurface(narrative, window, cursor), [narrative, window, cursor])
  const frames = replay.frames
  const activeFrame = replay.current

  useEffect(() => {
    if (!playing || !frames.length) return
    const timer = setInterval(() => {
      setCursor((prev) => (prev + 1) % frames.length)
    }, 950)
    return () => clearInterval(timer)
  }, [playing, frames.length])

  useEffect(() => {
    setCursor(0)
  }, [window])

  return (
    <section className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">Historical Replay Intelligence</div>
              <div className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-white">
                {activeFrame?.leadNarrative ?? "NO DATA"} · {activeFrame?.replayState ?? "WAITING"}
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
                Replay compresses the current narrative, participation, crowding, and geo-diffusion state into a time-sequenced research view. It is scaffolded for live snapshot persistence later, but already exposes phase transitions cleanly.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {WINDOWS.map((item) => (
                <button
                  key={item}
                  onClick={() => setWindow(item)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${window === item ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" : "border-zinc-800 bg-black text-zinc-500"}`}
                >
                  {item}
                </button>
              ))}
              <button
                onClick={() => setPlaying((prev) => !prev)}
                className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200"
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => setCursor((prev) => (prev + 1) % Math.max(1, frames.length))}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300"
              >
                Step
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Lifecycle</div>
              <div className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${lifecycleClass(activeFrame?.lifecycle)}`}>
                {activeFrame?.lifecycle ?? "--"}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Replay State</div>
              <div className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${replayStateClass(activeFrame?.replayState)}`}>
                {activeFrame?.replayState ?? "--"}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Participation</div>
              <div className="mt-2 text-xl font-black text-cyan-200">{metric(activeFrame?.participation)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Crowding</div>
              <div className="mt-2 text-xl font-black text-orange-200">{metric(activeFrame?.crowding)}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-2 md:grid-cols-9 xl:grid-cols-[repeat(15,minmax(0,1fr))]">
            {frames.map((frame, index) => (
              <button
                key={frame.id}
                onClick={() => setCursor(index)}
                className={`min-h-16 rounded-xl border p-2 text-left transition ${index === cursor ? "border-cyan-400/60 bg-cyan-500/15" : "border-zinc-900 bg-black/50 hover:border-zinc-700"}`}
                title={frame.operatorNote}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">{frame.timestampLabel}</span>
                  <span className="text-[9px] font-black text-zinc-400">{metric(frame.intensity)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.min(100, Math.max(0, frame.intensity))}%` }} />
                </div>
                <div className={`mt-2 truncate text-[9px] font-bold uppercase ${directionClass(frame.direction)}`}>{frame.leadNarrative}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-black/35 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Operator Replay Note</div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{activeFrame?.operatorNote ?? replay.compressedSummary}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Case Study Generator</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">{state.toUpperCase()}</div>
            </div>

            <div className="mt-3 rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Replay Thesis</div>
              <div className="mt-2 text-sm font-black uppercase tracking-[0.08em] text-white">{replay.caseStudy.title}</div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{replay.caseStudy.thesis}</p>
            </div>

            <div className="mt-3 space-y-2">
              {replay.caseStudy.sequence.map((step) => (
                <div key={step} className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs leading-5 text-zinc-300">
                  {step}
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-orange-300/80">Replay Risk</div>
              <p className="mt-2 text-xs leading-5 text-orange-100/80">{replay.caseStudy.risk}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Replay Components</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">Liquidity <span className="font-bold text-zinc-300">{metric(activeFrame?.liquidity)}</span></div>
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">Breadth <span className="font-bold text-zinc-300">{metric(activeFrame?.breadth)}</span></div>
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">Confidence <span className="font-bold text-zinc-300">{metric(activeFrame?.confidence)}</span></div>
              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">Diffusion <span className="font-bold text-zinc-300">{activeFrame?.diffusion.replaceAll("_", " ") ?? "--"}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
