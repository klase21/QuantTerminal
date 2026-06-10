"use client"

import { useMemo, useState, type ReactNode } from "react"
import { BarChart3, ClipboardList, Eye, History, Search, ShieldAlert, Target } from "lucide-react"

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
import { InformationIntelligencePanel } from "./InformationIntelligencePanel"
import { ReplayInsightCard } from "./ReplayInsightCard"
import { ReplayMetricBadge } from "./ReplayMetricBadge"
import {
  getReplayConfidencePresentation,
  getReplaySectionPriority,
  type ReplaySectionPriority,
} from "@/design-system/replayPresentationRules"

type NarrativeSectionId = "what-happened" | "why" | "history" | "worked" | "watch"

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

function WorkspacePanelShell({
  title,
  prompt,
  cardType,
  informationLevel,
  children,
}: {
  title: string
  prompt: string
  cardType: "primary" | "secondary" | "evidence" | "signal" | "decision"
  informationLevel: "level_1" | "level_2" | "level_3" | "level_4"
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
    <section className={`rounded-xl border p-3 ${shellClass[priority]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${priorityClass[priority]}`}>
            {priority}
          </div>
          <div className={priority === "primary" ? "mt-2 text-base font-black text-white" : "mt-2 text-sm font-black text-white"}>
            {title}
          </div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">{prompt}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        {children}
      </div>
    </section>
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
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-cyan-50/85">
          {topDriver ? `${topDriver.driver} was the highest-ranked explanation, but the replay tests it against narrative evidence and risk state.` : frame.narrative.summary}
        </p>
      </div>

      <div className="mt-2 grid gap-2">
        <div className="grid gap-2 md:grid-cols-3">
          {frame.narrative.possibleDrivers.slice(0, 3).map((driver) => (
            <ReplayInsightCard
              key={driver.driver}
              title={driver.driver}
              status={`#${driver.rank}`}
              metric={`${driver.confidence}%`}
              description={driver.evidence}
              tone={driver.rank === 1 ? "cyan" : "neutral"}
            />
          ))}
        </div>

        <div className="grid gap-2 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Narrative Shift</div>
            <div className="mt-1 text-sm font-black text-white">{frame.narrative.primaryNarrative}</div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{frame.narrative.summary}</p>
          </div>
          <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">Evidence For</div>
            <div className="mt-2 space-y-1.5">
              {supporting.slice(0, 2).map((item) => (
                <div key={item.headline} className="line-clamp-2 text-xs leading-5 text-emerald-50/80">{item.headline}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-rose-300/15 bg-rose-400/10 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/70">Evidence Against</div>
            <div className="mt-2 space-y-1.5">
              {contradicting.slice(0, 2).map((item) => (
                <div key={item} className="line-clamp-2 text-xs leading-5 text-rose-50/80">{item}</div>
              ))}
            </div>
          </div>
        </div>
        <details className="rounded-lg border border-zinc-900 bg-black/35 px-3 py-2 text-[11px] leading-5 text-zinc-500">
          <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em]">Expand Driver Detail</summary>
          <div className="mt-2">{replay.realityCheck}</div>
        </details>
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

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <ReplayInsightCard title="Winner" status="best condition" description={setupMemory.bestHistoricalCondition} tone="green">
          <ReplayMetricBadge label={`${setupMemory.winRate}% win`} tone="green" />
        </ReplayInsightCard>
        <ReplayInsightCard title="Failure" status="worst condition" description={setupMemory.worstHistoricalCondition} tone="rose">
          <ReplayMetricBadge label={`${setupMemory.maxAdverseMovePct.toFixed(1)}% adverse`} tone="rose" />
        </ReplayInsightCard>
        <ReplayInsightCard title={decisionJournal?.mistakeTag ?? "Mistake"} status="common mistake" description={setupMemory.commonFailureMode} tone="amber">
          <ReplayMetricBadge label="CAUTION" tone="amber" />
        </ReplayInsightCard>
        <ReplayInsightCard title="Playbook" status="next time" description={tacticalPlaybook.playbook[0] ?? tacticalPlaybook.lesson} tone="cyan">
          <ReplayMetricBadge label="ACTION" tone="cyan" />
        </ReplayInsightCard>
      </div>
      <details className="mt-2 rounded-lg border border-zinc-900 bg-black/35 px-3 py-2 text-[11px] leading-5 text-zinc-500">
        <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em]">Expand Playbook Detail</summary>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <div>{decisionJournal?.lesson ?? tacticalPlaybook.lesson}</div>
          <div>{tacticalPlaybook.invalidationChecklist.slice(0, 3).join(" / ")}</div>
        </div>
      </details>
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
      <div className="grid gap-2 md:grid-cols-3">
        {watchItems.map((item) => (
          <ReplayInsightCard key={item} title={item} status="watch signal" tone="cyan">
            <ReplayMetricBadge label="WATCH" tone="cyan" />
          </ReplayInsightCard>
        ))}
      </div>
      <div className="mt-2 rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">
          <ShieldAlert className="h-3.5 w-3.5" />
          Risk Signals
        </div>
        <div className="mt-2 space-y-1.5">
          {frame.risk.risks.slice(0, 3).map((risk) => (
            <div key={risk} className="line-clamp-1 text-xs leading-5 text-amber-50/85">{risk}</div>
          ))}
        </div>
      </div>
      <details className="mt-2 rounded-lg border border-zinc-900 bg-black/35 px-3 py-2 text-[11px] leading-5 text-zinc-500">
        <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em]">Expand Watch Detail</summary>
        <div className="mt-2">{predictionMarkets.tacticalInterpretation}</div>
      </details>
    </section>
  )
}

