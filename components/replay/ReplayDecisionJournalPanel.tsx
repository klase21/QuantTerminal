"use client"

import { NotebookPen } from "lucide-react"

import type { ReplayDecisionJournal } from "@/core/historical-intelligence/replayDecisionJournalTypes"

function decisionClass(decision: ReplayDecisionJournal["hypotheticalDecision"]) {
  if (decision === "long") return "text-emerald-200"
  if (decision === "short") return "text-rose-200"
  if (decision === "wait") return "text-amber-200"
  return "text-zinc-300"
}

export function ReplayDecisionJournalPanel({ journal }: { journal: ReplayDecisionJournal }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <NotebookPen className="h-3.5 w-3.5" />
          Decision Journal
        </div>
        <div className={`text-[10px] font-black uppercase tracking-[0.14em] ${decisionClass(journal.hypotheticalDecision)}`}>
          {journal.hypotheticalDecision} / {journal.confidence}%
        </div>
      </div>
      <div className="grid gap-2">
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Decision Reason</div>
          <p className="mt-1 text-xs leading-5 text-cyan-50/85">{journal.decisionReason}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Expected</div>
            <p className="mt-1 text-xs leading-5 text-zinc-300">{journal.expectedOutcome}</p>
          </div>
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Actual</div>
            <p className="mt-1 text-xs leading-5 text-zinc-300">{journal.actualOutcome}</p>
          </div>
        </div>
        <div className="rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">Invalidation / Mistake</div>
          <p className="mt-1 text-xs leading-5 text-amber-50/85">{journal.invalidationCondition}</p>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100/70">{journal.mistakeTag}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Future Rule</div>
          <p className="mt-1 text-xs leading-5 text-zinc-300">{journal.futureRule}</p>
        </div>
      </div>
    </section>
  )
}
