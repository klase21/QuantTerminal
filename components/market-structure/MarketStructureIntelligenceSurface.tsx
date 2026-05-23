"use client"

import { useEffect, useMemo, useState } from "react"

import type { MarketStructureSectorSnapshot } from "@/core/market-structure/marketStructureTypes"
import { useMarketStructureIntelligence } from "@/hooks/useMarketStructureIntelligence"

function metric(value: unknown, digits = 2) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return "--"
  return parsed.toFixed(digits)
}

function money(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "--"
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  return `$${value.toFixed(0)}`
}

function tone(state?: string) {
  switch (state) {
    case "CROWDED":
    case "EXTREME":
      return "border-red-500/30 bg-red-500/10 text-red-200"
    case "EXPANDING":
    case "HIGH":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    case "BUILDING":
    case "MEDIUM":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
    case "COOLING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200"
    default:
      return "border-zinc-800 bg-zinc-950 text-zinc-400"
  }
}

function SourceBadge({ name, status }: { name: string; status: string }) {
  const ok = status === "connected"
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
      {name.replaceAll("-", " ")} · {status}
    </span>
  )
}

function SectorRow({ sector, selected, onClick }: { sector: MarketStructureSectorSnapshot; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid w-full grid-cols-[42px_1fr_78px] items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-cyan-500/40 bg-cyan-500/10" : "border-zinc-900 bg-zinc-950/70 hover:border-zinc-700"}`}
    >
      <div className="text-xs font-black text-zinc-500">#{sector.rank}</div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-[0.14em] text-white">{sector.sector}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${tone(sector.operatorState)}`}>{sector.operatorState}</span>
        </div>
        <div className="mt-1 truncate text-xs text-zinc-500">{sector.operatorRead}</div>
      </div>
      <div className="text-right text-lg font-black text-cyan-200">{metric(sector.marketStructureScore, 1)}</div>
    </button>
  )
}

function DetailPanel({ sector }: { sector?: MarketStructureSectorSnapshot }) {
  if (!sector) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-zinc-900 bg-zinc-950/60 p-6 text-center text-sm text-zinc-500">
        Waiting for market structure intelligence...
      </div>
    )
  }

  const cards = [
    { label: "Leverage Crowding", value: metric(sector.derivatives.leverageCrowding), note: `${money(sector.derivatives.openInterestUsd)} OI` },
    { label: "Participation Velocity", value: metric(sector.participation.participationVelocity), note: `${metric(sector.participation.breadthPersistence)} breadth` },
    { label: "Conviction Regime", value: sector.narrative.propagationState, note: `${metric(sector.narrative.extremityScore)} extremity` },
    { label: "Memory Readiness", value: metric(sector.historical.replayReadiness), note: sector.historical.memoryState },
  ]

  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400/80">Operator Read</div>
          <div className="mt-2 text-2xl font-black uppercase tracking-[0.16em] text-white">{sector.sector}</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{sector.operatorRead}</p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tone(sector.operatorState)}`}>{sector.operatorState}</div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-900 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{card.label}</div>
            <div className="mt-2 text-xl font-black text-white">{card.value}</div>
            <div className="mt-1 text-xs text-zinc-500">{card.note}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-900 bg-black/30 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Derivatives</div>
          <div className="mt-3 space-y-1 text-xs text-zinc-400">
            {sector.derivatives.evidence.map((item) => <div key={item}>• {item}</div>)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-900 bg-black/30 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Participation</div>
          <div className="mt-3 space-y-1 text-xs text-zinc-400">
            {sector.participation.evidence.map((item) => <div key={item}>• {item}</div>)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-900 bg-black/30 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Risk Notes</div>
          <div className="mt-3 space-y-1 text-xs text-zinc-400">
            {sector.risks.map((item) => <div key={item}>• {item}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MarketStructureIntelligenceSurface() {
  const { data, status, error } = useMarketStructureIntelligence()
  const sectors = data?.sectors ?? []
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null)
  const selected = useMemo(
    () => sectors.find((sector) => sector.sector === selectedSectorId) ?? sectors[0],
    [sectors, selectedSectorId]
  )

  useEffect(() => {
    if (!selectedSectorId && sectors[0]) setSelectedSectorId(sectors[0].sector)
  }, [sectors, selectedSectorId])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <div className="rounded-2xl border border-zinc-900 bg-black p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-fuchsia-400/80">Phase 27–30 Intelligence Expansion</div>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[0.16em] text-white">Market Structure Intelligence</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              Derivatives positioning, participation velocity, narrative propagation, and historical memory in one operator surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data?.sources ?? []).map((source) => <SourceBadge key={source.name} name={source.name} status={source.status} />)}
            {!data && <SourceBadge name="market-structure" status={status} />}
          </div>
        </div>
        {error && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Structure Ranking</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Top sectors</div>
          </div>
          <div className="space-y-2">
            {sectors.length ? sectors.slice(0, 10).map((sector) => (
              <SectorRow key={sector.sector} sector={sector} selected={sector.sector === selected?.sector} onClick={() => setSelectedSectorId(sector.sector)} />
            )) : (
              <div className="rounded-xl border border-zinc-900 bg-black/40 p-5 text-center text-sm text-zinc-500">Loading market structure feed...</div>
            )}
          </div>
        </div>

        <DetailPanel sector={selected} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Narrative Propagation</div>
          <div className="mt-3 space-y-3">
            {sectors.slice(0, 5).map((sector) => (
              <div key={sector.sector}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200">{sector.sector}</span>
                  <span className="text-zinc-500">{sector.narrative.propagationState}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-fuchsia-400/80" style={{ width: `${Math.min(100, sector.narrative.convictionScore)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Participation Velocity</div>
          <div className="mt-3 space-y-3">
            {sectors.slice(0, 5).map((sector) => (
              <div key={sector.sector}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200">{sector.sector}</span>
                  <span className="text-zinc-500">{metric(sector.participation.participationVelocity)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.min(100, sector.participation.participationVelocity)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Historical Memory</div>
          <div className="mt-3 space-y-3">
            {sectors.slice(0, 5).map((sector) => (
              <div key={sector.sector}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200">{sector.sector}</span>
                  <span className="text-zinc-500">{sector.historical.memoryState}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${Math.min(100, sector.historical.replayReadiness)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
