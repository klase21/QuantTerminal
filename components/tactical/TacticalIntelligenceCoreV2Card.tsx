"use client"

import { Activity, AlertTriangle, Crosshair, Flame, ListChecks, TimerReset } from "lucide-react"

import type { TacticalInsightV3 } from "@/lib/tactical/tacticalInsightEngineV3"
import type { ExecutionIntelligenceV3 } from "@/lib/tactical/executionIntelligenceV3"

function toneForAttention(attention: TacticalInsightV3["attention"]) {
  if (attention === "EXTREME") return "border-rose-300/30 bg-rose-500/10 text-rose-100"
  if (attention === "ELEVATED") return "border-amber-300/30 bg-amber-500/10 text-amber-100"
  return "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  )
}

export default function TacticalIntelligenceCoreV2Card({
  insight,
  executionIntelligence,
}: {
  insight: TacticalInsightV3
  executionIntelligence?: ExecutionIntelligenceV3
}) {
  const primaryEvents = insight.events.slice(0, 4)
  const primaryOpportunities = insight.opportunities.slice(0, 3)

  return (
    <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.13),transparent_32%),rgba(0,0,0,.52)] shadow-[0_0_60px_rgba(34,211,238,.08)]">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
              <Crosshair className="h-3.5 w-3.5" /> Tactical Intelligence Core
            </div>
            <h3 className="mt-3 text-2xl font-black text-white md:text-3xl">{insight.headline}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{insight.summary}</p>
          </div>

          <div className={`rounded-2xl border px-4 py-3 text-right ${toneForAttention(insight.attention)}`}>
            <div className="text-[9px] font-black uppercase tracking-[0.24em] opacity-70">Attention</div>
            <div className="mt-1 text-xl font-black">{insight.attention}</div>
          </div>
        </div>

        {executionIntelligence ? (
          <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.055] px-4 py-3 text-xs font-bold leading-5 text-cyan-50/90">
            Router Sync: {executionIntelligence.routeSync} · Primary: {executionIntelligence.primarySymbol} · Event Pressure: {executionIntelligence.decayAdjustedEventPressure}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <MetricPill label="Bias" value={insight.bias} />
          <MetricPill label="Mode" value={insight.executionMode} />
          <MetricPill label="Timing" value={insight.timing} />
          <MetricPill label="Conviction" value={`${insight.conviction}%`} />
          <MetricPill label="Risk" value={insight.riskLevel} />
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
            <ListChecks className="h-3.5 w-3.5" /> Tactical Playbook
          </div>
          <div className="space-y-2">
            {insight.playbook.map((item) => (
              <div key={item} className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.06] p-3 text-sm font-semibold leading-5 text-emerald-50/90">
                {item}
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.07] p-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                <TimerReset className="h-3.5 w-3.5" /> Wait For
              </div>
              <div className="mt-2 space-y-1.5 text-xs leading-5 text-zinc-300">
                {insight.waitFor.map((item) => (
                  <div key={item}>• {item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.07] p-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" /> Invalidation
              </div>
              <div className="mt-2 text-xs leading-5 text-zinc-300">{insight.invalidation}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            <Activity className="h-3.5 w-3.5" /> Tactical Event Bus
          </div>
          <div className="space-y-2">
            {primaryEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-white">{event.label}</div>
                    <div className="mt-1 text-xs leading-4 text-zinc-500">{event.executionImpact}</div>
                  </div>
                  <div className="text-right text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">
                    {event.source}<br />{Math.round(event.confidence)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-white/10 p-5">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
          <Flame className="h-3.5 w-3.5" /> Opportunity Ranking
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {primaryOpportunities.map((opportunity) => (
            <div key={opportunity.symbol} className="rounded-2xl border border-purple-300/12 bg-purple-400/[0.055] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white">{opportunity.label}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-200/80">{opportunity.grade}</div>
                </div>
                <div className="text-xl font-black text-purple-100">{opportunity.score}</div>
              </div>
              <div className="mt-2 text-xs leading-5 text-zinc-400">{opportunity.reason}</div>
              <div className="mt-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[11px] font-bold text-zinc-300">{opportunity.risk}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
