"use client"

import { Activity } from "lucide-react"
import type { FlowIntelligenceResult } from "@/lib/tactical/flowIntelligenceEngine"

export default function FlowIntelligenceCard({ flow }: { flow: FlowIntelligenceResult }) {
  const tone =
    flow.regime === "BUYER DOMINANT"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
      : flow.regime === "SELLER DOMINANT"
        ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
        : flow.regime === "LIQUIDITY VACUUM"
          ? "border-orange-300/25 bg-orange-400/10 text-orange-100"
          : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"

  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            <Activity className="h-3.5 w-3.5" />
            Flow Intelligence
          </div>
          <div className="mt-2 text-xl font-black text-white">{flow.regime}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${tone}`}>
          Score {flow.score}
        </div>
      </div>

      <div className="mt-3 text-sm font-semibold leading-6 text-zinc-300">{flow.read}</div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs font-bold leading-5 text-zinc-400">
        {flow.executionHint}
      </div>

      {flow.alerts.length ? (
        <div className="mt-3 space-y-1">
          {flow.alerts.slice(0, 3).map((alert) => (
            <div key={alert} className="text-xs font-semibold leading-5 text-amber-200">• {alert}</div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
