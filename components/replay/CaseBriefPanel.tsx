"use client"

import { FileQuestion, GraduationCap, ShieldAlert, Target, TrendingUp } from "lucide-react"

import type { ReplayExplanation } from "@/core/historical-intelligence/replayExplanationTypes"
import type { ReplayLearningSummary } from "@/core/historical-intelligence/replayLearningSummaryTypes"
import type { ReplayDecisionJournal } from "@/core/historical-intelligence/replayDecisionJournalTypes"
import type { ReplayCase, ReplayEvent, ReplayFrame } from "@/core/replay/replayTypes"
import { getReplayConfidencePresentation, replayStandardCaveats } from "@/design-system/replayPresentationRules"
import { ReplayInsightCard } from "./ReplayInsightCard"
import { ReplayMetricBadge } from "./ReplayMetricBadge"

function metricClass(value: number) {
  if (value > 0) return "text-emerald-300"
  if (value < 0) return "text-rose-300"
  return "text-zinc-300"
}

export function CaseBriefPanel({
  replay,
  frame,
  event,
  learningSummary,
  explanation,
  decisionJournal,
}: {
  replay: ReplayCase
  frame: ReplayFrame
  event: ReplayEvent
  learningSummary?: ReplayLearningSummary | null
  explanation?: ReplayExplanation | null
  decisionJournal?: ReplayDecisionJournal | null
}) {
  const confidence = learningSummary?.confidence ?? Math.round(
    [...frame.agents.map((agent) => agent.confidence), ...frame.narrative.possibleDrivers.map((driver) => driver.confidence)]
      .reduce((sum, value, _index, values) => sum + value / Math.max(1, values.length), 0),
  )
  const whyItHappened = explanation?.primaryReason ?? frame.narrative.summary
  const keyLesson = learningSummary?.historicalLesson ?? explanation?.tacticalLesson ?? replay.realityCheck
  const futureRule = learningSummary?.futureExecutionRule ?? explanation?.futureExecutionRule ?? frame.risk.invalidation
  const caveat = learningSummary?.caveat ?? explanation?.caveat ?? replayStandardCaveats.mockReplay
  const confidenceRead = getReplayConfidencePresentation(confidence)

  return (
    <section className="rounded-xl border border-cyan-300/20 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,.15),transparent_34%),rgba(9,9,11,.92)] p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
              <FileQuestion className="h-3.5 w-3.5" />
              Case Summary
            </div>
            <div className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${confidenceRead.className}`}>
              {explanation?.setupResult ?? "review"} / {confidenceRead.shortLabel}
            </div>
          </div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            {replay.symbol} / {replay.window} / {frame.label}
          </div>
          <h1 className="mt-2 text-xl font-black text-white">{event.title}</h1>
          <p className="mt-1 line-clamp-2 max-w-4xl text-sm leading-6 text-zinc-400">{event.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-right">
          <div className="rounded-lg border border-zinc-800 bg-black/45 p-2 text-left">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Verdict</div>
            <div className="mt-1 line-clamp-2 text-xs font-black text-white">{learningSummary?.caseVerdict ?? replay.verdict}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Reaction</div>
            <div className={`mt-1 text-sm font-black ${metricClass(frame.market.priceChangePct)}`}>
              {frame.market.priceChangePct >= 0 ? "+" : ""}{frame.market.priceChangePct.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Risk</div>
            <div className="mt-1 text-xs font-black text-amber-100">{frame.risk.level}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Price</div>
            <div className="mt-1 text-sm font-black text-cyan-100">{frame.market.price.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <ReplayInsightCard icon={Target} title="Why" status="driver read" description={whyItHappened} tone="cyan">
          <ReplayMetricBadge label="REVIEW" tone="cyan" />
        </ReplayInsightCard>
        <ReplayInsightCard icon={GraduationCap} title="Lesson" status="memory" description={keyLesson} tone="green">
          <ReplayMetricBadge label="LEARNED" tone="green" />
        </ReplayInsightCard>
        <ReplayInsightCard icon={TrendingUp} title="Execution Lesson" status="next time" description={futureRule}>
          <ReplayMetricBadge label="RULE" />
        </ReplayInsightCard>
        <ReplayInsightCard icon={ShieldAlert} title="What Failed" status={frame.risk.level} description={frame.risk.invalidation} tone="amber">
          <ReplayMetricBadge label="CAUTION" tone="amber" />
        </ReplayInsightCard>
        <ReplayInsightCard icon={FileQuestion} title={decisionJournal?.hypotheticalDecision ?? "Review"} status="decision" description={decisionJournal?.decisionReason ?? frame.risk.invalidation}>
          <ReplayMetricBadge label={decisionJournal?.confidence ? `${decisionJournal.confidence}%` : "MOCK"} tone="cyan" />
        </ReplayInsightCard>
      </div>

      <details className="mt-2 rounded-lg border border-zinc-900 bg-black/35 px-3 py-2 text-[11px] leading-5 text-zinc-500">
        <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em] text-zinc-500">Details</summary>
        <div className="mt-2">{event.description}</div>
        <div className="mt-1">{caveat}</div>
      </details>
    </section>
  )
}
