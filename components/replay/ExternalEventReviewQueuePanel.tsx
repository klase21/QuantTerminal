"use client"

import { useEffect, useState } from "react"
import { ListChecks } from "lucide-react"

import type { ExternalEventSourceType } from "@/core/historical-intelligence/externalEventAdapterTypes"
import type { ExternalEventReviewItem } from "@/core/historical-intelligence/externalEventReviewQueueTypes"

type QueueResponse =
  | {
      ok: true
      data: {
        items: ExternalEventReviewItem[]
        count: number
        pendingCount: number
      }
    }
  | {
      ok: false
      error: string
    }

const SOURCES: { id: ExternalEventSourceType; label: string }[] = [
  { id: "polymarket", label: "Polymarket" },
  { id: "etf_flow", label: "ETF Flow" },
  { id: "macro_calendar", label: "Macro Calendar" },
]

function candidateCount(item: ExternalEventReviewItem) {
  return [
    item.candidates.event,
    item.candidates.memory,
    item.candidates.decision,
    item.candidates.playbook,
  ].filter(Boolean).length
}

export function ExternalEventReviewQueuePanel({
  assetHint,
  onAccepted,
}: {
  assetHint?: string
  onAccepted?: () => void
}) {
  const [sourceType, setSourceType] = useState<ExternalEventSourceType>("polymarket")
  const [mode, setMode] = useState<"mock" | "live">("mock")
  const [keyword, setKeyword] = useState("")
  const [items, setItems] = useState<ExternalEventReviewItem[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function loadItems() {
    const response = await fetch("/api/historical-intelligence/external-review/items?status=pending&limit=5")
    const payload = (await response.json()) as QueueResponse
    if (payload.ok) {
      setItems(payload.data.items)
      setPendingCount(payload.data.pendingCount)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  async function enqueue() {
    setIsBusy(true)
    setMessage(null)
    try {
      const response = await fetch("/api/historical-intelligence/external-review/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          keyword: keyword || undefined,
          asset: assetHint,
          limit: 3,
          mode,
        }),
      })
      const payload = (await response.json()) as QueueResponse
      if (!response.ok || !payload.ok) {
        setMessage("error" in payload ? payload.error : "Enqueue failed")
        return
      }
      setMessage(`${mode === "live" ? "Live events queued for review only" : "Queued"}: ${payload.data.count} item(s)`)
      await loadItems()
    } catch {
      setMessage("Review queue enqueue request failed")
    } finally {
      setIsBusy(false)
    }
  }

  async function decide(id: string, action: "accept" | "reject" | "ignore") {
    setIsBusy(true)
    setMessage(null)
    try {
      const response = await fetch("/api/historical-intelligence/external-review/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note: `${action} from Replay review queue panel` }),
      })
      const payload = (await response.json()) as QueueResponse
      if (!response.ok || !payload.ok) {
        setMessage("error" in payload ? payload.error : "Review decision failed")
        return
      }
      setMessage(action === "accept" ? `Accepted review item: ${id}` : `${action} ${id}`)
      if (action === "accept") onAccepted?.()
      await loadItems()
    } catch {
      setMessage("Review decision request failed")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <ListChecks className="h-3.5 w-3.5" />
          External Review Queue
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{pendingCount} pending</div>
      </div>

      <div className="grid gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
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
          <button
            type="button"
            onClick={enqueue}
            disabled={isBusy}
            className="h-9 rounded-lg border border-cyan-300/30 bg-cyan-400/15 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Queue
          </button>
        </div>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as "mock" | "live")}
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
        >
          <option value="mock">Mock enqueue</option>
          <option value="live" disabled={sourceType !== "polymarket"}>
            Live Polymarket enqueue
          </option>
        </select>
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Keyword"
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
        />
      </div>

      {message ? (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-black/45 p-3 text-xs leading-5 text-zinc-300">
          {message}
        </div>
      ) : null}
      {mode === "live" ? (
        <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-400/10 p-3 text-[11px] leading-5 text-amber-50/80">
          Live events are queued for review only. They are external market context, not trading signals.
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-white">{item.rawTitle}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  {item.sourceType} / {candidateCount(item)} candidates
                </div>
              </div>
              <div className="shrink-0 text-xs font-black text-cyan-100">{item.confidence}%</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => decide(item.id, "accept")}
                disabled={isBusy}
                className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => decide(item.id, "reject")}
                disabled={isBusy}
                className="rounded-md border border-rose-300/20 bg-rose-400/10 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-rose-100 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => decide(item.id, "ignore")}
                disabled={isBusy}
                className="rounded-md border border-zinc-800 bg-black/45 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400 disabled:opacity-50"
              >
                Ignore
              </button>
            </div>
          </article>
        ))}
        {!items.length ? (
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3 text-xs leading-5 text-zinc-500">
            No pending external event review items.
          </div>
        ) : null}
      </div>
    </section>
  )
}
