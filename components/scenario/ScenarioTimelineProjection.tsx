"use client"

import type { ScenarioTimelinePoint } from "@/core/scenario/probabilisticScenarioEngine"

export default function ScenarioTimelineProjection({ timeline }: { timeline: ScenarioTimelinePoint[] }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-black/50 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-purple-300">
        Tactical Simulation Timeline
      </div>

      <div className="relative space-y-3">
        <div className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-cyan-300/40 via-purple-300/30 to-zinc-700" />

        {timeline.map((point) => (
          <div key={point.horizon} className="relative flex gap-3">
            <div className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-purple-300/25 bg-purple-400/10 text-[10px] font-black text-purple-100">
              {point.horizon}
            </div>

            <div className="flex-1 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black text-white">{point.dominantScenario}</div>
                <div className="text-sm font-black text-purple-300">{point.probability}%</div>
              </div>
              <div className="mt-1 text-xs leading-5 text-zinc-500">{point.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
