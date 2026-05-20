"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Flame,
  Waves,
} from "lucide-react"
import { useRotationStore } from "@/stores/useRotationStore"

type Props = {
  frames: any[]
  liquidityEvents: any[]
}

export default function LiquidityPanel({
  frames,
}: Props) {
  const { sectors, update } = useRotationStore()
  const [rotationPulse, setRotationPulse] = useState(0)

  useEffect(() => {
    update(frames || [])
    setRotationPulse((prev) => prev + 1)
  }, [frames, update])

  const totalVolume = useMemo(() => {
    return sectors.reduce(
      (acc, sector) => acc + sector.volume,
      0
    )
  }, [sectors])

  const dominantSector = sectors[0]

  const whaleSector = useMemo(() => {
    return [...sectors]
      .sort((a, b) => b.volume - a.volume)[0]
  }, [sectors])

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-400">
            Dominance
          </div>

          <div className="mt-2 flex items-center gap-2 text-lg font-bold text-cyan-400">
            <Waves size={18} />
            {dominantSector?.sector || "N/A"}
          </div>

          <div className="mt-1 text-xs text-zinc-500">
            {dominantSector?.dominance.toFixed(1)}% market share
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-400">
            Whale Rotation
          </div>

          <div className="mt-2 flex items-center gap-2 text-lg font-bold text-yellow-400">
            <Flame size={18} />
            {whaleSector?.sector || "N/A"}
          </div>

          <div className="mt-1 text-xs text-zinc-500">
            ${(whaleSector?.volume || 0 / 1000000).toFixed(1)}M flowing
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-400">
            Rotation Activity
          </div>

          <div className="mt-2 flex items-center gap-2 text-lg font-bold text-emerald-400">
            <Activity size={18} />
            LIVE
          </div>

          <div className="mt-1 text-xs text-zinc-500">
            ${(totalVolume / 1000000).toFixed(1)}M aggregate volume
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              Binance Rotation Tracking
            </div>

            <div className="text-lg font-bold text-white">
              Sector Liquidity Heatmap
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-cyan-400">
            <Activity size={14} className="animate-pulse" />
            <span className="text-xs font-semibold">
              REALTIME FLOW
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {sectors.map((sector, index) => {
            const positive = sector.delta >= 0

            const heat = Math.min(
              100,
              Math.max(8, sector.dominance * 2)
            )

            const intensity = Math.min(
              100,
              Math.abs(sector.delta) * 7
            )

            const flowDirection =
              sectors[index + 1]?.sector || "STABLE"

            return (
              <div
                key={sector.sector}
                className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black/40 p-4"
              >
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ${
                    positive
                      ? "bg-emerald-500/10"
                      : "bg-red-500/10"
                  }`}
                  style={{
                    width: `${heat}%`,
                    opacity: 0.7,
                  }}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-semibold text-white">
                        {sector.sector}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        Rotation → {flowDirection}
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

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                        <span>Heatmap Intensity</span>
                        <span>{heat.toFixed(0)}%</span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-zinc-900">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            positive
                              ? "bg-emerald-400"
                              : "bg-red-400"
                          }`}
                          style={{
                            width: `${heat}%`,
                            transform: `translateX(${rotationPulse % 3}px)`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                        <span>Trade Intensity</span>
                        <span>{intensity.toFixed(0)}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                        <div
                          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                          style={{ width: `${intensity}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-zinc-900/70 p-3">
                      <div className="text-zinc-500">
                        Market Cap
                      </div>

                      <div className="mt-1 font-semibold text-white">
                        ${(sector.marketCap / 1000000000).toFixed(2)}B
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/70 p-3">
                      <div className="text-zinc-500">
                        Volume
                      </div>

                      <div className="mt-1 font-semibold text-white">
                        ${(sector.volume / 1000000).toFixed(1)}M
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-900/70 p-3">
                      <div className="text-zinc-500">
                        Dominance
                      </div>

                      <div className="mt-1 font-semibold text-white">
                        {sector.dominance.toFixed(1)}%
                      </div>
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
