"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  Activity,
  BarChart3,
  BrainCircuit,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  History,
  Newspaper,
  ScanLine,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react"

import {
  getReplayCaseCatalog,
  type HistoricalReplayEventType,
} from "@/core/historical-intelligence/mockHistoricalIntelligenceRepository"
import { findSimilarReplayCases } from "@/core/historical-intelligence/similarHistoricalEventEngine"
import {
  getSetupOutcomeMemory,
  type SetupOutcomeMemorySummary,
} from "@/core/historical-intelligence/setupOutcomeMemoryEngine"
import {
  getExpectationIntelligence,
  type ExpectationIntelligenceSummary,
} from "@/core/historical-intelligence/expectationIntelligenceEngine"
import {
  getTacticalPlaybook,
  type TacticalPlaybook,
} from "@/core/historical-intelligence/tacticalPlaybookEngine"
import {
  getAgentAccuracyStats,
  type AgentAccuracyStat,
} from "@/core/historical-intelligence/agentAccuracyEngine"
import { getMarketMemory } from "@/core/historical-intelligence/marketMemoryEngine"
import { getPredictionMarketIntelligence } from "@/core/historical-intelligence/predictionMarketEngine"
import { getEventMemoryLinker } from "@/core/historical-intelligence/eventMemoryLinkerEngine"
import { getReplayExplanation } from "@/core/historical-intelligence/replayExplanationEngine"
import { getReplayLearningSummary } from "@/core/historical-intelligence/replayLearningSummaryEngine"
import { getReplayDecisionJournal } from "@/core/historical-intelligence/replayDecisionJournalEngine"
import { ReplayNarrativeFlow } from "./ReplayNarrativeFlow"
import type { SimilarEventMatch } from "@/core/historical-intelligence/historicalIntelligenceTypes"
import type { ReplayAgentTone, ReplayCase, ReplayFrame, ReplaySentiment, ReplaySeverity } from "@/core/replay/replayTypes"

type ReplayFilter = "all" | Exclude<HistoricalReplayEventType, "mixed">

const REPLAY_CATALOG = getReplayCaseCatalog()

const FILTERS: { id: ReplayFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "macro", label: "Macro" },
  { id: "crypto_policy", label: "Crypto Policy" },
  { id: "liquidity", label: "Liquidity" },
  { id: "narrative_shock", label: "Narrative Shock" },
]

function severityClass(severity: ReplaySeverity) {
  if (severity === "HIGH") return "border-rose-300/30 bg-rose-400/10 text-rose-100"
  if (severity === "MEDIUM") return "border-amber-300/30 bg-amber-400/10 text-amber-100"
  return "border-zinc-700 bg-zinc-950 text-zinc-400"
}

function toneClass(tone: ReplayAgentTone) {
  if (tone === "BULLISH") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
  if (tone === "BEARISH") return "border-rose-300/25 bg-rose-400/10 text-rose-100"
  if (tone === "DEFENSIVE") return "border-amber-300/25 bg-amber-400/10 text-amber-100"
  return "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
}

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

function averageConfidence(frame: ReplayFrame) {
  const values = [
    ...frame.agents.map((agent) => agent.confidence),
    ...frame.narrative.possibleDrivers.map((driver) => driver.confidence),
  ]
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function currentEvent(replay: ReplayCase, eventId: string) {
  return replay.events.find((event) => event.id === eventId) ?? replay.events[0]
}

function frameForEvent(replay: ReplayCase, eventId: string) {
  const eventIndex = Math.max(0, replay.events.findIndex((event) => event.id === eventId))
  const frameIndex = Math.min(
    replay.frames.length - 1,
    Math.round((eventIndex / Math.max(1, replay.events.length - 1)) * Math.max(0, replay.frames.length - 1)),
  )
  return replay.frames[frameIndex] ?? replay.frames[0]!
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
        {replay.frames.map((frame, index) => {
          const x = (index / Math.max(1, replay.frames.length - 1)) * 100
          const y = 82 - ((frame.market.price - min) / range) * 64
          return <circle key={frame.id} cx={x} cy={y} r="1.4" fill="#ecfeff" vectorEffect="non-scaling-stroke" />
        })}
      </svg>
    </div>
  )
}

