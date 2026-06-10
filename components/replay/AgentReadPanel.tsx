"use client"

import { Activity, BrainCircuit, Gauge, ScanLine, ShieldAlert, TrendingUp } from "lucide-react"

import type { AgentAccuracyStat } from "@/core/historical-intelligence/agentAccuracyEngine"
import type { ReplayAgentTone, ReplayFrame } from "@/core/replay/replayTypes"

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
        <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">Most Useful</div>
          <div className="mt-1 text-sm font-black text-white">{top?.agent ?? "N/A"}</div>
          <div className="mt-1 text-xs font-black text-emerald-100">{top?.accuracyScore ?? 0}% / {top?.caseAlignment ?? "catalog"}</div>
        </div>
        <div className="rounded-lg border border-rose-300/15 bg-rose-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/70">Cross-check</div>
          <div className="mt-1 text-sm font-black text-white">{weakest?.agent ?? "N/A"}</div>
          <div className="mt-1 text-xs font-black text-rose-100">{weakest?.accuracyScore ?? 0}% / {weakest?.caseAlignment ?? "catalog"}</div>
        </div>
      </div>

      <div className="mt-2 grid gap-2">
        {frame.agents.map((agent, index) => {
          const Icon = icons[index] ?? BrainCircuit
          const stat = statByAgent.get(agent.agent as AgentAccuracyStat["agent"])
          return (
            <article key={agent.agent} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-white">{agent.agent}</div>
                    <div className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${toneClass(agent.tone)}`}>
                      {agent.tone} / {agent.confidence}%
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{agent.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
                      accuracy {stat?.accuracyScore ?? 0}%
                    </span>
                    <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
                      calibration {stat?.confidenceCalibrationScore ?? 0}%
                    </span>
                    {stat?.caseAlignment ? (
                      <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100/80">
                        {stat.caseAlignment}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-zinc-500">{stat?.alignmentRead ?? stat?.tacticalTakeaway ?? agent.watch}</p>
                </div>
              </div>
            </article>
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

