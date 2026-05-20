
"use client"

import { useEffect } from "react"
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"
import { useRotationStore } from "@/stores/useRotationStore"

type Props = {
  frames: any[]
  liquidityEvents: any[]
}

export default function LiquidityPanel({
  frames,
}: Props) {
  const { sectors, update } = useRotationStore()

  useEffect(() => {
    update(frames || [])
  }, [frames, update])

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              Liquidity Rotation
            </div>

            <div className="text-lg font-bold text-white">
              Sector Dominance Engine
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-cyan-400">
            <Activity size={14} />
            <span className="text-xs font-semibold">
              LIVE ROTATION
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {sectors.map((sector) => {
            const positive = sector.delta >= 0

            return (
              <div
                key={sector.sector}
                className="rounded-xl border border-zinc-800 bg-black/30 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {sector.sector}
                    </div>

                    <div className="text-xs text-zinc-500">
                      Dominance {sector.dominance.toFixed(1)}%
                    </div>
                  </div>

                  <div
                    className={
                      positive
                        ? "flex items-center gap-1 text-emerald-400"
                        : "flex items-center gap-1 text-red-400"
                    }
                  >
                    {positive ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}

                    <span className="text-sm font-semibold">
                      {sector.delta.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="mb-2 h-3 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className={
                      positive
                        ? "h-full rounded-full bg-emerald-400 transition-all duration-500"
                        : "h-full rounded-full bg-red-400 transition-all duration-500"
                    }
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(6, sector.dominance)
                      )}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-zinc-900/70 p-2">
                    <div className="text-zinc-500">
                      Aggregate Volume
                    </div>

                    <div className="mt-1 font-semibold text-white">
                      ${(sector.volume / 1000000).toFixed(1)}M
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-900/70 p-2">
                    <div className="text-zinc-500">
                      Market Cap
                    </div>

                    <div className="mt-1 font-semibold text-white">
                      ${(sector.marketCap / 1000000000).toFixed(2)}B
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
