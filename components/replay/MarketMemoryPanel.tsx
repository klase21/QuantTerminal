"use client"

import { DatabaseZap } from "lucide-react"

import type { MarketMemorySnapshot } from "@/core/historical-intelligence/marketMemoryTypes"

export function MarketMemoryPanel({ memory }: { memory: MarketMemorySnapshot }) {
  const topRegime = memory.rememberedMarketRegimes[0]
  const topCluster = memory.similarEventClusters[0]
  const topPattern = memory.recurringSetupPatterns[0]
  const topAgent = memory.agentReliabilityNotes[0]
  const topExpectation = memory.expectedReactionSummaries[0]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <DatabaseZap className="h-3.5 w-3.5" />
        Market Memory
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Regimes</div>
          <div className="mt-1 text-sm font-black text-white">{memory.rememberedMarketRegimes.length}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Clusters</div>
          <div className="mt-1 text-sm font-black text-cyan-100">{memory.similarEventClusters.length}</div>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Tactical Memory Takeaway</div>
        <p className="mt-1 text-xs leading-5 text-cyan-50/85">{memory.tacticalMemoryTakeaway}</p>
      </div>
      <div className="mt-2 grid gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Remembered Regime</div>
          <div className="mt-1 text-xs font-black text-white">{topRegime?.label ?? "No regime memory"}</div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">{topRegime?.memoryRead ?? "Mock memory unavailable."}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Event Cluster</div>
          <div className="mt-1 text-xs font-black text-white">{topCluster?.label ?? "No cluster"}</div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">{topCluster?.clusterRead ?? "No similar cluster yet."}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Setup Pattern</div>
          <div className="mt-1 text-xs font-black text-white">
            {topPattern ? `${topPattern.winRate}% win / n=${topPattern.sampleSize}` : "No setup pattern"}
          </div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">{topPattern?.commonFailureMode ?? "No pattern memory yet."}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Top Agent</div>
            <div className="mt-1 text-xs font-black text-emerald-100">{topAgent?.agent ?? "N/A"}</div>
          </div>
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Expectation</div>
            <div className="mt-1 text-xs font-black text-cyan-100">
              {topExpectation ? `${topExpectation.probability}% / ${topExpectation.pricedInStatus}` : "N/A"}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
