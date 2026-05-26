"use client"

import { Waves } from "lucide-react"
import { buildLiquidityMap } from "@/core/liquidity/liquidityMapEngine"

export default function LiquidityMapPanel() {
  const zones = buildLiquidityMap()

  return (
    <section className="rounded-3xl border border-emerald-300/20 bg-emerald-400/5 p-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">
        <Waves size={14} />
        Liquidity Map Engine
      </div>

      <div className="space-y-3">
        {zones.map((zone) => (
          <div
            key={zone.label}
            className="rounded-2xl border border-zinc-900 bg-black/45 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">
                  {zone.label}
                </div>

                <div className="mt-1 text-xs text-zinc-500">
                  {zone.type} · {zone.direction}
                </div>
              </div>

              <div className="text-lg font-black text-emerald-300">
                {zone.probability}%
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-emerald-300"
                style={{
                  width: `${zone.probability}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}