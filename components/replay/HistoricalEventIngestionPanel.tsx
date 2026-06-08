"use client"

import { useState } from "react"
import { UploadCloud } from "lucide-react"

import type { HistoricalMockIngestionKind } from "@/core/historical-intelligence/historicalEventIngestionTypes"
import type { ReplayCase } from "@/core/replay/replayTypes"

type IngestionResult =
  | {
      ok: true
      data: {
        sourceKind?: HistoricalMockIngestionKind
        event: {
          id: string
          title: string
          category?: string
          symbol?: string
        }
        memory?: {
          id: string
        }
        decision?: {
          id: string
        }
        playbook?: {
          id: string
        }
      }
    }
  | {
      ok: false
      error: string
    }

const INGESTION_KINDS: { id: HistoricalMockIngestionKind; label: string }[] = [
  { id: "etf_flow", label: "ETF Flow" },
  { id: "cpi", label: "CPI" },
  { id: "fomc", label: "FOMC" },
  { id: "nfp", label: "NFP" },
  { id: "polymarket", label: "Polymarket" },
  { id: "kalshi", label: "Kalshi" },
  { id: "token_unlock", label: "Token Unlock" },
  { id: "exchange_listing", label: "Exchange Listing" },
  { id: "regulatory_event", label: "Regulatory" },
]

export function HistoricalEventIngestionPanel({ replay, onIngest }: { replay: ReplayCase; onIngest?: () => void }) {
  const [kind, setKind] = useState<HistoricalMockIngestionKind>("cpi")
  const [result, setResult] = useState<IngestionResult | null>(null)
  const [isIngesting, setIsIngesting] = useState(false)
  const candidateCounts = {
    event: 1,
    memory: 1,
    decision: 1,
    playbook: 1,
  }
  const normalizedPreview = `${replay.symbol} / ${kind.replace(/_/g, " ")} / mock-only`

  async function ingestEvent() {
    setIsIngesting(true)
    setResult(null)

    try {
      const response = await fetch("/api/historical-intelligence/ingestion/mock-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          symbol: replay.symbol,
          title: `${replay.symbol} ${kind.replace(/_/g, " ")} mock event`,
          summary: `Mock ingestion test linked to ${replay.title}.`,
          tags: [replay.symbol.toLowerCase(), kind, "replay_workspace_test"],
        }),
      })
      const json = (await response.json()) as IngestionResult
      setResult(json)
      if (json.ok) onIngest?.()
    } catch {
      setResult({ ok: false, error: "Mock ingestion request failed" })
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <UploadCloud className="h-3.5 w-3.5" />
          Event Ingestion Test
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Mock</div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as HistoricalMockIngestionKind)}
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
        >
          {INGESTION_KINDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={ingestEvent}
          disabled={isIngesting}
          className="h-9 rounded-lg border border-cyan-300/30 bg-cyan-400/15 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isIngesting ? "..." : "Ingest"}
        </button>
      </div>
      <div className="mt-3 rounded-lg border border-zinc-900 bg-black/45 p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Normalized Preview</div>
        <div className="mt-1 text-xs font-black text-white">{normalizedPreview}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(candidateCounts).map(([label, count]) => (
            <span
              key={label}
              className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100"
            >
              {label} {count}
            </span>
          ))}
          <span className="rounded-full border border-amber-300/15 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100">
            mock-only
          </span>
          <span className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100">
            write-ready
          </span>
        </div>
      </div>
      {result ? (
        <div
          className={`mt-3 rounded-lg border p-3 text-xs leading-5 ${
            result.ok ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-rose-300/20 bg-rose-400/10 text-rose-100"
          }`}
        >
          {result.ok
            ? `Created ${result.data.event.id} / ${result.data.memory ? `memory ${result.data.memory.id}` : "no memory"} / ${
                result.data.decision ? `decision ${result.data.decision.id}` : "no decision"
              } / ${result.data.playbook ? `playbook ${result.data.playbook.id}` : "no playbook"}`
            : "error" in result
              ? result.error
              : "Mock ingestion failed"}
        </div>
      ) : null}
    </section>
  )
}
