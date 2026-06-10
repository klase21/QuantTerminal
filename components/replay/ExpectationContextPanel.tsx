"use client"

import { Gauge, Scale } from "lucide-react"

import type { ExpectationIntelligenceSummary } from "@/core/historical-intelligence/expectationIntelligenceEngine"
import type { PredictionMarketIntelligence } from "@/core/historical-intelligence/predictionMarketTypes"

function signalClass(signal: PredictionMarketIntelligence["disagreementSignal"]) {
  if (signal === "high") return "text-rose-200"
  if (signal === "medium") return "text-amber-200"
  return "text-emerald-200"
}

export function ExpectationContextPanel({
  expectation,
  predictionMarkets,
}: {
  expectation: ExpectationIntelligenceSummary
  predictionMarkets: PredictionMarketIntelligence
}) {
  const topMarket = predictionMarkets.marketEvents[0]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <Gauge className="h-3.5 w-3.5" />
          Expectation Context
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
          {expectation.confidence}% confidence
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Expected Outcome</div>
          <div className="mt-1 text-xs font-black text-white">{expectation.dominantExpectedOutcome}</div>
          <div className="mt-1 text-xs font-black text-cyan-100">{expectation.expectationProbability}%</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3 text-right">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Surprise / Status</div>
          <div className="mt-1 text-xs font-black text-amber-100">{expectation.surpriseScore}/100</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{expectation.pricingStatus}</div>
        </div>
      </div>

      <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-3">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
          <Scale className="h-3.5 w-3.5" />
          Prediction Context
        </div>
        <p className="mt-1 text-xs leading-5 text-zinc-300">{predictionMarkets.dominantCrowdExpectation}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
            odds {predictionMarkets.averageImpliedProbability}%
          </span>
          <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
            change {predictionMarkets.averageProbabilityChange >= 0 ? "+" : ""}{predictionMarkets.averageProbabilityChange}%
          </span>
          <span className={`rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${signalClass(predictionMarkets.disagreementSignal)}`}>
            {predictionMarkets.disagreementSignal} disagreement
          </span>
        </div>
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

      <p className="mt-2 text-xs leading-5 text-zinc-400">{expectation.interpretation}</p>
    </section>
  )
}

