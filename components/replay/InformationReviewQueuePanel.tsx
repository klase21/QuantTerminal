"use client"

import { useEffect, useState } from "react"
import { Check, EyeOff, Inbox, X } from "lucide-react"

import type {
  InformationReviewItem,
  InformationReviewQueueResult,
} from "@/core/information-intelligence/informationReviewQueueTypes"

type QueueResponse =
  | { ok: true; data: InformationReviewQueueResult }
  | { ok: false; error: string }

type DecisionResponse =
  | { ok: true; data: InformationReviewItem }
  | { ok: false; error: string }

function actionClass(action: InformationReviewItem["suggestedAction"]) {
  if (action === "promote_to_event") return "text-emerald-200"
  if (action === "promote_to_memory") return "text-cyan-200"
  if (action === "watch_only") return "text-amber-200"
  return "text-rose-200"
}

export function InformationReviewQueuePanel({ symbol }: { symbol?: string }) {
  const [queue, setQueue] = useState<InformationReviewQueueResult | null>(null)
  const [latestAccepted, setLatestAccepted] = useState<InformationReviewItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function loadItems() {
    const response = await fetch("/api/information-intelligence/review/items?status=pending&limit=5", { cache: "no-store" })
    const payload = (await response.json()) as QueueResponse
    if (payload.ok) setQueue(payload.data)
  }

  async function enqueue() {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch("/api/information-intelligence/review/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, limit: 5 }),
      })
      const payload = (await response.json()) as QueueResponse
      if (payload.ok === false) {
        setMessage(payload.error)
        return
      }
      setQueue(payload.data)
      setMessage(`Queued ${payload.data.count} information item(s).`)
    } finally {
      setLoading(false)
    }
  }

  async function decide(item: InformationReviewItem, action: "accept" | "reject" | "ignore") {
    const response = await fetch("/api/information-intelligence/review/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        action,
        suggestedAction: item.suggestedAction,
        note: `Mock ${action} from Replay information review queue.`,
      }),
    })
    const payload = (await response.json()) as DecisionResponse
    if (payload.ok === false) {
      setMessage(payload.error)
      return
    }
    if (action === "accept") setLatestAccepted(payload.data)
    setMessage(`${action} / ${payload.data.informationItem.title}`)
    await loadItems()
  }

  useEffect(() => {
    void loadItems()
  }, [])

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <Inbox className="h-3.5 w-3.5" />
          Information Review Queue
        </div>
        <button
          type="button"
          onClick={enqueue}
          disabled={loading}
          className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Queueing..." : "Enqueue Top Scores"}
        </button>
      </div>

      <p className="mb-3 text-xs leading-5 text-zinc-500">
        Review scored information before it becomes an event, memory, or narrative candidate. No persistence write happens here.
      </p>

      {message ? <div className="mb-2 rounded-lg border border-zinc-900 bg-black/45 p-2 text-xs leading-5 text-zinc-300">{message}</div> : null}

      <div className="grid gap-2">
        {(queue?.items ?? []).map((item) => (
          <article key={item.id} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  {item.informationItem.source.displayName}
                </div>
                <div className="mt-1 text-xs font-black leading-5 text-white">{item.informationItem.title}</div>
              </div>
              <div className="shrink-0 text-right text-sm font-black text-cyan-100">{item.scoringResult.compositeScore}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
                rel {item.scoringResult.reliabilityScore}
              </span>
              <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
                attn {item.scoringResult.attentionScore}
              </span>
              <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
                impact {item.scoringResult.impactScore}
              </span>
              <span className={`rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${actionClass(item.suggestedAction)}`}>
                {item.suggestedAction.replace(/_/g, " ")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => decide(item, "accept")} className="flex items-center gap-1 rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100">
                <Check className="h-3 w-3" /> Accept
              </button>
              <button type="button" onClick={() => decide(item, "reject")} className="flex items-center gap-1 rounded-md border border-rose-300/20 bg-rose-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-rose-100">
                <X className="h-3 w-3" /> Reject
              </button>
              <button type="button" onClick={() => decide(item, "ignore")} className="flex items-center gap-1 rounded-md border border-zinc-700 bg-black/35 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-300">
                <EyeOff className="h-3 w-3" /> Ignore
              </button>
            </div>
          </article>
        ))}
        {queue && !queue.items.length ? <div className="rounded-lg border border-zinc-900 bg-black/45 p-3 text-xs text-zinc-500">No pending information review items.</div> : null}
      </div>

      {latestAccepted ? (
        <div className="mt-2 rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Candidate Preview</div>
          <div className="mt-1 text-xs leading-5 text-cyan-50/85">
            Event: {latestAccepted.candidates.event?.title ?? "none"} / Memory: {latestAccepted.candidates.memory?.title ?? "none"} / Narrative: {latestAccepted.candidates.narrative?.label ?? "none"}
          </div>
        </div>
      ) : null}
    </section>
  )
}
