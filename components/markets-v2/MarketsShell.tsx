import React from "react"
import { Badge } from "@/components/ui/foundation"
import type { MarketsSummaryViewModel } from "@/lib/markets-presentation/contracts"

export function MarketsShell({ summary }: { readonly summary: MarketsSummaryViewModel }) {
  return <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--qt-color-border)] pb-4"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Markets V2</p><h1 className="mt-1 text-xl font-semibold">Global Market Intelligence</h1><p className="mt-1 text-sm text-[var(--qt-color-text-secondary)]">{summary.symbol} / {summary.exchange} / {summary.timeframe}</p></div><Badge tone="neutral">Facts before regime</Badge></header>
}