const INVESTIGATION_STEPS: {
  id: NarrativeSectionId
  label: string
  prompt: string
  cardType: "primary" | "secondary" | "evidence" | "signal" | "decision"
  informationLevel: "level_1" | "level_2" | "level_3" | "level_4"
}[] = [
  {
    id: "what-happened",
    label: "What Happened?",
    prompt: "Incident, verdict, confidence, replay window.",
    cardType: "primary",
    informationLevel: "level_1",
  },
  {
    id: "why",
    label: "Why?",
    prompt: "Drivers, evidence, narrative vs reality.",
    cardType: "evidence",
    informationLevel: "level_2",
  },
  {
    id: "history",
    label: "History",
    prompt: "Analogs and recurring patterns.",
    cardType: "secondary",
    informationLevel: "level_3",
  },
  {
    id: "worked",
    label: "Worked Before",
    prompt: "Outcome memory and playbook rules.",
    cardType: "decision",
    informationLevel: "level_4",
  },
  {
    id: "watch",
    label: "Watch",
    prompt: "Expectations, agents, risk signals.",
    cardType: "signal",
    informationLevel: "level_4",
  },
]

function CompactCaseStatusBar({
  replay,
  frame,
  event,
  completenessScore,
}: {
  replay: ReplayCase
  frame: ReplayFrame
  event: ReplayEvent
  completenessScore: number
}) {
  const completenessRead = getReplayConfidencePresentation(completenessScore)

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
              <Search className="h-3.5 w-3.5" />
              Replay Workspace
            </div>
            <div className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400">
              {replay.symbol}
            </div>
            <div className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400">
              {frame.label}
            </div>
          </div>
          <div className="mt-2 truncate text-sm font-black text-white">{event.title}</div>
          <div className="mt-1 line-clamp-1 text-xs text-zinc-500">{replay.verdict}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right sm:grid-cols-4">
          <StatusMetric label="Move" value={`${frame.market.priceChangePct >= 0 ? "+" : ""}${frame.market.priceChangePct.toFixed(2)}%`} valueClass={metricClass(frame.market.priceChangePct)} />
          <StatusMetric label="Risk" value={frame.risk.level} valueClass="text-amber-100" />
          <StatusMetric label="Window" value={replay.window} valueClass="text-cyan-100" />
          <StatusMetric label="Complete" value={`${completenessRead.value}/100`} valueClass="text-emerald-100" />
        </div>
      </div>
    </section>
  )
}

function StatusMetric({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 px-2 py-1.5">
      <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className={`mt-1 truncate text-xs font-black ${valueClass}`}>{value}</div>
    </div>
  )
}

