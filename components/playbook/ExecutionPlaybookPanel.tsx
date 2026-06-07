"use client"

import { Crosshair, ShieldAlert, Target } from "lucide-react"
import TacticalFocusCard from "@/components/focus/TacticalFocusCard"
import ExecutionChecklist from "@/components/playbook/ExecutionChecklist"
import { buildExecutionPlaybook } from "@/core/playbook/executionPlaybookEngine"

export default function ExecutionPlaybookPanel({ flow }: { flow?: any }) {
  const playbook = buildExecutionPlaybook({
    buyPressure: Number(flow?.buyPressure ?? flow?.buyRatio ?? 36),
    sellPressure: Number(flow?.sellPressure ?? flow?.sellRatio ?? 64),
    cvd: Number(flow?.cvd ?? -1.2),
    rotationScore: 78,
    liquidityMagnet: 72,
    contradictionPenalty: 14,
  })

  const tone =
    playbook.side === "LONG"
      ? "border-emerald-300/25 bg-emerald-950/10"
      : playbook.side === "SHORT"
        ? "border-red-300/25 bg-red-950/10"
        : "border-yellow-300/25 bg-yellow-950/10"

  const accent =
    playbook.side === "LONG"
      ? "text-emerald-300"
      : playbook.side === "SHORT"
        ? "text-red-300"
        : "text-yellow-300"

  return (
    <TacticalFocusCard
      eyebrow="Execution Playbook"
      title={playbook.title}
      summary={`${playbook.side} · Confidence ${playbook.confidence}% · Quality ${playbook.setupQuality}%`}
      className={tone}
      preview={
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-zinc-600">Side</div>
              <div className={`mt-1 text-xl font-black ${accent}`}>{playbook.side}</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-zinc-600">Confidence</div>
              <div className="mt-1 text-xl font-black text-white">{playbook.confidence}%</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-zinc-600">Quality</div>
              <div className="mt-1 text-xl font-black text-white">{playbook.setupQuality}%</div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-black text-cyan-100">
              <Target size={15} /> Trigger
            </div>
            <div className="text-sm leading-6 text-zinc-300">{playbook.trigger}</div>
          </div>

          <div className="rounded-2xl border border-red-400/15 bg-red-400/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-black text-red-100">
              <ShieldAlert size={15} /> Invalidation
            </div>
            <div className="text-sm leading-6 text-zinc-300">{playbook.invalidation}</div>
          </div>

          <ExecutionChecklist items={playbook.checklist} />
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-600">Side</div>
          <div className={`mt-1 text-lg font-black ${accent}`}>{playbook.side}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-600">Confidence</div>
          <div className="mt-1 text-lg font-black text-white">{playbook.confidence}%</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-600">Quality</div>
          <div className="mt-1 text-lg font-black text-white">{playbook.setupQuality}%</div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
        <div className="mb-1 flex items-center gap-2 text-xs font-black text-cyan-100">
          <Crosshair size={14} /> Trigger
        </div>
        <div className="line-clamp-2 text-xs leading-5 text-zinc-400">{playbook.trigger}</div>
      </div>

      <div className="mt-3 text-xs leading-5 text-yellow-200/80">{playbook.caution}</div>
    </TacticalFocusCard>
  )
}
