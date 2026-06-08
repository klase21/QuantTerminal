"use client"

import { useState } from "react"
import { Save } from "lucide-react"

import type { ReplayCase } from "@/core/replay/replayTypes"

type WriteResult =
  | {
      ok: true
      data: {
        id: string
        decision?: string
        title?: string
      }
    }
  | {
      ok: false
      error: string
    }

const AUDIT = {
  createdAt: "2026-06-08T00:00:00.000Z",
  updatedAt: "2026-06-08T00:00:00.000Z",
  schemaVersion: 1,
}

export function ReplayDecisionWritePanel({ replay }: { replay: ReplayCase }) {
  const [result, setResult] = useState<WriteResult | null>(null)
  const [isWriting, setIsWriting] = useState(false)

  async function writeDecision() {
    setIsWriting(true)
    setResult(null)

    const payload = {
      caseId: replay.id,
      mode: "hypothetical",
      decidedAt: "2026-06-08T00:00:00.000Z",
      symbol: replay.symbol,
      decision: replay.verdict === "Narrative Confirmed" ? "long" : "wait",
      decisionReason: `Mock write test for ${replay.title}.`,
      invalidationCondition: "Flow, structure, or expectation context invalidates the replay read.",
      expectedOutcome: replay.setup,
      actualOutcome: replay.outcome,
      mistakeTag: replay.verdict === "Reality Diverged" ? "headline_attribution_risk" : "none",
      lesson: replay.realityCheck,
      futureRule: "Persist the decision, then compare it with replay outcome memory before execution.",
      confidence: 72,
      sourceIds: ["replay-write-panel"],
      status: "draft",
      audit: AUDIT,
    }

    try {
      const response = await fetch("/api/historical-intelligence/persistence/write/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await response.json()) as WriteResult
      setResult(json)
    } catch {
      setResult({ ok: false, error: "Decision write request failed" })
    } finally {
      setIsWriting(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <Save className="h-3.5 w-3.5" />
          Decision Write Test
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Mock</div>
      </div>
      <p className="text-xs leading-5 text-zinc-400">
        Creates a draft hypothetical decision for the selected replay case in the in-memory persistence adapter.
      </p>
      <button
        type="button"
        onClick={writeDecision}
        disabled={isWriting}
        className="mt-3 h-9 w-full rounded-lg border border-cyan-300/30 bg-cyan-400/15 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isWriting ? "Writing..." : "Write Draft Decision"}
      </button>
      {result ? (
        <div
          className={`mt-3 rounded-lg border p-3 text-xs leading-5 ${
            result.ok ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-rose-300/20 bg-rose-400/10 text-rose-100"
          }`}
        >
          {result.ok ? `Created ${result.data.id}` : "error" in result ? result.error : "Decision write failed"}
        </div>
      ) : null}
    </section>
  )
}
