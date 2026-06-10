"use client"

import { Activity, BrainCircuit, Gauge, ScanLine, ShieldAlert, TrendingUp } from "lucide-react"

import type { AgentAccuracyStat } from "@/core/historical-intelligence/agentAccuracyEngine"
import type { ReplayAgentTone, ReplayFrame } from "@/core/replay/replayTypes"
import { ReplayInsightCard } from "./ReplayInsightCard"
import { ReplayMetricBadge } from "./ReplayMetricBadge"

function toneClass(tone: ReplayAgentTone) {
  if (tone === "BULLISH") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
  if (tone === "BEARISH") return "border-rose-300/25 bg-rose-400/10 text-rose-100"
  if (tone === "DEFENSIVE") return "border-amber-300/25 bg-amber-400/10 text-amber-100"
  return "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
}

export function AgentReadPanel({ frame, stats }: { frame: ReplayFrame; stats: AgentAccuracyStat[] }) {
  const icons = [TrendingUp, Activity, BrainCircuit, Gauge, ShieldAlert]
  const statByAgent = new Map(stats.map((stat) => [stat.agent, stat]))
  const top = stats[0]
  const weakest = stats[stats.length - 1]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <BrainCircuit className="h-3.5 w-3.5" />
          Agent Read
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
          top {top?.agent ?? "N/A"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ReplayInsightCard title={top?.agent ?? "N/A"} status="most useful" metric={`${top?.accuracyScore ?? 0}%`} tone="green">
          <ReplayMetricBadge label={top?.caseAlignment ?? "catalog"} tone="green" />
        </ReplayInsightCard>
        <ReplayInsightCard title={weakest?.agent ?? "N/A"} status="cross-check" metric={`${weakest?.accuracyScore ?? 0}%`} tone="rose">
          <ReplayMetricBadge label={weakest?.caseAlignment ?? "catalog"} tone="rose" />
        </ReplayInsightCard>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {frame.agents.map((agent, index) => {
          const Icon = icons[index] ?? BrainCircuit
          const stat = statByAgent.get(agent.agent as AgentAccuracyStat["agent"])
          return (
            <ReplayInsightCard
              key={agent.agent}
              icon={Icon}
              title={agent.agent}
              status={agent.tone}
              metric={`${agent.confidence}%`}
              description={agent.summary}
            >
              <div className="flex flex-wrap gap-1.5">
                <ReplayMetricBadge label={`accuracy ${stat?.accuracyScore ?? 0}%`} />
                <ReplayMetricBadge label={`cal ${stat?.confidenceCalibrationScore ?? 0}%`} />
                {stat?.caseAlignment ? <ReplayMetricBadge label={stat.caseAlignment} tone="cyan" /> : null}
              </div>
              <details className="mt-2 text-[11px] leading-5 text-zinc-500">
                <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em]">Details</summary>
                <div className="mt-1">{stat?.alignmentRead ?? stat?.tacticalTakeaway ?? agent.watch}</div>
              </details>
            </ReplayInsightCard>
          )
        })}
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-lg border border-zinc-900 bg-black/35 p-2 text-[11px] leading-5 text-zinc-500">
        <ScanLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
        Agent stance and historical calibration are shown together so the committee read is not interpreted without reliability context.
      </div>
    </section>
  )
}
