"use client"

import { Crosshair, Gauge, Timer, Shield } from "lucide-react"
import { buildTacticalDecision } from "@/core/decision/tacticalDecisionEngine"

export default function TacticalDecisionStrip({ flow }: { flow?: any }) {
  const decision = buildTacticalDecision({
    buyPressure: Number(flow?.buyPressure ?? flow?.buyRatio ?? 38),
    sellPressure: Number(flow?.sellPressure ?? flow?.sellRatio ?? 62),
    rotationConfidence: 81,
    entryQuality: 68,
    contradictionPenalty: 14,
    liquidityRisk: 72,
    marketRegime: "TREND_EXPANSION",
  })

  const defensive = decision.action === "REDUCE_RISK" || decision.action === "WAIT"
  const actionTone = defensive
    ? "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
    : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"

  return (
    <section className={`rounded-[2rem] border p-4 ${actionTone}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-current/30 bg-black/30">
            <Crosshair size={21} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">
              Tactical Decision Compression
            </div>
            <div className="mt-1 text-2xl font-black text-white">{decision.headline}</div>
            <div className="mt-1 text-sm text-zinc-400">{decision.action.replaceAll("_", " ")}</div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[620px]">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase text-zinc-500">
              <Gauge size={12} /> Readiness
            </div>
            <div className="text-xl font-black text-white">{decision.readiness}%</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase text-zinc-500">
              <Crosshair size={12} /> Entry
            </div>
            <div className="text-xl font-black text-white">{decision.entryQuality}%</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase text-zinc-500">
              <Shield size={12} /> Size
            </div>
            <div className="text-sm font-black text-white">{decision.suggestedSize}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase text-zinc-500">
              <Timer size={12} /> Timing
            </div>
            <div className="text-sm font-black text-white">{decision.timingWindow}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
