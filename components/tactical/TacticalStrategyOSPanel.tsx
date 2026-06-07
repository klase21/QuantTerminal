"use client"

import { Ban, BrainCircuit, CheckCircle2, ListChecks, Radar, ShieldAlert, Sparkles, Target, XCircle } from "lucide-react"

import type { TacticalStrategyOS, TacticalStrategyPlaybook } from "@/lib/tactical/tacticalStrategyPlaybookEngine"

function gradeTone(grade: TacticalStrategyPlaybook["fitGrade"]) {
  if (grade === "PRIME") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
  if (grade === "ACTIVE") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
  if (grade === "WATCH") return "border-amber-300/30 bg-amber-400/10 text-amber-100"
  return "border-zinc-700 bg-zinc-950/80 text-zinc-400"
}

function riskTone(risk: TacticalStrategyPlaybook["riskLevel"]) {
  if (risk === "high") return "border-rose-300/25 bg-rose-400/10 text-rose-100"
  if (risk === "medium") return "border-amber-300/25 bg-amber-400/10 text-amber-100"
  return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
}

function PlaybookCard({ playbook, primary = false }: { playbook: TacticalStrategyPlaybook; primary?: boolean }) {
  return (
    <article
      className={`rounded-3xl border p-4 ${
        primary
          ? "border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.16),transparent_36%),rgba(0,0,0,.52)] shadow-[0_0_42px_rgba(34,211,238,.08)]"
          : "border-white/10 bg-white/[0.035]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${gradeTone(playbook.fitGrade)}`}>
              {playbook.fitGrade}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${riskTone(playbook.riskLevel)}`}>
              Risk {playbook.riskLevel}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-black text-white">{playbook.title}</h3>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            {playbook.category.replace("_", " ")} · {playbook.executionMode}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-cyan-100">{playbook.confidence}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">fit</div>
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-zinc-300">{playbook.reason}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {playbook.marketRegime.map((item) => (
          <span key={item} className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            {item.replace("_", "-")}
          </span>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.055] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/80">
            <CheckCircle2 className="h-3.5 w-3.5" /> Conditions
          </div>
          <div className="space-y-1.5 text-xs leading-5 text-zinc-300">
            {playbook.conditions.map((item) => (
              <div key={item}>• {item}</div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-300/12 bg-rose-400/[0.055] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-rose-200/80">
            <XCircle className="h-3.5 w-3.5" /> Invalidation
          </div>
          <div className="space-y-1.5 text-xs leading-5 text-zinc-300">
            {playbook.invalidation.map((item) => (
              <div key={item}>• {item}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-purple-300/12 bg-purple-400/[0.055] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-purple-200/80">
            <Sparkles className="h-3.5 w-3.5" /> Catalysts
          </div>
          <div className="flex flex-wrap gap-2">
            {playbook.catalyst.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 lg:min-w-[150px]">
          <div className="mb-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <Target className="h-3.5 w-3.5" /> Assets
          </div>
          <div className="text-xs font-black text-white">{playbook.linkedAssets.join(" · ")}</div>
        </div>
      </div>
    </article>
  )
}

export default function TacticalStrategyOSPanel({ strategyOS }: { strategyOS: TacticalStrategyOS }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-purple-300/20 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,.15),transparent_34%),rgba(0,0,0,.5)] shadow-[0_0_60px_rgba(168,85,247,.08)]">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
              <BrainCircuit className="h-3.5 w-3.5" /> Tactical Strategy OS
            </div>
            <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">{strategyOS.headline}</h2>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-zinc-400">{strategyOS.summary}</p>
          </div>
          <div className="grid gap-2 text-right">
            <div className="rounded-2xl border border-purple-300/20 bg-purple-400/10 px-4 py-3">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-purple-200/70">Strategy Bias</div>
              <div className="mt-1 text-lg font-black uppercase text-purple-100">{strategyOS.strategyBias}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {strategyOS.regime.map((item) => (
            <span key={item} className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              {item.replace("_", "-")}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <PlaybookCard playbook={strategyOS.primaryPlaybook} primary />

        <aside className="space-y-3">
          <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
              <Radar className="h-3.5 w-3.5" /> Live Strategy Match
            </div>
            <div className="space-y-2">
              {strategyOS.playbooks.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-white">{item.title}</div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{item.fitGrade} · {item.executionMode}</div>
                    </div>
                    <div className="text-lg font-black text-cyan-100">{item.confidence}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-rose-300/15 bg-rose-400/[0.055] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-rose-200">
              <Ban className="h-3.5 w-3.5" /> Suppressed Strategies
            </div>
            <div className="space-y-2">
              {strategyOS.suppressedPlaybooks.length ? (
                strategyOS.suppressedPlaybooks.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-rose-300/10 bg-black/30 p-3 text-xs leading-5 text-zinc-300">
                    <span className="font-black text-white">{item.title}</span> — {item.operatorNote}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-zinc-400">
                  No strategy is fully suppressed. Use ranking and invalidation to choose sizing.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.055] p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
              <ShieldAlert className="h-3.5 w-3.5" /> Operator Note
            </div>
            <div className="text-sm font-semibold leading-6 text-zinc-300">{strategyOS.primaryPlaybook.operatorNote}</div>
          </div>
        </aside>
      </div>
    </section>
  )
}
