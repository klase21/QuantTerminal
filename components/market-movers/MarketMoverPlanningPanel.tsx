"use client"

import type React from "react"
import { useState } from "react"
import { Activity, AlertTriangle, CheckCircle2, Copy, Crosshair, Gauge, Loader2, Shield, Target, XCircle } from "lucide-react"

import { formatSetupAge, useActiveSetupMemory, type ActiveSetupMemoryItem } from "@/hooks/market-movers/useActiveSetupMemory"
import { useMarketMovers } from "@/hooks/market-movers/useMarketMovers"
import PairFocusControls from "@/components/market-movers/PairFocusControls"
import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"
import type { MarketMoverCandidate } from "@/lib/market-movers/types"
import { exportSetupSnapshotPng } from "@/lib/share/exportSetupSnapshot"
import { resolveSnapshotCandles } from "@/lib/share/resolveSnapshotCandles"

function outcomeClass(outcome: ActiveSetupMemoryItem["outcome"]) {
  if (outcome === "TP2_HIT" || outcome === "TP1_HIT") return "text-emerald-200"
  if (outcome === "STOPPED" || outcome === "EXPIRED") return "text-red-200"
  return "text-zinc-400"
}

function signedPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function compactBiasLabel(value: unknown) {
  return typeof value === "string" ? value.replace(" BIAS", "") : "NEUTRAL"
}

function formatOutcomeLabel(value: unknown) {
  return typeof value === "string" ? value.replace(/_/g, " ") : "OPEN"
}

function formatCapTier(value: unknown) {
  return typeof value === "string" ? value.replace(/_/g, " ") : "UNKNOWN"
}

function biasDotClass(direction: MarketMoverCandidate["direction"]) {
  if (direction === "LONG") return "bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,.75)]"
  if (direction === "SHORT") return "bg-red-300 shadow-[0_0_10px_rgba(239,68,68,.75)]"
  return "bg-zinc-400"
}

function biasBadgeClass(direction: MarketMoverCandidate["direction"]) {
  if (direction === "LONG") return "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
  if (direction === "SHORT") return "border-red-300/40 bg-red-400/10 text-red-100"
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}


function freshnessClass(freshness: MarketMoverCandidate["freshness"] | ActiveSetupMemoryItem["freshness"] | undefined) {
  if (freshness === "FRESH") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
  if (freshness === "DEVELOPING") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
  if (freshness === "MATURE") return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
  if (freshness === "LATE") return "border-red-300/30 bg-red-400/10 text-red-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-400"
}

function gradeClass(grade: MarketMoverCandidate["grade"] | undefined) {
  if (grade === "A") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
  if (grade === "B") return "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
  return "border-zinc-800 bg-black/40 text-zinc-300"
}

function planQualityClass(planQuality: MarketMoverCandidate["planQuality"] | undefined) {
  if (planQuality === "BALANCED") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
  if (planQuality === "SL_TOO_TIGHT" || planQuality === "POOR_RR") return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
  if (planQuality === "WIDE_RISK" || planQuality === "NO_TRADE") return "border-red-300/25 bg-red-400/10 text-red-100"
  return "border-zinc-800 bg-black/40 text-zinc-300"
}

function formatPlanQuality(value: MarketMoverCandidate["planQuality"] | undefined) {
  if (!value) return "PLAN"
  return value.replace(/_/g, " ")
}

function regimeClass(regime: MarketMoverCandidate["marketRegime"] | undefined) {
  if (regime === "TRENDING" || regime === "BREAKOUT") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
  if (regime === "HIGH_VOL") return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
  if (regime === "EXHAUSTED") return "border-red-300/25 bg-red-400/10 text-red-100"
  return "border-zinc-800 bg-black/40 text-zinc-300"
}

function scoreItemClass(polarity: MarketMoverCandidate["scoreBreakdown"][number]["polarity"]) {
  if (polarity === "positive") return "text-emerald-200"
  if (polarity === "negative") return "text-red-200"
  return "text-zinc-400"
}

