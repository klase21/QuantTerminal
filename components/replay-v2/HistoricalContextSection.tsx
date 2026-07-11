import React from "react"

import { AvailabilityBadge, StatePanel } from "@/components/feedback"
import { Section, SurfacePanel } from "@/components/layout/foundation-layout"
import type { ReplayHistoricalContextViewModel } from "@/lib/replay-presentation/contracts"

export function HistoricalContextSection({ model }: { readonly model: ReplayHistoricalContextViewModel }) {
  return <Section aria-labelledby="replay-history-title"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">4 · Historical Context</p><h2 id="replay-history-title" className="mt-1 text-xl font-bold">Supplied case context only</h2></div>{model.caseId ? <SurfacePanel className="grid gap-2"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Case {model.caseId}</h3><AvailabilityBadge availability={model.availability} /></div><p className="text-xs text-[var(--qt-color-text-muted)]">Timestamp: {model.timestamp}</p><p className="text-xs text-[var(--qt-color-text-muted)]">Source: {model.source ?? "Supplied investigation context"}</p><p className="text-xs text-[var(--qt-color-warning)]">{model.limitation}</p></SurfacePanel> : <StatePanel state="PARTIAL" title="Historical context unavailable" reason={model.availability.reason ?? model.limitation} />}</Section>
}

