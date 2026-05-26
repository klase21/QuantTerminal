"use client"

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Crosshair,
  Gauge,
  Radar,
  Route,
  Sparkles,
  Zap,
} from "lucide-react"

import { buildPredictiveIntelligence } from "@/core/predictive/buildPredictiveIntelligence"
import type { LiquidityZone, NarrativeMomentumSignal, PredictiveIntelligenceState } from "@/core/predictive/predictiveTypes"

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}

function ToneBar({ label, value, tone = "cyan" }: { label: string; value: number; tone?: "cyan" | "green" | "red" | "amber" | "purple" }) {
  const toneClass =
    tone === "green"
      ? "from-emerald-500 to-green-300 shadow-[0_0_16px_rgba(74,222,128,.3)]"
      : tone === "red"
      ? "from-rose-500 to-red-300 shadow-[0_0_16px_rgba(248,113,113,.3)]"
      : tone === "amber"
      ? "from-amber-500 to-yellow-300 shadow-[0_0_16px_rgba(251,191,36,.25)]"
      : tone === "purple"
      ? "from-fuchsia-500 to-violet-300 shadow-[0_0_16px_rgba(217,70,239,.25)]"
      : "from-cyan-500 to-sky-300 shadow-[0_0_16px_rgba(34,211,238,.28)]"

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        <span>{label}</span>
        <span className="font-black text-zinc-200">{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-950 ring-1 ring-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneClass}`} style={{ width: `${clamp(value, 3, 100)}%` }} />
      </div>
    </div>
  )
}

function ProbabilityMeter({ state }: { state: PredictiveIntelligenceState }) {
  const direction = state.probability.direction
  const probability = clamp(state.probability.probability)
  const isLong = direction === "LONG"
  const isShort = direction === "SHORT"
  const tone = isLong ? "green" : isShort ? "red" : "amber"
  const shell = isLong
    ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
    : isShort
    ? "border-rose-300/30 bg-rose-500/10 text-rose-100"
    : "border-amber-300/30 bg-amber-500/10 text-amber-100"

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          <Gauge size={13} className="text-cyan-300" />
          Probability Meter
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${shell}`}>
          {direction}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-4xl font-black tracking-tight text-white">{Math.round(probability)}%</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">next move odds</div>
        </div>
        <div className="relative h-16 w-16 rounded-full border border-cyan-300/20 bg-cyan-300/5">
          <div className="qt-confidence-breath absolute inset-1 rounded-full border border-cyan-300/30" />
          <div className="absolute inset-4 rounded-full bg-cyan-300/20 blur-md" />
          <Crosshair size={20} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-200" />
        </div>
      </div>

      <div className="mt-3">
        <ToneBar label="Realtime confidence" value={state.confidence.finalConfidence} tone={tone} />
      </div>
    </div>
  )
}

function RotationPredictionOverlay({ state }: { state: PredictiveIntelligenceState }) {
  const rotation = state.primaryRotation
  const probability = clamp(rotation.probability)

  return (
    <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-cyan-300/15 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.13),rgba(0,0,0,.95)_62%)] p-4">
      <div className="qt-predictive-scan absolute inset-0 opacity-60" />
      <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/5" />

      <div className="relative z-10 mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            <Route size={13} />
            Predictive Rotation Overlay
          </div>
          <div className="mt-1 text-xs text-zinc-500">visual next-capital-flow candidate</div>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-100">
          {probability}% CONF
        </div>
      </div>

      <div className="relative z-10 mt-6 grid grid-cols-[1fr_92px_1fr] items-center gap-3">
        <div className="qt-node-breathe rounded-2xl border border-zinc-700 bg-zinc-950/80 p-3 text-center shadow-[0_0_35px_rgba(39,39,42,.5)]">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">capital leaving</div>
          <div className="mt-2 text-lg font-black text-zinc-100">{rotation.from}</div>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-zinc-500" style={{ width: `${Math.max(18, 100 - probability / 2)}%` }} />
          </div>
        </div>

        <div className="relative h-16">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-300/25" />
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className="qt-predictive-particle absolute top-1/2 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,.8)]"
              style={{ animationDelay: `${index * 0.34}s` }}
            />
          ))}
          <ArrowRight size={22} className="absolute right-0 top-1/2 -translate-y-1/2 text-cyan-200" />
        </div>

        <div className="qt-target-glow rounded-2xl border border-cyan-300/25 bg-cyan-400/10 p-3 text-center shadow-[0_0_45px_rgba(34,211,238,.16)]">
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">probable target</div>
          <div className="mt-2 text-lg font-black text-white">{rotation.to}</div>
          <div className="mt-2 h-1.5 rounded-full bg-cyan-950">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(12, probability)}%` }} />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 grid gap-2 md:grid-cols-3">
        <ToneBar label="velocity" value={rotation.velocity} />
        <ToneBar label="acceleration" value={rotation.acceleration} tone="purple" />
        <ToneBar label="confidence" value={rotation.confidence} tone="green" />
      </div>
    </div>
  )
}

function LiquidityHeatmapVisual({ zones }: { zones: LiquidityZone[] }) {
  const upside = zones.find((zone) => zone.side === "upside") ?? zones[0]
  const downside = zones.find((zone) => zone.side === "downside") ?? zones[1]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        <Radar size={13} className="text-cyan-300" />
        Liquidity Heatmap
      </div>

      <div className="relative h-32 overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-emerald-400/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-rose-400/25 to-transparent" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-zinc-700" />
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between text-[10px] text-emerald-200">
          <span>Upside magnet</span>
          <span>{upside?.sweepProbability ?? 0}% sweep</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] text-rose-200">
          <span>Downside magnet</span>
          <span>{downside?.sweepProbability ?? 0}% sweep</span>
        </div>
        <div
          className="qt-liquidity-band absolute left-0 h-4 rounded-r-full bg-emerald-300/40 blur-[1px]"
          style={{ top: "22%", width: `${clamp(upside?.magnetScore ?? 0, 12, 100)}%` }}
        />
        <div
          className="qt-liquidity-band absolute right-0 h-4 rounded-l-full bg-rose-300/40 blur-[1px]"
          style={{ bottom: "22%", width: `${clamp(downside?.magnetScore ?? 0, 12, 100)}%`, animationDelay: ".8s" }}
        />
        <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_20px_rgba(34,211,238,.22)]" />
      </div>

      <div className="mt-3 space-y-2">
        {zones.slice(0, 2).map((zone) => (
          <div key={zone.label} className="rounded-xl border border-zinc-800 bg-black/50 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-200">{zone.label}</span>
              <span className={zone.side === "upside" ? "text-emerald-300" : "text-rose-300"}>{zone.magnetScore}% magnet</span>
            </div>
            <div className="mt-1 text-[11px] leading-4 text-zinc-500">{zone.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NarrativeMomentumWidget({ narrative }: { narrative: NarrativeMomentumSignal }) {
  const phaseTone =
    narrative.phase === "EXPANSION"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
      : narrative.phase === "EXHAUSTION"
      ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
      : narrative.phase === "SATURATION"
      ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
      : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          <Sparkles size={13} className="text-purple-300" />
          Narrative Momentum
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${phaseTone}`}>{narrative.phase}</span>
      </div>
      <div className="text-sm font-black text-white">{narrative.narrative}</div>
      <div className="mt-3 space-y-3">
        <ToneBar label="velocity" value={narrative.velocity} tone="cyan" />
        <ToneBar label="acceleration" value={narrative.acceleration} tone="purple" />
        <ToneBar label="saturation" value={narrative.saturation} tone="amber" />
        <ToneBar label="exhaustion risk" value={narrative.exhaustionRisk} tone="red" />
      </div>
    </div>
  )
}

