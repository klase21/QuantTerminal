"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ArrowDown, BarChart3, ClipboardList, Eye, History, Search, ShieldAlert, Target } from "lucide-react"

import type { AgentAccuracyStat } from "@/core/historical-intelligence/agentAccuracyEngine"
import type { EventMemoryLinkerSnapshot } from "@/core/historical-intelligence/eventMemoryLinkerTypes"
import type { ExpectationIntelligenceSummary } from "@/core/historical-intelligence/expectationIntelligenceEngine"
import type { SimilarEventMatch } from "@/core/historical-intelligence/historicalIntelligenceTypes"
import type { MarketMemorySnapshot } from "@/core/historical-intelligence/marketMemoryTypes"
import type { PredictionMarketIntelligence } from "@/core/historical-intelligence/predictionMarketTypes"
import type { ReplayDecisionJournal } from "@/core/historical-intelligence/replayDecisionJournalTypes"
import type { ReplayExplanation } from "@/core/historical-intelligence/replayExplanationTypes"
import type { ReplayLearningSummary } from "@/core/historical-intelligence/replayLearningSummaryTypes"
import type { SetupOutcomeMemorySummary } from "@/core/historical-intelligence/setupOutcomeMemoryEngine"
import type { TacticalPlaybook } from "@/core/historical-intelligence/tacticalPlaybookEngine"
import type { ReplayCase, ReplayEvent, ReplayFrame, ReplaySentiment } from "@/core/replay/replayTypes"
import { AgentReadPanel } from "./AgentReadPanel"
import { CaseBriefPanel } from "./CaseBriefPanel"
import { DataOperationsWorkbenchPanel } from "./DataOperationsWorkbenchPanel"
import { ExpectationContextPanel } from "./ExpectationContextPanel"
import { HistoricalContextPanel } from "./HistoricalContextPanel"
import {
  getReplayConfidencePresentation,
  getReplaySectionPriority,
  type ReplaySectionPriority,
} from "@/design-system/replayPresentationRules"

type NarrativeSectionId = "what-happened" | "why" | "history" | "worked" | "watch" | "advanced"

function sentimentClass(sentiment: ReplaySentiment) {
  if (sentiment === "positive") return "text-emerald-300"
  if (sentiment === "negative") return "text-rose-300"
  return "text-zinc-300"
}

function metricClass(value: number) {
  if (value > 0) return "text-emerald-300"
  if (value < 0) return "text-rose-300"
  return "text-zinc-300"
}

function narrativeCompletenessScore({
  replay,
  frame,
  similarEvents,
  setupMemory,
  tacticalPlaybook,
  expectation,
  agentAccuracy,
}: {
  replay: ReplayCase
  frame: ReplayFrame
  similarEvents: SimilarEventMatch[]
  setupMemory: SetupOutcomeMemorySummary
  tacticalPlaybook: TacticalPlaybook
  expectation: ExpectationIntelligenceSummary
  agentAccuracy: AgentAccuracyStat[]
}) {
  const checks = [
    Boolean(replay.events.length && frame.market),
    Boolean(frame.narrative.possibleDrivers.length && frame.narrative.items.length),
    Boolean(similarEvents.length),
    Boolean(setupMemory.sampleSize && tacticalPlaybook.playbook.length),
    Boolean(expectation.confidence && agentAccuracy.length),
  ]
  return checks.reduce((score, passed) => score + (passed ? 20 : 0), 0)
}

