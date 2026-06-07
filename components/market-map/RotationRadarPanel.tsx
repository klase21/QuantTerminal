"use client"

import type { RotationRoute } from "@/core/market-map/tacticalMarketMapEngine"

export default function RotationRadarPanel({ routes }: { routes: RotationRoute[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/55 p-3 backdrop-blur">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        Rotation Radar
      </div>

      <div className="space-y-2">
        {routes.map((route, index) => (
          <div key={route.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">
                  {index + 1}. {route.from} → {route.to}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                  {route.status} · accel {route.acceleration}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-cyan-300">{route.confidence}%</div>
                <div className="text-[10px] text-zinc-500">conf</div>
              </div>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${route.confidence}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