function lifecycleClass(lifecycle: ActiveSetupMemoryItem["lifecycle"]) {
  if (lifecycle === "COMPLETED") return "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
  if (lifecycle === "STRENGTHENING") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
  if (lifecycle === "WEAKENING") return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
  if (lifecycle === "INVALIDATED") return "border-red-300/30 bg-red-400/10 text-red-100"
  if (lifecycle === "NEW") return "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

export default function MarketMoverPlanningPanel() {
  const activeSymbol = useFocusRoutingStore((state) => state.activeSymbol)
  const { data, loading } = useMarketMovers(true, activeSymbol)
  const candidates = data?.candidates ?? []
  const activeSetups = useActiveSetupMemory(candidates)
  const suppressed = data?.suppressed ?? []
  const focusCandidate = data?.focusCandidate ?? null
  const focusSymbols = [
    focusCandidate?.symbol,
    ...candidates.map((item) => item.symbol),
    ...activeSetups.slice(0, 4).map((item) => item.symbol),
  ].filter((symbol): symbol is string => Boolean(symbol))
  const recentOutcomes = activeSetups.filter((item) => item.outcome !== "OPEN").slice(0, 6)
  const recentWinners = recentOutcomes.filter((item) => item.outcome === "TP1_HIT" || item.outcome === "TP2_HIT").slice(0, 4)
  const recentFailures = recentOutcomes.filter((item) => item.outcome === "STOPPED" || item.outcome === "EXPIRED").slice(0, 4)

  return (
    <section className="rounded-3xl border border-zinc-900 bg-black/60 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Market Discovery</div>
          <h3 className="mt-1 text-lg font-black text-white">Trade planning candidates</h3>
          <p className="mt-1 max-w-2xl text-xs text-zinc-500">
            Quality-first scanner: liquid participation is preferred, late/chase moves are suppressed, and Advanced mode shows the actual trade framework.
          </p>
        </div>
        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-zinc-500">
          {loading ? "Scanning" : `${data?.summary.scanned ?? 0} scanned`}
        </div>
      </div>

      <div className="mb-3">
        <PairFocusControls symbols={focusSymbols} />
      </div>

      {focusCandidate ? (
        <div className="mb-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.06] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Focused Pair Plan</div>
              <div className="mt-1 text-sm font-black text-white">{focusCandidate.symbol} · {focusCandidate.setup}</div>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${biasBadgeClass(focusCandidate.direction)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${biasDotClass(focusCandidate.direction)}`} />
              {focusCandidate.bias}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${gradeClass(focusCandidate.grade)}`}>GRADE {focusCandidate.grade}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${planQualityClass(focusCandidate.planQuality)}`}>{formatPlanQuality(focusCandidate.planQuality)}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${freshnessClass(focusCandidate.freshness)}`}>{focusCandidate.freshness}</span>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            <PlanRow icon={<Crosshair size={12} />} label="Entry" value={focusCandidate.entryZone} />
            <PlanRow icon={<AlertTriangle size={12} />} label="SL" value={focusCandidate.stopLoss} danger />
            <PlanRow icon={<Target size={12} />} label="TP1 / TP2" value={`${focusCandidate.takeProfit1} / ${focusCandidate.takeProfit2}`} />
            <PlanRow icon={<Activity size={12} />} label="Regime" value={`${focusCandidate.marketRegime} · ${focusCandidate.regimeNote}`} />
            <PlanRow icon={<Gauge size={12} />} label="Position" value={focusCandidate.maxLossPlan} />
            <PlanRow icon={<Gauge size={12} />} label="Sizing" value={focusCandidate.sizePlan} />
          </div>
          <div className="mt-2 truncate text-[10px] font-bold uppercase tracking-wide text-zinc-500" title={focusCandidate.volatilityNote}>Plan quality: {focusCandidate.riskReward} · {focusCandidate.volatilityNote}</div>
          <div className="mt-2 text-xs text-zinc-500">{focusCandidate.suppressedReason ? `Not actionable yet: ${focusCandidate.suppressedReason}` : focusCandidate.qualityReason}</div>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-sm text-zinc-400">
          <Loader2 size={15} className="animate-spin" /> Loading market movers...
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-3">
        {candidates.length ? candidates.map((candidate) => <PlanningCard key={candidate.symbol} candidate={candidate} />) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 text-sm text-zinc-400 xl:col-span-3">
            No tradable mover passed the filter yet. Market may be active, but the scanner is not seeing clean execution conditions.
          </div>
        )}
      </div>

      {(recentWinners.length || recentFailures.length) ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <section className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200"><CheckCircle2 size={14} /> Recent winners</div>
            {recentWinners.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {recentWinners.map((item) => (
                  <ResultTile key={`${item.symbol}-${item.firstSeenAt}-winner`} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500">No TP outcomes tracked yet.</div>
            )}
          </section>
          <section className="rounded-2xl border border-red-300/15 bg-red-400/[0.035] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-200"><XCircle size={14} /> Recent failures</div>
            {recentFailures.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {recentFailures.map((item) => (
                  <ResultTile key={`${item.symbol}-${item.firstSeenAt}-failure`} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500">No stopped/expired setups tracked yet.</div>
            )}
          </section>
        </div>
      ) : null}

      {activeSetups.length ? (
        <details open className="group mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/50">
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-black text-zinc-300">
            <span>Active setup memory</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 group-open:text-cyan-300">{activeSetups.length} tracked</span>
          </summary>
          <div className="grid gap-2 border-t border-zinc-900 p-3 md:grid-cols-2 xl:grid-cols-4">
            {activeSetups.map((item) => (
              <div key={`${item.symbol}-${item.firstSeenAt}`} className="rounded-xl border border-zinc-900 bg-black/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${biasDotClass(item.direction)}`} />
                    <div className="truncate text-xs font-black text-white">{item.symbol}</div>
                  </div>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${lifecycleClass(item.lifecycle)}`}>{item.lifecycle}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                  <span>{compactBiasLabel(item.bias)}</span>
                  <span>active {formatSetupAge(item.firstSeenAt)}</span>
                </div>
                <div className={`mt-1 line-clamp-1 text-[10px] font-bold ${outcomeClass(item.outcome)}`}>{item.resultText}</div>
                <div className="mt-1 line-clamp-1 text-[10px] text-zinc-500">Entry: {item.entryZone}</div>
                <div className="mt-1 line-clamp-1 text-[10px] text-red-100">SL: {item.stopLoss}</div>
              </div>
            ))}
          </div>
        </details>
      ) : null}


      {recentOutcomes.length ? (
        <details open className="group mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/50">
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-black text-zinc-300">
            <span>Recent outcomes</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 group-open:text-cyan-300">TP / SL tracking</span>
          </summary>
          <div className="grid gap-2 border-t border-zinc-900 p-3 md:grid-cols-2 xl:grid-cols-3">
            {recentOutcomes.map((item) => (
              <div key={`${item.symbol}-${item.firstSeenAt}-outcome`} className="rounded-xl border border-zinc-900 bg-black/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${biasDotClass(item.direction)}`} />
                    <div className="truncate text-xs font-black text-white">{item.symbol}</div>
                  </div>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${lifecycleClass(item.lifecycle)}`}>{formatOutcomeLabel(item.outcome)}</span>
                </div>
                <div className={`mt-1 text-[11px] font-black ${outcomeClass(item.outcome)}`}>{item.resultText}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                  <span>{compactBiasLabel(item.bias)}</span>
                  <span>duration {formatSetupAge(item.firstSeenAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {suppressed.length ? (
        <details className="group mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/50">
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-black text-zinc-300">
            <span>Suppressed movers</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 group-open:text-cyan-300">Open</span>
          </summary>
          <div className="grid gap-2 border-t border-zinc-900 p-3 md:grid-cols-2 xl:grid-cols-4">
            {suppressed.slice(0, 8).map((item) => (
              <div key={item.symbol} className="rounded-xl border border-zinc-900 bg-black/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-white">{item.symbol}</div>
                  <div className="text-[10px] font-black text-zinc-400">{signedPct(item.priceChangePercent)}</div>
                </div>
                <div className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{item.suppressedReason || "Not clean enough for execution."}</div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}

function PlanningCard({ candidate }: { candidate: MarketMoverCandidate }) {
  const [shareStatus, setShareStatus] = useState<"idle" | "busy" | "done" | "error">("idle")
  const [shareMessage, setShareMessage] = useState<string | null>(null)

  const downloadSnapshot = async () => {
    if (shareStatus === "busy") return
    setShareStatus("busy")
    setShareMessage("Loading chart candles...")
    try {
      const candles = await resolveSnapshotCandles(candidate.symbol, "15m", 180)
      if (!candles.length) {
        setShareStatus("error")
        setShareMessage("No candle data for PNG")
        return
      }

      setShareMessage("Creating PNG...")
      const result = await exportSetupSnapshotPng({
        symbol: candidate.symbol,
        timeframe: "15m",
        candles,
        candidate,
      })
      if (!result.ok) {
        setShareStatus("error")
        setShareMessage(result.reason || "PNG export failed")
      } else {
        setShareStatus("done")
        setShareMessage(`Downloaded ${result.filename}`)
      }
    } catch (error) {
      setShareStatus("error")
      setShareMessage(error instanceof Error ? error.message : "PNG export failed")
    } finally {
      window.setTimeout(() => {
        setShareStatus("idle")
        setShareMessage(null)
      }, 3200)
    }
  }

  return (
    <article className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-100">{candidate.action}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${gradeClass(candidate.grade)}`}>GRADE {candidate.grade}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${planQualityClass(candidate.planQuality)}`}>{formatPlanQuality(candidate.planQuality)}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${biasBadgeClass(candidate.direction)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${biasDotClass(candidate.direction)}`} />
              {candidate.bias}
            </span>
            <span className="rounded-full border border-zinc-800 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-400">{formatCapTier(candidate.capTier)}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${freshnessClass(candidate.freshness)}`}>{candidate.freshness}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${regimeClass(candidate.marketRegime)}`}>{candidate.marketRegime}</span>
          </div>
          <div className="mt-1 text-sm font-black text-white">{candidate.symbol}</div>
          <div className="mt-0.5 text-xs text-zinc-400">{candidate.setup} · {candidate.qualityReason}</div>
          <div className="mt-1 line-clamp-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500" title={candidate.trustSummary}>Trust: {candidate.trustSummary}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black text-cyan-300">{candidate.tradeabilityScore}</div>
          <div className="text-[10px] text-zinc-500">quality</div>
          <button
            onClick={downloadSnapshot}
            disabled={shareStatus === "busy"}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-black/40 px-2 py-1 text-[10px] font-black uppercase text-zinc-400 hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-wait disabled:opacity-60"
          >
            <Copy size={11} /> {shareStatus === "busy" ? "Exporting" : shareStatus === "done" ? "Downloaded" : "PNG"}
          </button>
          {shareMessage ? <div className="mt-1 max-w-[150px] truncate text-[9px] font-bold text-cyan-200" title={shareMessage}>{shareMessage}</div> : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <Metric icon={<Target size={11} />} label="Move" value={signedPct(candidate.priceChangePercent)} />
        <Metric icon={<Gauge size={11} />} label="Liq" value={`${candidate.liquidityRank}`} />
        <Metric icon={<Shield size={11} />} label="R:R" value={candidate.riskReward} />
        <Metric icon={<Gauge size={11} />} label="Size" value={`${candidate.suggestedPositionPct}%`} />
      </div>

      {candidate.scoreBreakdown?.length ? (
        <div className="mt-3 rounded-xl border border-zinc-900 bg-black/30 p-2">
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">Score breakdown</div>
          <div className="grid gap-1 sm:grid-cols-2">
            {candidate.scoreBreakdown.slice(0, 6).map((item) => (
              <div key={`${candidate.symbol}-${item.label}`} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate text-zinc-500">{item.label}</span>
                <span className={`font-black ${scoreItemClass(item.polarity)}`}>{item.value > 0 ? `+${item.value}` : item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2 text-xs">
        <PlanRow icon={<Crosshair size={12} />} label="Entry" value={candidate.entryZone} />
        <PlanRow icon={<AlertTriangle size={12} />} label="SL" value={candidate.stopLoss} danger />
        <PlanRow icon={<Target size={12} />} label="TP1 / TP2" value={`${candidate.takeProfit1} / ${candidate.takeProfit2}`} />
        <PlanRow icon={<Activity size={12} />} label="Regime" value={`${candidate.marketRegime} · ${candidate.regimeNote}`} />
        <PlanRow icon={<Gauge size={12} />} label="Position" value={candidate.maxLossPlan} />
        <PlanRow icon={<Gauge size={12} />} label="Sizing" value={candidate.sizePlan} />
        <PlanRow icon={<Gauge size={12} />} label="Pullback" value={candidate.pullbackGuide} />
        <PlanRow icon={<Shield size={12} />} label="Plan Quality" value={`${formatPlanQuality(candidate.planQuality)} · ${candidate.volatilityNote}`} />
      </div>
    </article>
  )
}

function ResultTile({ item }: { item: ActiveSetupMemoryItem }) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-black/35 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${biasDotClass(item.direction)}`} />
          <span className="truncate text-xs font-black text-white">{item.symbol}</span>
        </div>
        <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${lifecycleClass(item.lifecycle)}`}>{formatOutcomeLabel(item.outcome)}</span>
      </div>
      <div className={`mt-1 text-[11px] font-black ${outcomeClass(item.outcome)}`}>{item.resultText}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>{compactBiasLabel(item.bias)}</span>
        <span>{formatSetupAge(item.firstSeenAt)}</span>
      </div>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/35 px-2 py-1.5">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wide text-zinc-600">{icon}{label}</div>
      <div className="truncate text-xs font-black text-white">{value}</div>
    </div>
  )
}

function PlanRow({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex gap-2 rounded-xl border border-zinc-900 bg-black/35 p-2">
      <div className={danger ? "mt-0.5 text-red-300" : "mt-0.5 text-cyan-300"}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">{label}</div>
        <div className={danger ? "mt-0.5 text-red-100" : "mt-0.5 text-zinc-300"}>{value}</div>
      </div>
    </div>
  )
}
