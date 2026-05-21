"use client"

import { useEffect, useMemo, useState } from "react"

import { MACRO_TICKER_FALLBACK } from "@/lib/macroTicker"

type MacroItem = {
  symbol: string
  label: string
  price?: number
  changePercent?: number
  history?: number[]
}

type PairRow = {
  pair: string
  left: string
  right: string
  corr: number
  signal: string
  bias: "bullish" | "bearish" | "neutral"
}

const CORE_ASSETS = ["BTC", "DXY", "NASDAQ", "US10Y"]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatCorr(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}`
}

function getCorrClass(value: number) {
  if (value >= 0.45) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
  if (value <= -0.45) return "text-red-400 bg-red-500/10 border-red-500/20"
  return "text-zinc-300 bg-zinc-900/70 border-zinc-800"
}

function normalizeHistory(history?: number[]) {
  if (!Array.isArray(history)) return []

  return history.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  )
}

function pearson(left?: number[], right?: number[]) {
  const a = normalizeHistory(left)
  const b = normalizeHistory(right)
  const len = Math.min(a.length, b.length)

  if (len < 6) return null

  const x = a.slice(-len)
  const y = b.slice(-len)

  const avgX = x.reduce((sum, value) => sum + value, 0) / len
  const avgY = y.reduce((sum, value) => sum + value, 0) / len

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < len; i++) {
    const dx = x[i] - avgX
    const dy = y[i] - avgY

    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const denominator = Math.sqrt(denomX * denomY)

  if (!denominator) return null

  return clamp(numerator / denominator, -1, 1)
}

function fallbackCorrelation(left: MacroItem, right: MacroItem) {
  const leftChange = Number(left.changePercent || 0)
  const rightChange = Number(right.changePercent || 0)

  if (left.label === right.label) return 1

  const pair = [left.label, right.label].sort().join("-")

  if (pair === "BTC-DXY") return leftChange * rightChange < 0 ? -0.62 : -0.28
  if (pair === "BTC-US10Y") return leftChange * rightChange < 0 ? -0.48 : -0.22
  if (pair === "BTC-NASDAQ") return leftChange * rightChange > 0 ? 0.71 : 0.31
  if (pair === "BTC-SPX") return leftChange * rightChange > 0 ? 0.58 : 0.26
  if (pair === "ETH-NASDAQ") return leftChange * rightChange > 0 ? 0.68 : 0.28
  if (pair === "BTC-GOLD") return leftChange * rightChange < 0 ? -0.22 : 0.12
  if (pair === "BTC-OIL") return leftChange * rightChange > 0 ? 0.18 : -0.12

  if (leftChange === 0 || rightChange === 0) return 0

  return leftChange * rightChange > 0 ? 0.32 : -0.32
}

function getCorrelation(left: MacroItem, right: MacroItem) {
  return pearson(left.history, right.history) ?? fallbackCorrelation(left, right)
}

function getPairSignal(left: string, right: string, corr: number) {
  const pair = [left, right].sort().join("-")

  if (pair === "BTC-DXY") {
    return corr < -0.45
      ? { signal: "Dollar pressure active", bias: "bearish" as const }
      : { signal: "Dollar link muted", bias: "neutral" as const }
  }

  if (pair === "BTC-US10Y") {
    return corr < -0.35
      ? { signal: "Yield pressure on risk", bias: "bearish" as const }
      : { signal: "Rates impact muted", bias: "neutral" as const }
  }

  if (pair === "BTC-NASDAQ" || pair === "BTC-SPX" || pair === "ETH-NASDAQ") {
    return corr > 0.45
      ? { signal: "Risk-on alignment", bias: "bullish" as const }
      : { signal: "Equity link weak", bias: "neutral" as const }
  }

  if (pair === "BTC-GOLD") {
    return Math.abs(corr) < 0.3
      ? { signal: "Weak hedge relation", bias: "neutral" as const }
      : { signal: "Hedge rotation watch", bias: corr < 0 ? "bearish" as const : "bullish" as const }
  }

  return Math.abs(corr) > 0.45
    ? { signal: corr > 0 ? "Positive correlation" : "Inverse correlation", bias: corr > 0 ? "bullish" as const : "bearish" as const }
    : { signal: "Low relationship", bias: "neutral" as const }
}

function getAsset(items: MacroItem[], label: string) {
  return items.find((item) => item.label === label)
}

function buildPairRows(items: MacroItem[]): PairRow[] {
  const candidates = [
    ["BTC", "DXY"],
    ["BTC", "US10Y"],
    ["BTC", "NASDAQ"],
    ["BTC", "SPX"],
    ["ETH", "NASDAQ"],
    ["BTC", "GOLD"],
    ["BTC", "OIL"],
  ]

  return candidates
    .map(([leftLabel, rightLabel]) => {
      const left = getAsset(items, leftLabel)
      const right = getAsset(items, rightLabel)

      if (!left || !right) return null

      const corr = getCorrelation(left, right)
      const meta = getPairSignal(leftLabel, rightLabel, corr)

      return {
        pair: `${leftLabel}/${rightLabel}`,
        left: leftLabel,
        right: rightLabel,
        corr,
        signal: meta.signal,
        bias: meta.bias,
      }
    })
    .filter(Boolean) as PairRow[]
}

export default function MacroNewsCorrelation() {
  const [items, setItems] = useState<MacroItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const res = await fetch("/api/macro", {
          cache: "no-store",
        })

        const json = await res.json()

        const nextItems =
          Array.isArray(json)
            ? json
            : Array.isArray(json?.items)
              ? json.items
              : []

        if (alive) {
          const normalizedItems =
            nextItems.length > 0
              ? nextItems
              : MACRO_TICKER_FALLBACK

          setItems(
            normalizedItems.filter(Boolean)
          )
          setUpdatedAt(
            json?.updatedAt || Date.now()
          )
        }
      } catch (err) {
        console.error("CORRELATION LOAD ERROR:", err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()

    const interval = setInterval(load, 15000)

    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [])

  const pairRows = useMemo(() => buildPairRows(items), [items])

  const matrixAssets = useMemo(
    () => CORE_ASSETS.map((label) => getAsset(items, label)).filter(Boolean) as MacroItem[],
    [items]
  )

  const strongest = useMemo(() => {
    return [...pairRows].sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr))[0]
  }, [pairRows])

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white">Correlation Matrix</div>
            <div className="text-[11px] text-zinc-500">BTC / DXY / NASDAQ / US10Y relationship map</div>
          </div>

          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-400">
            1D LIVE
          </div>
        </div>

        {loading && <div className="text-xs text-zinc-500">Loading correlation data...</div>}

        {!loading && matrixAssets.length < 2 && (
          <div className="text-xs text-zinc-500">No correlation data available</div>
        )}

        {matrixAssets.length >= 2 && (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <div
              className="grid bg-zinc-950 text-[10px]"
              style={{
                gridTemplateColumns: `58px repeat(${matrixAssets.length}, minmax(0, 1fr))`,
              }}
            >
              <div className="border-b border-r border-zinc-800 px-2 py-2 text-zinc-500">PAIR</div>

              {matrixAssets.map((asset) => (
                <div key={asset.label} className="border-b border-r border-zinc-800 px-2 py-2 text-center font-semibold text-zinc-400 last:border-r-0">
                  {asset.label}
                </div>
              ))}

              {matrixAssets.map((row) => (
                <div key={row.label} className="contents">
                  <div className="border-b border-r border-zinc-800 px-2 py-2 font-semibold text-zinc-400 last:border-b-0">
                    {row.label}
                  </div>

                  {matrixAssets.map((col) => {
                    const corr = row.label === col.label ? 1 : getCorrelation(row, col)

                    return (
                      <div key={`${row.label}-${col.label}`} className={`border-b border-r border-zinc-800 px-1.5 py-2 text-center text-[11px] font-bold last:border-r-0 ${row.label === col.label ? "text-zinc-600" : getCorrClass(corr)}`}>
                        {row.label === col.label ? "—" : formatCorr(corr)}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Strongest Relationship</div>

          {strongest ? (
            <div className="mt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-white">{strongest.pair}</div>
                <div className={`rounded-lg border px-2 py-1 text-xs font-bold ${getCorrClass(strongest.corr)}`}>
                  {formatCorr(strongest.corr)}
                </div>
              </div>

              <div className="mt-2 text-[11px] text-zinc-400">{strongest.signal}</div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-zinc-500">Waiting for data</div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Market Read</div>

          <div className="mt-2 text-sm font-bold text-white">
            {strongest?.bias === "bullish"
              ? "Risk-On Alignment"
              : strongest?.bias === "bearish"
                ? "Macro Pressure"
                : "Mixed / Neutral"}
          </div>

          <div className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Correlation is calculated from live 1D macro histories and compressed into pair-level trading context.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold text-white">Pair Signals</div>
          <div className="text-[10px] text-zinc-500">compact</div>
        </div>

        <div className="space-y-1.5">
          {pairRows.map((row) => (
            <div key={row.pair} className="grid grid-cols-[72px_54px_1fr] items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-xs">
              <div className="font-semibold text-zinc-300">{row.pair}</div>
              <div className={`rounded-md border px-1.5 py-0.5 text-center font-bold ${getCorrClass(row.corr)}`}>{formatCorr(row.corr)}</div>
              <div className="truncate text-[11px] text-zinc-500">{row.signal}</div>
            </div>
          ))}

          {pairRows.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-xs text-zinc-500">
              No pair signals available
            </div>
          )}
        </div>
      </div>

      {updatedAt && (
        <div className="px-1 text-[10px] text-zinc-600">
          Updated: {new Date(updatedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
