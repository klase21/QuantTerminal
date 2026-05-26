"use client"

import { ArrowRightLeft, Radar } from "lucide-react"
import {
  type FocusScope,
  useFocusRoutingStore,
} from "@/stores/useFocusRoutingStore"

const symbols = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "TRXUSDT",
  "HYPEUSDT",
]

const scopes: FocusScope[] = [
  "GLOBAL",
  "FLOW",
  "CHARTS",
  "ORDERBOOK",
  "ALERTS",
]

export default function FocusRoutingBar() {
  const {
    activeSymbol,
    previousSymbol,
    focusScope,
    setActiveSymbol,
    setFocusScope,
  } = useFocusRoutingStore()

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
            <Radar size={13} />
            Focus Routing Engine
          </div>

          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-300">
            <span className="font-black text-white">{previousSymbol}</span>
            <ArrowRightLeft size={13} className="text-zinc-500" />
            <span className="font-black text-cyan-100">{activeSymbol}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeSymbol}
            onChange={(event) => setActiveSymbol(event.target.value)}
            className="rounded-2xl border border-zinc-800 bg-black px-3 py-2 text-xs font-black text-zinc-100 outline-none"
          >
            {symbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-1">
            {scopes.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setFocusScope(scope)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                  focusScope === scope
                    ? "bg-cyan-400/15 text-cyan-100"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {scope}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-zinc-900 bg-black/40 px-3 py-2 text-xs text-zinc-400">
        Current routing scope:
        <span className="ml-2 font-black text-cyan-100">
          {focusScope}
        </span>
      </div>
    </div>
  )
}
