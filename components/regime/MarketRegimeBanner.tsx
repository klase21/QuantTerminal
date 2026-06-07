"use client"

import {
  Activity,
  Gauge,
  RadioTower,
  ShieldAlert,
  TrendingUp,
} from "lucide-react"
import { useRegimeStore } from "@/stores/useRegimeStore"

const regimeLabel: Record<string, string> = {
  BTC_DEFENSIVE: "BTC Defensive",
  ALT_EXPANSION: "Alt Expansion",
  ALT_EUPHORIA: "Alt Euphoria",
  KOREAN_RETAIL_FOMO: "Korean Retail FOMO",
  RISK_OFF: "Risk Off",
  NEUTRAL_ROTATION: "Neutral Rotation",
}

function badgeClass(regime: string) {
  if (regime === "ALT_EUPHORIA" || regime === "KOREAN_RETAIL_FOMO") {
    return "border-orange-500/30 bg-orange-500/10 text-orange-300"
  }

  if (regime === "ALT_EXPANSION") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
  }

  if (regime === "BTC_DEFENSIVE" || regime === "RISK_OFF") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300"
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

export default function MarketRegimeBanner() {
  const regime = useRegimeStore((state) => state.regime)
  const snapshot = useRegimeStore((state) => state.snapshot)
  const sectors = useRegimeStore((state) => state.sectors)
  const leader = sectors[0]

  return (
    <section className="border-b border-zinc-900 bg-black px-4 py-3">
      <div className="grid gap-3 xl:grid-cols-[1.15fr_1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                <RadioTower className="h-3.5 w-3.5 text-cyan-400" />
                Regime Intelligence Layer
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-sm font-bold ${badgeClass(regime.regime)}`}>
                  {regimeLabel[regime.regime] || regime.regime}
                </span>

                <span className="text-2xl font-black text-white">
                  {regime.confidence}%
                </span>

                <span className="text-xs text-zinc-500">
                  confidence
                </span>
              </div>

              <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                {regime.summary}
              </p>
            </div>

            <div className="grid min-w-[260px] grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-2">
                <div className="text-[10px] uppercase text-zinc-500">Risk</div>
                <div className="mt-1 text-sm font-bold text-white">{regime.riskState}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-2">
                <div className="text-[10px] uppercase text-zinc-500">Liquidity</div>
                <div className="mt-1 text-sm font-bold text-cyan-300">{regime.liquidityState}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-2">
                <div className="text-[10px] uppercase text-zinc-500">Vol</div>
                <div className="mt-1 text-sm font-bold text-orange-300">{regime.volatilityState}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Alt Strength
            </div>
            <div className="mt-2 text-2xl font-black text-white">{regime.altStrength}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${regime.altStrength}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldAlert className="h-4 w-4 text-sky-400" /> BTC Strength
            </div>
            <div className="mt-2 text-2xl font-black text-white">{regime.btcStrength}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${regime.btcStrength}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Gauge className="h-4 w-4 text-orange-400" /> KR FOMO
            </div>
            <div className="mt-2 text-2xl font-black text-white">{regime.retailFomoScore}</div>
            <div className="mt-1 text-[11px] text-zinc-500">
              Premium {snapshot?.upbitPremium?.toFixed(2) ?? "-"}% · Leader {leader?.sector ?? "-"}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
