"use client"

import { useState } from "react"
import { GitBranch, Search } from "lucide-react"

import type { InformationHistoricalBridgePreview } from "@/core/information-intelligence/informationHistoricalBridgeTypes"

type BridgeResponse =
  | { ok: true; data: InformationHistoricalBridgePreview }
  | { ok: false; error: string }

function actionClass(action: InformationHistoricalBridgePreview["recommendedNextAction"]) {
  if (action === "create_event_manually") return "text-emerald-200"
  if (action === "send_to_external_review") return "text-cyan-200"
  if (action === "watch_only") return "text-amber-200"
  return "text-rose-200"
}

export function InformationHistoricalBridgePanel() {
  const [reviewItemId, setReviewItemId] = useState("")
  const [preview, setPreview] = useState<InformationHistoricalBridgePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function loadPreview() {
    const id = reviewItemId.trim()
    if (!id) {
      setMessage("Accepted information review item id is required.")
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/information-intelligence/historical-bridge/preview?reviewItemId=${encodeURIComponent(id)}`, {
        cache: "no-store",
      })
      const payload = (await response.json()) as BridgeResponse
      if (payload.ok === false) {
        setPreview(null)
        setMessage(payload.error)
        return
      }
      setPreview(payload.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <GitBranch className="h-3.5 w-3.5" />
          Information / Historical Bridge
        </div>
        <div className="rounded-full border border-zinc-700 bg-black/35 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400">
          preview only
        </div>
      </div>

      <p className="mb-3 text-xs leading-5 text-zinc-500">
        Convert an accepted source review item into reusable market cases. No persistence write happens here.
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={reviewItemId}
          onChange={(event) => setReviewItemId(event.target.value)}
          placeholder="accepted review item id"
          className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/40"
        />
        <button
          type="button"
          onClick={loadPreview}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search className="h-3 w-3" />
          {loading ? "Previewing..." : "Preview"}
        </button>
      </div>

      {message ? <div className="mt-2 rounded-lg border border-zinc-900 bg-black/45 p-2 text-xs leading-5 text-zinc-300">{message}</div> : null}

      {preview ? (
        <div className="mt-3 grid gap-2">
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  {preview.sourceName} / {preview.reviewItemStatus}
                </div>
                <div className="mt-1 text-xs font-black leading-5 text-white">{preview.sourceTitle}</div>
              </div>
              <div className={`text-right text-[10px] font-black uppercase tracking-[0.12em] ${actionClass(preview.recommendedNextAction)}`}>
                {preview.recommendedNextAction.replace(/_/g, " ")}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
                confidence {preview.suggestedConfidence}
              </span>
              <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
                composite {preview.scoring.compositeScore}
              </span>
              <span className="rounded-full border border-zinc-700 bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-300">
                impact {preview.scoring.impactScore}
              </span>
            </div>
            <div className="mt-2 text-[11px] leading-5 text-zinc-500">{preview.bridgeCaveat}</div>
          </div>

          <div className="grid gap-2 lg:grid-cols-3">
            <CandidateCard label="Event" title={preview.eventCandidate?.title} meta={preview.eventCandidate ? `${preview.eventCandidate.category} / ${preview.eventCandidate.severity}` : "none"} />
            <CandidateCard label="Memory" title={preview.memoryCandidate?.title} meta={preview.memoryCandidate?.memoryType ?? "none"} />
            <CandidateCard label="Narrative" title={preview.narrativeCandidate?.label} meta={preview.narrativeCandidate?.stage ?? "none"} />
          </div>

          <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Suggested Historical Tags</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preview.suggestedHistoricalTags.slice(0, 8).map((tag) => (
                <span key={tag} className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100/80">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function CandidateCard({ label, title, meta }: { label: string; title?: string; meta: string }) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{label} Candidate</div>
      <div className="mt-1 text-xs font-black leading-5 text-zinc-100">{title ?? "No candidate"}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-500">{meta}</div>
    </div>
  )
}
