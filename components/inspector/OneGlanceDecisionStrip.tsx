"use client"

import { Activity, AlertTriangle, Crosshair } from "lucide-react"
import { buildOneGlanceDecision, type InspectorSignal } from "@/core/inspector/signalPriorityEngine"

export default function OneGlanceDecisionStrip({ signals }: { signals: InspectorSignal[] }) {
  const decision = buildOneGlanceDecision(signals)
  const defensive = decision.bias === "DEFENSIVE"

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-4 ${
      defensive
        ? "border-red-400/25 bg-red-950/10"
        : "border-cyan-400/25 bg-cyan-950/10"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl ${
          defensive ? "bg-red-400/20" : "bg-cyan-400/20"
        }`} />
      </div>

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
            defensive
              ? "border-red-300/30 bg-red-400/10 text-red-200"
              : "border-cyan-300/30 bg-cyan-400/10 text-cyan-200"
          }`}>
            {defensive ? <AlertTriangle size={20} /> : <Crosshair size={20} />}
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">One-glance Tactical Decision</div>
            <div className="mt-1 text-xl font-black text-white">{decision.bias}</div>
            <div className="mt-1 text-sm text-zinc-400">{decision.explanation}</div>
          </div>
        </div>

        <div className="grid gap-2 md:min-w-[220px]">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 px-3 py-2">
            <span className="text-xs text-zinc-500">Action</span>
            <span className="text-xs font-black text-white">{decision.action}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 px-3 py-2">
            <span className="text-xs text-zinc-500">Confidence</span>
            <span className={defensive ? "text-xs font-black text-red-300" : "text-xs font-black text-cyan-300"}>
              {decision.confidence}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
