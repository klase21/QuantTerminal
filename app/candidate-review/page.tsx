import Link from "next/link"
import { notFound } from "next/navigation"

import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

const replay = [
  ["BTCUSDT", "mvpv_8105e949ab2a6f0b619375fbb16fef73a0d875cedb279af57fe7afe974a067ba"],
  ["ETHUSDT", "mvpv_090b3381299ac7a317bd432c08a08c0956d891949df9417f2b7db61682c611d9"],
  ["SOLUSDT", "mvpv_ac37f0a16aca8d4095e6ab8974c3e9519ed6bcc82751df61212707e462c47124"],
  ["BNBUSDT", "mvpv_b6089b2dcaff6ddabd15ea0725149239ffa17244a226305ae2038cfec7dbbd68"],
  ["XRPUSDT", "mvpv_911d9562a8b7d549e592ab9dcfb8ebe31e30599e6f5e62e54dea20a49dd8cb02"],
  ["DOGEUSDT", "mvpv_52a13aa81e4881398d74fc4fa14374dff82e7a9487fd0c3c9867ec2cc2edc57b"],
] as const

const start = "2026-07-15T00:00:00.000Z"
const end = "2026-07-16T00:00:00.000Z"
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
              {replay.map(([instrument]) => <Link className={linkClass} href={`/trade?instrument=${instrument}`} key={instrument}>{instrument}</Link>)}
            </div>
          </section>
          <section aria-labelledby="replay-review-links">
            <h2 id="replay-review-links" className="mb-3 text-sm font-bold uppercase text-zinc-400">Replay · supported window</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {replay.map(([instrument, projection]) => {
                const query = new URLSearchParams({ instrument, start, end, projection, timestamp: start })
                return <Link className={linkClass} href={`/replay?${query.toString()}`} key={instrument}>{instrument} · 2026-07-15 UTC</Link>
              })}
            </div>
          </section>
        </div>
      </main>
    </TerminalAppShell>
  )
}
