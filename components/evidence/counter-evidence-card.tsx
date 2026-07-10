import React from "react"

import { ConfidenceIndicator } from "@/components/evidence/confidence-indicator"
import { AvailabilityBadge, FreshnessIndicator, ProvenanceLabel, StatePanel } from "@/components/feedback"
import { RepositoryLink } from "@/components/navigation"
import { Badge } from "@/components/ui/foundation"
import type { CounterEvidenceViewModel } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function CounterEvidenceCard({ counterEvidence, className }: { readonly counterEvidence: CounterEvidenceViewModel; readonly className?: string }) {
  if (["LOADING", "EMPTY", "ERROR", "OFFLINE"].includes(counterEvidence.lifecycle)) {
    return <StatePanel state={counterEvidence.lifecycle} title="Counter evidence" reason={counterEvidence.availability.reason} className={className} />
  }

  const available = counterEvidence.availability.state === "AVAILABLE" || counterEvidence.availability.state === "STALE" || counterEvidence.availability.state === "EXPERIMENTAL"

  return (
    <article data-qt-foundation="counter-evidence-card" className={cn("grid gap-3 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-counter-evidence)] bg-[var(--qt-color-surface)] p-[var(--qt-space-4)]", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--qt-color-counter-evidence)]">Counter evidence</h3>
        <div className="flex flex-wrap gap-2"><AvailabilityBadge availability={counterEvidence.availability} />{counterEvidence.unresolved ? <Badge tone="warning">UNRESOLVED</Badge> : null}</div>
      </header>
      <p className="text-xs text-[var(--qt-color-text-muted)]">Affected claim: {counterEvidence.affectedClaim}</p>
      {available && counterEvidence.observation ? <p className="text-sm leading-6 text-[var(--qt-color-text-secondary)]">{counterEvidence.observation}</p> : <p role="status" className="text-sm text-[var(--qt-color-text-muted)]">{counterEvidence.availability.reason ?? "Counter evidence unavailable."}</p>}
      {counterEvidence.confidence ? <ConfidenceIndicator confidence={counterEvidence.confidence} /> : null}
      {counterEvidence.freshness ? <FreshnessIndicator freshness={counterEvidence.freshness} /> : null}
      {counterEvidence.provenance ? <ProvenanceLabel provenance={counterEvidence.provenance} /> : null}
      {counterEvidence.repository ? <RepositoryLink handoff={counterEvidence.repository} /> : null}
    </article>
  )
}
