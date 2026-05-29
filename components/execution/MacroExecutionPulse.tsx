"use client"

import { useEffect, useMemo, useState } from "react"
import { Globe2, ShieldAlert } from "lucide-react"

import { detectRiskMode } from "@/lib/macro/detectRiskMode"
import { buildMacroSignals } from "@/lib/macro/buildMacroSignals"
import { MACRO_TICKER_FALLBACK } from "@/lib/macroTicker"

function tone(mode: string) {
  if (mode === "RISK_ON") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
  if (mode === "RISK_OFF") return "border-rose-300/25 bg-rose-400/10 text-rose-100"
  return "border-amber-300/25 bg-amber-400/10 text-amber-100"
}

function executionLine(mode: string, bullish: number, bearish: number) {
  if (mode === "RISK_ON" && bullish >= bearish) return "Macro allows selective risk. Still require execution trigger."
  if (mode === "RISK_OFF" || bearish > bullish) return "Macro is a filter against aggressive longs. Reduce chase and wait for confirmation."
  return "Macro is mixed. Only A-grade setups deserve attention."
}

export default function MacroExecutionPulse() {
  const [items, setItems] = useState<any[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch("/api/macro", { cache: "no-store" })
        const json = await res.json()
        const nextItems = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []
        if (!mounted) return
        setItems(nextItems.length > 0 ? nextItems : MACRO_TICKER_FALLBACK)
        setUpdatedAt(json?.updatedAt || Date.now())
      } catch (error) {
        console.error("MACRO EXECUTION PULSE ERROR:", error)
        if (!mounted) return
        setItems(MACRO_TICKER_FALLBACK)
        setUpdatedAt(Date.now())
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  const risk = useMemo(() => detectRiskMode(items), [items])
  const signals = useMemo(() => buildMacroSignals(items), [items])
  const bullish = signals?.bullish?.length ?? 0
  const bearish = signals?.bearish?.length ?? 0
  const strongestSignal = signals?.all?.[0]

  return (
    <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-300">
            <Globe2 className="h-3.5 w-3.5" /> Macro Execution Pulse
          </div>
          <div className="mt-2 text-sm font-bold leading-5 text-zinc-200">
            {executionLine(risk.mode, bullish, bearish)}
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${tone(risk.mode)}`}>
          {risk.mode.replace("_", "-")}
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Bias Count</div>
          <div className="mt-1 text-xs font-bold text-zinc-200">Bull {bullish} / Bear {bearish}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/35 p-3 md:col-span-2">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <ShieldAlert className="h-3.5 w-3.5" /> Current Filter
          </div>
          <div className="mt-1 text-xs font-semibold leading-5 text-zinc-300">
            {strongestSignal?.message || "No dominant macro filter. Keep default execution discipline."}
          </div>
        </div>
      </div>
      {updatedAt ? <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-zinc-600">Updated {new Date(updatedAt).toLocaleTimeString()}</div> : null}
    </section>
  )
}
