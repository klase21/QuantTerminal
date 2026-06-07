"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Activity, BellRing, Check, ChevronDown, Crosshair, Info, Layers3, Radar, Search } from "lucide-react"
import {
  tacticalSymbols,
  type ExecutionStyle,
  type TacticalState,
  type TacticalTimeframe,
  useGlobalTacticalContextStore,
} from "@/stores/useGlobalTacticalContextStore"
import type { MarketMode } from "@/stores/useMarketModeStore"

const modes: MarketMode[] = ["FUTURES", "SPOT", "HYBRID"]
const timeframes: TacticalTimeframe[] = ["1m", "3m", "5m", "15m", "1h", "4h", "1d"]
const styles: ExecutionStyle[] = ["SCALP", "SWING", "RISK_OFF", "AI_ROTATION"]
const states: TacticalState[] = [
  "RISK_ON_EXPANSION",
  "PERP_EUPHORIA",
  "FRAGILE_BREAKOUT",
  "ABSORPTION",
  "DEFENSIVE_ROTATION",
  "MIXED",
]

const symbolNames: Record<string, string> = {
  BTCUSDT: "Bitcoin / Tether",
  ETHUSDT: "Ethereum / Tether",
  SOLUSDT: "Solana / Tether",
  BNBUSDT: "BNB / Tether",
  XRPUSDT: "Ripple / Tether",
  DOGEUSDT: "Dogecoin / Tether",
  TRXUSDT: "TRON / Tether",
  HYPEUSDT: "Hyperliquid / Tether",
}

const stateDescriptions: Record<TacticalState, string> = {
  RISK_ON_EXPANSION: "Momentum and liquidity expansion are aligned for risk-on continuation.",
  PERP_EUPHORIA: "Futures pressure is elevated. Watch funding, liquidations, and late-long risk.",
  FRAGILE_BREAKOUT: "Breakout is present but confirmation quality is weak or unstable.",
  ABSORPTION: "Passive liquidity may be absorbing aggressive flow. Watch CVD recovery/failure.",
  DEFENSIVE_ROTATION: "Capital is rotating toward safer or lower-beta narratives.",
  MIXED:
    "Auto mode: the tactical layer does not force a single regime. Widgets read live flow, macro, and liquidity signals independently.",
}

type DarkSelectOption<T extends string> = {
  value: T
  label: string
  description?: string
}

function DarkSelect<T extends string>({
  value,
  options,
  onChange,
  icon,
  searchable = false,
  className = "",
}: {
  value: T
  options: DarkSelectOption<T>[]
  onChange: (value: T) => void
  icon?: ReactNode
  searchable?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const active = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) => {
      return `${option.label} ${option.description ?? ""} ${option.value}`.toLowerCase().includes(term)
    })
  }, [options, query])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-w-[112px] items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/95 px-3 py-2 text-left text-xs font-black text-zinc-100 shadow-[0_0_24px_rgba(0,0,0,.35)] outline-none transition hover:border-cyan-400/30 hover:bg-zinc-900"
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate">{active?.label}</span>
        </span>
        <ChevronDown size={13} className={`text-zinc-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#05080d] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,.85),0_0_40px_rgba(34,211,238,.12)] ring-1 ring-white/5">
          {searchable && (
            <div className="border-b border-zinc-800 bg-black/70 p-2">
              <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-zinc-400">
                <Search size={13} />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search symbol..."
                  className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-600 outline-none"
                />
              </label>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto p-1">
            {filtered.map((option) => {
              const selected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                    setQuery("")
                  }}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                    selected ? "bg-cyan-400/10 text-cyan-100" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-[0.08em]">{option.label}</span>
                    {option.description && <span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">{option.description}</span>}
                  </span>
                  {selected && <Check size={14} className="mt-0.5 shrink-0 text-cyan-300" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TacticalContextBar() {
  const {
    primarySymbol,
    marketMode,
    timeframe,
    executionStyle,
    tacticalState,
    attentionMode,
    setPrimarySymbol,
    setMarketMode,
    setTimeframe,
    setExecutionStyle,
    setTacticalState,
    setAttentionMode,
  } = useGlobalTacticalContextStore()

  const symbolOptions = tacticalSymbols.map((symbol) => ({
    value: symbol,
    label: symbol,
    description: symbolNames[symbol] ?? "USDT pair",
  }))

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-black/75 p-3 shadow-[0_0_36px_rgba(34,211,238,.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
            <Radar size={13} />
            Tactical Context
          </div>
          <div className="mt-1 text-xs text-zinc-500">Single source of truth for execution widgets.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DarkSelect
            value={primarySymbol}
            onChange={setPrimarySymbol}
            options={symbolOptions}
            searchable
            icon={<Crosshair size={13} className="shrink-0 text-cyan-300" />}
            className="min-w-[132px]"
          />

          <div className="flex items-center gap-1 rounded-2xl border border-zinc-900 bg-zinc-950/80 p-1">
            <Layers3 size={13} className="mx-2 text-zinc-500" />
            {modes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMarketMode(mode)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                  marketMode === mode ? "bg-cyan-400/15 text-cyan-100" : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <DarkSelect
            value={timeframe}
            onChange={(next) => setTimeframe(next as TacticalTimeframe)}
            options={timeframes.map((item) => ({ value: item, label: item }))}
            className="min-w-[76px]"
          />

          <DarkSelect
            value={executionStyle}
            onChange={(next) => setExecutionStyle(next as ExecutionStyle)}
            options={styles.map((style) => ({ value: style, label: style.replace("_", " ") }))}
            className="min-w-[112px]"
          />

          <DarkSelect
            value={tacticalState}
            onChange={(next) => setTacticalState(next as TacticalState)}
            options={states.map((state) => ({
              value: state,
              label: state.replaceAll("_", " "),
              description: stateDescriptions[state],
            }))}
            icon={<Info size={13} className="shrink-0 text-purple-300" />}
            className="min-w-[150px]"
          />

          <button
            type="button"
            onClick={() => setAttentionMode(!attentionMode)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${
              attentionMode
                ? "border-purple-300/40 bg-purple-400/10 text-purple-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-500"
            }`}
          >
            <Activity size={13} />
            Attention
          </button>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-yellow-300/15 bg-yellow-400/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-100">
            <BellRing size={13} />
            Alerts v2
          </div>
        </div>
      </div>
    </div>
  )
}
