"use client"

import { useMemo } from "react"
import { Activity, Globe2, ShieldAlert } from "lucide-react"

import { buildMacroReasoning, type MacroSignalInput } from "@/lib/tactical/macroReasoningEngine"

export default function MacroReasoningCard({ input }: { input?: MacroSignalInput }) {
  const macro = useMemo(() => buildMacroReasoning(input), [input])

  const regimeClass =
    macro.regime === "RISK-ON SUPPORTIVE"
      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
      : macro.regime === "RISK-OFF PRESSURE" || macro.regime === "LIQUIDITY STRESS"
        ? "border-rose-300/30 bg-rose-400/10 text-rose-100"
        : "border-amber-300/30 bg-amber-400/10 text-amber-100"

  return (
    <div className="rounded-3xl border border-violet-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,.15),transparent_30%),rgba(0,0,0,.46)] p-4 shadow-[0_0_40px_rgba(139,92,246,.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-violet-300">
            <Globe2 className="h-3.5 w-3.5" />
            Macro Reasoning
          </div>
          <div className="mt-2 text-2xl font-black text-white">{macro.regime}</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{macro.read}</p>
        </div>

        <div className={`rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${regimeClass}`}>
          Macro Score {macro.macroScore}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/80">
            <Activity className="h-3.5 w-3.5" />
            Execution Impact
          </div>
          <div className="mt-2 text-sm font-bold leading-6 text-emerald-50">{macro.executionImpact}</div>
        </div>

        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/80">
            Possible Drivers
          </div>
          <div className="mt-2 space-y-2">
            {macro.possibleDrivers.slice(0, 3).map((driver) => (
              <div key={driver} className="text-xs font-semibold leading-5 text-cyan-50">
                • {driver}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-300/15 bg-rose-400/10 p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-200/80">
            <ShieldAlert className="h-3.5 w-3.5" />
            Risk Filter
          </div>
          <div className="mt-2 text-xs font-bold leading-5 text-rose-50">{macro.riskFilter}</div>
          <div className="mt-3 rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
            {macro.tacticalBiasModifier}
          </div>
        </div>
      </div>
    </div>
  )
}
