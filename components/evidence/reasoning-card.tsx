import React from "react"

import { ConfidenceIndicator } from "@/components/evidence/confidence-indicator"
import { AvailabilityBadge, FreshnessIndicator, StatePanel } from "@/components/feedback"
import type { ReasoningViewModel } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function ReasoningCard({ reasoning, className }: { readonly reasoning: ReasoningViewModel; readonly className?: string }) {
  if (["LOADING", "EMPTY", "ERROR", "OFFLINE"].includes(reasoning.lifecycle)) {
    return <StatePanel state={reasoning.lifecycle} title="Reasoning" reason={reasoning.unavailableReason ?? reasoning.availability.reason} className={className} />
  }

  if (reasoning.supportingEvidence.length === 0) {
    return <StatePanel state="PARTIAL" title="Reasoning unavailable" reason={reasoning.unavailableReason ?? "Reasoning requires at least one supporting evidence reference."} className={className} />
  }

  return (
    <article data-qt-foundation="reasoning-card" className={cn("grid gap-3 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-reasoning)] bg-[var(--qt-color-surface)] p-[var(--qt-space-4)]", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--qt-color-reasoning)]">Reasoning</h3>
        <AvailabilityBadge availability={reasoning.availability} />
      </header>
      {reasoning.summary ? <p className="text-sm leading-6 text-[var(--qt-color-text-secondary)]">{reasoning.summary}</p> : <p role="status" className="text-sm text-[var(--qt-color-text-muted)]">Reasoning summary unavailable.</p>}
      <div>
        <h4 className="text-xs font-semibold text-[var(--qt-color-text-primary)]">Supporting evidence</h4>
        <ul className="mt-1 list-inside list-disc text-xs text-[var(--qt-color-text-secondary)]">{reasoning.supportingEvidence.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-[var(--qt-color-counter-evidence)]">Counter evidence</h4>
        {reasoning.counterEvidence.length ? <ul className="mt-1 list-inside list-disc text-xs text-[var(--qt-color-text-secondary)]">{reasoning.counterEvidence.map((item) => <li key={item.id}>{item.label}</li>)}</ul> : <p className="mt-1 text-xs text-[var(--qt-color-text-muted)]">Counter evidence not supplied.</p>}
      </div>
      {reasoning.assumptions.length ? <p className="text-xs text-[var(--qt-color-warning)]">Assumptions: {reasoning.assumptions.join("; ")}</p> : null}
      {reasoning.confidence ? <ConfidenceIndicator confidence={reasoning.confidence} /> : null}
      {reasoning.freshness ? <FreshnessIndicator freshness={reasoning.freshness} /> : null}
    </article>
  )
}
