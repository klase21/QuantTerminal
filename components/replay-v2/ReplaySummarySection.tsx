import React from "react"

import { StatePanel } from "@/components/feedback"
import { Section, SurfacePanel } from "@/components/layout/foundation-layout"
import type { ReplaySummaryViewModel } from "@/lib/replay-presentation/contracts"

export function ReplaySummarySection({ model }: { readonly model: ReplaySummaryViewModel }) {
  return <Section aria-labelledby="replay-summary-title">
    <div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">1 · Summary</p><h2 id="replay-summary-title" className="mt-1 text-xl font-bold">What happened in this bounded window?</h2></div>
    {model.observations.length ? <SurfacePanel><ul className="grid gap-2 text-sm leading-6 text-[var(--qt-color-text-secondary)]">{model.observations.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-3 text-xs text-[var(--qt-color-warning)]">{model.limitation}</p></SurfacePanel> : <StatePanel state={model.lifecycle} title="Replay summary unavailable" reason={model.availability.reason ?? "No bounded observations were supplied."} />}
  </Section>
}

