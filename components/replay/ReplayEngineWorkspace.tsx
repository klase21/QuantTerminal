"use client"

import { useState } from "react"
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Gauge,
  Newspaper,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react"

import { adaptMockReplayCase } from "@/core/replay/replayAdapter"
import { MOCK_REPLAY_SOURCE_CASES, type MockReplayEventType } from "@/core/replay/mockReplayData"
import type { ReplayAgentTone, ReplayCase, ReplayFrame, ReplaySentiment, ReplaySeverity } from "@/core/replay/replayTypes"

type ReplayFilter = "all" | MockReplayEventType

const REPLAY_CATALOG = MOCK_REPLAY_SOURCE_CASES.map((source) => ({
  eventType: source.eventType,
  shockLevel: source.shockLevel,
  replay: adaptMockReplayCase(source),
}))

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
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
        <Target className="h-3.5 w-3.5" />
        Case / Event
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
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
      <div className="flex flex-wrap gap-2">
        {cases.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onReplayChange(item.id)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              item.id === replay.id
                ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-50"
                : "border-zinc-800 bg-black/45 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <div className="text-[9px] font-black uppercase tracking-[0.16em]">{item.symbol}</div>
            <div className="mt-1 text-xs font-black">{item.title}</div>
          </button>
        ))}
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
          <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80">
              <Gauge className="h-3.5 w-3.5" />
              Prediction Market Placeholder
            </div>
            <div className="mt-2 text-xs leading-5 text-cyan-50/80">{frame.expectation.interpretation}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ReplayEngineWorkspace() {
  const initialReplay = REPLAY_CATALOG[0]!.replay
  const [activeFilter, setActiveFilter] = useState<ReplayFilter>("all")
  const filteredCases = REPLAY_CATALOG
    .filter((item) => activeFilter === "all" || item.eventType === activeFilter)
    .map((item) => item.replay)
  const [replayId, setReplayId] = useState(initialReplay.id)
  const replay = filteredCases.find((item) => item.id === replayId) ?? filteredCases[0] ?? initialReplay
  const [activeEventId, setActiveEventId] = useState(replay.events[0]?.id ?? "")
  const activeEvent = currentEvent(replay, activeEventId)
  const activeEventIdForReplay = activeEvent?.id ?? replay.events[0]?.id ?? ""
  const activeFrame = frameForEvent(replay, activeEventIdForReplay)

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

        <TopSummaryCard replay={replay} frame={activeFrame} event={activeEvent ?? replay.events[0]!} />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-3">
            <NarrativeRealitySection replay={replay} frame={activeFrame} />
            <ReplayTimeline replay={replay} frame={activeFrame} />
          </div>

          <div className="grid content-start gap-3">
            <PossibleDrivers frame={activeFrame} />
            <AgentCommittee frame={activeFrame} />
          </div>
        </div>
      </div>
    </main>
  )
}
