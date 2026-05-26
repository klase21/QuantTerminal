"use client"

import { buildAdaptiveCommentary } from "@/core/adaptive/adaptiveCommentaryEngine"
import { detectSignalContradictions } from "@/core/adaptive/signalContradictionEngine"
import { applyConfidenceDecay } from "@/core/adaptive/confidenceDecayEngine"
import { buildDefaultTimeframeFusion } from "@/core/adaptive/multiTimeframeFusion"
import { buildTacticalWatchlist } from "@/core/adaptive/tacticalWatchlistEngine"
import { scanRotationOpportunities } from "@/core/adaptive/rotationOpportunityScanner"
import TacticalFocusCard from "@/components/focus/TacticalFocusCard"
import FocusModeShell from "@/components/focus/FocusModeShell"
import CompactMetricRow from "@/components/focus/CompactMetricRow"

export default function AdaptiveIntelligencePanel() {
  const fusion = buildDefaultTimeframeFusion()
  const contradiction = detectSignalContradictions({
    rotationScore: 78,
    cvd: -1.8,
    sellPressure: 68,
    whaleConfidence: 74,
    funding: 0.032,
  })
  const decay = applyConfidenceDecay({ confidence: 82, ageMinutes: 18 })
  const commentary = buildAdaptiveCommentary({
    regime: "TREND_EXPANSION",
    bias: fusion.tacticalBias,
    contradictionScore: contradiction.contradictionScore,
    confidence: decay.decayed,
  })
  const watchlist = buildTacticalWatchlist()
  const opportunities = scanRotationOpportunities()

  return (
    <FocusModeShell
      title="Adaptive Intelligence"
      description="Hover cards for enlarged tactical preview. Use Focus Mode when reading details."
    >
      <TacticalFocusCard
        eyebrow="Adaptive Commentary"
        title={commentary.headline}
        summary={commentary.action}
        preview={
          <div className="space-y-4">
            <p className="text-sm leading-6 text-zinc-300">{commentary.summary}</p>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm font-bold text-cyan-100">
              {commentary.action}
            </div>
            <CompactMetricRow label="Current Regime" value="TREND EXPANSION" tone="cyan" />
            <CompactMetricRow label="Adaptive Bias" value={fusion.tacticalBias} tone={fusion.tacticalBias === "BULLISH" ? "green" : fusion.tacticalBias === "BEARISH" ? "red" : "yellow"} />
            <CompactMetricRow label="Contradiction Penalty" value={contradiction.penalty} tone="red" />
          </div>
        }
      >
        <p className="line-clamp-2 text-sm leading-6 text-zinc-400">{commentary.summary}</p>
        <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-sm font-bold text-cyan-100">
          {commentary.action}
        </div>
      </TacticalFocusCard>

      <TacticalFocusCard
        eyebrow="MTF Fusion"
        title={fusion.tacticalBias}
        summary={`Alignment ${fusion.alignmentScore}%`}
        preview={
          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-black/50 p-4">
              <div className="text-3xl font-black text-white">{fusion.tacticalBias}</div>
              <div className="text-xs text-zinc-500">Alignment Score {fusion.alignmentScore}%</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                <div className="h-full rounded-full bg-cyan-300" style={{ width: `${fusion.alignmentScore}%` }} />
              </div>
            </div>
            {fusion.signals.map((item) => (
              <div key={item.timeframe} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-black text-white">{item.timeframe}</div>
                  <div className={item.bias === "BULLISH" ? "text-emerald-300" : item.bias === "BEARISH" ? "text-red-300" : "text-zinc-400"}>
                    {item.bias} · {item.confidence}
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{item.note}</div>
              </div>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <CompactMetricRow label="Bias" value={fusion.tacticalBias} tone={fusion.tacticalBias === "BULLISH" ? "green" : fusion.tacticalBias === "BEARISH" ? "red" : "yellow"} />
          <CompactMetricRow label="Align" value={`${fusion.alignmentScore}%`} tone="cyan" />
        </div>
        <p className="mt-3 line-clamp-2 text-xs text-zinc-500">{fusion.executionRead}</p>
      </TacticalFocusCard>

      <TacticalFocusCard
        eyebrow="Contradiction"
        title={`Score ${contradiction.contradictionScore}`}
        summary={`Penalty ${contradiction.penalty}`}
        className="hover:border-red-300/35"
      >
        <div className="space-y-2">
          {contradiction.contradictions.slice(0, 2).map((item) => (
            <div key={item.label} className="rounded-xl border border-red-400/10 bg-red-400/5 p-3">
              <div className="text-xs font-black text-red-100">{item.label}</div>
              <div className="mt-1 line-clamp-1 text-xs text-zinc-500">{item.explanation}</div>
            </div>
          ))}
        </div>
      </TacticalFocusCard>

      <TacticalFocusCard
        eyebrow="Confidence Decay"
        title={`${decay.decayed}%`}
        summary={`${decay.label} · Freshness ${decay.freshness}%`}
      >
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-black text-white">{decay.decayed}%</div>
            <div className="text-xs text-zinc-500">Original {decay.original}%</div>
          </div>
          <div className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-black text-purple-100">
            {decay.label}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-900">
          <div className="h-full rounded-full bg-purple-300" style={{ width: `${decay.decayed}%` }} />
        </div>
      </TacticalFocusCard>

      <TacticalFocusCard
        eyebrow="Rotation Scanner"
        title={`${opportunities[0]?.from} → ${opportunities[0]?.to}`}
        summary={`${opportunities[0]?.probability}% · ETA ${opportunities[0]?.eta}`}
        preview={
          <div className="space-y-3">
            {opportunities.map((item) => (
              <div key={`${item.from}-${item.to}`} className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-black text-white">{item.from} → {item.to}</div>
                  <div className="text-lg font-black text-emerald-300">{item.probability}%</div>
                </div>
                <div className="mt-1 text-xs text-zinc-500">ETA {item.eta}</div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.reason}</p>
              </div>
            ))}
          </div>
        }
      >
        <div className="space-y-2">
          {opportunities.map((item) => (
            <div key={`${item.from}-${item.to}`} className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-white">{item.from} → {item.to}</div>
                <div className="text-sm font-black text-emerald-300">{item.probability}%</div>
              </div>
              <div className="mt-1 text-xs text-zinc-500">ETA {item.eta}</div>
            </div>
          ))}
        </div>
      </TacticalFocusCard>

      <TacticalFocusCard
        eyebrow="Watchlist"
        title="Tactical Watch"
        summary={`${watchlist.length} active symbols`}
        preview={
          <div className="space-y-3">
            {watchlist.map((item) => (
              <div key={item.symbol} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-black text-white">{item.symbol}</div>
                  <div className={item.status === "ACTIVE" ? "text-emerald-300" : item.status === "RISK" ? "text-red-300" : "text-yellow-300"}>
                    {item.status} · {item.score}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.reason}</p>
              </div>
            ))}
          </div>
        }
      >
        <div className="space-y-2">
          {watchlist.map((item) => (
            <div key={item.symbol} className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-white">{item.symbol}</div>
                <div className={item.status === "ACTIVE" ? "text-emerald-300" : item.status === "RISK" ? "text-red-300" : "text-yellow-300"}>
                  {item.status} · {item.score}
                </div>
              </div>
            </div>
          ))}
        </div>
      </TacticalFocusCard>
    </FocusModeShell>
  )
}
