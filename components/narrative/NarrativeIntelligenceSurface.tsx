"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { CheckCircle2, Eye, Layers3, Map, ShieldAlert, Sparkles, X, Zap } from "lucide-react"

import TacticalMarketMap from "@/components/market-map/TacticalMarketMap"
import RotationRadarPanel from "@/components/market-map/RotationRadarPanel"
import TacticalLaneLegend from "@/components/market-map/TacticalLaneLegend"
import TacticalLiveBindingProvider from "@/components/tactical/TacticalLiveBindingProvider"
import { buildTacticalMarketMapState } from "@/core/market-map/tacticalMarketMapEngine"
import { buildTacticalIntelligenceBrain } from "@/lib/tactical/tacticalVerdictEngine"
import { buildMacroReasoning } from "@/lib/tactical/macroReasoningEngine"
import { buildFlowIntelligence } from "@/lib/tactical/flowIntelligenceEngine"
import { buildNarrativeMacroFusionV2 } from "@/lib/tactical/narrativeMacroFusionV2"
import { buildTacticalInsightV3 } from "@/lib/tactical/tacticalInsightEngineV3"
import { buildExecutionIntelligenceV3 } from "@/lib/tactical/executionIntelligenceV3"
import { buildTacticalStrategyOS } from "@/lib/tactical/tacticalStrategyPlaybookEngine"
import { useTacticalSnapshotStore } from "@/stores/useTacticalSnapshotStore"

type OverlayKey = "lanes" | "rotation" | "pressure" | "threats"

const overlayLabels: Record<OverlayKey, string> = {
  lanes: "Lane Read",
  rotation: "Rotation Radar",
  pressure: "Sector Pressure",
  threats: "Threat Overlay",
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/10 bg-black/45 p-4 ${className}`}>{children}</div>
}

function SectionLabel({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
      {icon}
      {children}
    </div>
  )
}

function ContextPill({ label, value, tone = "zinc" }: { label: string; value: ReactNode; tone?: "cyan" | "emerald" | "amber" | "rose" | "zinc" }) {
  const toneMap = {
    cyan: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    rose: "border-rose-300/20 bg-rose-400/10 text-rose-100",
    zinc: "border-white/10 bg-white/[0.035] text-zinc-200",
  }[tone]

  return (
    <div className={`rounded-2xl border p-3 ${toneMap}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.22em] opacity-60">{label}</div>
      <div className="mt-2 text-sm font-black leading-5">{value}</div>
    </div>
  )
}

