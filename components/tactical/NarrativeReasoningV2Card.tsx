"use client"

import { Sparkles } from "lucide-react"
import type { NarrativeReasoningV2 } from "@/lib/tactical/narrativeReasoningV2"

export default function NarrativeReasoningV2Card({ narrative }: { narrative: NarrativeReasoningV2 }) {
  return (
    <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-200">
        <Sparkles className="h-3.5 w-3.5" />
        Narrative Reasoning
      </div>

      <div className="mt-2 text-lg font-black text-white">{narrative.headline}</div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/80">Possible Drivers</div>
          <div className="mt-2 space-y-2">
            {narrative.possibleDrivers.slice(0, 4).map((driver) => (
              <div key={driver} className="text-xs font-semibold leading-5 text-zinc-300">• {driver}</div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/80">Likely Catalysts</div>
          <div className="mt-2 space-y-2">
            {narrative.likelyCatalysts.slice(0, 3).map((driver) => (
              <div key={driver} className="text-xs font-semibold leading-5 text-zinc-300">• {driver}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-xs font-bold leading-5 text-emerald-50">
        {narrative.executionImpact}
      </div>
      <div className="mt-2 rounded-xl border border-rose-300/15 bg-rose-400/10 p-3 text-xs font-bold leading-5 text-rose-50">
        {narrative.invalidation}
      </div>
    </div>
  )
}
