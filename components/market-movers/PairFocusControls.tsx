"use client"

import { useMemo, useState } from "react"
import { Search, Star } from "lucide-react"

import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"
import { useWorkspaceStore } from "@/stores/useWorkspaceStore"

const DEFAULT_FOCUS_PAIRS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]

function normalizePair(value: string) {
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!cleaned) return ""
  if (cleaned.endsWith("USDT")) return cleaned
  return `${cleaned}USDT`
}

export default function PairFocusControls({ symbols = [] }: { symbols?: string[] }) {
  const [draft, setDraft] = useState("")
  const activeSymbol = useFocusRoutingStore((state) => state.activeSymbol)
  const setActiveSymbol = useFocusRoutingStore((state) => state.setActiveSymbol)
  const charts = useWorkspaceStore((state) => state.charts)
  const updateChart = useWorkspaceStore((state) => state.updateChart)
  const addChart = useWorkspaceStore((state) => state.addChart)

  const focusPairs = useMemo(() => {
    const merged = [...DEFAULT_FOCUS_PAIRS, ...symbols.map((symbol) => normalizePair(symbol)).filter(Boolean)]
    return Array.from(new Set(merged)).slice(0, 10)
  }, [symbols])

  function focusPair(raw: string) {
    const pair = normalizePair(raw)
    if (!pair) return
    setActiveSymbol(pair)
    const primaryChart = charts[0]
    if (primaryChart) updateChart(primaryChart.id, { symbol: pair })
    else addChart(pair)
    setDraft("")
  }

  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/35 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">
          <Star size={11} className="text-cyan-300" /> Pair Focus
        </div>
        <div className="truncate rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-100">
          {activeSymbol}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {focusPairs.map((symbol) => {
          const active = symbol === activeSymbol
          return (
            <button
              key={symbol}
              type="button"
              onClick={() => focusPair(symbol)}
              className={active
                ? "rounded-full border border-cyan-300/50 bg-cyan-400/15 px-2 py-1 text-[10px] font-black text-cyan-100"
                : "rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:border-cyan-300/35 hover:text-white"}
            >
              {symbol.replace("USDT", "")}
            </button>
          )
        })}
      </div>

      <form
        className="mt-2 flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          focusPair(draft)
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-500">
          <Search size={11} />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="SOL or SOLUSDT"
            className="min-w-0 flex-1 bg-transparent text-[10px] font-semibold uppercase text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
        <button
          type="submit"
          className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-black uppercase text-zinc-400 hover:border-cyan-300/35 hover:text-white"
        >
          Focus
        </button>
      </form>
    </div>
  )
}
