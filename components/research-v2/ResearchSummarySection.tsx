import React from "react"
import { AvailabilityBadge, FreshnessIndicator, StatePanel } from "@/components/feedback"
import { Badge } from "@/components/ui/foundation"
import type { ResearchSummaryViewModel } from "@/lib/research-presentation/contracts"

export function ResearchSummarySection({ model }: { readonly model: ResearchSummaryViewModel }) {
  if (model.lifecycle === "EMPTY" || model.lifecycle === "ERROR") return <StatePanel state={model.lifecycle} title="Research Summary" reason={model.limitation} />
  return <section aria-labelledby="research-summary-title" className="grid gap-4"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Research Summary</p><h2 id="research-summary-title" className="mt-1 text-lg font-semibold">{model.question.question}</h2></div><div className="grid gap-3 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface)] p-[var(--qt-space-4)] md:grid-cols-3"><div><span className="text-xs text-[var(--qt-color-text-muted)]">Evidence counts</span><p className="mt-1 text-sm">{model.supportingCount} supporting / {model.conflictingCount} conflicting</p></div><div className="flex flex-wrap items-center gap-2"><AvailabilityBadge availability={model.availability} /><Badge tone="warning">{model.lifecycle}</Badge></div><FreshnessIndicator freshness={model.freshness} /></div>{model.decisionBriefOrientation ? <p className="border-l-2 border-[var(--qt-color-warning)] pl-3 text-sm text-[var(--qt-color-text-secondary)]">Decision Brief orientation: {model.decisionBriefOrientation}. {model.limitation}</p> : <p className="text-sm text-[var(--qt-color-text-muted)]">{model.limitation}</p>}</section>
}
