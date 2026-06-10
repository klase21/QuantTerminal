"use client"

import { Gauge, Scale } from "lucide-react"

import type { ExpectationIntelligenceSummary } from "@/core/historical-intelligence/expectationIntelligenceEngine"
import type { PredictionMarketIntelligence } from "@/core/historical-intelligence/predictionMarketTypes"
import { getReplayConfidencePresentation, replayStandardCaveats } from "@/design-system/replayPresentationRules"
import { ReplayInsightCard } from "./ReplayInsightCard"
import { ReplayMetricBadge } from "./ReplayMetricBadge"

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
  const confidenceRead = getReplayConfidencePresentation(expectation.confidence)

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <Gauge className="h-3.5 w-3.5" />
          Expectation Context
        </div>
        <div className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${confidenceRead.className}`}>
          {confidenceRead.shortLabel}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <ReplayInsightCard icon={Gauge} title={expectation.dominantExpectedOutcome} status="expected" metric={`${expectation.expectationProbability}%`} tone="cyan">
          <ReplayMetricBadge label={expectation.convictionLevel} tone="cyan" />
        </ReplayInsightCard>
        <ReplayInsightCard title={expectation.pricingStatus} status="priced status" metric={`${expectation.surpriseScore}/100`} description="Surprise score" tone="amber">
          <ReplayMetricBadge label={expectation.expectationMomentum} tone="amber" />
        </ReplayInsightCard>
        <ReplayInsightCard icon={Scale} title={predictionMarkets.disagreementSignal} status="disagreement" metric={`${predictionMarkets.averageImpliedProbability}%`} description={predictionMarkets.dominantCrowdExpectation}>
          <ReplayMetricBadge label="CROWD" />
        </ReplayInsightCard>
      </div>

      <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-3">
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ReplayMetricBadge label={`odds ${predictionMarkets.averageImpliedProbability}%`} />
          <ReplayMetricBadge label={`change ${predictionMarkets.averageProbabilityChange >= 0 ? "+" : ""}${predictionMarkets.averageProbabilityChange}%`} />
          <ReplayMetricBadge label={`${predictionMarkets.disagreementSignal} disagreement`} tone={predictionMarkets.disagreementSignal === "high" ? "rose" : predictionMarkets.disagreementSignal === "medium" ? "amber" : "green"} />
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

      <details className="mt-2 rounded-lg border border-zinc-900 bg-black/35 px-3 py-2 text-[11px] leading-5 text-zinc-500">
        <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em]">Details / Caveat</summary>
        <div className="mt-2">{expectation.interpretation}</div>
        <div className="mt-1">{replayStandardCaveats.expectation}</div>
      </details>
    </section>
  )
}
