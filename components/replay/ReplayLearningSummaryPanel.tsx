"use client"

import { GraduationCap } from "lucide-react"

import type { ReplayLearningSummary } from "@/core/historical-intelligence/replayLearningSummaryTypes"

export function ReplayLearningSummaryPanel({ summary }: { summary: ReplayLearningSummary }) {
  return (
    <section className="rounded-xl border border-cyan-300/20 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.12),transparent_30%),rgba(9,9,11,.9)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <GraduationCap className="h-3.5 w-3.5" />
          Replay Learning Summary
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
          {summary.caseVerdict} / {summary.confidence}%
        </div>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">What Worked</div>
          <p className="mt-1 text-xs leading-5 text-emerald-50/85">{summary.whatWorked}</p>
        </div>
        <div className="rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">Failed / Warned</div>
          <p className="mt-1 text-xs leading-5 text-amber-50/85">{summary.whatFailedOrWarned}</p>
        </div>
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Historical Lesson</div>
          <p className="mt-1 text-xs leading-5 text-zinc-300">{summary.historicalLesson}</p>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Agent Lesson</div>
            {summary.agentAlignment ? (
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200">{summary.agentAlignment}</div>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-300">{summary.agentLesson}</p>
          {summary.agentFallbackNote ? <p className="mt-1 text-[11px] leading-5 text-amber-100/80">{summary.agentFallbackNote}</p> : null}
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Future Rule</div>
          <p className="mt-1 text-xs leading-5 text-zinc-300">{summary.futureExecutionRule}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-zinc-500">{summary.caveat}</p>
    </section>
  )
}
