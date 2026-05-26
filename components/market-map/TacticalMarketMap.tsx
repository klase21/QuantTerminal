"use client"

import { buildTacticalMarketMapState } from "@/core/market-map/tacticalMarketMapEngine"
import DynamicRotationRoutes from "@/components/market-map/DynamicRotationRoutes"
import SectorPressureNode from "@/components/market-map/SectorPressureNode"
import NarrativeTemperatureLayer from "@/components/market-map/NarrativeTemperatureLayer"
import LiquidityGravityOverlay from "@/components/market-map/LiquidityGravityOverlay"
import ThreatOverlay from "@/components/market-map/ThreatOverlay"
import RotationRadarPanel from "@/components/market-map/RotationRadarPanel"
import TacticalNarratorCard from "@/components/market-map/TacticalNarratorCard"
import TacticalLaneBackground from "@/components/market-map/TacticalLaneBackground"
import TacticalLaneLegend from "@/components/market-map/TacticalLaneLegend"

export default function TacticalMarketMap() {
  const state = buildTacticalMarketMapState()

  return (
    <div className="grid min-h-[760px] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="relative min-h-[760px] overflow-hidden rounded-[2rem] border border-zinc-800 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,.13),transparent_36%),radial-gradient(circle_at_20%_20%,rgba(168,85,247,.10),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,.10),transparent_30%)]" />

        <div className="absolute inset-0 opacity-[0.12]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
        </div>

        <TacticalLaneBackground />

        <NarrativeTemperatureLayer sectors={state.sectors} />
        <LiquidityGravityOverlay zones={state.gravityZones} />
        <DynamicRotationRoutes routes={state.routes} sectors={state.sectors} />

        {state.sectors.map((node) => (
          <SectorPressureNode key={node.id} node={node} />
        ))}

        <ThreatOverlay threats={state.threats} />

        <div className="absolute left-5 top-5 z-40">
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-black/55 px-4 py-2 backdrop-blur">
            <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">
                Tactical Market Map
              </div>
              <div className="text-xs text-zinc-500">Lane-aligned Rotation Surface</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-40">
          <div className="rounded-2xl border border-cyan-400/15 bg-black/45 px-4 py-2 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
                AI Tactical Narrator
              </div>
            </div>
            <div className="mt-1 text-xs leading-5 text-zinc-400">
              {state.narrator}
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-3">
        <TacticalLaneLegend />
        <RotationRadarPanel routes={state.radar} />

        <div className="rounded-3xl border border-zinc-800 bg-black/55 p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
            Sector Pressure
          </div>

          <div className="space-y-2">
            {state.sectors.map((sector) => (
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

                <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                  <div className="rounded-lg bg-black/50 px-2 py-1 text-zinc-400">SM {sector.smartMoney}</div>
                  <div className="rounded-lg bg-black/50 px-2 py-1 text-zinc-400">NT {sector.narrativeTemp}</div>
                  <div className="rounded-lg bg-black/50 px-2 py-1 text-zinc-400">EX {sector.exhaustion}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-red-400/20 bg-red-950/10 p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-red-300">
            Threat Overlay
          </div>

          <div className="space-y-2">
            {state.threats.map((threat) => (
              <div key={threat.id} className="rounded-2xl border border-red-400/10 bg-black/45 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-white">{threat.label}</div>
                  <div className="text-[10px] font-black text-red-300">{threat.severity}</div>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{threat.note}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
