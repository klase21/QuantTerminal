"use client"

import { DatabaseZap, History } from "lucide-react"

import type { SetupOutcomeMemorySummary } from "@/core/historical-intelligence/setupOutcomeMemoryEngine"
import type { SimilarEventMatch } from "@/core/historical-intelligence/historicalIntelligenceTypes"
import type { MarketMemorySnapshot } from "@/core/historical-intelligence/marketMemoryTypes"
import type { EventMemoryLinkerSnapshot } from "@/core/historical-intelligence/eventMemoryLinkerTypes"
import { ReplayInsightCard } from "./ReplayInsightCard"
import { ReplayMetricBadge } from "./ReplayMetricBadge"

function metricClass(value: number) {
  if (value > 0) return "text-emerald-300"
  if (value < 0) return "text-rose-300"
  return "text-zinc-300"
}

function reasonLabel(reason: string) {
  return reason.replace(/_/g, " ")
}

export function HistoricalContextPanel({
  similarEvents,
  setupMemory,
  marketMemory,
  eventMemoryLink,
}: {
  similarEvents: SimilarEventMatch[]
  setupMemory: SetupOutcomeMemorySummary
  marketMemory: MarketMemorySnapshot
  eventMemoryLink?: EventMemoryLinkerSnapshot | null
}) {
  const topPattern = marketMemory.recurringSetupPatterns[0]
  const topRegime = marketMemory.rememberedMarketRegimes[0]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <History className="h-3.5 w-3.5" />
          Historical Context
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
          n={setupMemory.sampleSize} / {setupMemory.winRate}% win
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Avg Move</div>
          <div className={`mt-1 text-sm font-black ${metricClass(setupMemory.averageMovePct)}`}>
            {setupMemory.averageMovePct >= 0 ? "+" : ""}{setupMemory.averageMovePct.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Adverse</div>
          <div className="mt-1 text-sm font-black text-rose-200">{setupMemory.maxAdverseMovePct.toFixed(2)}%</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Analogs</div>
          <div className="mt-1 text-sm font-black text-cyan-100">{similarEvents.length}</div>
        </div>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {similarEvents.slice(0, 3).map((match) => (
          <ReplayInsightCard
            key={match.caseId}
            icon={History}
            title={match.title}
            status={match.symbol}
            metric={`${match.similarityScore}%`}
            description={match.takeaway}
            tone="cyan"
          >
            <div className="mt-2 flex flex-wrap gap-1.5">
              {match.reasons.slice(0, 3).map((reason) => (
                <ReplayMetricBadge key={reason} label={reasonLabel(reason)} tone="cyan" />
              ))}
            </div>
            <details className="mt-2 text-[11px] leading-5 text-zinc-500">
              <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em]">Details</summary>
              <div className="mt-1">{match.takeaway}</div>
              {match.keyDifferences.length ? <div className="mt-1 text-amber-100/80">{match.keyDifferences.join(" / ")}</div> : null}
            </details>
          </ReplayInsightCard>
        ))}
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <ReplayInsightCard title="Repeated Failure" status="pattern" description={setupMemory.commonFailureMode} tone="amber">
          <ReplayMetricBadge label="CAUTION" tone="amber" />
        </ReplayInsightCard>
        <ReplayInsightCard icon={DatabaseZap} title="Market Memory" status="memory" description={marketMemory.tacticalMemoryTakeaway} tone="cyan">
          <ReplayMetricBadge label="MOCK" tone="cyan" />
        </ReplayInsightCard>
        {eventMemoryLink ? (
          <ReplayInsightCard title="Memory Linkage" status="link" metric={`${eventMemoryLink.memoryConfidenceScore}%`} description={eventMemoryLink.executionImplication} />
        ) : null}
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Best Historical Condition</div>
          <div className="mt-1 text-xs leading-5 text-emerald-100/85">{setupMemory.bestHistoricalCondition}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Remembered Regime</div>
          <div className="mt-1 text-xs font-black text-white">{topRegime?.label ?? topPattern?.label ?? "No regime memory"}</div>
          <div className="mt-1 text-[11px] leading-5 text-zinc-400">{topRegime?.memoryRead ?? topPattern?.tacticalLesson ?? "Mock memory unavailable."}</div>
        </div>
      </div>
    </section>
  )
}
