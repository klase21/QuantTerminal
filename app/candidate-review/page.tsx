import Link from "next/link"
import { notFound } from "next/navigation"

import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"
import {
  MVP8Z2_CANDIDATE_REPLAY_REVIEWS,
  MVP8Z2_CANDIDATE_REVIEW_END,
  MVP8Z2_CANDIDATE_REVIEW_START,
  mvp8z2CandidateReplayHref,
} from "@/lib/data-platform/mvp-serving/candidateReview"

const linkClass = "border border-[#213021] bg-[#09120a] px-3 py-2 text-sm font-semibold text-cyan-300 hover:border-cyan-400"

export default function CandidateReviewPage() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.MVP_SERVING_PREVIEW_CANDIDATE_MODE !== "EXPLICIT_CANDIDATE_DB_REVIEW") notFound()
  return (
    <TerminalAppShell>
      <main className="min-h-screen bg-black px-4 py-6 text-white">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="border-b border-[#213021] pb-4">
            <h1 className="text-2xl font-semibold">Cutover Candidate Review</h1>
            <p className="mt-2 text-sm text-zinc-400">Latest application code reading the isolated 2026-07-16 candidate through mvp_serving_reader.</p>
          </header>
          <section aria-labelledby="core-review-links">
            <h2 id="core-review-links" className="mb-3 text-sm font-bold uppercase text-zinc-400">Core review</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Link className={linkClass} href="/api/health/mvp-serving">Serving health</Link>
              <Link className={linkClass} href="/dashboard">Dashboard</Link>
              <Link className={linkClass} href="/scanner">Scanner</Link>
              <Link className={linkClass} href="/trade?instrument=BTCUSDT">Trade</Link>
            </div>
          </section>
          <section aria-labelledby="trade-review-links">
            <h2 id="trade-review-links" className="mb-3 text-sm font-bold uppercase text-zinc-400">Trade · six symbols</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MVP8Z2_CANDIDATE_REPLAY_REVIEWS.map(({ instrument }) => {
                const query = new URLSearchParams({ instrument, start: MVP8Z2_CANDIDATE_REVIEW_START, end: MVP8Z2_CANDIDATE_REVIEW_END })
                return <Link className={linkClass} href={`/trade?${query.toString()}`} key={instrument}>{instrument}</Link>
              })}
            </div>
          </section>
          <section aria-labelledby="replay-review-links">
            <h2 id="replay-review-links" className="mb-3 text-sm font-bold uppercase text-zinc-400">Replay · supported window</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MVP8Z2_CANDIDATE_REPLAY_REVIEWS.map(({ instrument }) => <Link className={linkClass} href={mvp8z2CandidateReplayHref(instrument)} key={instrument}>{instrument} · 2026-07-15 UTC</Link>)}
            </div>
          </section>
        </div>
      </main>
    </TerminalAppShell>
  )
}
