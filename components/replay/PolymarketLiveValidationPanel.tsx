"use client"

import { useState } from "react"
import { ShieldCheck } from "lucide-react"

import type { PolymarketLiveValidationResult } from "@/core/historical-intelligence/polymarketLiveValidationTypes"

type ValidationResponse =
  | {
      ok: true
      data: PolymarketLiveValidationResult
    }
  | {
      ok: false
      error: string
    }

function appendParam(params: URLSearchParams, key: string, value: string) {
  const trimmed = value.trim()
  if (trimmed) params.set(key, trimmed)
}

function metric(label: string, value: number) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
      <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-black text-cyan-100">{value}</div>
    </div>
  )
}

export function PolymarketLiveValidationPanel({ assetHint }: { assetHint?: string }) {
  const [keyword, setKeyword] = useState("")
  const [asset, setAsset] = useState("")
  const [limit, setLimit] = useState("3")
  const [result, setResult] = useState<PolymarketLiveValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function runValidation() {
    setIsLoading(true)
    setError(null)
    setResult(null)

    const params = new URLSearchParams({ limit })
    appendParam(params, "keyword", keyword)
    appendParam(params, "asset", asset)

    try {
      const response = await fetch(`/api/historical-intelligence/polymarket/validate-live-samples?${params.toString()}`)
      const payload = (await response.json()) as ValidationResponse
      if (!response.ok || !payload.ok) {
        setError("error" in payload ? payload.error : "Polymarket validation failed")
        return
      }
      setResult(payload.data)
    } catch {
      setError("Polymarket validation request failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Polymarket Live Validation
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">No write</div>
      </div>

      <div className="grid gap-2">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Keyword"
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_72px_92px] gap-2">
          <input
            value={asset}
            onChange={(event) => setAsset(event.target.value)}
            placeholder={assetHint ? `Asset, e.g. ${assetHint}` : "Asset"}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
          />
          <select
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-2 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="5">5</option>
          </select>
          <button
            type="button"
            onClick={runValidation}
            disabled={isLoading}
            className="h-9 rounded-lg border border-cyan-300/30 bg-cyan-400/15 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "..." : "Validate"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-3 grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            {metric("Samples", result.summary.sampleCount)}
            {metric("Normalized", result.summary.normalizedCount)}
            {metric("Avg Conf", result.summary.averageConfidence)}
            {metric("Warnings", result.summary.warningCount)}
            {metric("Errors", result.summary.errorCount)}
            {metric("Active", result.summary.activeCount)}
            {metric("Missing Outcomes", result.summary.missingOutcomeCount)}
            {metric("Missing Prices", result.summary.missingPriceCount)}
            {metric("Missing Volume", result.summary.missingVolumeCount + result.summary.missingLiquidityCount)}
          </div>

          <div className="grid gap-2">
            {result.issues.slice(0, 3).map((issue) => (
              <div
                key={`${issue.code}-${issue.marketId ?? "global"}-${issue.field ?? "field"}`}
                className="rounded-lg border border-amber-300/15 bg-amber-400/10 p-3 text-[11px] leading-5 text-amber-50/80"
              >
                <span className="font-black uppercase">{issue.level}</span> / {issue.code}: {issue.message}
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            {result.samples.slice(0, 3).map((sample) => (
              <article key={sample.marketId} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
                <div className="truncate text-xs font-black text-white">{sample.title}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
                  {sample.status} / {sample.confidence}% / warnings {sample.warningCount}
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3 text-[11px] leading-5 text-cyan-50/80">
            {result.caveat}
          </div>
        </div>
      ) : null}
    </section>
  )
}
