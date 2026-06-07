"use client"

import type React from "react"
import { Activity, AlertTriangle, CheckCircle2, Crosshair, Gauge, Loader2, Shield, Star, Target, XCircle } from "lucide-react"

import { formatSetupAge, useActiveSetupMemory, type ActiveSetupMemoryItem } from "@/hooks/market-movers/useActiveSetupMemory"
import { useMarketMovers } from "@/hooks/market-movers/useMarketMovers"
import PairFocusControls from "@/components/market-movers/PairFocusControls"
import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"
import type { MarketMoverCandidate } from "@/lib/market-movers/types"

function actionClass(action: MarketMoverCandidate["action"]) {
  if (action === "WATCH") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
  if (action === "AVOID") return "border-red-300/30 bg-red-400/10 text-red-100"
  return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
}

function biasClass(direction: MarketMoverCandidate["direction"]) {
  if (direction === "LONG") return "border-emerald-300/50 bg-emerald-400/12 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,.12)]"
  if (direction === "SHORT") return "border-red-300/50 bg-red-400/12 text-red-100 shadow-[0_0_18px_rgba(239,68,68,.12)]"
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

function biasDotClass(direction: MarketMoverCandidate["direction"]) {
  if (direction === "LONG") return "bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,.75)]"
  if (direction === "SHORT") return "bg-red-300 shadow-[0_0_10px_rgba(239,68,68,.75)]"
  return "bg-zinc-400"
}

function biasTextClass(direction: MarketMoverCandidate["direction"]) {
  if (direction === "LONG") return "text-emerald-200"
  if (direction === "SHORT") return "text-red-200"
  return "text-zinc-300"
}

function lifecycleClass(lifecycle: ActiveSetupMemoryItem["lifecycle"]) {
  if (lifecycle === "COMPLETED") return "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
  if (lifecycle === "STRENGTHENING") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
  if (lifecycle === "WEAKENING") return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
  if (lifecycle === "INVALIDATED") return "border-red-300/30 bg-red-400/10 text-red-100"
  if (lifecycle === "NEW") return "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
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

function outcomeSummary(items: ActiveSetupMemoryItem[]) {
  const winners = items.filter((item) => item.outcome === "TP2_HIT" || item.outcome === "TP1_HIT").slice(0, 2)
  const failures = items.filter((item) => item.outcome === "STOPPED" || item.outcome === "EXPIRED").slice(0, 1)
  return { winners, failures }
}

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

export default function MarketMoverSignalCard() {
  const activeSymbol = useFocusRoutingStore((state) => state.activeSymbol)
  const { data, loading, error } = useMarketMovers(true, activeSymbol)
  const memory = useActiveSetupMemory(data?.candidates)
  const setup = data?.candidates?.[0]
  const liquidWatch = (data?.candidates ?? []).slice(1, 4)
  const currentSetupMemory = setup ? memory.find((item) => item.symbol === setup.symbol) : undefined
  const recentSetups = memory.filter((item) => item.symbol !== setup?.symbol).slice(0, 3)
  const focusCandidate = data?.focusCandidate ?? null
  const { winners, failures } = outcomeSummary(memory)
  const focusSymbols = [
    setup?.symbol,
    focusCandidate?.symbol,
    ...liquidWatch.map((item) => item.symbol),
    ...memory.slice(0, 4).map((item) => item.symbol),
  ].filter((symbol): symbol is string => Boolean(symbol))

  if (loading && !data) {
    return (
      <section className="rounded-[1.25rem] border border-zinc-900 bg-black/55 p-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
          <Loader2 size={14} className="animate-spin" /> Scanning market attention
        </div>
      </section>
    )
  }

  if (!setup) {
    return (
      <section className="rounded-[1.25rem] border border-zinc-900 bg-black/55 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">Market Discovery</div>
            <div className="mt-1 text-sm font-black text-white">No high-quality setup detected</div>
            <div className="mt-1 truncate text-xs text-zinc-500" title={data?.summary?.attention || error || undefined}>
              {data?.summary?.attention || error || "Scanner is waiting for cleaner liquidity + volatility alignment."}
            </div>
          </div>
          <div className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[9px] font-black uppercase text-zinc-500">
            Hidden scan
          </div>
        </div>

        <div className="mt-2">
          <PairFocusControls symbols={focusSymbols} />
        </div>

        {focusCandidate ? (
          <FocusCandidateCard candidate={focusCandidate} />
        ) : null}

        {memory.length ? (
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Recent active setups</div>
            <div className="grid gap-1.5 md:grid-cols-3">
              {memory.slice(0, 3).map((item) => (
                <div key={`${item.symbol}-${item.firstSeenAt}`} className="rounded-lg border border-zinc-800 bg-black/30 px-2 py-1.5">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${biasDotClass(item.direction)}`} />
                      <span className="truncate text-[10px] font-black text-white">{item.symbol}</span>
                    </div>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${lifecycleClass(item.lifecycle)}`}>{item.lifecycle}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-zinc-500">
                    <span className={biasTextClass(item.direction)}>{compactBiasLabel(item.bias)}</span>
                    <span>{formatSetupAge(item.firstSeenAt)}</span>
                  </div>
                  <div className={`mt-1 truncate text-[9px] font-bold ${outcomeClass(item.outcome)}`} title={item.resultText}>
                    {item.resultText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <section className="rounded-[1.25rem] border border-cyan-300/20 bg-cyan-400/[0.06] p-3 shadow-[0_0_28px_rgba(34,211,238,.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${biasClass(setup.direction)}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${biasDotClass(setup.direction)}`} />
              {setup.bias}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${actionClass(setup.action)}`}>{setup.action}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${gradeClass(setup.grade)}`}>GRADE {setup.grade}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${planQualityClass(setup.planQuality)}`}>{formatPlanQuality(setup.planQuality)}</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-100">{setup.confidence}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${freshnessClass(setup.freshness)}`}>{setup.freshness}</span>
            {currentSetupMemory ? (
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${lifecycleClass(currentSetupMemory.lifecycle)}`}>
                {currentSetupMemory.lifecycle} · {formatSetupAge(currentSetupMemory.firstSeenAt)}
              </span>
            ) : null}
          </div>
          <div className="mt-1 truncate text-base font-black text-white" title={`${setup.symbol} ${setup.setup}`}>
            {setup.symbol} · {setup.setup}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-zinc-800 bg-black/40 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-400">{formatCapTier(setup.capTier)}</span>
            {setup.isLargeCapWatch ? <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-100">Liquid watch</span> : null}
          </div>
          <div className="mt-1 line-clamp-1 text-xs text-zinc-400" title={`${setup.reason} ${setup.qualityReason}`}>WHY: {setup.qualityReason}</div>
          {setup.planQuality !== "BALANCED" ? (
            <div className="mt-1 line-clamp-1 text-[10px] font-bold uppercase tracking-wide text-yellow-200" title={setup.volatilityNote}>
              PLAN WARNING: {formatPlanQuality(setup.planQuality)} · {setup.volatilityNote}
            </div>
          ) : null}
          <div className="mt-1 line-clamp-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500" title={setup.trustSummary}>TRUST: {setup.trustSummary}</div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-right">
          <MiniMetric icon={<Activity size={11} />} label="Move" value={signedPct(setup.priceChangePercent)} />
          <MiniMetric icon={<Gauge size={11} />} label="Quality" value={`${setup.tradeabilityScore}`} />
          <MiniMetric icon={<Shield size={11} />} label="R:R" value={setup.riskReward} />
        </div>
      </div>

      <div className="mt-2 grid gap-1.5 text-xs md:grid-cols-4">
        <TradeLevel icon={<Crosshair size={11} />} label="Entry" value={setup.entryZone} />
        <TradeLevel icon={<AlertTriangle size={11} />} label="SL" value={setup.stopLoss} danger />
        <TradeLevel icon={<Target size={11} />} label="TP1" value={setup.takeProfit1} />
        <TradeLevel icon={<Target size={11} />} label="TP2" value={setup.takeProfit2} />
      </div>
      <div className="mt-1.5 truncate text-[10px] font-bold uppercase tracking-wide text-zinc-500" title={setup.volatilityNote}>PLAN: {setup.riskReward} · {setup.volatilityNote}</div>

      <div className="mt-2">
        <PairFocusControls symbols={focusSymbols} />
      </div>

      {focusCandidate && focusCandidate.symbol !== setup.symbol ? (
        <FocusCandidateCard candidate={focusCandidate} />
      ) : null}

      {(winners.length || failures.length) ? (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Recent results</div>
          <div className="flex flex-wrap gap-1.5">
            {winners.map((item) => (
              <span key={`${item.symbol}-${item.firstSeenAt}-win`} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-100">
                <CheckCircle2 size={11} /> {item.symbol} {formatOutcomeLabel(item.outcome)} · {item.resultText.replace(/^.*best /, "")}
              </span>
            ))}
            {failures.map((item) => (
              <span key={`${item.symbol}-${item.firstSeenAt}-fail`} className="inline-flex items-center gap-1.5 rounded-full border border-red-300/20 bg-red-400/10 px-2 py-1 text-[10px] font-bold text-red-100">
                <XCircle size={11} /> {item.symbol} {formatOutcomeLabel(item.outcome)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {liquidWatch.length ? (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Large-cap volume watch</div>
          <div className="flex flex-wrap gap-1.5">
            {liquidWatch.map((item) => (
              <span key={item.symbol} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-black/35 px-2 py-1 text-[10px] font-bold text-zinc-300">
                <span className={`h-1.5 w-1.5 rounded-full ${biasDotClass(item.direction)}`} />
                {item.symbol} <span className={item.priceChangePercent >= 0 ? "text-emerald-300" : "text-red-300"}>{signedPct(item.priceChangePercent)}</span> · <span className={biasTextClass(item.direction)}>{item.confidence}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {recentSetups.length ? (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Recent active setups</div>
          <div className="grid gap-1.5 md:grid-cols-3">
            {recentSetups.map((item) => (
              <div key={`${item.symbol}-${item.firstSeenAt}`} className="rounded-lg border border-zinc-800 bg-black/30 px-2 py-1.5">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${biasDotClass(item.direction)}`} />
                    <span className="truncate text-[10px] font-black text-white">{item.symbol}</span>
                  </div>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${lifecycleClass(item.lifecycle)}`}>{item.lifecycle}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-zinc-500">
                  <span className={biasTextClass(item.direction)}>{compactBiasLabel(item.bias)}</span>
                  <span>{formatSetupAge(item.firstSeenAt)}</span>
                </div>
                <div className={`mt-1 truncate text-[9px] font-bold ${outcomeClass(item.outcome)}`} title={item.resultText}>
                  {item.resultText}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}


function FocusCandidateCard({ candidate }: { candidate: MarketMoverCandidate }) {
  return (
    <div className="mt-2 rounded-xl border border-zinc-800 bg-black/35 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Star size={12} className="shrink-0 text-cyan-300" />
          <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Focus Pair</span>
          <span className="truncate text-xs font-black text-white">{candidate.symbol}</span>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${biasClass(candidate.direction)}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${biasDotClass(candidate.direction)}`} />
          {compactBiasLabel(candidate.bias)}
        </span>
      </div>
      <div className="grid gap-1.5 text-xs md:grid-cols-4">
        <TradeLevel icon={<Crosshair size={11} />} label="Entry" value={candidate.entryZone} />
        <TradeLevel icon={<AlertTriangle size={11} />} label="SL" value={candidate.stopLoss} danger />
        <TradeLevel icon={<Target size={11} />} label="TP1" value={candidate.takeProfit1} />
        <TradeLevel icon={<Target size={11} />} label="TP2" value={candidate.takeProfit2} />
      </div>
      <div className="mt-1.5 truncate text-[10px] font-bold uppercase tracking-wide text-zinc-500" title={candidate.volatilityNote}>PLAN: {candidate.riskReward} · {candidate.volatilityNote}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${gradeClass(candidate.grade)}`}>GRADE {candidate.grade}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${planQualityClass(candidate.planQuality)}`}>{formatPlanQuality(candidate.planQuality)}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${freshnessClass(candidate.freshness)}`}>{candidate.freshness}</span>
      </div>
      <div className="mt-1.5 line-clamp-1 text-[10px] text-zinc-500" title={candidate.suppressedReason || candidate.reason}>
        {candidate.suppressedReason ? `Not actionable: ${candidate.suppressedReason}` : candidate.qualityReason}
      </div>
    </div>
  )
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-[68px] rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
      <div className="mb-0.5 flex items-center justify-end gap-1 text-[9px] uppercase tracking-wide text-zinc-500">{icon}{label}</div>
      <div className="truncate text-xs font-black text-white">{value}</div>
    </div>
  )
}

function TradeLevel({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
      <div className={danger ? "mt-0.5 text-red-200" : "mt-0.5 text-cyan-200"}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">{label}</div>
        <div className={`mt-0.5 line-clamp-2 text-xs font-semibold ${danger ? "text-red-100" : "text-white"}`}>{value}</div>
      </div>
    </div>
  )
}
