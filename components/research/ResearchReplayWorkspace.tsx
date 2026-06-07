"use client"

import { useEffect, useMemo, useState } from "react"
import type { RealMarketRotationResponse, SectorRotationSnapshot } from "@/core/marketDataTypes"

const WINDOWS = ["30D", "90D", "180D"] as const

type ReplayWindow = (typeof WINDOWS)[number]
type FetchState = "idle" | "loading" | "live" | "partial" | "error"

function metric(value: unknown, digits = 2) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return "--"
  return number.toFixed(digits)
}

function directionClass(direction?: string) {
  switch (direction) {
    case "INFLOW":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "OUTFLOW":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    case "CHURN":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function buildReplayFrames(sectors: SectorRotationSnapshot[], replayWindow: ReplayWindow) {
  const frameCount = replayWindow === "30D" ? 30 : replayWindow === "90D" ? 45 : 60
  const leaders = sectors.slice(0, 5)
  return Array.from({ length: frameCount }, (_, index) => {
    const progress = frameCount <= 1 ? 1 : index / (frameCount - 1)
    const leader = leaders[index % Math.max(1, leaders.length)]
    const intensity = leader ? Math.max(8, Math.min(100, leader.rotationScore * (0.72 + progress * 0.28))) : 0
    const phase = progress < 0.25 ? "SCAN" : progress < 0.45 ? "CHURN" : progress < 0.7 ? "INFLOW" : progress < 0.88 ? "EXPANSION" : "WATCH"
    return {
      id: `replay-${replayWindow}-${index}`,
      index,
      label: `T-${frameCount - index}`,
      phase,
      leader: leader?.sector ?? "--",
      direction: leader?.direction ?? "QUIET",
      intensity,
    }
  })
}

export default function ResearchReplayWorkspace() {
  const [rotationData, setRotationData] = useState<RealMarketRotationResponse | null>(null)
  const [state, setState] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [window, setWindow] = useState<ReplayWindow>("90D")
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        setState("loading")
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
    return () => {
      alive = false
    }
  }, [])

  const frames = useMemo(() => buildReplayFrames(rotationData?.sectors ?? [], window), [rotationData, window])
  const activeFrame = frames[Math.min(cursor, Math.max(0, frames.length - 1))]
  const topSectors = rotationData?.sectors.slice(0, 6) ?? []

  useEffect(() => {
    if (!playing || !frames.length) return
    const timer = setInterval(() => {
      setCursor((prev) => (prev + 1) % frames.length)
    }, 900)
    return () => clearInterval(timer)
  }, [playing, frames.length])

  useEffect(() => {
    setCursor(0)
  }, [window])

  return (
    <section className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">Research Replay</div>
              <div className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-white">
                {activeFrame?.phase ?? "WAITING"} · {activeFrame?.leader ?? "NO DATA"}
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
                Regime Lab replay controls have been promoted into a focused research workspace. This view replays the current real rotation map as a research sequence without keeping the full experimental lab in the main tab list.
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

          <div className="mt-5 grid grid-cols-5 gap-2">
            {frames.slice(0, 40).map((frame, index) => (
              <button
                key={frame.id}
                onClick={() => setCursor(index)}
                className={`h-14 rounded-xl border p-2 text-left transition ${index === cursor ? "border-cyan-400/60 bg-cyan-500/15" : "border-zinc-900 bg-black/50 hover:border-zinc-700"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">{frame.label}</span>
                  <span className="text-[9px] font-black text-zinc-400">{metric(frame.intensity, 0)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.min(100, Math.max(0, frame.intensity))}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Case Study Generator</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">{state.toUpperCase()}</div>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Current Replay Thesis</div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {topSectors[0]
                ? `${topSectors[0].sector} is the leading rotation candidate with ${topSectors[0].direction} pressure and ${metric(topSectors[0].confidence)} confidence.`
                : "Waiting for live sector rotation data."}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {topSectors.map((sector) => (
              <div key={sector.sector} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black uppercase text-zinc-100">#{sector.rank} {sector.sector}</div>
                    <div className="mt-1 text-[11px] text-zinc-500">{sector.topSymbols.slice(0, 4).join(" · ")}</div>
                  </div>
                  <div className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${directionClass(sector.direction)}`}>{sector.direction}</div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  <span>Score {metric(sector.rotationScore)}</span>
                  <span>Breadth {metric(sector.breadth, 0)}%</span>
                  <span>Vol {metric(sector.volatility, 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
