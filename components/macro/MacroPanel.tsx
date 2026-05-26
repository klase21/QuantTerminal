// ======================================================
// components/macro/MacroPanel.tsx
// ======================================================

"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

import { detectRiskMode } from "@/lib/macro/detectRiskMode"
import { buildMacroSignals } from "@/lib/macro/buildMacroSignals"

import NarrativeHeatmap from "./NarrativeHeatmap"
import NarrativeDivergence from "./NarrativeDivergence"
import LiquidityIntelligencePanel from "./LiquidityIntelligencePanel"

import { MACRO_TICKER_FALLBACK } from "@/lib/macroTicker"

function signalTone(mode: string) {
  if (mode === "RISK_ON") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
  if (mode === "RISK_OFF") return "border-red-400/25 bg-red-500/10 text-red-200"
  return "border-amber-400/25 bg-amber-500/10 text-amber-200"
}

function buildMacroReasoning(risk: any, signals: any) {
  const bullish = signals?.bullish?.length ?? 0
  const bearish = signals?.bearish?.length ?? 0

  if (risk.mode === "RISK_ON" && bullish >= bearish) {
    return {
      regime: "Risk-on liquidity support",
      impact: "Selective longs are acceptable, but execution quality still needs confirmation.",
      drivers: [
        "Equity beta is supporting crypto risk appetite.",
        "Liquidity pressure is not dominant enough to force defensive positioning.",
        "Crypto confirmation is stronger when BTC and ETH both hold positive liquidity response.",
      ],
      risk: "Avoid chasing if DXY or yields start rising against the move.",
    }
  }

  if (risk.mode === "RISK_OFF" || bearish > bullish) {
    return {
      regime: "Defensive macro pressure",
      impact: "Avoid aggressive longs. Prefer waiting for failed breakdowns or liquidity stabilization.",
      drivers: [
        "Dollar or yield pressure may be tightening risk liquidity.",
        "Cross-asset confirmation is not supportive for broad crypto beta.",
        "Macro pressure can turn good-looking alt setups into low follow-through trades.",
      ],
      risk: "If BTC liquidity weakens while DXY rises, downgrade execution posture to defensive.",
    }
  }

  return {
    regime: "Mixed macro conditions",
    impact: "Trade only high-quality setups. Do not treat rotation strength as broad risk-on confirmation.",
    drivers: [
      "Some risk assets are supportive, but confirmation is uneven.",
      "Macro liquidity is not clean enough for broad aggressive positioning.",
      "Narrative moves can continue, but execution should stay selective.",
    ],
    risk: "Weak sectors can fail quickly if liquidity pressure returns.",
  }
}

function ReasonCard({ label, children, tone = "zinc" }: { label: string; children: ReactNode; tone?: "cyan" | "emerald" | "amber" | "rose" | "zinc" }) {
  const toneMap = {
    cyan: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    rose: "border-rose-300/20 bg-rose-400/10 text-rose-100",
    zinc: "border-zinc-800 bg-zinc-950/70 text-zinc-200",
  }[tone]

  return (
    <div className={`rounded-2xl border p-3 ${toneMap}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.22em] opacity-60">{label}</div>
      <div className="mt-2 text-xs font-bold leading-5">{children}</div>
    </div>
  )
}

export default function MacroPanel() {
  const [items, setItems] = useState<any[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  async function load() {
    try {
      const res = await fetch("/api/macro", { cache: "no-store" })
      const json = await res.json()
      const nextItems = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []

      setItems(nextItems.length > 0 ? nextItems : MACRO_TICKER_FALLBACK)
      setUpdatedAt(json?.updatedAt || Date.now())
    } catch (err) {
      console.error("MACRO LOAD ERROR:", err)
      setItems(MACRO_TICKER_FALLBACK)
      setUpdatedAt(Date.now())
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const risk = useMemo(() => detectRiskMode(items), [items])
  const signals = useMemo(() => buildMacroSignals(items), [items])
  const reasoning = useMemo(() => buildMacroReasoning(risk, signals), [risk, signals])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white">MACRO REASONING</div>
            <div className="text-xs text-zinc-500">Macro signal → possible drivers → execution impact</div>
          </div>

          <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${signalTone(risk.mode)}`}>
            {risk.mode}
          </div>
        </div>
      </div>

      <div className="space-y-3 border-b border-zinc-800 p-4">
        <ReasonCard label="Macro Signal" tone={risk.mode === "RISK_ON" ? "emerald" : risk.mode === "RISK_OFF" ? "rose" : "amber"}>
          {reasoning.regime}
        </ReasonCard>

        <ReasonCard label="Execution Impact" tone="cyan">
          {reasoning.impact}
        </ReasonCard>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Possible Drivers</div>
          <div className="mt-2 space-y-2">
            {reasoning.drivers.map((driver: string) => (
              <div key={driver} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs leading-5 text-zinc-300">
                {driver}
              </div>
            ))}
          </div>
        </div>

        <ReasonCard label="Risk / Invalidation" tone="amber">
          {reasoning.risk}
        </ReasonCard>
      </div>

      <div className="border-b border-zinc-800 p-4">
        <LiquidityIntelligencePanel items={items} />
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-zinc-800 p-4">
        <NarrativeHeatmap />
        <NarrativeDivergence />
      </div>

      <div className="border-b border-zinc-800 p-4">
        <div className="mb-3 text-sm font-semibold text-white">Macro Evidence</div>
        <div className="space-y-2">
          {signals.all.slice(0, 5).map((signal: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
              <div className="text-xs text-zinc-300">{signal.label}</div>
              <div className={`text-xs font-semibold ${signal.bias === "bullish" ? "text-green-400" : "text-red-400"}`}>
                {signal.message}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-500">
        {updatedAt ? <div>Updated: {new Date(updatedAt).toLocaleTimeString()}</div> : null}
      </div>
    </div>
  )
}
