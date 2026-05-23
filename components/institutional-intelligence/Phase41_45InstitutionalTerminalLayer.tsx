"use client"

import type { ReactNode } from "react"

import { useInstitutionalIntelligenceLayer } from "@/hooks/useInstitutionalIntelligenceLayer"
import type { InstitutionalWorkspacePanel, PortfolioExposureItem, RankedSignal, TimeframeIntelligenceItem, TradeMemoryPattern } from "@/core/institutional-intelligence/institutionalTypes"

function metric(value: unknown, digits = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return "--"
  return parsed.toFixed(digits)
}

function tone(value?: string) {
  switch (value) {
    case "ALPHA":
    case "ACTIONABLE":
    case "LONG_BIAS":
    case "BULLISH":
    case "OPERATOR":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    case "DEFENSIVE":
    case "SHORT_BIAS":
    case "BEARISH":
    case "RISK":
      return "border-red-500/30 bg-red-500/10 text-red-200"
    case "WATCH":
    case "MIXED":
    case "COMPRESSED":
    case "RESEARCH":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200"
    default:
      return "border-zinc-800 bg-zinc-950 text-zinc-400"
  }
}

function Pill({ children, value }: { children: ReactNode; value?: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone(value)}`}>{children}</span>
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
      <div className="h-full rounded-full bg-fuchsia-300/80" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

function ExposureCard({ item }: { item: PortfolioExposureItem }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase text-zinc-100">{item.sector}</div>
        <Pill value={item.side}>{item.side.replace("_", " ")}</Pill>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_46px] items-center gap-3">
        <Bar value={item.exposureScore} />
        <div className="text-right text-sm font-black text-fuchsia-200">{metric(item.exposureScore)}</div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <div>Narr {metric(item.narrativeExposure)}</div>
        <div>Crowd {metric(item.crowdingExposure)}</div>
        <div>Beta {metric(item.betaConcentration)}</div>
      </div>
    </div>
  )
}

function MemoryRow({ item }: { item: TradeMemoryPattern }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-black uppercase text-zinc-100">{item.label}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">{item.replayWindow} · {item.historicalOutcome}</div>
        </div>
        <div className="text-right text-sm font-black text-cyan-200">{metric(item.confidence)}</div>
      </div>
    </div>
  )
}

function TimeframeRow({ item }: { item: TimeframeIntelligenceItem }) {
  return (
    <div className="grid grid-cols-[44px_1fr_58px] items-center gap-3 rounded-xl border border-zinc-800 bg-black/35 p-3">
      <div className="text-xs font-black text-zinc-300">{item.timeframe}</div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <Pill value={item.direction}>{item.direction}</Pill>
          <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{item.topSector ?? "--"}</span>
        </div>
        <div className="mt-2"><Bar value={item.consensusScore} /></div>
      </div>
      <div className="text-right text-sm font-black text-violet-200">{metric(item.consensusScore)}</div>
    </div>
  )
}

function SignalRow({ item }: { item: RankedSignal }) {
  return (
    <div className="grid grid-cols-[30px_1fr_64px] items-center gap-3 rounded-xl border border-zinc-800 bg-black/35 p-3">
      <div className="text-xs font-black text-zinc-500">#{item.rank}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="truncate text-xs font-black uppercase text-zinc-100">{item.label}</div>
          <Pill value={item.class}>{item.class}</Pill>
        </div>
        <div className="mt-1 truncate text-[10px] text-zinc-500">confidence {metric(item.confidence)} · decay {metric(item.decayRisk)}</div>
      </div>
      <div className="text-right text-sm font-black text-emerald-200">{metric(item.actionability)}</div>
    </div>
  )
}

function WorkspacePanel({ item }: { item: InstitutionalWorkspacePanel }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/35 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Phase {item.phase}</div>
          <div className="mt-1 text-xs font-black uppercase text-zinc-100">{item.title}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-black text-zinc-300">{item.hotkey}</div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{item.summary}</p>
    </div>
  )
}

export default function Phase41_45InstitutionalTerminalLayer() {
  const { data, error, loading } = useInstitutionalIntelligenceLayer()

  return (
    <section className="rounded-3xl border border-fuchsia-500/20 bg-zinc-950/80 p-5 shadow-[0_0_60px_rgba(217,70,239,0.08)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.36em] text-fuchsia-300/80">Phase 41-45</div>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Institutional Terminal Layer</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Portfolio intelligence, AI trade memory, multi-timeframe consensus, signal ranking, and institutional workspace orchestration layered over the AI intelligence stack.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill value={data?.ux.activeMode}>{data?.ux.activeMode ?? (loading ? "LOADING" : "IDLE")}</Pill>
          <Pill>{data?.mode ?? "empty"}</Pill>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div> : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Phase 41</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="text-sm font-black uppercase text-zinc-100">Portfolio Intelligence</div>
            <div className="text-right text-xl font-black text-fuchsia-200">{metric(data?.portfolio.concentrationRisk)}</div>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{data?.portfolio.hedgingRead ?? "Waiting for exposure model."}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(data?.portfolio.exposures ?? []).slice(0, 4).map((item) => <ExposureCard key={item.sector} item={item} />)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Phase 44</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="text-sm font-black uppercase text-zinc-100">Signal Ranking Engine</div>
            <div className="text-right text-xl font-black text-emerald-200">{metric(data?.signalRanking.signalQualityScore)}</div>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{data?.signalRanking.operatorRead ?? "Waiting for ranked signals."}</p>
          <div className="mt-4 space-y-2">
            {(data?.signalRanking.topSignals ?? []).slice(0, 5).map((item) => <SignalRow key={item.id} item={item} />)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Phase 42</div>
          <div className="mt-1 text-sm font-black uppercase text-zinc-100">AI Trade Memory</div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{data?.tradeMemory.memoryRead ?? "Waiting for memory recall."}</p>
          <div className="mt-4 space-y-2">
            {(data?.tradeMemory.patterns ?? []).slice(0, 4).map((item) => <MemoryRow key={item.id} item={item} />)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Phase 43</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="text-sm font-black uppercase text-zinc-100">Multi-Timeframe Intelligence</div>
            <Pill value={data?.multiTimeframe.consensus}>{data?.multiTimeframe.consensus ?? "--"}</Pill>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{data?.multiTimeframe.operatorRead ?? "Waiting for timeframe consensus."}</p>
          <div className="mt-4 space-y-2">
            {(data?.multiTimeframe.frames ?? []).map((item) => <TimeframeRow key={item.timeframe} item={item} />)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Phase 45</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="text-sm font-black uppercase text-zinc-100">Institutional UX Layer</div>
            <Pill value={data?.ux.activeMode}>{data?.ux.activeMode ?? "--"}</Pill>
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{data?.ux.operatorLayoutRead ?? "Waiting for workspace orchestration."}</p>
          <div className="mt-4 space-y-2">
            {(data?.ux.panels ?? []).slice(0, 5).map((item) => <WorkspacePanel key={item.id} item={item} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
