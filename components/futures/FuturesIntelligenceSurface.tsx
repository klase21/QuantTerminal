"use client"

import { useMemo } from "react"
import { useFuturesIntelligenceFeed } from "@/hooks/useFuturesIntelligenceFeed"
import type { SectorFuturesSnapshot } from "@/core/futuresTypes"

function metric(value: unknown, digits = 0) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return "--"
  return number.toFixed(digits)
}

function money(value: number) {
  if (!Number.isFinite(value)) return "--"
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  return `$${value.toFixed(0)}`
}

function fundingBps(value: number) {
  if (!Number.isFinite(value)) return "--"
  return `${(value * 10000).toFixed(2)} bps`
}

function stateTone(state?: string) {
  switch (state) {
    case "OVERHEATED":
      return "border-red-500/30 bg-red-500/10 text-red-200"
    case "CROWDED":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200"
    case "BUILDING":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
    default:
      return "border-zinc-800 bg-zinc-900/70 text-zinc-300"
  }
}

function prettyState(state: string) {
  switch (state) {
    case "OVERHEATED":
      return "Overheated"
    case "CROWDED":
      return "Crowded"
    case "BUILDING":
      return "Building"
    default:
      return "Contained"
  }
}

function prettyBias(bias: string) {
  switch (bias) {
    case "LONGS_PAYING":
      return "Longs Paying"
    case "SHORTS_PAYING":
      return "Shorts Paying"
    default:
      return "Neutral Funding"
  }
}

function connectorTone(status?: string) {
  switch (status) {
    case "connected":
      return "text-emerald-300"
    case "partial":
    case "stale":
      return "text-amber-300"
    case "error":
      return "text-red-300"
    default:
      return "text-zinc-500"
  }
}

function topRead(sectors: SectorFuturesSnapshot[]) {
  const top = sectors[0]
  if (!top) return "Waiting for Binance Futures OI and funding data."
  if (top.leverageState === "OVERHEATED") return `${top.sector} is the most crowded derivatives pocket. Avoid treating spot strength as clean continuation.`
  if (top.leverageState === "CROWDED") return `${top.sector} has elevated leverage. Confirm with spot breadth before increasing conviction.`
  return `${top.sector} derivatives pressure is building but not yet excessive.`
}

export default function FuturesIntelligenceSurface() {
  const { data, status, error } = useFuturesIntelligenceFeed()
  const sectors = data?.sectors ?? []
  const top = sectors[0]
  const totalOi = useMemo(() => sectors.reduce((sum, sector) => sum + sector.oiNotional, 0), [sectors])
  const overheated = sectors.filter((sector) => sector.leverageState === "OVERHEATED" || sector.leverageState === "CROWDED")

  return (
    <section className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">Futures Intelligence</div>
              <div className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-white">
                {top ? `${top.sector} ${prettyState(top.leverageState)}` : status === "loading" ? "Loading" : "Scanning"}
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
                Binance Futures open interest and funding are used as a leverage-positioning overlay for spot rotation signals.
              </p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${stateTone(top?.leverageState)}`}>
              {status === "error" ? "ERROR" : top ? prettyBias(top.fundingBias) : "SCAN"}
            </div>
          </div>

          {error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div> : null}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Tracked OI</div>
              <div className="mt-1 text-lg font-black text-cyan-200">{money(totalOi)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Crowded</div>
              <div className="mt-1 text-lg font-black text-amber-200">{overheated.length}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Symbols</div>
              <div className="mt-1 text-lg font-black text-violet-200">{metric(data?.coverage.mappedSymbols)}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300/80">Operator Read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-200">{topRead(sectors)}</div>
          </div>

          <div className="mt-4 space-y-2">
            {(data?.connectors ?? []).map((connector) => (
              <div key={connector.name} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-xs">
                <div>
                  <div className="font-bold uppercase text-zinc-200">{connector.name.replaceAll("-", " ")}</div>
                  <div className="mt-1 text-[11px] text-zinc-500">{connector.message ?? `${connector.records ?? 0} records · ${connector.latencyMs ?? "--"}ms`}</div>
                </div>
                <div className={`font-bold uppercase ${connectorTone(connector.status)}`}>{connector.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Leverage Crowding Board</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Top sectors</div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {sectors.slice(0, 8).map((sector) => (
              <div key={sector.sector} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase text-zinc-100">{sector.sector}</div>
                    <div className="mt-1 text-[11px] text-zinc-500">{prettyBias(sector.fundingBias)} · {sector.symbolCount} futures symbols</div>
                  </div>
                  <div className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${stateTone(sector.leverageState)}`}>
                    {prettyState(sector.leverageState)}
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.max(5, Math.min(100, sector.crowdingScore))}%` }} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  <span>OI {money(sector.oiNotional)}</span>
                  <span>Fund {fundingBps(sector.avgFundingRate)}</span>
                  <span>Score {metric(sector.crowdingScore)}</span>
                </div>

                <div className="mt-3 text-[11px] leading-5 text-zinc-400">{sector.operatorRead}</div>

                {sector.topSymbols.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sector.topSymbols.map((symbol) => (
                      <span key={symbol} className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-300">{symbol}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
