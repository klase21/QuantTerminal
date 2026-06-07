"use client"

import { Link2 } from "lucide-react"

import type { EventMemoryLinkerSnapshot } from "@/core/historical-intelligence/eventMemoryLinkerTypes"

export function EventMemoryLinkerPanel({ link }: { link: EventMemoryLinkerSnapshot }) {
  const prediction = link.linkedPredictionMarketSignal
  const analog = link.similarHistoricalEvents[0]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <Link2 className="h-3.5 w-3.5" />
        Event Memory Linker
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Memory Confidence</div>
          <div className="mt-1 text-sm font-black text-cyan-100">{link.memoryConfidenceScore}%</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Analog</div>
          <div className="mt-1 text-sm font-black text-white">{analog?.similarityScore ?? 0}%</div>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Possible Linkage</div>
        <p className="mt-1 text-xs leading-5 text-cyan-50/85">{link.executionImplication}</p>
      </div>
      <div className="mt-2 grid gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Prediction Signal</div>
          <div className="mt-1 text-xs font-black text-white">{prediction?.title ?? "No linked prediction market"}</div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">
            {prediction
              ? `${prediction.impliedProbability}% implied / ${prediction.marketDisagreementSignal} disagreement`
              : "Crowd expectation context unavailable in mock data."}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Historical Analog</div>
          <div className="mt-1 text-xs font-black text-white">{analog?.title ?? "No analog"}</div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">{analog?.takeaway ?? "No similar event match in mock catalog."}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Setup Pattern</div>
          <div className="mt-1 text-xs font-black text-white">
            {link.relatedSetupOutcomePattern.winRate}% win / n={link.relatedSetupOutcomePattern.sampleSize}
          </div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">{link.relatedSetupOutcomePattern.commonFailureMode}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Agent Context</div>
          <div className="mt-1 text-xs font-black text-white">
            Top {link.agentReliabilityContext.topAgent} / Check {link.agentReliabilityContext.weakestAgent}
          </div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">{link.expectationAlignment.alignmentRead}</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-amber-100/80">{link.caveat}</p>
    </section>
  )
}