function FlowSection({
  id,
  step,
  title,
  prompt,
  cardType,
  informationLevel,
  open,
  onOpenChange,
  onContinue,
  nextLabel,
  children,
}: {
  id: NarrativeSectionId
  step: string
  title: string
  prompt: string
  cardType: "primary" | "secondary" | "evidence" | "signal" | "decision"
  informationLevel: "level_1" | "level_2" | "level_3" | "level_4" | "advanced"
  open: boolean
  onOpenChange: (id: NarrativeSectionId, open: boolean) => void
  onContinue?: () => void
  nextLabel?: string
  children: ReactNode
}) {
  const priority = getReplaySectionPriority(informationLevel, cardType)
  const shellClass: Record<ReplaySectionPriority, string> = {
    primary: "border-cyan-300/25 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.12),transparent_34%),rgba(9,9,11,.9)]",
    supporting: "border-zinc-800 bg-zinc-950/80",
    advanced: "border-zinc-900 bg-zinc-950/55",
  }
  const priorityClass: Record<ReplaySectionPriority, string> = {
    primary: "border-cyan-300/25 bg-cyan-400/10 text-cyan-100",
    supporting: "border-zinc-700 bg-black/35 text-zinc-300",
    advanced: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  }

  return (
    <details
      open={open}
      onToggle={(event) => onOpenChange(id, event.currentTarget.open)}
      className={`group rounded-xl border p-3 ${shellClass[priority]}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{step}</div>
            <div className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${priorityClass[priority]}`}>
              {priority}
            </div>
          </div>
          <div className={priority === "primary" ? "mt-1 text-base font-black text-white" : "mt-1 text-sm font-black text-white"}>{title}</div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">{prompt}</div>
        </div>
        <div className="shrink-0 rounded-full border border-zinc-800 bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400 group-open:text-cyan-200">
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Reading</span>
        </div>
      </summary>
      <div className="mt-3 grid gap-3">
        {children}
        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300 transition hover:border-cyan-300/35 hover:bg-cyan-400/10 hover:text-cyan-100"
          >
            Continue{nextLabel ? `: ${nextLabel}` : " Investigation"}
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </details>
  )
}

function MiniPricePath({ replay }: { replay: ReplayCase }) {
  const prices = replay.frames.map((frame) => frame.market.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = Math.max(1, max - min)
  const points = replay.frames
    .map((frame, index) => {
      const x = (index / Math.max(1, replay.frames.length - 1)) * 100
      const y = 82 - ((frame.market.price - min) / range) * 64
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="h-28 rounded-xl border border-zinc-900 bg-black/50 p-2">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(63,63,70,.45)" strokeWidth="0.35" />
        ))}
        <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {replay.frames.map((item, index) => {
          const x = (index / Math.max(1, replay.frames.length - 1)) * 100
          const y = 82 - ((item.market.price - min) / range) * 64
          return <circle key={item.id} cx={x} cy={y} r="1.4" fill="#ecfeff" vectorEffect="non-scaling-stroke" />
        })}
      </svg>
    </div>
  )
}