function CaseSelector({
  replay,
  cases,
  activeFilter,
  activeEventId,
  onFilterChange,
  onReplayChange,
  onEventChange,
}: {
  replay: ReplayCase
  cases: ReplayCase[]
  activeFilter: ReplayFilter
  activeEventId: string
  onFilterChange: (filter: ReplayFilter) => void
  onReplayChange: (id: string) => void
  onEventChange: (id: string) => void
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
          <Target className="h-3.5 w-3.5" />
          Replay Case Selector
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
          {cases.length} cases / {replay.window}
        </div>
      </div>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                filter.id === activeFilter
                  ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-50"
                  : "border-zinc-800 bg-black/45 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="grid gap-1">
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Selected Case</span>
          <select
            value={replay.id}
            onChange={(event) => onReplayChange(event.target.value)}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none ring-0 transition focus:border-cyan-300/50"
          >
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.symbol} / {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {replay.events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onEventChange(event.id)}
            className={`rounded-lg border p-2 text-left transition ${
              event.id === activeEventId
                ? "border-cyan-300/50 bg-cyan-400/15"
                : "border-zinc-900 bg-black/40 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{event.timestamp}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${severityClass(event.severity)}`}>
                {event.severity}
              </span>
            </div>
            <div className="mt-1 text-xs font-black text-white">{event.title}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

function TopSummaryCard({ replay, frame, event }: { replay: ReplayCase; frame: ReplayFrame; event: NonNullable<ReturnType<typeof currentEvent>> }) {
  const confidence = averageConfidence(frame)

  return (
    <section className="rounded-xl border border-cyan-300/20 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,.14),transparent_34%),rgba(9,9,11,.9)] p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Market Forensics</div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            {replay.symbol} / {replay.title} / {replay.window}
          </div>
          <h1 className="mt-2 text-2xl font-black text-white">{event.title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">{event.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-right">
          <div className="rounded-lg border border-zinc-800 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Asset</div>
            <div className="mt-1 text-sm font-black text-white">{replay.symbol}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Timeframe</div>
            <div className="mt-1 text-sm font-black text-white">{frame.label}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Window</div>
            <div className="mt-1 text-sm font-black text-cyan-100">{replay.window}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/45 p-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Confidence</div>
            <div className="mt-1 text-sm font-black text-cyan-100">{confidence}%</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_1.2fr]">
        <div className="rounded-lg border border-zinc-800 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Final Verdict</div>
          <div className="mt-1 text-sm font-black text-white">{replay.verdict}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Price</div>
          <div className="mt-1 text-sm font-black text-white">{frame.market.price.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Reaction</div>
          <div className={`mt-1 text-sm font-black ${metricClass(frame.market.priceChangePct)}`}>
            {frame.market.priceChangePct >= 0 ? "+" : ""}{frame.market.priceChangePct.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Risk</div>
          <div className="mt-1 text-sm font-black text-amber-100">{frame.risk.level} / {frame.risk.summary}</div>
        </div>
      </div>
    </section>
  )
}

function NarrativeRealitySection({ replay, frame }: { replay: ReplayCase; frame: ReplayFrame }) {
  const supporting = frame.narrative.items.filter((item) => item.sentiment !== "negative").slice(0, 2)
  const contradicting = [
    ...frame.narrative.items.filter((item) => item.sentiment === "negative").map((item) => item.headline),
    ...frame.risk.risks,
  ].slice(0, 3)

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">Narrative vs Reality</div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/70">Claimed Narrative</div>
          <div className="mt-1 text-sm font-black text-white">{frame.narrative.primaryNarrative}</div>
          <p className="mt-2 text-xs leading-5 text-cyan-50/80">{frame.narrative.summary}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Conclusion</div>
          <div className="mt-1 text-sm font-black text-white">{replay.verdict}</div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">{replay.realityCheck}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/70">Supporting Evidence</div>
          <div className="mt-2 space-y-2">
            {supporting.map((item) => (
              <div key={item.headline} className="text-xs leading-5 text-emerald-50/80">{item.headline}</div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-rose-300/15 bg-rose-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-100/70">Contradicting Evidence</div>
          <div className="mt-2 space-y-2">
            {contradicting.map((item) => (
              <div key={item} className="text-xs leading-5 text-rose-50/80">{item}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PossibleDrivers({ frame }: { frame: ReplayFrame }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <Target className="h-3.5 w-3.5" />
        Possible Drivers
      </div>
      <div className="space-y-2">
        {frame.narrative.possibleDrivers.map((driver) => (
          <div key={driver.driver} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">#{driver.rank}</div>
                <div className="mt-1 text-sm font-black text-white">{driver.driver}</div>
              </div>
              <div className="min-w-16 text-right text-lg font-black text-cyan-100">{driver.confidence}%</div>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{driver.evidence}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function AgentCommittee({ frame }: { frame: ReplayFrame }) {
  const icons = [TrendingUp, Activity, BrainCircuit, Gauge, ShieldAlert]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <BrainCircuit className="h-3.5 w-3.5" />
        Agent Committee
      </div>
      <div className="grid gap-2">
        {frame.agents.map((agent, index) => {
          const Icon = icons[index] ?? BrainCircuit
          return (
            <article key={agent.agent} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-black text-white">{agent.agent}</div>
                    <div className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${toneClass(agent.tone)}`}>
                      {agent.tone} / {agent.confidence}%
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{agent.summary}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function reasonLabel(reason: string) {
  return reason.replace(/_/g, " ")
}

function SimilarHistoricalEvents({ matches }: { matches: SimilarEventMatch[] }) {
  if (!matches.length) return null

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <History className="h-3.5 w-3.5" />
        Similar Historical Events
      </div>
      <div className="grid gap-2">
        {matches.map((match) => (
          <article key={match.caseId} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{match.symbol}</div>
                <div className="mt-1 text-sm font-black leading-5 text-white">{match.title}</div>
              </div>
              <div className="shrink-0 text-right text-lg font-black text-cyan-100">{match.similarityScore}%</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {match.reasons.slice(0, 3).map((reason) => (
                <span
                  key={`${match.caseId}-${reason}`}
                  className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100/80"
                >
                  {reasonLabel(reason)}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{match.takeaway}</p>
            {match.keyDifferences.length ? (
              <div className="mt-2 text-[11px] leading-5 text-amber-100/80">{match.keyDifferences.join(" / ")}</div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function SetupOutcomeMemory({ memory }: { memory: SetupOutcomeMemorySummary }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <ClipboardCheck className="h-3.5 w-3.5" />
        Setup Outcome Memory
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Sample</div>
          <div className="mt-1 text-sm font-black text-white">{memory.sampleSize}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Win Rate</div>
          <div className="mt-1 text-sm font-black text-cyan-100">{memory.winRate}%</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Avg Move</div>
          <div className={`mt-1 text-sm font-black ${metricClass(memory.averageMovePct)}`}>
            {memory.averageMovePct >= 0 ? "+" : ""}{memory.averageMovePct.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Max Adverse</div>
          <div className="mt-1 text-sm font-black text-rose-200">{memory.maxAdverseMovePct.toFixed(2)}%</div>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">Common Failure Mode</div>
        <p className="mt-1 text-xs leading-5 text-amber-50/80">{memory.commonFailureMode}</p>
      </div>
      <div className="mt-2 grid gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Best Condition</div>
          <div className="mt-1 text-xs leading-5 text-emerald-100/85">{memory.bestHistoricalCondition}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Worst Condition</div>
          <div className="mt-1 text-xs leading-5 text-rose-100/85">{memory.worstHistoricalCondition}</div>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{memory.tacticalLesson}</p>
    </section>
  )
}

function TacticalPlaybookCard({ playbook }: { playbook: TacticalPlaybook }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <ClipboardList className="h-3.5 w-3.5" />
        Tactical Playbook
      </div>
      <div className="grid gap-2">
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Historical Lesson</div>
          <p className="mt-1 text-xs leading-5 text-cyan-50/85">{playbook.lesson}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-lg border border-rose-300/15 bg-rose-400/10 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/70">Key Mistake</div>
            <p className="mt-1 text-xs leading-5 text-rose-50/85">{playbook.mistake}</p>
          </div>
          <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">Confirmation Signal</div>
            <p className="mt-1 text-xs leading-5 text-emerald-50/85">{playbook.confirmation}</p>
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Future Playbook</div>
        <div className="mt-2 space-y-1.5">
          {playbook.playbook.map((item, index) => (
            <div key={item} className="flex gap-2 text-xs leading-5 text-zinc-300">
              <span className="font-black text-cyan-300">{index + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 grid gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Execution Checklist</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {playbook.executionChecklist.map((item) => (
              <span key={item} className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100/80">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Invalidation Checklist</div>
          <div className="mt-2 space-y-1.5">
            {playbook.invalidationChecklist.map((item) => (
              <div key={item} className="text-xs leading-5 text-amber-100/80">{item}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AgentAccuracy({ stats }: { stats: AgentAccuracyStat[] }) {
  const top = stats[0]
  const weakest = stats[stats.length - 1]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
        <ScanLine className="h-3.5 w-3.5" />
        Agent Accuracy
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">Top Agent</div>
          <div className="mt-1 text-sm font-black text-white">{top?.agent ?? "N/A"}</div>
          <div className="mt-1 text-xs font-black text-emerald-100">{top?.accuracyScore ?? 0}% / {top?.caseAlignment ?? "catalog"}</div>
        </div>
        <div className="rounded-lg border border-rose-300/15 bg-rose-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/70">Weakest</div>
          <div className="mt-1 text-sm font-black text-white">{weakest?.agent ?? "N/A"}</div>
          <div className="mt-1 text-xs font-black text-rose-100">{weakest?.accuracyScore ?? 0}% / {weakest?.caseAlignment ?? "catalog"}</div>
        </div>
      </div>
      <div className="mt-2 grid gap-2">
        {stats.map((stat) => (
          <article key={stat.agent} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-black text-white">{stat.agent}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
                  n={stat.sampleSize} / calibration {stat.confidenceCalibrationScore}%
                </div>
              </div>
              <div className="shrink-0 text-right text-lg font-black text-cyan-100">{stat.accuracyScore}%</div>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{stat.alignmentRead ?? stat.tacticalTakeaway}</p>
            {stat.fallbackNote ? <p className="mt-1 text-[11px] leading-5 text-amber-100/80">{stat.fallbackNote}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function ExpectationIntelligenceCard({ expectation }: { expectation: ExpectationIntelligenceSummary }) {
  return (
    <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80">
        <Gauge className="h-3.5 w-3.5" />
        Expectation Intelligence
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-cyan-300/10 bg-black/35 p-2">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/50">Expected</div>
          <div className="mt-1 truncate text-xs font-black text-white">{expectation.dominantExpectedOutcome}</div>
        </div>
        <div className="rounded-md border border-cyan-300/10 bg-black/35 p-2 text-right">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/50">Probability</div>
          <div className="mt-1 text-xs font-black text-cyan-100">{expectation.expectationProbability}%</div>
        </div>
        <div className="rounded-md border border-cyan-300/10 bg-black/35 p-2">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/50">Surprise</div>
          <div className="mt-1 text-xs font-black text-amber-100">{expectation.surpriseScore}/100</div>
        </div>
        <div className="rounded-md border border-cyan-300/10 bg-black/35 p-2 text-right">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/50">Status</div>
          <div className="mt-1 text-xs font-black uppercase text-cyan-100">{expectation.pricingStatus}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
          {expectation.expectationMomentum}
        </span>
        <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
          {expectation.convictionLevel} conviction
        </span>
        <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
          {expectation.confidence}% confidence
        </span>
      </div>
      <div className="mt-2 text-xs leading-5 text-cyan-50/80">{expectation.interpretation}</div>
    </div>
  )
}

function CollapsibleSection({
  title,
  eyebrow,
  defaultOpen = false,
  children,
}: {
  title: string
  eyebrow: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</div>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{title}</div>
        </div>
        <div className="rounded-full border border-zinc-800 bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400 group-open:text-cyan-200">
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Visible</span>
        </div>
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
  )
}

function ReplayTimeline({ replay, frame }: { replay: ReplayCase; frame: ReplayFrame }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <BarChart3 className="h-3.5 w-3.5" />
          Replay Timeline
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Mock-first</div>
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
          <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-2 text-xs leading-5 text-zinc-400">
            {frame.market.liquidityRead}
          </div>
        </div>

        <div className="space-y-2">
          {frame.narrative.items.map((item) => (
            <div key={`${item.timestamp}-${item.headline}`} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  <Newspaper className="h-3.5 w-3.5" />
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

export default function ReplayEngineWorkspace() {
  const initialReplay = REPLAY_CATALOG[0]!.replay
  const [activeFilter, setActiveFilter] = useState<ReplayFilter>("all")
  const [storageRefreshSignal, setStorageRefreshSignal] = useState(0)
  const filteredCases = REPLAY_CATALOG
    .filter((item) => activeFilter === "all" || item.eventType === activeFilter)
    .map((item) => item.replay)
  const [replayId, setReplayId] = useState(initialReplay.id)
  const replay = filteredCases.find((item) => item.id === replayId) ?? filteredCases[0] ?? initialReplay
  const [activeEventId, setActiveEventId] = useState(replay.events[0]?.id ?? "")
  const activeEvent = currentEvent(replay, activeEventId)
  const activeEventIdForReplay = activeEvent?.id ?? replay.events[0]?.id ?? ""
  const activeFrame = frameForEvent(replay, activeEventIdForReplay)
  const similarEvents = useMemo(() => findSimilarReplayCases(replay, 3), [replay])
  const setupMemory = useMemo(() => getSetupOutcomeMemory(replay), [replay])
  const expectation = useMemo(() => getExpectationIntelligence(replay), [replay])
  const tacticalPlaybook = useMemo(() => getTacticalPlaybook(replay), [replay])
  const agentAccuracy = useMemo(() => getAgentAccuracyStats({ replay }), [replay])
  const marketMemory = useMemo(() => getMarketMemory({ caseId: replay.id }), [replay])
  const predictionMarkets = useMemo(() => getPredictionMarketIntelligence({ caseId: replay.id }), [replay])
  const eventMemoryLink = useMemo(() => getEventMemoryLinker({ caseId: replay.id }), [replay])
  const replayExplanation = useMemo(() => getReplayExplanation({ caseId: replay.id }), [replay])
  const learningSummary = useMemo(() => getReplayLearningSummary({ caseId: replay.id }), [replay])
  const decisionJournal = useMemo(() => getReplayDecisionJournal({ caseId: replay.id }), [replay])

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 px-4 py-4 lg:px-5">
        <CaseSelector
          replay={replay}
          cases={filteredCases}
          activeFilter={activeFilter}
          activeEventId={activeEventIdForReplay}
          onFilterChange={(filter) => {
            const nextCases = REPLAY_CATALOG
              .filter((item) => filter === "all" || item.eventType === filter)
              .map((item) => item.replay)
            setActiveFilter(filter)
            setReplayId(nextCases[0]?.id ?? initialReplay.id)
            setActiveEventId(nextCases[0]?.events[0]?.id ?? initialReplay.events[0]?.id ?? "")
          }}
          onReplayChange={(id) => {
            const next = filteredCases.find((item) => item.id === id)
            setReplayId(id)
            setActiveEventId(next?.events[0]?.id ?? "")
          }}
          onEventChange={setActiveEventId}
        />

        <ReplayNarrativeFlow
          replay={replay}
          frame={activeFrame}
          event={activeEvent ?? replay.events[0]!}
          learningSummary={learningSummary}
          explanation={replayExplanation}
          decisionJournal={decisionJournal}
          similarEvents={similarEvents}
          setupMemory={setupMemory}
          marketMemory={marketMemory}
          eventMemoryLink={eventMemoryLink}
          expectation={expectation}
          predictionMarkets={predictionMarkets}
          tacticalPlaybook={tacticalPlaybook}
          agentAccuracy={agentAccuracy}
          storageRefreshSignal={storageRefreshSignal}
          onStorageRefresh={() => setStorageRefreshSignal((value) => value + 1)}
        />
      </div>
    </main>
  )
}
