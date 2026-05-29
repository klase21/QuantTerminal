"use client"

import { useEffect, useMemo, useState } from "react"

import { appendHistoricalSnapshot, buildHistoricalMemorySurface, buildHistoricalSnapshot } from "@/core/memory/historicalMemoryEngine"
import type { HistoricalRegimeSnapshot } from "@/core/memory/historicalMemoryTypes"
import { buildMemoryReplaySurface } from "@/core/memory/memoryReplayEngine"
import type { NarrativeSurface, NarrativePropagationNode, CrossMarketNode, CrossMarketReflexivitySurface } from "@/core/narrative/narrativeTypes"

const STORAGE_KEY = "quantterminal.phase31_35.historicalMemory.v1"
const MAX_MEMORY = 240

type Props = {
  narrative: NarrativeSurface
}

function metric(value: unknown, digits = 0) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return "--"
  return number.toFixed(digits)
}

function label(value?: string) {
  if (!value) return "--"
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

function safeWidth(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return `${Math.min(100, Math.max(0, Number.isFinite(number) ? number : 0))}%`
}

function phaseClass(phase?: string) {
  switch (phase) {
    case "EUPHORIA":
      return "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200"
    case "EXHAUSTION":
    case "COLLAPSE":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    case "EXPANSION":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "IGNITION":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function PhaseBadge({ phase }: { phase?: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ${phaseClass(phase)}`}>
      {label(phase)}
    </span>
  )
}

function NarrativePropagationGraph({ nodes, links }: { nodes: NarrativePropagationNode[]; links: NonNullable<NarrativeSurface["propagation"]>["links"] }) {
  const lead = nodes[0]
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Narrative Propagation</div>
          <div className="mt-1 text-sm font-black uppercase text-zinc-100">Narrative Propagation Graph</div>
        </div>
        <PhaseBadge phase={lead?.phase} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[0.72fr_1fr]">
        <div className="relative min-h-[170px] overflow-hidden rounded-xl border border-violet-500/15 bg-black/40 p-3">
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/30 bg-violet-500/10" />
          {nodes.slice(0, 6).map((node, index) => {
            const angle = (Math.PI * 2 * index) / Math.max(1, Math.min(6, nodes.length))
            const radius = index === 0 ? 0 : 62
            const left = 50 + Math.cos(angle) * (radius / 2.2)
            const top = 50 + Math.sin(angle) * (radius / 2.2)
            return (
              <div
                key={node.narrative}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/30 bg-zinc-950 px-3 py-2 text-center shadow-[0_0_28px_rgba(139,92,246,0.18)]"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <div className="text-[10px] font-black uppercase text-violet-100">{node.narrative}</div>
                <div className="mt-0.5 text-[9px] text-zinc-500">V {metric(node.velocity)}</div>
              </div>
            )
          })}
        </div>
        <div className="space-y-2">
          {nodes.slice(0, 5).map((node) => (
            <div key={node.narrative} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black uppercase text-zinc-100">{node.narrative}</div>
                <PhaseBadge phase={node.phase} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-zinc-500">
                <div>Velocity <b className="text-violet-200">{metric(node.velocity)}</b></div>
                <div>Sync <b className="text-cyan-200">{metric(node.synchronization)}</b></div>
                <div>Stress <b className="text-red-200">{metric(node.stress)}</b></div>
              </div>
            </div>
          ))}
          {(links ?? []).slice(0, 2).map((link, index) => (
            <div key={`${link.from ?? link.source}-${link.to ?? link.target}-${index}`} className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-400">
              <b className="text-zinc-200">{link.from ?? link.source}</b> → <b className="text-zinc-200">{link.to ?? link.target}</b> · strength {metric(link.strength)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReflexivityMap({ nodes }: { nodes: CrossMarketNode[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Narrative Graph</div>
          <div className="mt-1 text-sm font-black uppercase text-zinc-100">Cross-Market Reflexivity Map</div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {nodes.slice(0, 6).map((node) => (
          <div key={node.id} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-xs font-black uppercase text-zinc-100">{node.label}</div>
              <div className="text-[10px] font-bold text-cyan-200">{metric(node.score)}</div>
            </div>
            <div className="mt-2 grid grid-cols-[48px_1fr_42px] items-center gap-2">
              <span className="text-[10px] uppercase text-zinc-500">Risk</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                <div className="h-full rounded-full bg-red-400/80" style={{ width: safeWidth(node.risk) }} />
              </div>
              <span className="text-right text-[10px] text-zinc-400">{metric(node.risk)}</span>
            </div>
          </div>
        ))}
        {!nodes.length ? <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">Waiting for reflexivity nodes.</div> : null}
      </div>
    </div>
  )
}

function HistoricalReplayTape({ snapshots, narrative }: { snapshots: HistoricalRegimeSnapshot[]; narrative: NarrativeSurface }) {
  const currentSnapshot = useMemo(() => buildHistoricalSnapshot(narrative), [narrative])
  const replay = useMemo(() => buildMemoryReplaySurface(snapshots, "ALL", Math.max(0, snapshots.length - 1)), [snapshots])
  const memory = useMemo(() => buildHistoricalMemorySurface(currentSnapshot, snapshots), [currentSnapshot, snapshots])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Contagion Frame</div>
          <div className="mt-1 text-sm font-black uppercase text-zinc-100">Historical Replay Engine</div>
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.18em] text-zinc-500">{snapshots.length} frames</div>
      </div>
      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-3">
        <div className="text-xs font-bold uppercase text-violet-200">{replay.currentFrame?.leadNarrative ?? memory.current.leadNarrative}</div>
        <p className="mt-1 text-xs leading-5 text-zinc-400">{replay.operatorRead}</p>
      </div>
      <div className="mt-3 space-y-2">
        {replay.frames.slice(-5).reverse().map((frame) => (
          <div key={frame.id} className="grid grid-cols-[76px_1fr_52px] items-center gap-2 rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="text-[10px] font-bold uppercase text-zinc-500">{new Date(frame.timestamp).toLocaleTimeString()}</div>
            <div>
              <div className="truncate text-xs font-black uppercase text-zinc-100">{frame.leadNarrative} · {label(frame.regime)}</div>
              <div className="mt-1 text-[10px] text-zinc-500">{label(frame.leadPhase)}</div>
            </div>
            <div className="text-right text-xs font-black text-violet-200">{metric(frame.heat)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventTape({ narrative, snapshots }: { narrative: NarrativeSurface; snapshots: HistoricalRegimeSnapshot[] }) {
  const reflexivity = narrative.crossMarketReflexivity as CrossMarketReflexivitySurface | undefined
  const events = [
    ...(narrative.propagation?.nodes ?? []).slice(0, 3).map((node) => ({ title: `${node.narrative} ${label(node.phase)}`, detail: node.summary, score: node.velocity })),
    ...(reflexivity?.dependencies ?? []).slice(0, 2).map((dep) => ({ title: `${dep.from ?? dep.source} → ${dep.to ?? dep.target}`, detail: dep.read ?? dep.reason ?? dep.summary ?? "Cross-market dependency active.", score: dep.strength })),
    ...snapshots.slice(-2).map((snapshot) => ({ title: `${snapshot.leadNarrative} Memory Snapshot`, detail: `${label(snapshot.regime)} / ${label(snapshot.leadPhase)}`, score: snapshot.heat })),
  ]

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Memory Snapshot</div>
        <div className="mt-1 text-sm font-black uppercase text-zinc-100">Intelligence Timeline / Event Tape</div>
      </div>
      <div className="mt-4 space-y-2">
        {events.slice(0, 7).map((event, index) => (
          <div key={`${event.title}-${index}`} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase text-zinc-100">{event.title}</div>
              <div className="text-[10px] font-bold text-cyan-200">{metric(event.score)}</div>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{event.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardIntegrationSummary({ narrative, snapshots }: { narrative: NarrativeSurface; snapshots: HistoricalRegimeSnapshot[] }) {
  const propagation = narrative.propagation
  const stress = narrative.liquidityStress
  const reflexivity = narrative.crossMarketReflexivity
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-zinc-950/80 p-4 shadow-[0_0_40px_rgba(139,92,246,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-violet-300/80">Intelligence Map</div>
          <div className="mt-1 text-sm font-black uppercase text-zinc-100">Dashboard Integration + UX Polish</div>
        </div>
        <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">MVP Live</div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Velocity</div>
          <div className="mt-1 text-lg font-black text-violet-200">{metric(propagation?.velocityScore)}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Stress</div>
          <div className="mt-1 text-lg font-black text-red-200">{metric(stress?.stressScore)}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Reflexivity</div>
          <div className="mt-1 text-lg font-black text-cyan-200">{metric(reflexivity?.reflexivityScore)}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Memory</div>
          <div className="mt-1 text-lg font-black text-emerald-200">{snapshots.length}</div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-400">
        {propagation?.operatorRead ?? "Propagation layer is scanning."}
      </p>
    </div>
  )
}

export default function Phase31_35IntelligenceLayer({ narrative }: Props) {
  const [snapshots, setSnapshots] = useState<HistoricalRegimeSnapshot[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as HistoricalRegimeSnapshot[]
      if (Array.isArray(parsed)) setSnapshots(parsed)
    } catch {
      setSnapshots([])
    }
  }, [])

  useEffect(() => {
    if (!narrative.ok) return
    setSnapshots((previous) => {
      const next = appendHistoricalSnapshot(previous, buildHistoricalSnapshot(narrative), MAX_MEMORY)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Local memory is best effort only.
      }
      return next
    })
  }, [narrative])

  const nodes = narrative.propagation?.nodes ?? []
  const links = narrative.propagation?.links ?? []
  const reflexivityNodes = (narrative.crossMarketReflexivity as CrossMarketReflexivitySurface | undefined)?.nodes ?? []

  return (
    <div className="mt-3 space-y-3">
      <DashboardIntegrationSummary narrative={narrative} snapshots={snapshots} />
      <div className="grid gap-3 xl:grid-cols-[1.35fr_0.9fr]">
        <NarrativePropagationGraph nodes={nodes} links={links} />
        <ReflexivityMap nodes={reflexivityNodes} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <HistoricalReplayTape snapshots={snapshots} narrative={narrative} />
        <EventTape narrative={narrative} snapshots={snapshots} />
      </div>
    </div>
  )
}
