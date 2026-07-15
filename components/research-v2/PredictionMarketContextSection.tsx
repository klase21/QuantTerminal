import React from "react"
import { AvailabilityBadge, FreshnessIndicator, StatePanel } from "@/components/feedback"
import { Badge } from "@/components/ui/foundation"
import { formatCompactCount, formatPlainNumber, formatProbability } from "@/lib/presentation/financialFormatting"
import type { PredictionMarketContextViewModel } from "@/lib/research-presentation/contracts"

function probability(value: number | null) { return value === null ? "UNAVAILABLE" : formatProbability(value / 100) }
function number(value: number | null) { return value === null ? "UNAVAILABLE" : formatPlainNumber(value) }
function count(value: number | null) { return value === null ? "UNAVAILABLE" : formatCompactCount(value) }
export function PredictionMarketContextSection({ markets }: { readonly markets: readonly PredictionMarketContextViewModel[] }) {
  return <section aria-labelledby="prediction-context-title" className="grid gap-4"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Prediction Market Context</p><h2 id="prediction-context-title" className="mt-1 text-lg font-semibold">Context, not confidence</h2></div>{markets.length ? <div className="grid gap-3 lg:grid-cols-2">{markets.map((market) => <article key={market.id} className="grid gap-3 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface)] p-[var(--qt-space-4)]"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-semibold">{market.title}</h3><AvailabilityBadge availability={market.availability} /></div><div className="flex flex-wrap gap-2"><Badge tone="neutral">Probability: {probability(market.probability)}</Badge><Badge tone="neutral">Volume: {count(market.volume)}</Badge><Badge tone="neutral">Liquidity: {number(market.liquidity)}</Badge></div><FreshnessIndicator freshness={market.freshness} /><p className="text-xs text-[var(--qt-color-text-muted)]">Heuristic attention label: {market.attentionHeuristic}</p><p className="text-xs text-[var(--qt-color-warning)]">{market.limitation}</p></article>)}</div> : <StatePanel state="EMPTY" title="Prediction Market Context" reason="No contextual prediction-market payload is available." />}</section>
}
