import React from "react"

import MarketCandleChart from "@/components/charts/MarketCandleChart"
import { AvailabilityBadge, StatePanel } from "@/components/feedback"
import { Section, SurfacePanel } from "@/components/layout/foundation-layout"
import type { ReplayPrimaryEvidenceViewModel } from "@/lib/replay-presentation/contracts"

export function PrimaryEvidenceSection({ model }: { readonly model: ReplayPrimaryEvidenceViewModel }) {
  return <Section aria-labelledby="replay-evidence-title">
    <div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">2 · Primary Evidence</p><h2 id="replay-evidence-title" className="mt-1 text-xl font-bold">Price and dataset availability</h2></div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <SurfacePanel className="min-w-0">{model.candles.length ? <div className="h-[430px] min-h-[320px] w-full"><MarketCandleChart candles={[...model.candles]} minHeight={320} /></div> : <StatePanel state="PARTIAL" title="Price evidence unavailable" reason={model.chartReason ?? "No bounded candles were supplied."} />}<p className="mt-3 text-xs text-[var(--qt-color-text-muted)]">Source: {model.chartSource ?? "UNAVAILABLE"}</p></SurfacePanel>
      <div className="grid content-start gap-2">{model.datasets.map((item) => <SurfacePanel key={item.id} className="grid gap-2"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold capitalize">{item.label}</h3><AvailabilityBadge availability={item.availability} /></div><p className="break-words text-xs leading-5 text-[var(--qt-color-text-muted)]">{item.detail}</p><p className="text-xs text-[var(--qt-color-text-muted)]">Source: {item.source ?? "UNAVAILABLE"}</p></SurfacePanel>)}</div>
    </div>
  </Section>
}

