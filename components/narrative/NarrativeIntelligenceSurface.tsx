"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Eye, Layers3, Map, ShieldAlert, Sparkles, X, Zap } from "lucide-react"

import TacticalMarketMap from "@/components/market-map/TacticalMarketMap"
import RotationRadarPanel from "@/components/market-map/RotationRadarPanel"
import TacticalLaneLegend from "@/components/market-map/TacticalLaneLegend"
import { buildTacticalMarketMapState } from "@/core/market-map/tacticalMarketMapEngine"

type OverlayKey = "lanes" | "rotation" | "pressure" | "threats"

const overlayLabels: Record<OverlayKey, string> = {
  lanes: "Lane Read",
  rotation: "Rotation Radar",
  pressure: "Sector Pressure",
  threats: "Threat Overlay",
}

const tacticalAlerts = [
  {
    title: "RWA liquidity is improving",
    detail: "Focus on RWA leaders first. Avoid chasing late AI continuation until flow confirms.",
    tone: "cyan",
  },
  {
    title: "AI participation is cooling",
    detail: "AI is still hot, but exhaustion risk is rising. Treat breakouts as confirmation-required.",
    tone: "amber",
  },
  {
    title: "ETH/BTC remains a risk filter",
    detail: "Alt rotation is active, but broad beta confirmation is not clean yet.",
    tone: "rose",
  },
]

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

function ReasoningBlock({
  label,
  children,
  tone = "zinc",
}: {
  label: string
  children: ReactNode
  tone?: "cyan" | "emerald" | "amber" | "rose" | "zinc"
}) {
  const toneMap = {
    cyan: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    rose: "border-rose-300/20 bg-rose-400/10 text-rose-100",
    zinc: "border-white/10 bg-white/[0.035] text-zinc-200",
  }[tone]

  return (
    <div className={`rounded-2xl border p-3 ${toneMap}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.24em] opacity-60">{label}</div>
      <div className="mt-2 text-sm font-bold leading-5">{children}</div>
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
            <p className="mt-2 text-xs text-zinc-500">Narrative, flow, liquidity and threat overlays appear above the Tactical Verdict only when advanced mode is opened.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:block">Press ESC or click X to close</div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/30 bg-black/70 text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-400/10"
              aria-label="Close advanced market map"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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

export default function NarrativeIntelligenceSurface() {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [activeOverlays, setActiveOverlays] = useState<OverlayKey[]>(["lanes", "rotation", "pressure", "threats"])

  function toggleOverlay(id: OverlayKey) {
    setActiveOverlays((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  return (
    <div className="min-h-[760px] space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-4">
          <Card className="border-cyan-300/20 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.12),transparent_34%),rgba(0,0,0,.46)] shadow-[0_0_45px_rgba(34,211,238,.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SectionLabel icon={<Sparkles className="h-3.5 w-3.5" />}>Tactical Verdict</SectionLabel>
                <h2 className="mt-4 text-3xl font-black leading-tight text-white md:text-4xl">Wait for confirmation before aggressive entries.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                  Alt rotation is active, but the clean trade is selective. RWA is improving while AI looks late-stage. Use the market as a filter, not as a chase signal.
                </p>
              </div>

              <div className="grid min-w-[210px] gap-2">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-200/70">Tradeability</div>
                  <div className="mt-1 text-lg font-black text-amber-100">CONFIRMATION NEEDED</div>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/70">Best Action</div>
                  <div className="mt-1 text-lg font-black text-emerald-100">SELECTIVE LONGS</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ReasoningBlock label="Execution Guidance" tone="emerald">Focus on RWA leaders only after lower-timeframe bid support confirms.</ReasoningBlock>
            <ReasoningBlock label="Possible Drivers" tone="cyan">Capital appears to be rotating from overheated AI participation into RWA strength.</ReasoningBlock>
            <ReasoningBlock label="Risk Filter" tone="amber">ETH/BTC weakness can cap broad alt follow-through even during rotation.</ReasoningBlock>
            <ReasoningBlock label="Invalidation" tone="rose">Downgrade to observe-only if L1 strength fades or RWA inflow fails to hold.</ReasoningBlock>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <SectionLabel icon={<Map className="h-3.5 w-3.5" />}>Advanced Market Map</SectionLabel>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Keep the workspace verdict-first. Open the tactical map as an on-demand overlay above this verdict layer only when you want to inspect the reasoning structure.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdvancedOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/15"
              >
                <Layers3 className="h-3.5 w-3.5" />
                Open Advanced Map
              </button>
            </div>
          </Card>
        </main>

        <aside className="space-y-4">
          <Card className="border-white/10 bg-black/40">
            <SectionLabel icon={<Zap className="h-3.5 w-3.5" />}>Live Tactical Alerts</SectionLabel>
            <div className="mt-3 space-y-2">
              {tacticalAlerts.map((alert) => {
                const tone = alert.tone === "cyan" ? "border-cyan-300/15 bg-cyan-400/10" : alert.tone === "amber" ? "border-amber-300/15 bg-amber-400/10" : "border-rose-300/15 bg-rose-400/10"
                return (
                  <div key={alert.title} className={`rounded-2xl border p-3 ${tone}`}>
                    <div className="flex items-center gap-2 text-sm font-black text-white">
                      {alert.tone === "rose" ? <AlertTriangle className="h-4 w-4 text-rose-300" /> : <CheckCircle2 className="h-4 w-4 text-cyan-300" />}
                      {alert.title}
                    </div>
                    <div className="mt-1 text-xs leading-4 text-zinc-500">{alert.detail}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="border-amber-300/15 bg-amber-950/[0.07]">
            <SectionLabel icon={<Eye className="h-3.5 w-3.5" />}>What To Watch</SectionLabel>
            <div className="mt-3 space-y-2 text-sm font-bold text-zinc-200">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">RWA continuation after pullback</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">AI failed breakout / late chase risk</div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">ETH/BTC improvement as beta confirmation</div>
            </div>
          </Card>
        </aside>
      </div>

      {advancedOpen ? <AdvancedMapModal activeOverlays={activeOverlays} onToggle={toggleOverlay} onClose={() => setAdvancedOpen(false)} /> : null}
    </div>
  )
}
