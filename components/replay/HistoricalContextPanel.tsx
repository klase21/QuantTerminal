"use client"

import { DatabaseZap, History } from "lucide-react"

import type { SetupOutcomeMemorySummary } from "@/core/historical-intelligence/setupOutcomeMemoryEngine"
import type { SimilarEventMatch } from "@/core/historical-intelligence/historicalIntelligenceTypes"
import type { MarketMemorySnapshot } from "@/core/historical-intelligence/marketMemoryTypes"
import type { EventMemoryLinkerSnapshot } from "@/core/historical-intelligence/eventMemoryLinkerTypes"

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

      <div className="mt-2 grid gap-2">
        {similarEvents.slice(0, 3).map((match) => (
          <article key={match.caseId} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{match.symbol}</div>
                <div className="mt-1 text-xs font-black text-white">{match.title}</div>
              </div>
              <div className="shrink-0 text-right text-sm font-black text-cyan-100">{match.similarityScore}%</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {match.reasons.slice(0, 3).map((reason) => (
                <span key={reason} className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100/80">
                  {reasonLabel(reason)}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{match.takeaway}</p>
          </article>
        ))}
      </div>

      <div className="mt-2 grid gap-2">
        <div className="rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">Repeated Failure Pattern</div>
          <p className="mt-1 text-xs leading-5 text-amber-50/85">{setupMemory.commonFailureMode}</p>
        </div>
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
            <DatabaseZap className="h-3.5 w-3.5" />
            Market Memory
          </div>
          <p className="mt-1 text-xs leading-5 text-cyan-50/85">{marketMemory.tacticalMemoryTakeaway}</p>
        </div>
        {eventMemoryLink ? (
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Memory Linkage</div>
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200">
                {eventMemoryLink.memoryConfidenceScore}%
              </div>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-300">{eventMemoryLink.executionImplication}</p>
          </div>
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
