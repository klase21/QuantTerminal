import React from "react"

import { MetricCard } from "@/components/evidence"
import { StatePanel } from "@/components/feedback"
import { Section } from "@/components/layout/foundation-layout"
import { Button } from "@/components/ui/foundation"
import type { ReplayMarketStructureViewModel } from "@/lib/replay-presentation/contracts"

export function MarketStructureSection({ model, onLoadOrderbook, orderbookVisualization }: { readonly model: ReplayMarketStructureViewModel; readonly onLoadOrderbook: () => void; readonly orderbookVisualization?: React.ReactNode }) {
  const orderbookAvailable = model.orderbook.availability.state === "AVAILABLE" || model.orderbook.availability.state === "STALE"
  return <Section aria-labelledby="replay-structure-title"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">5 · Market Structure</p><h2 id="replay-structure-title" className="mt-1 text-xl font-bold">Positioning, forced flow, and bounded depth</h2></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{model.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div><div className="grid gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Orderbook snapshot</h3><Button loading={model.orderbook.loading} loadingLabel="Loading orderbook" onClick={onLoadOrderbook}>Load orderbook manually</Button></div>{orderbookAvailable && model.orderbook.metrics.length ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{model.orderbook.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</div>{orderbookVisualization}</> : <StatePanel state={model.orderbook.lifecycle === "EMPTY" ? "PARTIAL" : model.orderbook.lifecycle} title="Orderbook UNAVAILABLE" reason={model.orderbook.detail} />}</div></Section>
}
