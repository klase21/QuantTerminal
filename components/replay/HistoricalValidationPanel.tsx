"use client"

import { useState } from "react"
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react"

import type { HistoricalValidationResult } from "@/core/historical-intelligence/validation/historicalValidationTypes"

type ValidationApiResponse =
  | {
      ok: true
      mode: "historical-validation"
      data: HistoricalValidationResult
    }
  | {
      ok: false
      mode: "historical-validation"
      error: string
    }

function healthClass(health?: HistoricalValidationResult["summary"]["pipelineHealth"]) {
  if (health === "Excellent") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
  if (health === "Good") return "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
  if (health === "Needs Review") return "border-amber-300/20 bg-amber-400/10 text-amber-100"
  return "border-rose-300/20 bg-rose-400/10 text-rose-100"
}

function MetricTile({ label, value, suffix = "%" }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-black text-white">
        {value}
        {suffix}
      </div>
    </div>
  )
}

export function HistoricalValidationPanel() {
  const [result, setResult] = useState<HistoricalValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runValidation() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/historical-intelligence/validation", { cache: "no-store" })
      const payload = (await response.json()) as ValidationApiResponse
      if (payload.ok === false) {
        setError(payload.error)
        setResult(null)
        return
      }
      setResult(payload.data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Validation request failed")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const summary = result?.summary

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <Activity className="h-3.5 w-3.5" />
          Historical Validation
        </div>
        <button
          type="button"
          onClick={runValidation}
          disabled={loading}
          className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Measuring..." : "Run Validation"}
        </button>
      </div>

      <p className="mb-3 text-xs leading-5 text-zinc-500">
        Measures accepted events through review, linking, relationship graph, scoring, and historical context coverage. Mock/in-memory observability only.
      </p>

      {error ? (
        <div className="mb-3 rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <MetricTile label="Accepted Events" value={summary?.acceptedEvents ?? 0} suffix="" />
        <MetricTile label="Linked Events" value={summary?.linkedEvents ?? 0} suffix="" />
        <MetricTile label="Graph Coverage" value={summary?.graphCoverage ?? 0} />
        <MetricTile label="Match Rate" value={summary?.historicalMatchRate ?? 0} />
        <MetricTile label="Avg Confidence" value={summary?.averageConfidence ?? 0} />
        <MetricTile label="Rel Density" value={summary?.averageRelationshipDensity ?? 0} suffix="x" />
      </div>

      <div className={`mt-2 rounded-lg border p-3 ${healthClass(summary?.pipelineHealth)}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Pipeline Health
          </div>
          <div className="text-sm font-black">{summary?.pipelineHealth ?? "Poor"}</div>
        </div>
      </div>

      {result?.gaps.length ? (
        <div className="mt-2 rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">
            <AlertTriangle className="h-3.5 w-3.5" />
            Major Gaps
          </div>
          <div className="mt-2 space-y-2">
            {result.gaps.slice(0, 3).map((gap) => (
              <div key={`${gap.reviewItemId}-${gap.eventId}`} className="text-xs leading-5 text-amber-50/85">
                <span className="font-black text-white">{gap.title}</span> / {gap.gaps.join(", ")}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {result?.improvementPriorities.length ? (
        <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Improvement Priorities</div>
          <div className="mt-2 space-y-1.5">
            {result.improvementPriorities.slice(0, 3).map((priority) => (
              <div key={priority} className="text-xs leading-5 text-zinc-300">{priority}</div>
            ))}
          </div>
        </div>
      ) : null}

      {summary?.warnings.length ? (
        <div className="mt-2 text-[11px] leading-5 text-zinc-500">{summary.warnings[0]}</div>
      ) : null}
    </section>
  )
}
