"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
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

type ScannerCandidate = {
  symbol: string
  setup: string
  direction: string
  confidence: string
  grade: string
  quality: string
  rr: string
  status: string
  score: number
  reason?: string
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

function displayDirection(value?: string | null) {
  if (!value) return "Neutral"
  if (/long|bull|up/i.test(value)) return "Uptrend"
  if (/short|bear|down/i.test(value)) return "Downtrend"
  return "Neutral"
}

function moverToScannerCandidate(candidate: MarketMoverCandidate): ScannerCandidate {
  const qualityItems = quality(candidate)
  return {
    symbol: candidate.symbol,
    setup: setupLabel(candidate.setup),
    direction: displayDirection(candidate.direction),
    confidence: confidence(candidate),
    grade: candidate.grade ?? "NO DATA",
    quality: qualityItems.find((item) => item.includes("Quality")) ?? candidate.qualityState.replaceAll("_", " "),
    rr: candidate.riskReward?.replace(/^TP1\s*/i, "").replace(/\s*\/\s*TP2\s*/i, " / ") || "NO DATA",
    status: candidate.freshness ?? candidate.action ?? "WATCHLIST",
    score: Number.isFinite(candidate.score) ? candidate.score : 0,
    reason: candidate.reason,
  }
}

function opportunityToScannerCandidate(item: Opportunity): ScannerCandidate {
  return {
    symbol: item.symbol,
    setup: setupLabel(item.setup),
    direction: displayDirection(item.direction),
    confidence: item.confidence || String(item.score),
    grade: item.score >= 85 ? "A" : item.score >= 70 ? "B" : "C",
    quality: item.historicalSupport === null ? "NO HISTORY" : `${Math.round(item.historicalSupport)} History`,
    rr: "NO DATA",
    status: item.priority,
    score: item.score,
  }
}

function marketHref(item: ScannerCandidate) {
  const params = new URLSearchParams({
    symbol: item.symbol,
    source: "scanner",
    setup: item.setup,
    direction: item.direction,
    confidence: item.confidence,
  })
  if (item.reason) params.set("reason", item.reason)
  return `/markets?${params.toString()}`
}

function tradeHref(item: ScannerCandidate) {
  const params = new URLSearchParams({
    symbol: item.symbol,
    source: "scanner",
    setup: item.setup,
    direction: item.direction,
    confidence: item.confidence,
  })
  if (item.reason) params.set("reason", item.reason)
  return `/trade?${params.toString()}`
}

function OpportunityRow({ item }: { item: ScannerCandidate }) {
  return (
    <div className="grid gap-2 rounded border border-zinc-900 bg-black/45 p-2 text-[10px] font-black uppercase tracking-[0.1em] md:grid-cols-[1.2fr_0.8fr_80px_80px_80px_80px_110px_96px]">
      <div className="min-w-0">
        <div className="text-sm text-white">{item.symbol}</div>
        <div className="mt-1 truncate text-cyan-100">{item.setup}</div>
      </div>
      <div>
        <div className="text-zinc-600">Direction</div>
        <div className="text-zinc-300">{item.direction}</div>
      </div>
      <div>
        <div className="text-zinc-600">Conf</div>
        <div className="text-emerald-100">{item.confidence}</div>
      </div>
      <div>
        <div className="text-zinc-600">Grade</div>
        <div className="text-amber-100">{item.grade}</div>
      </div>
      <div>
        <div className="text-zinc-600">Quality</div>
        <div className="truncate text-zinc-300">{item.quality}</div>
      </div>
      <div>
        <div className="text-zinc-600">RR</div>
        <div className="truncate text-zinc-300">{item.rr}</div>
      </div>
      <Link
        href={marketHref(item)}
        className="flex items-center justify-center rounded border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-center text-[9px] text-cyan-100 transition hover:border-cyan-200/60"
      >
        Inspect Market
      </Link>
      <Link
        href={tradeHref(item)}
        className="flex items-center justify-center rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-center text-[9px] text-zinc-200 transition hover:border-zinc-500 hover:text-white"
      >
        Open Trade
      </Link>
      <div className="md:col-span-8 flex items-center justify-between gap-2 border-t border-zinc-900 pt-1">
        <span className="truncate text-zinc-500">{item.reason ?? item.status}</span>
        <span className="shrink-0 text-zinc-600">{item.status}</span>
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
  const scannerCandidates = useMemo(() => {
    const fromMovers = candidates.map(moverToScannerCandidate)
    if (fromMovers.length) return fromMovers
    return opportunities.map(opportunityToScannerCandidate)
  }, [candidates, opportunities])
  const categories = ["Breakout", "Retest", "Liquidity Watch", "Support Holding", "Market Activity", "Range Trade"]
  const byCategory = categories.map((category) => ({
    category,
    items: candidates.filter((candidate) => categoryFor(candidate) === category).slice(0, 4),
  }))
  const highestConfidence = [...scannerCandidates].sort((left, right) => right.score - left.score).slice(0, 5)
  const tradeableCount = movers?.summary?.tradable ?? scannerCandidates.filter((item) => item.status !== "NO_TRADE").length
  const highConfidenceCount = scannerCandidates.filter((item) => {
    const numeric = Number(item.confidence)
    return item.confidence === "HIGH" || (Number.isFinite(numeric) && numeric >= 75)
  }).length

  useEffect(() => {
    console.debug("Scanner candidate trace", {
      moverCandidates: candidates.length,
      scannerCandidates: scannerCandidates.length,
      opportunityFallback: opportunities.length,
    })
  }, [candidates.length, opportunities.length, scannerCandidates.length])

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1800px] gap-3">
        <Card title="Scanner Summary" icon={<Radar className="h-3.5 w-3.5" />}>
          <div className="grid gap-2 md:grid-cols-4">
            {[
              ["Scanned", movers?.summary?.scanned ?? (moverState.error ? "Unavailable" : scannerCandidates.length), moverState.error],
              ["Tradeable", tradeableCount || "Unavailable", scannerCandidates.length ? null : "No candidate list available"],
              ["High Confidence", highConfidenceCount || "Unavailable", scannerCandidates.length ? null : "No confidence-ranked candidates"],
              ["Active Setups", activeSetups.length || "Unavailable", activeSetups.length ? null : "No active setup memory records"],
            ].map(([label, value, reason]) => (
              <div key={label as string} className="rounded border border-zinc-900 bg-black/45 p-2">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
                <div className="mt-1 text-lg font-black uppercase text-white">{value}</div>
                {reason ? <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.1em] text-zinc-600">{reason}</div> : null}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card title="Top Opportunities" icon={<Radar className="h-3.5 w-3.5" />}>
            {scannerCandidates.length ? (
              <div className="grid gap-2">
                {scannerCandidates.slice(0, 10).map((item) => <OpportunityRow key={`${item.symbol}-${item.setup}-${item.score}`} item={item} />)}
              </div>
            ) : (
              <EmptyState title="Unavailable" reason={opportunitiesState.error ?? moverState.error ?? "No trade candidates returned by market movers or scanner API."} />
            )}
          </Card>

          <Card title="Highest Confidence" icon={<Zap className="h-3.5 w-3.5" />}>
            <div className="grid gap-1.5">
              {highestConfidence.length ? highestConfidence.map((item) => (
                <div key={`high-${item.symbol}-${item.setup}`} className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-black text-white">{item.symbol}</div>
                    <div className="text-lg font-black text-emerald-100">{item.confidence}</div>
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">{item.setup}</div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">{item.direction} / {item.status}</div>
                </div>
              )) : <EmptyState title="Unavailable" reason="No confidence-ranked opportunities available." />}
            </div>
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card title="Opportunity Categories" icon={<Signal className="h-3.5 w-3.5" />}>
            <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
              {byCategory.map((group) => (
                <div key={group.category} className="rounded border border-zinc-900 bg-black/45 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">{group.category}</div>
                    <div className="text-sm font-black text-white">{group.items.length}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className="text-zinc-500">Top</span>
                    <span className="text-white">{group.items[0]?.symbol ?? "Unavailable"}</span>
                    <span className="text-emerald-100">{group.items[0] ? confidence(group.items[0]) : "NO DATA"}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

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
