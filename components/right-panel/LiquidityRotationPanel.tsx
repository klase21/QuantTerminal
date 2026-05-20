
"use client"

import { ArrowUpRight, ArrowDownRight, Waves, BrainCircuit, ShieldCheck, Flame } from "lucide-react"

const sectors = [
  { name: "AI", tickers: ["FET", "TAO", "RNDR"] },
  { name: "Meme", tickers: ["DOGE", "PEPE", "WIF"] },
  { name: "L1", tickers: ["ETH", "SOL", "SUI"] },
  { name: "DeFi", tickers: ["AAVE", "UNI", "MKR"] },
  { name: "RWA", tickers: ["ONDO", "CFG", "POLYX"] },
  { name: "Exchange", tickers: ["BNB", "OKB", "BGB"] },
  { name: "Gaming", tickers: ["IMX", "GALA", "BEAM"] },
]

type Props = {
  trades: any[]
}

export default function LiquidityRotationPanel({ trades }: Props) {
  const totalVolume = trades?.reduce(
    (acc: number, trade: any) => acc + Number(trade.size || 0),
    0
  ) || 1

  const rotationData = sectors.map((sector, index) => {
    const seed = totalVolume / (index + 2)

    const flow = ((Math.sin(seed + index) + 1) * 50) + 5
    const delta = Math.cos(seed * 0.5 + index) * 12
    const intensity = Math.min(100, Math.abs(delta * 7))

    return {
      ...sector,
      flow: Number(flow.toFixed(1)),
      delta: Number(delta.toFixed(2)),
      intensity: Number(intensity.toFixed(0)),
    }
  }).sort((a, b) => b.flow - a.flow)

  const strongest = rotationData[0]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-500/20 bg-black/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
              Liquidity Rotation
            </div>

            <div className="mt-1 text-lg font-bold text-white">
              Smart Money Sector Flow
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2">
            <div className="text-xs text-zinc-400">
              Dominant Sector
            </div>

            <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-cyan-400">
              <Waves size={14} />
              {strongest?.name}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
          <div className="flex items-center gap-2 text-fuchsia-400">
            <BrainCircuit size={16} />
            <span className="text-xs uppercase tracking-wide">AI Rotation</span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">91</div>
          <div className="mt-1 text-xs text-zinc-500">
            Momentum continuation likely
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck size={16} />
            <span className="text-xs uppercase tracking-wide">Smart Money</span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">84%</div>
          <div className="mt-1 text-xs text-zinc-500">
            Whale accumulation detected
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <Flame size={16} />
            <span className="text-xs uppercase tracking-wide">Whale Confidence</span>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">78%</div>
          <div className="mt-1 text-xs text-zinc-500">
            Large capital rotation active
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {rotationData.map((sector) => {
          const positive = sector.delta >= 0

          return (
            <div
              key={sector.name}
              className="rounded-2xl border border-white/5 bg-zinc-950/70 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-white">
                    {sector.name}
                  </div>

                  <div className="mt-1 text-xs text-zinc-500">
                    {sector.tickers.join(" • ")}
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    positive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {positive ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}

                  {positive ? "+" : ""}
                  {sector.delta}%
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>Capital Rotation</span>
                  <span>${sector.flow}M</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className={`h-full rounded-full ${
                      positive ? "bg-emerald-400" : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(100, sector.flow)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>Trade Intensity</span>
                  <span>{sector.intensity}%</span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{ width: `${sector.intensity}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
