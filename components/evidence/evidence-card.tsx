import React from "react"

import { AvailabilityBadge, FreshnessIndicator, ProvenanceLabel, StatePanel } from "@/components/feedback"
import { ConfidenceIndicator } from "@/components/evidence/confidence-indicator"
import { RepositoryLink } from "@/components/navigation"
import { Badge } from "@/components/ui/foundation"
import type { EvidenceViewModel } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export interface EvidenceCardProps {
  readonly evidence: EvidenceViewModel
  readonly variant?: "compact" | "expanded"
  readonly className?: string
}

export function EvidenceCard({ evidence, variant = "compact", className }: EvidenceCardProps) {
  if (["LOADING", "EMPTY", "ERROR", "OFFLINE"].includes(evidence.lifecycle)) {
    return <StatePanel state={evidence.lifecycle} title={evidence.title} reason={evidence.availability.reason ?? evidence.limitation} className={className} />
  }

  const canPresentObservation = evidence.availability.state === "AVAILABLE" || evidence.availability.state === "STALE" || evidence.availability.state === "EXPERIMENTAL"

  return (
    <article data-qt-foundation="evidence-card" aria-labelledby={`${evidence.id}-title`} className={cn("grid gap-3 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface)] p-[var(--qt-space-4)] text-[var(--qt-color-text-primary)]", className)}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[var(--qt-type-label-size)] font-bold uppercase text-[var(--qt-color-evidence)]">{evidence.evidenceType}</p>
          <h3 id={`${evidence.id}-title`} className="mt-1 break-words text-sm font-semibold">{evidence.title}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {evidence.lifecycle === "PARTIAL" ? <Badge tone="warning">PARTIAL</Badge> : null}
          {evidence.lifecycle === "REFRESHING" ? <Badge tone="info">REFRESHING</Badge> : null}
          <AvailabilityBadge availability={evidence.availability} />
        </div>
      </header>

      {canPresentObservation && evidence.summary ? <p className="break-words text-sm leading-6 text-[var(--qt-color-text-secondary)]">{evidence.summary}</p> : <p role="status" className="text-sm text-[var(--qt-color-text-muted)]">{evidence.availability.reason ?? "Evidence content is unavailable."}</p>}

      <div className="flex flex-wrap gap-2 text-xs text-[var(--qt-color-text-muted)]">
        {evidence.supportingEvidenceCount !== null && evidence.supportingEvidenceCount !== undefined ? <span>Supporting evidence: {evidence.supportingEvidenceCount}</span> : null}
        {evidence.hasCounterEvidence !== null && evidence.hasCounterEvidence !== undefined ? <span>Counter evidence: {evidence.hasCounterEvidence ? "PRESENT" : "NOT SUPPLIED"}</span> : null}
        {evidence.coverage ? <span>Coverage: {evidence.coverage.state}{evidence.coverage.percent !== null && evidence.coverage.percent !== undefined ? ` (${evidence.coverage.percent}%)` : ""}</span> : null}
      </div>

      {variant === "expanded" && evidence.confidence ? <ConfidenceIndicator confidence={evidence.confidence} /> : null}
      {evidence.freshness ? <FreshnessIndicator freshness={evidence.freshness} /> : null}
      {evidence.provenance ? <ProvenanceLabel provenance={evidence.provenance} /> : <p className="text-xs text-[var(--qt-color-text-muted)]">Source unavailable</p>}
      {evidence.limitation ? <p className="border-l-2 border-[var(--qt-color-warning)] pl-3 text-xs text-[var(--qt-color-warning)]">{evidence.limitation}</p> : null}
      {evidence.repository ? <RepositoryLink handoff={evidence.repository} /> : null}
    </article>
  )
}