function OverlayToggle({ id, active, onToggle }: { id: OverlayKey; active: boolean; onToggle: (id: OverlayKey) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`rounded-2xl border px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.16em] transition ${
        active
          ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,.14)]"
          : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {overlayLabels[id]}
    </button>
  )
}

function AdvancedMapModal({
  activeOverlays,
  onToggle,
  onClose,
}: {
  activeOverlays: OverlayKey[]
  onToggle: (id: OverlayKey) => void
  onClose: () => void
}) {
  const state = useMemo(() => buildTacticalMarketMapState(), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/60 px-3 py-5 backdrop-blur-md xl:items-center xl:overflow-hidden">
      <div className="relative flex h-[90vh] w-[96vw] max-w-[1600px] flex-col overflow-hidden rounded-[2rem] border border-cyan-200/25 bg-[#061016]/95 shadow-[0_0_80px_rgba(34,211,238,.18),0_40px_100px_rgba(0,0,0,.75)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/[0.035] px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <SectionLabel icon={<Map className="h-3.5 w-3.5" />}>Advanced Market Map</SectionLabel>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100">
                On-demand layer
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Open this only when you want to inspect the map behind the compressed execution context.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/30 bg-black/70 text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-400/10"
            aria-label="Close advanced market map"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 items-stretch gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-h-[640px] overflow-hidden rounded-[1.7rem] border border-cyan-300/15 bg-black/55 shadow-inner shadow-cyan-950/20 xl:h-full xl:min-h-0">
            <TacticalMarketMap showSidePanel={false} minHeightClass="h-full min-h-0" showChrome={false} />
          </div>

          <aside className="max-h-[640px] space-y-3 overflow-y-auto pr-1 xl:max-h-full">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(overlayLabels) as OverlayKey[]).map((id) => (
                <OverlayToggle key={id} id={id} active={activeOverlays.includes(id)} onToggle={onToggle} />
              ))}
            </div>

            {activeOverlays.includes("lanes") ? <TacticalLaneLegend /> : null}
            {activeOverlays.includes("rotation") ? <RotationRadarPanel routes={state.radar} /> : null}

            {activeOverlays.includes("pressure") ? (
              <div className="rounded-3xl border border-white/10 bg-black/45 p-4">
                <SectionLabel>Sector Pressure</SectionLabel>
                <div className="mt-3 space-y-2">
                  {state.sectors.slice(0, 5).map((sector) => (
                    <div key={sector.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-white">{sector.label}</div>
                          <div className="text-[10px] uppercase text-zinc-500">{sector.state}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-cyan-300">{sector.pressure}</div>
                          <div className="text-[10px] text-zinc-500">pressure</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeOverlays.includes("threats") ? (
              <div className="rounded-3xl border border-rose-400/20 bg-rose-950/10 p-4">
                <SectionLabel icon={<ShieldAlert className="h-3.5 w-3.5" />}>Threat Overlay</SectionLabel>
                <div className="mt-3 space-y-2">
                  {state.threats.map((threat) => (
                    <div key={threat.id} className="rounded-2xl border border-rose-400/10 bg-black/45 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-white">{threat.label}</div>
                        <div className="text-[10px] font-black text-rose-300">{threat.severity}</div>
                      </div>
                      <div className="mt-1 text-xs leading-4 text-zinc-500">{threat.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

function NarrativeIntelligenceSurfaceInner() {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [activeOverlays, setActiveOverlays] = useState<OverlayKey[]>(["lanes", "rotation", "pressure", "threats"])
  const tacticalSnapshot = useTacticalSnapshotStore((state) => state.snapshot)

  const tacticalBrain = useMemo(() => buildTacticalIntelligenceBrain(tacticalSnapshot.input), [tacticalSnapshot])
  const macroReasoning = useMemo(() => buildMacroReasoning(tacticalSnapshot.macroInput), [tacticalSnapshot])
  const flowIntelligence = useMemo(() => buildFlowIntelligence(tacticalSnapshot.flowInput), [tacticalSnapshot])
  const narrativeMacroFusion = useMemo(
    () => buildNarrativeMacroFusionV2({ tactical: tacticalBrain, macro: macroReasoning, flow: flowIntelligence }),
    [flowIntelligence, macroReasoning, tacticalBrain],
  )
  const tacticalInsightV3 = useMemo(() => buildTacticalInsightV3(tacticalSnapshot), [tacticalSnapshot])
  const executionIntelligenceV3 = useMemo(
    () => buildExecutionIntelligenceV3({ snapshot: tacticalSnapshot, insight: tacticalInsightV3 }),
    [tacticalSnapshot, tacticalInsightV3],
  )
  const tacticalStrategyOS = useMemo(
    () => buildTacticalStrategyOS({ snapshot: tacticalSnapshot, insight: tacticalInsightV3, execution: executionIntelligenceV3 }),
    [executionIntelligenceV3, tacticalInsightV3, tacticalSnapshot],
  )

  const topPlaybook = tacticalStrategyOS.playbooks?.[0]
  const narrativeDriver = tacticalBrain.narrative.possibleDrivers?.[0] ?? "No dominant narrative driver detected."
  const marketImpact = tacticalBrain.narrative.executionImpact || narrativeMacroFusion.executionImpact || "Narrative is context only until flow confirms."
  const primaryRisk = tacticalBrain.riskFactors?.[0] ?? tacticalBrain.liquidation.executionImpact ?? "No major narrative-specific risk detected."
  const whyNow = topPlaybook?.catalyst?.[0] ?? narrativeDriver
  const supportState = tacticalBrain.directionalBias === "NO EDGE" ? "FILTER ONLY" : tacticalBrain.directionalBias

  function toggleOverlay(id: OverlayKey) {
    setActiveOverlays((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  return (
    <div className="min-h-[520px] space-y-4">
      <Card className="border-cyan-300/20 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.10),transparent_34%),rgba(0,0,0,.46)] shadow-[0_0_45px_rgba(34,211,238,.07)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionLabel icon={<Sparkles className="h-3.5 w-3.5" />}>Narrative Context</SectionLabel>
            <h2 className="mt-3 text-2xl font-black leading-tight text-white md:text-3xl">
              {supportState} · {tacticalBrain.verdict}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Narrative is shown only as execution context: what may be driving attention, what it changes, and what can invalidate it.
            </p>
          </div>

          <div className="grid min-w-[220px] gap-2">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/70">Best Match</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{topPlaybook?.title ?? tacticalBrain.opportunity.category}</div>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-200/70">Execution State</div>
              <div className="mt-1 text-sm font-black text-amber-100">{tacticalBrain.executionState}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 xl:grid-cols-3">
        <ContextPill label="Narrative" value={narrativeDriver} tone="cyan" />
        <ContextPill label="Market Impact" value={marketImpact} tone="emerald" />
        <ContextPill label="Risk" value={primaryRisk} tone="amber" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionLabel icon={<Zap className="h-3.5 w-3.5" />}>Why Now</SectionLabel>
              <div className="mt-2 text-base font-black text-white">{whyNow}</div>
              <div className="mt-2 text-xs leading-5 text-zinc-500">
                Use this only as confirmation. Execution still requires trigger, liquidity, and risk alignment.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-right">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Narrative Role</div>
              <div className="mt-1 text-sm font-black text-white">Support Layer</div>
            </div>
          </div>
        </Card>

        <Card className="border-amber-300/15 bg-amber-950/[0.07]">
          <SectionLabel icon={<Eye className="h-3.5 w-3.5" />}>Watch</SectionLabel>
          <div className="mt-3 space-y-2 text-sm font-bold text-zinc-200">
            {tacticalBrain.watchList.slice(0, 3).map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <details className="group rounded-3xl border border-zinc-900 bg-black/50">
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-black text-white">
          <span>Context Details</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 group-open:text-cyan-300">Open</span>
        </summary>
        <div className="grid gap-3 border-t border-zinc-900 p-3 xl:grid-cols-3">
          <ContextPill label="Flow Read" value={flowIntelligence.read} tone="zinc" />
          <ContextPill label="Macro Filter" value={macroReasoning.executionImpact} tone="zinc" />
          <ContextPill label="Strategy Fit" value={topPlaybook?.executionMode ?? tacticalBrain.aggression} tone="zinc" />
        </div>
      </details>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionLabel icon={<Map className="h-3.5 w-3.5" />}>Advanced Market Map</SectionLabel>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Keep narrative compressed. Open the map only when you need to inspect the underlying rotation, pressure, and threat layers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdvancedOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/15"
          >
            <Layers3 className="h-3.5 w-3.5" />
            Open Map
          </button>
        </div>
      </Card>

      <Card className="border-white/10 bg-black/40">
        <SectionLabel icon={<CheckCircle2 className="h-3.5 w-3.5" />}>Active Context Alerts</SectionLabel>
        <div className="mt-3 grid gap-2 xl:grid-cols-3">
          {tacticalBrain.alerts.slice(0, 3).map((alert) => (
            <div key={alert.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <div className="text-sm font-black text-white">{alert.title}</div>
              <div className="mt-1 text-xs leading-4 text-zinc-500">{alert.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      {advancedOpen ? <AdvancedMapModal activeOverlays={activeOverlays} onToggle={toggleOverlay} onClose={() => setAdvancedOpen(false)} /> : null}
    </div>
  )
}

export default function NarrativeIntelligenceSurface() {
  return (
    <TacticalLiveBindingProvider>
      <NarrativeIntelligenceSurfaceInner />
    </TacticalLiveBindingProvider>
  )
}
