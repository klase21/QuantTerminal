"use client"

import { useMemo } from "react"
import type { ReactNode } from "react"

import { useAIIntelligenceLayer } from "@/hooks/useAIIntelligenceLayer"
import type { AutonomousSignal, LiquidityFractureSignal, NarrativeForecastSignal, RegimeTransitionSignal } from "@/core/ai-intelligence/aiIntelligenceTypes"

function metric(value: unknown, digits = 1) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return "--"
  return parsed.toFixed(digits)
}

function tone(value?: string) {
  switch (value) {
    case "ACTIONABLE":
    case "ACCELERATE":
    case "SELF_REINFORCING_EXPANSION":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    case "DEFENSIVE":
    case "CRITICAL":
    case "HIGH":
    case "REVERSAL":
    case "RISK_OFF":
      return "border-red-500/30 bg-red-500/10 text-red-200"
    case "WATCH":
    case "MEDIUM":
    case "VOLATILITY_BREAKOUT":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200"
    default:
      return "border-zinc-800 bg-zinc-950 text-zinc-400"
  }
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
      <div className="h-full rounded-full bg-cyan-300/80" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

function Pill({ children, value }: { children: ReactNode; value?: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone(value)}`}>{children}</span>
}

function ForecastCard({ item }: { item: NarrativeForecastSignal }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.12em] text-zinc-100">{item.sector}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{item.horizon} forecast</div>
        </div>
        <Pill value={item.direction}>{item.direction}</Pill>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_52px] items-center gap-3">
        <Bar value={item.probability} />
        <div className="text-right text-sm font-black text-cyan-200">{metric(item.probability, 0)}%</div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500">{item.operatorRead}</p>
    </div>
  )
}

function FractureRow({ item }: { item: LiquidityFractureSignal }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase text-zinc-100">{item.sector}</div>
        <Pill value={item.level}>{item.level}</Pill>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_48px] items-center gap-3">
        <Bar value={item.fractureScore} />
        <div className="text-right text-xs font-black text-red-200">{metric(item.fractureScore, 0)}</div>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">{item.triggers.slice(0, 3).join(" · ")}</div>
    </div>
  )
}

function RegimePanel({ item }: { item?: RegimeTransitionSignal }) {
  if (!item) return null
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Regime Forecast</div>
      <div className="mt-1 text-sm font-black uppercase text-zinc-100">Regime Transition Probability</div>
      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Projected regime</div>
            <div className="mt-1 text-xl font-black uppercase text-white">{item.to.replaceAll("_", " ")}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-cyan-200">{metric(item.probability, 0)}%</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">probability</div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-400">{item.operatorRead}</p>
      </div>
    </div>
  )
}

function SignalTape({ signals }: { signals: AutonomousSignal[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Signal Ranking</div>
      <div className="mt-1 text-sm font-black uppercase text-zinc-100">Autonomous Intelligence Layer</div>
      <div className="mt-4 space-y-2">
        {signals.slice(0, 8).map((signal) => (
          <div key={signal.id} className="grid grid-cols-[34px_1fr_60px] items-center gap-3 rounded-xl border border-zinc-800 bg-black/35 p-3">
            <div className="text-xs font-black text-zinc-500">#{signal.rank}</div>
            <div className="min-w-0">
              <div className="truncate text-xs font-black uppercase text-zinc-100">{signal.label}</div>
              <div className="mt-1 truncate text-[10px] text-zinc-500">{signal.type} · {signal.priority}</div>
            </div>
            <div className="text-right text-sm font-black text-violet-200">{metric(signal.score, 0)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Phase36_40AIIntelligenceLayer() {
  const { data, error, loading } = useAIIntelligenceLayer()
  const topForecasts = useMemo(() => data?.forecast.slice(0, 4) ?? [], [data])
  const topFractures = useMemo(() => data?.liquidityFractures.slice(0, 4) ?? [], [data])
  const transition = data?.regimeTransitions[0]

  return (
    <section className="rounded-3xl border border-violet-500/20 bg-zinc-950/80 p-5 shadow-[0_0_60px_rgba(139,92,246,0.08)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.36em] text-violet-300/80">AI Intelligence</div>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">AI Intelligence Layer</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Forecasting, liquidity fracture detection, regime transition probability, operator copilot, and autonomous signal ranking derived from the market structure stack.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill value={data?.copilot.priority}>{data?.copilot.priority ?? (loading ? "LOADING" : "IDLE")}</Pill>
          <Pill>{data?.mode ?? "empty"}</Pill>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div> : null}

      <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Operator Copilot</div>
            <div className="mt-1 text-sm font-black uppercase text-zinc-100">AI Operator Copilot</div>
          </div>
          <Pill value={data?.copilot.priority}>{data?.copilot.title ?? "Waiting"}</Pill>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{data?.copilot.summary ?? "Waiting for market structure intelligence."}</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {(data?.copilot.bullets ?? []).slice(0, 3).map((bullet, index) => (
            <div key={`${bullet}-${index}`} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs leading-5 text-zinc-400">{bullet}</div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Narrative Forecast</div>
          <div className="mt-1 text-sm font-black uppercase text-zinc-100">Narrative Forecast Engine</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topForecasts.map((item) => <ForecastCard key={item.sector} item={item} />)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Liquidity Fracture</div>
          <div className="mt-1 text-sm font-black uppercase text-zinc-100">Liquidity Fracture Detection</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {topFractures.map((item) => <FractureRow key={item.sector} item={item} />)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <RegimePanel item={transition} />
        <SignalTape signals={data?.autonomousSignals ?? []} />
      </div>
    </section>
  )
}
