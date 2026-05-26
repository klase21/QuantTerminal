"use client"

import { Magnet } from "lucide-react"
import type { LiquidityGravityZone } from "@/core/market-map/tacticalMarketMapEngine"

export default function LiquidityGravityOverlay({ zones }: { zones: LiquidityGravityZone[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {zones.map((zone) => (
        <div
          key={zone.id}
          className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
        >
          <div
            className={`relative grid place-items-center rounded-full border ${
              zone.side === "upside"
                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                : zone.side === "downside"
                  ? "border-red-300/30 bg-red-400/10 text-red-200"
                  : "border-zinc-600 bg-zinc-900 text-zinc-300"
            }`}
            style={{ width: 56 + zone.gravity * 0.35, height: 56 + zone.gravity * 0.35 }}
          >
            <div className="absolute inset-0 animate-ping rounded-full border border-current opacity-20" />
            <Magnet size={18} />
          </div>

          <div className="pointer-events-none absolute left-1/2 top-[105%] hidden min-w-[120px] -translate-x-1/2 rounded-xl border border-zinc-800 bg-black/90 px-2 py-1 text-center opacity-0 backdrop-blur transition duration-200 group-hover:opacity-100 lg:block">
            <div className="text-[10px] font-black text-white">{zone.label}</div>
            <div className="text-[9px] text-zinc-500">Gravity {zone.gravity}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
