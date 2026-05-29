"use client"

import { Network } from "lucide-react"
import type { NarrativeMacroFusionV2 } from "@/lib/tactical/narrativeMacroFusionV2"

export default function NarrativeMacroFusionCard({ fusion }: { fusion: NarrativeMacroFusionV2 }) {
  const tone =
    fusion.conviction === "HIGH"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
      : fusion.conviction === "MEDIUM"
        ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
        : "border-zinc-700 bg-zinc-950 text-zinc-400"

  return (
    <div className="rounded-3xl border border-violet-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,.15),transparent_30%),rgba(0,0,0,.46)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-violet-300">
            <Network className="h-3.5 w-3.5" />
            Narrative + Macro Fusion
          </div>
          <div className="mt-2 text-2xl font-black text-white">{fusion.headline}</div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${tone}`}>
          {fusion.conviction} conviction
        </div>
      </div>

      <div className="mt-3 text-sm font-semibold leading-6 text-zinc-300">{fusion.reasoning}</div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {fusion.catalystStack.slice(0, 4).map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs font-bold leading-5 text-zinc-400">
            {item}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-xs font-bold leading-5 text-emerald-50">
        {fusion.executionImpact}
      </div>
    </div>
  )
}
