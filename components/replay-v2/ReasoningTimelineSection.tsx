import React from "react"

import { RepositoryLink } from "@/components/navigation"
import { StatePanel } from "@/components/feedback"
import { Section, SurfacePanel } from "@/components/layout/foundation-layout"
import { Button } from "@/components/ui/foundation"
import type { ReplayTimelineViewModel } from "@/lib/replay-presentation/contracts"

export function ReasoningTimelineSection({ model, onLoadTrades }: { readonly model: ReplayTimelineViewModel; readonly onLoadTrades: () => void }) {
  return <Section aria-labelledby="replay-timeline-title">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">3 · Reasoning Timeline</p><h2 id="replay-timeline-title" className="mt-1 text-xl font-bold">Observation → Evidence → Interpretation</h2></div><Button loading={model.manualAggTrade.loading} loadingLabel="Loading trades" onClick={onLoadTrades}>{model.manualAggTrade.label}</Button></div>
    <p className="text-xs text-[var(--qt-color-text-muted)]">AggTrade remains manual. Loaded: {model.manualAggTrade.loadedRecords}. {model.manualAggTrade.truncated ? "Response truncated; continuation remains manual." : "No automatic continuation."}</p>
    {model.events.length ? <ol className="grid gap-3">{model.events.map((event) => <li key={event.id}><SurfacePanel className="grid gap-3"><time className="font-[var(--qt-font-mono)] text-xs text-[var(--qt-color-text-muted)]" dateTime={event.timestamp}>{event.timestamp}</time><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Observation</p><h3 className="mt-1 text-sm font-semibold">{event.observationType}</h3><p className="mt-1 text-sm text-[var(--qt-color-text-secondary)]">{event.observedValue}</p></div><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-info)]">Evidence</p><p className="mt-1 text-xs text-[var(--qt-color-text-muted)]">Source: {event.source ?? "Merged Replay source; record identity unavailable"}</p><RepositoryLink handoff={event.repository} /></div><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-warning)]">Interpretation</p><p className="mt-1 text-xs leading-5 text-[var(--qt-color-text-muted)]">{event.interpretation}</p></div></SurfacePanel></li>)}</ol> : <StatePanel state={model.lifecycle} title="Timeline observations unavailable" reason={model.availability.reason} />}
    <StatePanel state="PARTIAL" title="Reasoning unavailable" reason={model.reasoningUnavailableReason} />
  </Section>
}