function TacticalSummaryCard({ state }: { state: PredictiveIntelligenceState }) {
  return (
    <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-3 shadow-[0_0_30px_rgba(34,211,238,.07)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <BrainCircuit size={14} />
          Tactical AI Summary
        </div>
        <span className="rounded-full border border-zinc-700 bg-black px-2 py-1 text-[10px] font-black text-zinc-300">
          live read
        </span>
      </div>
      <p className="text-sm leading-6 text-zinc-200">{state.summary}</p>
      <div className="mt-3 rounded-xl border border-zinc-800 bg-black/55 px-3 py-2 text-[11px] leading-5 text-zinc-500">
        Invalidation: <span className="text-zinc-300">{state.probability.invalidation}</span>
      </div>
    </div>
  )
}

function ScenarioPanel({ state }: { state: PredictiveIntelligenceState }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        <Zap size={13} className="text-amber-300" />
        Scenario Simulation
      </div>
      <div className="space-y-2">
        {state.scenarios.slice(0, 3).map((scenario) => (
          <div key={scenario.scenario} className="rounded-xl border border-zinc-800 bg-black/50 px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-zinc-200">{scenario.scenario}</span>
              <span className={scenario.probabilityShift >= 0 ? "text-emerald-300" : "text-rose-300"}>
                {scenario.probabilityShift >= 0 ? "+" : ""}{scenario.probabilityShift}%
              </span>
            </div>
            <div className="mt-1 text-[11px] leading-4 text-zinc-500">{scenario.expectedImpact}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PsychologyPanel({ state }: { state: PredictiveIntelligenceState }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        <Activity size={13} className="text-amber-300" />
        Market Psychology
      </div>
      <div className="space-y-3">
        <ToneBar label="euphoria" value={state.psychology.euphoria} tone="green" />
        <ToneBar label="panic" value={state.psychology.panic} tone="red" />
        <ToneBar label="retail aggression" value={state.psychology.retailAggression} tone="amber" />
        <ToneBar label="smart money divergence" value={state.psychology.smartMoneyDivergence} tone="purple" />
      </div>
      <div className="mt-3 flex gap-2 rounded-xl border border-amber-300/15 bg-amber-300/5 p-2 text-[11px] leading-4 text-zinc-400">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
        {state.psychology.read}
      </div>
    </div>
  )
}

export default function PredictiveTradeIntelligencePanel({ flow }: { flow: any }) {
  const state = buildPredictiveIntelligence(flow)

  return (
    <div className="rounded-2xl border border-cyan-300/15 bg-black/85 p-3 shadow-[0_0_30px_rgba(34,211,238,.08)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Predictive Tactical Visualization</div>
          <div className="mt-1 text-sm font-black text-white">Flow → Probability → Rotation → Scenario</div>
        </div>
        <div className="qt-confidence-breath rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-100">
          CONF {state.confidence.finalConfidence}%
        </div>
      </div>

      <div className="grid gap-3 2xl:grid-cols-[1.25fr_.75fr]">
        <RotationPredictionOverlay state={state} />
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
          <ProbabilityMeter state={state} />
          <TacticalSummaryCard state={state} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <LiquidityHeatmapVisual zones={state.liquidityZones} />
        <NarrativeMomentumWidget narrative={state.narrative} />
        <div className="grid gap-3">
          <PsychologyPanel state={state} />
          <ScenarioPanel state={state} />
        </div>
      </div>
    </div>
  )
}
