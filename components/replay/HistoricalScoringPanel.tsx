"use client"

import { useState } from "react"
import { GaugeCircle } from "lucide-react"

import type { HistoricalCompositeScore, HistoricalScoringResult } from "@/core/historical-intelligence/historicalScoringTypes"

type ScoringResponse =
  | {
      ok: true
      data: HistoricalScoringResult
    }
  | {
      ok: false
      error: string
    }

function topItem(label: string, item?: HistoricalCompositeScore) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
      <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-xs font-black text-white">{item?.title ?? "N/A"}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
        {item ? `${item.recordType} / ${item.composite}` : "no score"}
      </div>
    </div>
  )
}

function scoreRows(label: string, items: HistoricalCompositeScore[]) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="grid gap-1.5">
        {items.slice(0, 3).map((item) => (
          <div key={item.recordId} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-zinc-300">{item.title}</span>
            <span className="shrink-0 font-black text-cyan-100">{item.composite}</span>
          </div>
        ))}
        {!items.length ? <div className="text-xs text-zinc-600">No scored records</div> : null}
      </div>
    </div>
  )
}

export function HistoricalScoringPanel() {
  const [result, setResult] = useState<HistoricalScoringResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function loadScores() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/historical-intelligence/scoring")
      const payload = (await response.json()) as ScoringResponse
      if (!response.ok || !payload.ok) {
        setResult(null)
        setError("error" in payload ? payload.error : "Scoring request failed")
        return
      }
      setResult(payload.data)
    } catch {
      setResult(null)
      setError("Scoring request failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <GaugeCircle className="h-3.5 w-3.5" />
          Historical Scoring
        </div>
        <button
          type="button"
          onClick={loadScores}
          disabled={isLoading}
          className="rounded-lg border border-cyan-300/30 bg-cyan-400/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-50 disabled:opacity-50"
        >
          {isLoading ? "..." : "Score"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Average</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{result.summary.averageScore}</div>
            </div>
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Events</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{result.events.length}</div>
            </div>
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Playbooks</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{result.playbooks.length}</div>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
            {topItem("Highest Confidence", result.summary.highestConfidenceItem)}
            {topItem("Highest Learning", result.summary.highestLearningValueItem)}
          </div>
          {scoreRows("Top Events", result.events)}
          {scoreRows("Top Memories", result.memories)}
          {scoreRows("Top Playbooks", result.playbooks)}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3 text-xs leading-5 text-zinc-500">
          Run scoring to rank mock historical intelligence records.
        </div>
      )}
    </section>
  )
}