function MarketDriversStory({ replay, frame }: { replay: ReplayCase; frame: ReplayFrame }) {
  const topDriver = frame.narrative.possibleDrivers[0]
  const supporting = frame.narrative.items.filter((item) => item.sentiment !== "negative").slice(0, 2)
  const contradicting = [
    ...frame.narrative.items.filter((item) => item.sentiment === "negative").map((item) => item.headline),
    ...frame.risk.risks,
  ].slice(0, 3)
  const sectionConfidence = topDriver?.confidence ?? 0
  const confidenceRead = getReplayConfidencePresentation(sectionConfidence)

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <Target className="h-3.5 w-3.5" />
          Market Drivers Story
        </div>
        <div className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${confidenceRead.className}`}>
          {confidenceRead.shortLabel}
        </div>
      </div>

      <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Causal Read</div>
        <p className="mt-1 text-sm leading-6 text-cyan-50/85">
          {topDriver ? `${topDriver.driver} was the highest-ranked explanation, but the replay tests it against narrative evidence and risk state.` : frame.narrative.summary}
        </p>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-2">
          {frame.narrative.possibleDrivers.slice(0, 3).map((driver) => (
            <div key={driver.driver} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">#{driver.rank}</div>
                  <div className="mt-1 text-sm font-black text-white">{driver.driver}</div>
                </div>
                <div className="text-right text-sm font-black text-cyan-100">{driver.confidence}%</div>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{driver.evidence}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Narrative Shift</div>
            <div className="mt-1 text-sm font-black text-white">{frame.narrative.primaryNarrative}</div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{frame.narrative.summary}</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">Evidence For</div>
              <div className="mt-2 space-y-1.5">
                {supporting.map((item) => (
                  <div key={item.headline} className="text-xs leading-5 text-emerald-50/80">{item.headline}</div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-rose-300/15 bg-rose-400/10 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/70">Evidence Against</div>
              <div className="mt-2 space-y-1.5">
                {contradicting.map((item) => (
                  <div key={item} className="text-xs leading-5 text-rose-50/80">{item}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Reality Check</div>
            <p className="mt-1 text-xs leading-5 text-zinc-300">{replay.realityCheck}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function EvidenceTimelineStory({ replay, frame }: { replay: ReplayCase; frame: ReplayFrame }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <BarChart3 className="h-3.5 w-3.5" />
          Evidence Timeline
        </div>
        <div className={`text-[10px] font-black uppercase tracking-[0.14em] ${metricClass(frame.market.priceChangePct)}`}>
          {frame.market.priceChangePct >= 0 ? "+" : ""}{frame.market.priceChangePct.toFixed(2)}%
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_1.1fr]">
        <div>
          <MiniPricePath replay={replay} />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Price</div>
              <div className="mt-1 text-sm font-black text-white">{frame.market.price.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Funding</div>
              <div className="mt-1 text-sm font-black text-white">{frame.market.fundingRate.toFixed(3)}%</div>
            </div>
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Expectation</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{frame.expectation.probability}%</div>
            </div>
          </div>
          <p className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-2 text-xs leading-5 text-zinc-400">
            {frame.market.liquidityRead}
          </p>
        </div>

        <div className="space-y-2">
          {frame.narrative.items.slice(0, 4).map((item) => (
            <div key={`${item.timestamp}-${item.headline}`} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  {item.timestamp} / {item.source}
                </div>
                <div className={`text-[10px] font-black uppercase tracking-[0.14em] ${sentimentClass(item.sentiment)}`}>
                  {item.sentiment}
                </div>
              </div>
              <div className="mt-2 text-xs font-bold leading-5 text-zinc-100">{item.headline}</div>
              <div className="mt-1 text-[11px] text-cyan-200/80">{item.narrative}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhatWorkedBeforePanel({
  setupMemory,
  tacticalPlaybook,
  decisionJournal,
}: {
  setupMemory: SetupOutcomeMemorySummary
  tacticalPlaybook: TacticalPlaybook
  decisionJournal?: ReplayDecisionJournal | null
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <ClipboardList className="h-3.5 w-3.5" />
          What Worked Before
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
          n={setupMemory.sampleSize} / {setupMemory.winRate}% win
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">Historical Winners</div>
          <p className="mt-1 text-xs leading-5 text-emerald-50/85">{setupMemory.bestHistoricalCondition}</p>
        </div>
        <div className="rounded-lg border border-rose-300/15 bg-rose-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/70">Historical Failures</div>
          <p className="mt-1 text-xs leading-5 text-rose-50/85">{setupMemory.worstHistoricalCondition}</p>
        </div>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">Common Mistake</div>
          <p className="mt-1 text-xs leading-5 text-amber-50/85">{decisionJournal?.mistakeTag ?? tacticalPlaybook.mistake}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-300">{setupMemory.commonFailureMode}</p>
        </div>
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Recommended Playbook</div>
          <div className="mt-2 space-y-1.5">
            {tacticalPlaybook.playbook.slice(0, 4).map((item, index) => (
              <div key={item} className="flex gap-2 text-xs leading-5 text-cyan-50/85">
                <span className="font-black text-cyan-300">{index + 1}.</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Decision Lesson</div>
          <p className="mt-1 text-xs leading-5 text-zinc-300">{decisionJournal?.lesson ?? tacticalPlaybook.lesson}</p>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Invalidation</div>
          <div className="mt-2 space-y-1.5">
            {tacticalPlaybook.invalidationChecklist.slice(0, 3).map((item) => (
              <div key={item} className="text-xs leading-5 text-zinc-300">{item}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function WhatToWatchPanel({
  expectation,
  predictionMarkets,
  frame,
  agentAccuracy,
}: {
  expectation: ExpectationIntelligenceSummary
  predictionMarkets: PredictionMarketIntelligence
  frame: ReplayFrame
  agentAccuracy: AgentAccuracyStat[]
}) {
  const topAgent = agentAccuracy[0]
  const confidenceRead = getReplayConfidencePresentation(expectation.confidence)
  const watchItems = [
    `Expectation status: ${expectation.pricingStatus} / surprise ${expectation.surpriseScore}`,
    `Risk state: ${frame.risk.level} / ${frame.risk.summary}`,
    topAgent ? `${topAgent.agent}: ${topAgent.caseAlignment ?? "catalog"} / ${topAgent.accuracyScore}% accuracy` : "Agent calibration unavailable",
  ]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <Eye className="h-3.5 w-3.5" />
          What Should I Watch?
        </div>
        <div className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${confidenceRead.className}`}>
          {confidenceRead.shortLabel}
        </div>
      </div>
      <div className="grid gap-2 lg:grid-cols-3">
        {watchItems.map((item) => (
          <div key={item} className="rounded-lg border border-zinc-900 bg-black/45 p-3 text-xs leading-5 text-zinc-300">
            {item}
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">
          <ShieldAlert className="h-3.5 w-3.5" />
          Risk Signals
        </div>
        <div className="mt-2 space-y-1.5">
          {frame.risk.risks.slice(0, 3).map((risk) => (
            <div key={risk} className="text-xs leading-5 text-amber-50/85">{risk}</div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{predictionMarkets.tacticalInterpretation}</p>
    </section>
  )
}

export function ReplayNarrativeFlow({
  replay,
  frame,
  event,
  learningSummary,
  explanation,
  decisionJournal,
  similarEvents,
  setupMemory,
  marketMemory,
  eventMemoryLink,
  expectation,
  predictionMarkets,
  tacticalPlaybook,
  agentAccuracy,
  storageRefreshSignal,
  onStorageRefresh,
}: {
  replay: ReplayCase
  frame: ReplayFrame
  event: ReplayEvent
  learningSummary?: ReplayLearningSummary | null
  explanation?: ReplayExplanation | null
  decisionJournal?: ReplayDecisionJournal | null
  similarEvents: SimilarEventMatch[]
  setupMemory: SetupOutcomeMemorySummary
  marketMemory: MarketMemorySnapshot
  eventMemoryLink?: EventMemoryLinkerSnapshot | null
  expectation: ExpectationIntelligenceSummary
  predictionMarkets: PredictionMarketIntelligence
  tacticalPlaybook: TacticalPlaybook
  agentAccuracy: AgentAccuracyStat[]
  storageRefreshSignal: number
  onStorageRefresh: () => void
}) {
  const [openSections, setOpenSections] = useState<Record<NarrativeSectionId, boolean>>({
    "what-happened": true,
    why: false,
    history: false,
    worked: false,
    watch: false,
    advanced: false,
  })
  const completenessScore = useMemo(
    () => narrativeCompletenessScore({ replay, frame, similarEvents, setupMemory, tacticalPlaybook, expectation, agentAccuracy }),
    [agentAccuracy, expectation, frame, replay, setupMemory, similarEvents, tacticalPlaybook],
  )
  const completenessRead = getReplayConfidencePresentation(completenessScore)

  function setSectionOpen(id: NarrativeSectionId, open: boolean) {
    setOpenSections((current) => ({ ...current, [id]: open }))
  }

  function continueTo(id: NarrativeSectionId) {
    setOpenSections((current) => ({ ...current, [id]: true }))
  }

  return (
    <section className="grid gap-3">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
              <Search className="h-3.5 w-3.5" />
              Replay Narrative Flow
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Read the case as an investigation: incident, drivers, analogs, outcome memory, then watch signals.
            </p>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-right ${completenessRead.className}`}>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Narrative Completeness</div>
            <div className="mt-1 text-lg font-black text-white">{completenessRead.value}/100</div>
          </div>
        </div>
      </div>

      <FlowSection
        id="what-happened"
        step="Section A"
        title="What Happened?"
        prompt="Start with the event, verdict, confidence, replay window, and key lesson."
        cardType="primary"
        informationLevel="level_1"
        open={openSections["what-happened"]}
        onOpenChange={setSectionOpen}
        onContinue={() => continueTo("why")}
        nextLabel="Why"
      >
        <CaseBriefPanel
          replay={replay}
          frame={frame}
          event={event}
          learningSummary={learningSummary}
          explanation={explanation}
          decisionJournal={decisionJournal}
        />
      </FlowSection>

      <FlowSection
        id="why"
        step="Section B"
        title="Why Did It Happen?"
        prompt="Follow the driver story, narrative shift, and evidence for or against the market's explanation."
        cardType="evidence"
        informationLevel="level_2"
        open={openSections.why}
        onOpenChange={setSectionOpen}
        onContinue={() => continueTo("history")}
        nextLabel="History"
      >
        <MarketDriversStory replay={replay} frame={frame} />
        <EvidenceTimelineStory replay={replay} frame={frame} />
      </FlowSection>

      <FlowSection
        id="history"
        step="Section C"
        title="Has This Happened Before?"
        prompt="Compare this case to analogs and recurring historical patterns."
        cardType="secondary"
        informationLevel="level_3"
        open={openSections.history}
        onOpenChange={setSectionOpen}
        onContinue={() => continueTo("worked")}
        nextLabel="What Worked"
      >
        <HistoricalContextPanel
          similarEvents={similarEvents}
          setupMemory={setupMemory}
          marketMemory={marketMemory}
          eventMemoryLink={eventMemoryLink}
        />
      </FlowSection>

      <FlowSection
        id="worked"
        step="Section D"
        title="What Worked Before?"
        prompt="Translate outcome memory into playbook rules, mistake awareness, and invalidation."
        cardType="decision"
        informationLevel="level_4"
        open={openSections.worked}
        onOpenChange={setSectionOpen}
        onContinue={() => continueTo("watch")}
        nextLabel="Watch Signals"
      >
        <WhatWorkedBeforePanel
          setupMemory={setupMemory}
          tacticalPlaybook={tacticalPlaybook}
          decisionJournal={decisionJournal}
        />
      </FlowSection>

      <FlowSection
        id="watch"
        step="Section E"
        title="What Should I Watch?"
        prompt="Use expectations, agent reliability, and risk signals as the forward-looking checklist."
        cardType="signal"
        informationLevel="level_4"
        open={openSections.watch}
        onOpenChange={setSectionOpen}
        onContinue={() => continueTo("advanced")}
        nextLabel="Advanced Tools"
      >
        <WhatToWatchPanel
          expectation={expectation}
          predictionMarkets={predictionMarkets}
          frame={frame}
          agentAccuracy={agentAccuracy}
        />
        <ExpectationContextPanel expectation={expectation} predictionMarkets={predictionMarkets} />
        <AgentReadPanel frame={frame} stats={agentAccuracy} />
      </FlowSection>

      <FlowSection
        id="advanced"
        step="Advanced"
        title="Data Operations Workbench"
        prompt="Source preview, validation, review, linking, scoring, inspection, write tests, and ingestion stay out of the normal investigation path."
        cardType="secondary"
        informationLevel="advanced"
        open={openSections.advanced}
        onOpenChange={setSectionOpen}
      >
        <DataOperationsWorkbenchPanel
          replay={replay}
          refreshSignal={storageRefreshSignal}
          onRefresh={onStorageRefresh}
        />
      </FlowSection>
    </section>
  )
}
