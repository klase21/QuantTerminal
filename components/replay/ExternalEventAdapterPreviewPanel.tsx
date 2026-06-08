"use client"

import { useState } from "react"
import { SatelliteDish } from "lucide-react"

import type {
  ExternalEventAdapterHealth,
  ExternalEventNormalizationResult,
  ExternalEventSourceType,
} from "@/core/historical-intelligence/externalEventAdapterTypes"

type PreviewResponse =
  | {
      ok: true
      data: {
        health: ExternalEventAdapterHealth
        rawItemCount: number
        normalizedEventCount: number
        rawItems: {
          sourceUrl?: string
        }[]
        normalizedCandidates: ExternalEventNormalizationResult[]
        warnings: string[]
        previewMode?: "mock" | "live"
      }
    }
  | {
      ok: false
      error: string
      warnings?: string[]
    }

const SOURCES: { id: ExternalEventSourceType; label: string }[] = [
  { id: "polymarket", label: "Polymarket" },
  { id: "etf_flow", label: "ETF Flow" },
  { id: "macro_calendar", label: "Macro Calendar" },
]

function appendParam(params: URLSearchParams, key: string, value: string) {
  const trimmed = value.trim()
  if (trimmed) params.set(key, trimmed)
}

export function ExternalEventAdapterPreviewPanel({ assetHint }: { assetHint?: string }) {
  const [sourceType, setSourceType] = useState<ExternalEventSourceType>("polymarket")
  const [mode, setMode] = useState<"mock" | "live">("mock")
  const [keyword, setKeyword] = useState("")
  const [asset, setAsset] = useState("")
  const [limit, setLimit] = useState("3")
  const [result, setResult] = useState<PreviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function previewAdapter() {
    setIsLoading(true)
    setResult(null)

    const params = new URLSearchParams({ sourceType, limit })
    appendParam(params, "keyword", keyword)
    appendParam(params, "asset", asset)

    try {
      const endpoint =
        mode === "live" && sourceType === "polymarket"
          ? "/api/historical-intelligence/external-adapters/live-preview"
          : "/api/historical-intelligence/external-adapters/preview"
      const response = await fetch(`${endpoint}?${params.toString()}`)
      const payload = (await response.json()) as PreviewResponse
      setResult(payload)
    } catch {
      setResult({ ok: false, error: "External adapter preview request failed" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <SatelliteDish className="h-3.5 w-3.5" />
          External Adapter Preview
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
          {mode === "live" && sourceType === "polymarket" ? "Live Preview" : "Mock"}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_112px_72px] gap-2">
          <select
            value={sourceType}
            onChange={(event) => {
              const nextSourceType = event.target.value as ExternalEventSourceType
              setSourceType(nextSourceType)
              if (nextSourceType !== "polymarket") setMode("mock")
            }}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
          >
            {SOURCES.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "mock" | "live")}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-2 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
          >
            <option value="mock">Mock</option>
            <option value="live">Live</option>
          </select>
          <select
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="5">5</option>
          </select>
        </div>
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Keyword"
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
          <input
            value={asset}
            onChange={(event) => setAsset(event.target.value)}
            placeholder={assetHint ? `Asset, e.g. ${assetHint}` : "Asset"}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
          />
          <button
            type="button"
            onClick={previewAdapter}
            disabled={isLoading}
            className="h-9 rounded-lg border border-cyan-300/30 bg-cyan-400/15 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "..." : "Preview"}
          </button>
        </div>
      </div>

      {result ? (
        <div className="mt-3 grid gap-2">
          {result.ok ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Health</div>
                  <div className="mt-1 text-xs font-black text-cyan-100">{result.data.health.status}</div>
                </div>
                <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Raw</div>
                  <div className="mt-1 text-xs font-black text-white">{result.data.rawItemCount}</div>
                </div>
                <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Normalized</div>
                  <div className="mt-1 text-xs font-black text-white">{result.data.normalizedEventCount}</div>
                </div>
              </div>
              <div className="grid gap-2">
                {result.data.normalizedCandidates.slice(0, 3).map((candidate) => (
                  <article key={candidate.rawItem.id} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-white">{candidate.normalized.event.title}</div>
                        <div className="mt-1 text-[10px] font-bold text-zinc-500">{candidate.rawItem.sourceType}</div>
                      </div>
                      <div className="shrink-0 text-right text-xs font-black text-cyan-100">
                        {candidate.normalized.event.confidence}%
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {result.data.rawItems?.[0]?.sourceUrl ? (
                <div className="truncate rounded-lg border border-zinc-900 bg-black/45 p-3 text-[11px] leading-5 text-zinc-400">
                  Source: {result.data.rawItems[0].sourceUrl}
                </div>
              ) : null}
              {result.data.warnings.length ? (
                <div className="rounded-lg border border-zinc-800 bg-black/45 p-3 text-[11px] leading-5 text-zinc-400">
                  {result.data.warnings.slice(0, 2).join(" / ")}
                </div>
              ) : null}
              <div className="rounded-lg border border-amber-300/15 bg-amber-400/10 p-3 text-[11px] leading-5 text-amber-50/80">
                {mode === "live" && sourceType === "polymarket"
                  ? "Live preview only. External market context and crowd expectation, not a trading signal. Send to Review Queue before writing."
                  : "Mock-only preview. No external request, API key, or database write occurred."}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">
              {"error" in result ? result.error : "External adapter preview failed"}
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