function InvestigationRail({
  activeSection,
  onSectionChange,
}: {
  activeSection: NarrativeSectionId
  onSectionChange: (section: NarrativeSectionId) => void
}) {
  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 lg:sticky lg:top-3 lg:self-start">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Investigation Steps</div>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
        {INVESTIGATION_STEPS.map((step, index) => {
          const active = step.id === activeSection
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSectionChange(step.id)}
              className={`min-w-[190px] rounded-lg border p-3 text-left transition lg:min-w-0 ${
                active
                  ? "border-cyan-300/45 bg-cyan-400/15"
                  : "border-zinc-900 bg-black/40 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  Step {index + 1}
                </span>
                <span className={active ? "text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100" : "text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600"}>
                  {active ? "active" : "open"}
                </span>
              </div>
              <div className="mt-1 text-xs font-black text-white">{step.label}</div>
              <div className="mt-1 text-[11px] leading-4 text-zinc-500">{step.prompt}</div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function ActiveNarrativeWorkspace({
  activeSection,
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
}: {
  activeSection: NarrativeSectionId
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
}) {
  const step = INVESTIGATION_STEPS.find((item) => item.id === activeSection) ?? INVESTIGATION_STEPS[0]!

  return (
    <WorkspacePanelShell
      title={step.label}
      prompt={step.prompt}
      cardType={step.cardType}
      informationLevel={step.informationLevel}
    >
      {activeSection === "what-happened" ? (
        <CaseBriefPanel
          replay={replay}
          frame={frame}
          event={event}
          learningSummary={learningSummary}
          explanation={explanation}
          decisionJournal={decisionJournal}
        />
      ) : null}

      {activeSection === "why" ? (
        <>
          <MarketDriversStory replay={replay} frame={frame} />
          <EvidenceTimelineStory replay={replay} frame={frame} />
        </>
      ) : null}

      {activeSection === "history" ? (
        <HistoricalContextPanel
          similarEvents={similarEvents}
          setupMemory={setupMemory}
          marketMemory={marketMemory}
          eventMemoryLink={eventMemoryLink}
        />
      ) : null}

      {activeSection === "worked" ? (
        <WhatWorkedBeforePanel
          setupMemory={setupMemory}
          tacticalPlaybook={tacticalPlaybook}
          decisionJournal={decisionJournal}
        />
      ) : null}

      {activeSection === "watch" ? (
        <>
          <WhatToWatchPanel
            expectation={expectation}
            predictionMarkets={predictionMarkets}
            frame={frame}
            agentAccuracy={agentAccuracy}
          />
          <InformationIntelligencePanel symbol={replay.symbol} />
          <ExpectationContextPanel expectation={expectation} predictionMarkets={predictionMarkets} />
        </>
      ) : null}
    </WorkspacePanelShell>
  )
}

function DecisionWatchRail({
  frame,
  tacticalPlaybook,
  expectation,
  agentAccuracy,
}: {
  frame: ReplayFrame
  tacticalPlaybook: TacticalPlaybook
  expectation: ExpectationIntelligenceSummary
  agentAccuracy: AgentAccuracyStat[]
}) {
  const topAgent = agentAccuracy[0]

  return (
    <aside className="grid gap-3 lg:sticky lg:top-3 lg:self-start">
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <Target className="h-3.5 w-3.5" />
          Possible Drivers
        </div>
        <div className="grid gap-2">
          {frame.narrative.possibleDrivers.slice(0, 3).map((driver) => (
            <div key={driver.driver} className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">#{driver.rank}</div>
                  <div className="mt-1 text-xs font-black leading-5 text-white">{driver.driver}</div>
                </div>
                <div className="text-sm font-black text-cyan-100">{driver.confidence}%</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <ClipboardList className="h-3.5 w-3.5" />
          Tactical Playbook
        </div>
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-2 text-xs leading-5 text-cyan-50/85">
          {tacticalPlaybook.lesson}
        </div>
        <div className="mt-2 space-y-1.5">
          {tacticalPlaybook.playbook.slice(0, 3).map((item, index) => (
            <div key={item} className="flex gap-2 text-xs leading-5 text-zinc-300">
              <span className="font-black text-cyan-300">{index + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <Eye className="h-3.5 w-3.5" />
          Watch Signals
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatusMetric label="Pricing" value={expectation.pricingStatus} valueClass="text-cyan-100" />
          <StatusMetric label="Surprise" value={`${expectation.surpriseScore}/100`} valueClass="text-amber-100" />
        </div>
        <div className="mt-2 rounded-lg border border-amber-300/15 bg-amber-400/10 p-2 text-xs leading-5 text-amber-50/85">
          {frame.risk.risks[0] ?? frame.risk.summary}
        </div>
      </section>

      <AgentReadPanel frame={frame} stats={topAgent ? [topAgent] : agentAccuracy.slice(0, 1)} />
    </aside>
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
  const [activeSection, setActiveSection] = useState<NarrativeSectionId>("what-happened")
  const completenessScore = useMemo(
    () => narrativeCompletenessScore({ replay, frame, similarEvents, setupMemory, tacticalPlaybook, expectation, agentAccuracy }),
    [agentAccuracy, expectation, frame, replay, setupMemory, similarEvents, tacticalPlaybook],
  )

  return (
    <section className="grid gap-3">
      <CompactCaseStatusBar replay={replay} frame={frame} event={event} completenessScore={completenessScore} />

      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_320px] xl:grid-cols-[240px_minmax(0,1fr)_360px]">
        <InvestigationRail activeSection={activeSection} onSectionChange={setActiveSection} />
        <ActiveNarrativeWorkspace
          activeSection={activeSection}
          replay={replay}
          frame={frame}
          event={event}
          learningSummary={learningSummary}
          explanation={explanation}
          decisionJournal={decisionJournal}
          similarEvents={similarEvents}
          setupMemory={setupMemory}
          marketMemory={marketMemory}
          eventMemoryLink={eventMemoryLink}
          expectation={expectation}
          predictionMarkets={predictionMarkets}
          tacticalPlaybook={tacticalPlaybook}
          agentAccuracy={agentAccuracy}
        />
        <DecisionWatchRail
          frame={frame}
          tacticalPlaybook={tacticalPlaybook}
          expectation={expectation}
          agentAccuracy={agentAccuracy}
        />
      </div>

      <DataOperationsWorkbenchPanel
        replay={replay}
        refreshSignal={storageRefreshSignal}
        onRefresh={onStorageRefresh}
      />
    </section>
  )
}
