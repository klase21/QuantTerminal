"use client"

import { Activity, Gauge, ShieldAlert, TrendingUp } from "lucide-react"
import { buildCorrelationRegimeState } from "@/core/correlation/correlationRegimeEngine"

export default function CorrelationRegimePanel() {
  const state = buildCorrelationRegimeState()

  const regimeTone =
    state.regime === "RISK_ON_EXPANSION"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
      : state.regime === "FRAGILE_RALLY" || state.regime === "PERP_EUPHORIA"
        ? "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
        : state.regime === "LIQUIDITY_SQUEEZE" || state.regime === "DEFENSIVE_ROTATION"
          ? "border-red-300/25 bg-red-400/10 text-red-100"
          : "border-zinc-700 bg-zinc-900 text-zinc-200"

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-black/60 p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Correlation Regime Engine
          </div>
          <div className="mt-1 text-2xl font-black text-white">
            Cross-market tactical state
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            {state.summary}
          </p>
        </div>

        <div className={`rounded-2xl border px-4 py-3 text-right ${regimeTone}`}>
          <div className="text-[10px] uppercase tracking-wide opacity-70">Regime</div>
          <div className="mt-1 text-sm font-black">{state.regime.replaceAll("_", " ")}</div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        <Metric icon={<TrendingUp size={15} />} label="Risk-On" value={state.riskOnScore} tone="green" />
        <Metric icon={<ShieldAlert size={15} />} label="Liquidity Stress" value={state.liquidityStress} tone="red" />
        <Metric icon={<Activity size={15} />} label="Confirmation" value={state.crossAssetConfirmation} tone="cyan" />
        <Metric icon={<Gauge size={15} />} label="Fragile Rally" value={state.fragileRallyRisk} tone="yellow" />
        <Metric icon={<TrendingUp size={15} />} label="Beta Leadership" value={state.betaLeadership} tone="purple" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
            Tactical Rules
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            {state.tacticalRules.map((rule, index) => (
              <div key={rule} className="rounded-2xl border border-zinc-900 bg-black/55 p-3 text-sm leading-6 text-zinc-300">
                <span className="mr-2 font-black text-cyan-300">{index + 1}.</span>
                {rule}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
            Dynamic Weights
          </div>

          <Weight label="Macro" value={state.macroWeight} />
          <Weight label="Execution" value={state.executionWeight} />
          <Weight label="Narrative" value={state.narrativeWeight} />
        </div>
      </div>
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: "green" | "red" | "cyan" | "yellow" | "purple"
}) {
  const color =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : tone === "yellow"
          ? "text-yellow-300"
          : tone === "purple"
            ? "text-purple-300"
            : "text-cyan-300"

  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
        <span className={color}>{icon}</span>
        {label}
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
        <div className={`h-full rounded-full ${tone === "red" ? "bg-red-300" : tone === "yellow" ? "bg-yellow-300" : tone === "green" ? "bg-emerald-300" : tone === "purple" ? "bg-purple-300" : "bg-cyan-300"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function Weight({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.round(value * 70))

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className="font-black text-white">{value.toFixed(2)}x</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
