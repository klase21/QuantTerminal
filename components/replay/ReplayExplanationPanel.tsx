"use client"

import { FileQuestion } from "lucide-react"

import type { ReplayExplanation } from "@/core/historical-intelligence/replayExplanationTypes"

function resultClass(result: ReplayExplanation["setupResult"]) {
  if (result === "worked") return "text-emerald-200"
  if (result === "failed") return "text-rose-200"
  return "text-amber-200"
}

export function ReplayExplanationPanel({ explanation }: { explanation: ReplayExplanation }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <FileQuestion className="h-3.5 w-3.5" />
        Replay Explanation
      </div>
      <div className="flex items-start justify-between gap-3 rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Setup Result</div>
          <div className={`mt-1 text-sm font-black uppercase ${resultClass(explanation.setupResult)}`}>{explanation.setupResult}</div>
        </div>
        <div className="text-right text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
          {explanation.selectedReplayCase.symbol}
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Primary Reason</div>
        <p className="mt-1 text-xs leading-5 text-zinc-300">{explanation.primaryReason}</p>
      </div>
      <div className="mt-2 grid gap-2">
        <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">Supporting Factors</div>
          <div className="mt-2 space-y-1.5">
            {explanation.supportingFactors.slice(0, 3).map((factor) => (
              <div key={factor} className="text-xs leading-5 text-emerald-50/80">{factor}</div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-rose-300/15 bg-rose-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/70">Failure Factors</div>
          <div className="mt-2 space-y-1.5">
            {explanation.failureFactors.slice(0, 3).map((factor) => (
              <div key={factor} className="text-xs leading-5 text-rose-50/80">{factor}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Future Execution Rule</div>
        <p className="mt-1 text-xs leading-5 text-zinc-300">{explanation.futureExecutionRule}</p>
      </div>
    </section>
  )
}
