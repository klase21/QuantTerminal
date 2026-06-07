"use client"

import { Scale } from "lucide-react"

import type { PredictionMarketIntelligence } from "@/core/historical-intelligence/predictionMarketTypes"

function signalClass(signal: PredictionMarketIntelligence["disagreementSignal"]) {
  if (signal === "high") return "text-rose-200"
  if (signal === "medium") return "text-amber-200"
  return "text-emerald-200"
}

export function PredictionMarketPanel({ intelligence }: { intelligence: PredictionMarketIntelligence }) {
  const topMarket = intelligence.marketEvents[0]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <Scale className="h-3.5 w-3.5" />
        Prediction Markets
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Avg Odds</div>
          <div className="mt-1 text-sm font-black text-cyan-100">{intelligence.averageImpliedProbability}%</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Change</div>
          <div className="mt-1 text-sm font-black text-white">
            {intelligence.averageProbabilityChange >= 0 ? "+" : ""}{intelligence.averageProbabilityChange}%
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Crowd Expectation</div>
          <div className={`text-[9px] font-black uppercase tracking-[0.14em] ${signalClass(intelligence.disagreementSignal)}`}>
            {intelligence.disagreementSignal} disagreement
          </div>
        </div>
        <p className="mt-1 text-xs leading-5 text-cyan-50/85">{intelligence.dominantCrowdExpectation}</p>
      </div>
      {topMarket ? (
        <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
            {topMarket.venue} / {topMarket.category}
          </div>
          <div className="mt-1 text-xs font-black text-white">{topMarket.title}</div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">{topMarket.marketQuestion}</div>
        </div>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-zinc-400">{intelligence.tacticalInterpretation}</p>
      {intelligence.memoryLinkCandidates.length ? (
        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
          Memory link: {intelligence.memoryLinkCandidates.slice(0, 2).join(" / ")}
        </div>
      ) : null}
    </section>
  )
}
