"use client"

import { useState } from "react"
import { Search } from "lucide-react"

import type { HistoricalQueryResult } from "@/core/historical-intelligence/historicalQueryTypes"

type QueryState = {
  keyword: string
  asset: string
  narrative: string
  tag: string
  limit: string
}

type QueryApiResponse =
  | {
      ok: true
      mode: "historical-intelligence-query"
      data: HistoricalQueryResult
    }
  | {
      ok: false
      error: string
    }

const INITIAL_QUERY: QueryState = {
  keyword: "",
  asset: "",
  narrative: "",
  tag: "",
  limit: "5",
}

function appendParam(params: URLSearchParams, key: string, value: string) {
  const trimmed = value.trim()
  if (trimmed) params.set(key, trimmed)
}

function countLabel(label: string, value: number) {
  return (
    <div className="rounded-md border border-zinc-900 bg-black/45 p-2">
      <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-black text-cyan-100">{value}</div>
    </div>
  )
}

export function HistoricalQueryExplorerPanel({ assetHint }: { assetHint?: string }) {
  const [query, setQuery] = useState<QueryState>(INITIAL_QUERY)
  const [result, setResult] = useState<HistoricalQueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runQuery() {
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams()
    appendParam(params, "keyword", query.keyword)
    appendParam(params, "asset", query.asset)
    appendParam(params, "narrative", query.narrative)
    appendParam(params, "tag", query.tag)
    appendParam(params, "limit", query.limit)

    try {
      const response = await fetch(`/api/historical-intelligence/query?${params.toString()}`)
      const payload = (await response.json()) as QueryApiResponse

      if (!response.ok) {
        setResult(null)
        setError("error" in payload ? payload.error : "Historical query failed")
        return
      }

      if ("error" in payload) {
        setResult(null)
        setError(payload.error)
        return
      }

      setResult(payload.data)
    } catch {
      setResult(null)
      setError("Historical query request failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <Search className="h-3.5 w-3.5" />
          Historical Query
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Read-only</div>
      </div>

      <div className="grid gap-2">
        <input
          value={query.keyword}
          onChange={(event) => setQuery((current) => ({ ...current, keyword: event.target.value }))}
          placeholder="Keyword"
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={query.asset}
            onChange={(event) => setQuery((current) => ({ ...current, asset: event.target.value }))}
            placeholder={assetHint ? `Asset, e.g. ${assetHint}` : "Asset"}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
          />
          <select
            value={query.limit}
            onChange={(event) => setQuery((current) => ({ ...current, limit: event.target.value }))}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
          >
            <option value="3">3 results</option>
            <option value="5">5 results</option>
            <option value="10">10 results</option>
          </select>
        </div>
        <input
          value={query.narrative}
          onChange={(event) => setQuery((current) => ({ ...current, narrative: event.target.value }))}
          placeholder="Narrative"
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
          <input
            value={query.tag}
            onChange={(event) => setQuery((current) => ({ ...current, tag: event.target.value }))}
            placeholder="Tag"
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
          />
          <button
            type="button"
            onClick={runQuery}
            disabled={isLoading}
            className="h-9 rounded-lg border border-cyan-300/30 bg-cyan-400/15 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "..." : "Search"}
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
            {countLabel("Cases", result.replayCases.length)}
            {countLabel("Events", result.relatedEvents.length)}
            {countLabel("Memory", result.relatedMemories.length)}
            {countLabel("Decisions", result.relatedDecisions.length)}
            {countLabel("Playbooks", result.relatedPlaybooks.length)}
            <div className="rounded-md border border-cyan-300/15 bg-cyan-400/10 p-2">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/60">Confidence</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{result.summary.confidence}%</div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Readability</div>
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200">
                {result.summary.readability}
              </div>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-300">{result.summary.summary}</p>
            {result.summary.matchedSignals.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.summary.matchedSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-zinc-800 bg-black/45 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
