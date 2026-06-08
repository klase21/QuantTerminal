"use client"

import { useEffect, useState } from "react"
import { Link2 } from "lucide-react"

import type {
  AcceptedEventLink,
  AcceptedEventLinkCandidate,
} from "@/core/historical-intelligence/acceptedEventLinkerTypes"

type CandidateGenerationResponse =
  | {
      ok: true
      data: {
        candidates: AcceptedEventLinkCandidate[]
        summary: {
          warning?: string
        }
      }
    }
  | {
      ok: false
      error: string
    }

type CandidateListResponse =
  | {
      ok: true
      data: AcceptedEventLinkCandidate[]
    }
  | {
      ok: false
      error: string
    }

type LinkListResponse =
  | {
      ok: true
      data: {
        links: AcceptedEventLink[]
        count: number
      }
    }
  | {
      ok: false
      error: string
    }

export function AcceptedEventLinkerPanel({ onLinkAccepted }: { onLinkAccepted?: () => void }) {
  const [reviewItemId, setReviewItemId] = useState("")
  const [candidates, setCandidates] = useState<AcceptedEventLinkCandidate[]>([])
  const [links, setLinks] = useState<AcceptedEventLink[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function loadLinks() {
    const response = await fetch("/api/historical-intelligence/accepted-event-links/list?limit=5")
    const payload = (await response.json()) as LinkListResponse
    if (payload.ok) setLinks(payload.data.links)
  }

  async function loadCandidates() {
    const params = new URLSearchParams({ status: "pending", limit: "5" })
    if (reviewItemId.trim()) params.set("reviewItemId", reviewItemId.trim())
    const response = await fetch(`/api/historical-intelligence/accepted-event-links/candidates?${params.toString()}`)
    const payload = (await response.json()) as CandidateListResponse
    if (payload.ok) setCandidates(payload.data)
  }

  useEffect(() => {
    loadLinks()
    loadCandidates()
  }, [])

  async function generateCandidates() {
    setIsBusy(true)
    setMessage(null)
    try {
      const response = await fetch("/api/historical-intelligence/accepted-event-links/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewItemId: reviewItemId.trim() }),
      })
      const payload = (await response.json()) as CandidateGenerationResponse
      if (!response.ok || !payload.ok) {
        setMessage("error" in payload ? payload.error : "Candidate generation failed")
        return
      }
      setCandidates(payload.data.candidates.filter((candidate) => candidate.status === "pending"))
      setMessage(payload.data.summary.warning ?? `Generated ${payload.data.candidates.length} candidate(s)`)
      await loadLinks()
    } catch {
      setMessage("Candidate generation request failed")
    } finally {
      setIsBusy(false)
    }
  }

  async function decide(candidateId: string, action: "accept" | "reject") {
    setIsBusy(true)
    setMessage(null)
    try {
      const response = await fetch("/api/historical-intelligence/accepted-event-links/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, action }),
      })
      const payload = (await response.json()) as CandidateGenerationResponse
      if (!response.ok || !payload.ok) {
        setMessage("error" in payload ? payload.error : "Link decision failed")
        return
      }
      setMessage(`${action} ${candidateId}`)
      if (action === "accept") onLinkAccepted?.()
      await loadCandidates()
      await loadLinks()
    } catch {
      setMessage("Link decision request failed")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <Link2 className="h-3.5 w-3.5" />
          Accepted Event Linker
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{links.length} links</div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
        <input
          value={reviewItemId}
          onChange={(event) => setReviewItemId(event.target.value)}
          placeholder="Accepted review item id"
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
        />
        <button
          type="button"
          onClick={generateCandidates}
          disabled={isBusy || !reviewItemId.trim()}
          className="h-9 rounded-lg border border-cyan-300/30 bg-cyan-400/15 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Link
        </button>
      </div>

      {message ? (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-black/45 p-3 text-xs leading-5 text-zinc-300">
          {message}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Candidates</div>
            <div className="mt-1 text-sm font-black text-cyan-100">{candidates.length}</div>
          </div>
          <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Accepted</div>
            <div className="mt-1 text-sm font-black text-cyan-100">{links.length}</div>
          </div>
        </div>

        {candidates.map((candidate) => (
          <article key={candidate.candidateId} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-white">{candidate.targetTitle}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  {candidate.targetType} / {candidate.relationship}
                </div>
              </div>
              <div className="shrink-0 text-xs font-black text-cyan-100">{candidate.confidence}%</div>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-zinc-400">{candidate.rationale}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => decide(candidate.candidateId, "accept")}
                disabled={isBusy}
                className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => decide(candidate.candidateId, "reject")}
                disabled={isBusy}
                className="rounded-md border border-rose-300/20 bg-rose-400/10 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-rose-100 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </article>
        ))}

        {links.slice(0, 3).map((link) => (
          <article key={link.id} className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
            <div className="truncate text-xs font-black text-emerald-50">{link.targetTitle}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/70">
              {link.targetType} / {link.relationship} / {link.confidence}%
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
