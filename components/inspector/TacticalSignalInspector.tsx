"use client"

import OneGlanceDecisionStrip from "@/components/inspector/OneGlanceDecisionStrip"
import SignalPriorityQueue from "@/components/inspector/SignalPriorityQueue"
import { buildSignalPriorityQueue } from "@/core/inspector/signalPriorityEngine"

export default function TacticalSignalInspector({ flow }: { flow?: any }) {
  const buyPressure = Number(flow?.buyPressure ?? flow?.buyRatio ?? 36)
  const sellPressure = Number(flow?.sellPressure ?? flow?.sellRatio ?? 64)

  const signals = buildSignalPriorityQueue({
    buyPressure,
    sellPressure,
    rotationScore: 78,
    liquidityMagnet: 72,
    contradictionPenalty: sellPressure > buyPressure ? 16 : 8,
  })

  return (
    <div className="space-y-3">
      <OneGlanceDecisionStrip signals={signals} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SignalPriorityQueue signals={signals} />

        <div className="rounded-3xl border border-zinc-800 bg-black/50 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
            Inspector Rules
          </div>

          <div className="mt-3 space-y-2 text-xs text-zinc-400">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
              <span className="font-black text-cyan-300">1.</span> Prioritize execution conflicts before rotation conviction.
            </div>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
              <span className="font-black text-cyan-300">2.</span> High rotation + weak tape = wait, not chase.
            </div>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
              <span className="font-black text-cyan-300">3.</span> Critical contradiction means reduce size or stand down.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
