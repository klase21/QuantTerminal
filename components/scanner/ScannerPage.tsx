"use client"

import { useMemo } from "react"
import { Activity, Radar, Signal, Zap } from "lucide-react"

import { useActiveSetupMemory } from "@/hooks/market-movers/useActiveSetupMemory"
import { useMarketMovers } from "@/hooks/market-movers/useMarketMovers"
import { useSafePolling } from "@/hooks/system/useSafePolling"
import type { MarketMoverCandidate } from "@/lib/market-movers/types"

type Opportunity = {
  symbol: string
  score: number
  setup: string
  direction: string
  confidence: string
  historicalSupport: number | null
  priority: string
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

function setupLabel(value?: string | null) {
  const text = value ?? "Live Market Signal"
  if (/breakout/i.test(text)) return "Breakout"
  if (/pullback|retest/i.test(text)) return "Retest"
  if (/liquid|large-cap/i.test(text)) return "Liquidity Watch"
  if (/support/i.test(text)) return "Support Holding"
  if (/range|mean/i.test(text)) return "Range Trade"
  return text.replaceAll("_", " ")
}

function categoryFor(candidate: Pick<MarketMoverCandidate, "setup" | "trigger" | "reason">) {
  const text = `${candidate.setup ?? ""} ${candidate.trigger ?? ""} ${candidate.reason ?? ""}`.toLowerCase()
  if (text.includes("breakout")) return "Breakout"
  if (text.includes("pullback") || text.includes("retest")) return "Retest"
  if (text.includes("liquid")) return "Liquidity Watch"
  if (text.includes("support")) return "Support Holding"
  if (text.includes("range") || text.includes("mean")) return "Range Trade"
  return "Market Activity"
}

function confidence(candidate: MarketMoverCandidate) {
  if (Number.isFinite(candidate.score) && candidate.score < 97) return String(Math.round(candidate.score))
  return candidate.confidence
}

function quality(candidate: MarketMoverCandidate) {
  return [
    candidate.grade ? `Grade ${candidate.grade}` : null,
    Number.isFinite(candidate.tradeabilityScore) ? `${Math.round(candidate.tradeabilityScore)} Quality` : null,
    candidate.riskReward ? `RR ${candidate.riskReward.replace(/^TP1\s*/i, "").replace(/\s*\/\s*TP2\s*/i, " / ")}` : null,
    candidate.qualityState?.replaceAll("_", " "),
  ].filter((item): item is string => Boolean(item)).slice(0, 4)
}

function OpportunityRow({ item }: { item: Opportunity }) {
  return (
    <div className="grid gap-2 rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] md:grid-cols-[1fr_120px_100px_100px]">
      <div>
        <div className="text-sm text-white">{item.symbol}</div>
        <div className="mt-1 text-cyan-100">{setupLabel(item.setup)}</div>
      </div>
      <div>
        <div className="text-zinc-600">Priority</div>
        <div className="text-amber-100">{item.priority}</div>
      </div>
      <div>
        <div className="text-zinc-600">Score</div>
        <div className="text-emerald-100">{item.score}</div>
      </div>
      <div>
        <div className="text-zinc-600">Direction</div>
        <div className="text-zinc-300">{item.direction}</div>
      </div>
    </div>
  )
}

export default function ScannerPage() {
  const moverState = useMarketMovers(true)
  const movers = moverState.data
  const candidates = useMemo(() => (movers?.candidates ?? []).slice(0, 25), [movers])
  const activeSetups = useActiveSetupMemory(candidates)
  const opportunitiesState = useSafePolling<Opportunity[]>("/api/scanner/opportunities", 45000, {
    timeoutMs: 9000,
    retries: 1,
    label: "scanner-opportunities",
    enabled: true,
  })
  const opportunities = opportunitiesState.data ?? []
  const categories = ["Breakout", "Retest", "Liquidity Watch", "Support Holding", "Market Activity", "Range Trade"]
  const byCategory = categories.map((category) => ({
    category,
    items: candidates.filter((candidate) => categoryFor(candidate) === category).slice(0, 4),
  }))
  const highestConfidence = [...opportunities].sort((left, right) => right.score - left.score).slice(0, 6)

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Top Opportunities" icon={<Radar className="h-3.5 w-3.5" />}>
          {opportunities.length ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {opportunities.slice(0, 10).map((item) => <OpportunityRow key={`${item.symbol}-${item.setup}-${item.score}`} item={item} />)}
            </div>
          ) : (
            <EmptyState title="Unavailable" reason={opportunitiesState.error ?? "No ranked opportunities returned by scanner API."} />
          )}
        </Card>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card title="Opportunity Categories" icon={<Signal className="h-3.5 w-3.5" />}>
            <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
              {byCategory.map((group) => (
                <div key={group.category} className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">{group.category}</div>
                  <div className="mt-2 grid gap-1">
                    {group.items.length ? group.items.map((item) => (
                      <div key={`${group.category}-${item.symbol}-${item.score}`} className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                        <span className="text-white">{item.symbol}</span>
                        <span className="text-zinc-500">{confidence(item)}</span>
                      </div>
                    )) : <div className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-600">Unavailable</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Highest Confidence" icon={<Zap className="h-3.5 w-3.5" />}>
            <div className="grid gap-2">
              {highestConfidence.length ? highestConfidence.map((item) => (
                <div key={`high-${item.symbol}-${item.setup}`} className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-black text-white">{item.symbol}</div>
                    <div className="text-lg font-black text-emerald-100">{item.score}</div>
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">{setupLabel(item.setup)}</div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{item.priority} / {item.confidence}</div>
                </div>
              )) : <EmptyState title="Unavailable" reason="No confidence-ranked opportunities available." />}
            </div>
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card title="Tracked Opportunities" icon={<Activity className="h-3.5 w-3.5" />}>
            {activeSetups.length ? (
              <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-5">
                {activeSetups.slice(0, 15).map((setup) => (
                  <div key={`${setup.symbol}-${setup.firstSeenAt}`} className="rounded border border-zinc-900 bg-black/45 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-white">{setup.symbol}</div>
                      <div className="text-[8px] font-black uppercase tracking-[0.1em] text-amber-100">{setup.lifecycle}</div>
                    </div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">{setupLabel(setup.setup)}</div>
                    <div className="mt-1 flex justify-between text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">
                      <span>{confidence(setup)}</span>
                      <span>{setup.outcome}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Unavailable" reason="No active setup memory records yet." />
            )}
          </Card>

          <Card title="Market Breadth" icon={<Activity className="h-3.5 w-3.5" />}>
            {movers?.summary ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Scanned</div>
                  <div className="mt-1 text-lg font-black text-white">{movers.summary.scanned}</div>
                </div>
                <div className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Tradable</div>
                  <div className="mt-1 text-lg font-black text-emerald-100">{movers.summary.tradable}</div>
                </div>
                <div className="col-span-2 rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                  Attention: {movers.summary.attention}
                </div>
              </div>
            ) : (
              <EmptyState title="Unavailable" reason={moverState.error ?? "Market movers summary unavailable."} />
            )}
          </Card>
        </div>
      </div>
    </main>
  )
}
