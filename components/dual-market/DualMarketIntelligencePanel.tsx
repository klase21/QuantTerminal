"use client"

import { buildDualMarketIntelligence } from "@/core/dual-market/dualMarketEngine"
import { useMarketModeStore } from "@/stores/useMarketModeStore"

export default function DualMarketIntelligencePanel({
  symbol,
  spotFlow,
  futuresFlow,
}: {
  symbol: string
  spotFlow: any
  futuresFlow: any
}) {
  const { marketMode } = useMarketModeStore()

  const intel = buildDualMarketIntelligence({
    symbol,
    mode: marketMode,
    spot: spotFlow,
    futures: futuresFlow,
  })

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        Spot / Futures Intelligence
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <Metric label="Divergence" value={intel.divergenceScore} />
        <Metric label="Fake Breakout" value={intel.fakeBreakoutRisk} tone="yellow" />
        <Metric label="Real Demand" value={intel.realDemandConfirmation} tone="green" />
        <Metric label="Absorption" value={intel.absorptionScore} tone="purple" />
      </div>

      <div className="mt-3 rounded-2xl border border-zinc-900 bg-black/50 p-3 text-sm leading-6 text-zinc-300">
        {intel.summary}
      </div>

      {intel.warnings.length ? (
        <div className="mt-3 space-y-2">
          {intel.warnings.map((warning) => (
            <div key={warning} className="rounded-2xl border border-yellow-300/15 bg-yellow-400/5 p-3 text-xs leading-5 text-yellow-100/80">
              {warning}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <FlowBox title="Spot Flow" flow={intel.spot} />
        <FlowBox title="Futures Flow" flow={intel.futures} />
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  tone = "cyan",
}: {
  label: string
  value: number
  tone?: "cyan" | "yellow" | "green" | "purple"
}) {
  const color =
    tone === "yellow"
      ? "text-yellow-200"
      : tone === "green"
        ? "text-emerald-300"
        : tone === "purple"
          ? "text-purple-300"
          : "text-cyan-300"

  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-black ${color}`}>{value}</div>
    </div>
  )
}

function FlowBox({ title, flow }: { title: string; flow: any }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-black text-white">{title}</div><div className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${flow.connected ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : "border-zinc-700 bg-zinc-900 text-zinc-500"}`}>{flow.connected ? "LIVE" : "PRELOAD"}</div></div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-zinc-600">Buy</div>
          <div className="font-black text-emerald-300">{Math.round(flow.buyPressure)}%</div>
        </div>
        <div>
          <div className="text-zinc-600">Sell</div>
          <div className="font-black text-red-300">{Math.round(flow.sellPressure)}%</div>
        </div>
        <div>
          <div className="text-zinc-600">CVD</div>
          <div className="font-black text-cyan-300">{Number(flow.cvd).toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}
