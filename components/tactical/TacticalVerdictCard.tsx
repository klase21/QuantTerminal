"use client"

import { buildTacticalIntelligenceBrain } from "@/lib/tactical/tacticalVerdictEngine"

export default function TacticalVerdictCard() {
  const result = buildTacticalIntelligenceBrain({
    trendScore: 62,
    momentumScore: 58,
    executionScore: 52,
    liquidityScore: 55,
    volatilityScore: 48,
    flowScore: 60,
    rotationScore: 64,
    liquidationPressure: 42,
    fundingPressure: 38,
    macroRiskScore: 46,
  })

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-black/40 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400">
            Tactical Verdict
          </div>

          <div className="mt-2 text-3xl font-bold text-white">
            {result.directionalBias}
          </div>

          <div className="mt-1 text-sm font-semibold text-cyan-100">
            {result.verdict}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="rounded-full border border-cyan-500/30 px-3 py-1 text-xs text-cyan-300">
            {result.aggression}
          </div>
          <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
            {result.confidence}% confidence
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
          Execution Guidance
        </div>
        <div className="mt-2 text-sm leading-6 text-zinc-300">
          {result.guidance}
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Opportunity
          </div>
          <div className="mt-1 text-sm font-bold text-white">{result.opportunity.category}</div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">{result.opportunity.focus}</div>
        </div>

        <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
            Timeframe Read
          </div>
          <div className="mt-1 text-sm font-bold text-white">{result.timeframeRead.htf} / {result.timeframeRead.mtf} / {result.timeframeRead.ltf}</div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">{result.timeframeRead.summary}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {result.riskFactors.length > 0 ? result.riskFactors.map((risk) => (
          <div
            key={risk}
            className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2 text-xs text-red-300"
          >
            {risk}
          </div>
        )) : (
          <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
            No major execution risk flagged
          </div>
        )}
      </div>
    </div>
  )
}
