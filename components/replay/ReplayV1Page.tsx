"use client"

import { GitCompare, History, Layers, ListChecks, Target } from "lucide-react"

import { useSafePolling } from "@/hooks/system/useSafePolling"

type HistoricalAnalogsResponse = {
  status?: string
  reason?: string
  totalCandidates?: number
  analogs?: Array<{
    symbol: string
    date: string
    daysAgo: number
    matchedContexts: string[]
    avgReturn7d: number | null
    avgReturn30d: number | null
    successRate: number | null
    dominantOutcome: string | null
  }>
}

type MarketMemoryResponse = {
  status?: string
  reason?: string
  setups?: Array<{ date: string; title: string; category: string; matchedContext: string[]; outcome: string }>
  currentState?: {
    direction?: string
    drivers?: string[]
    narratives?: string[]
    liquidityState?: string
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function Card({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-zinc-900 bg-zinc-950/80 p-3", className)}>
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded border border-zinc-900 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
      <span className="text-zinc-300">{title}</span>
      <span className="ml-2 text-zinc-600">Reason: {reason}</span>
    </div>
  )
}

function pct(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}%`
}

function titleCase(value?: string | null) {
  if (!value) return "NO DATA"
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function ReplayV1Page() {
  const analogs = useSafePolling<HistoricalAnalogsResponse>("/api/research/historical-analogs?symbol=BTCUSDT&interval=1h&limit=20", 60000, { label: "replay-analogs", timeoutMs: 12000, retries: 1 })
  const memory = useSafePolling<MarketMemoryResponse>("/api/dashboard/market-memory?symbol=BTCUSDT&interval=1h", 60000, { label: "replay-memory", timeoutMs: 12000, retries: 1 })
  const rows = analogs.data?.analogs ?? []
  const caseA = rows[0]
  const caseB = rows[1]
  const environment = memory.data?.currentState

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Historical Cases" icon={<History className="h-3.5 w-3.5" />}>
          {rows.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              {rows.slice(0, 10).map((item) => (
                <div key={`${item.symbol}-${item.date}`} className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-black text-white">{item.symbol}</div>
                    <div className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{item.date}</div>
                  </div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">{item.matchedContexts.slice(0, 3).join(" / ") || "NO CONTEXT"}</div>
                  <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className="text-cyan-100">7D {pct(item.avgReturn7d)}</span>
                    <span className="text-amber-100">{titleCase(item.dominantOutcome)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState title="Unavailable" reason={analogs.data?.reason ?? analogs.error ?? "No verified historical cases available."} />}
        </Card>

        <div className="grid gap-3 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card title="Market Environment" icon={<Layers className="h-3.5 w-3.5" />}>
            {environment ? (
              <div className="grid gap-2">
                <div className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Direction</div>
                  <div className="mt-1 text-lg font-black uppercase text-white">{titleCase(environment.direction)}</div>
                </div>
                <div className="rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                  Drivers: {(environment.drivers ?? []).slice(0, 4).map(titleCase).join(" / ") || "NO DATA"}
                </div>
                <div className="rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                  Narratives: {(environment.narratives ?? []).slice(0, 4).map(titleCase).join(" / ") || "NO DATA"}
                </div>
                <div className="rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                  Liquidity: {titleCase(environment.liquidityState)}
                </div>
              </div>
            ) : <EmptyState title="Unavailable" reason={memory.data?.reason ?? memory.error ?? "No current market environment available."} />}
          </Card>

          <Card title="Outcome Review" icon={<Target className="h-3.5 w-3.5" />}>
            {rows.length ? (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {rows.slice(0, 8).map((item) => (
                  <div key={`outcome-${item.symbol}-${item.date}`} className="rounded border border-zinc-900 bg-black/45 p-2">
                    <div className="text-sm font-black text-white">{item.symbol}</div>
                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{item.date}</div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-black uppercase tracking-[0.1em]">
                      <span className="text-cyan-100">7D {pct(item.avgReturn7d)}</span>
                      <span className="text-cyan-100">30D {pct(item.avgReturn30d)}</span>
                      <span className="text-emerald-100">{item.successRate === null ? "NO RATE" : `${Math.round(item.successRate)}%`}</span>
                      <span className="text-amber-100">{titleCase(item.dominantOutcome)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason="No outcome rows available from historical analog explorer." />}
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card title="Case Comparison" icon={<GitCompare className="h-3.5 w-3.5" />}>
            {caseA && caseB ? (
              <div className="grid gap-2 md:grid-cols-2">
                {[caseA, caseB].map((item, index) => (
                  <div key={`compare-${item.symbol}-${item.date}`} className="rounded border border-zinc-900 bg-black/45 p-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Case {index === 0 ? "A" : "B"}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-black text-white">{item.symbol}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">{item.date}</span>
                    </div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">{item.matchedContexts.slice(0, 3).join(" / ") || "NO CONTEXT"}</div>
                    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">Outcome: {titleCase(item.dominantOutcome)}</div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason="At least two verified historical cases are required." />}
          </Card>

          <Card title="Lessons" icon={<ListChecks className="h-3.5 w-3.5" />}>
            {memory.data?.setups?.length ? (
              <div className="grid gap-1.5">
                {memory.data.setups.slice(0, 5).map((setup) => (
                  <div key={`${setup.date}-${setup.title}`} className="rounded border border-zinc-900 bg-black/45 p-2">
                    <div className="text-xs font-black uppercase text-white">{setup.title}</div>
                    <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">{setup.date} / {setup.category}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">{setup.outcome}</div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Unavailable" reason={memory.data?.reason ?? "Stored market memory has no comparable cases yet."} />}
          </Card>
        </div>
      </div>
    </main>
  )
}
