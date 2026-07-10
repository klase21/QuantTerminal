import React from "react"

import { AvailabilityBadge, FreshnessIndicator, ProvenanceLabel, StatePanel } from "@/components/feedback"
import type { MetricViewModel } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function MetricCard({ metric, className }: { readonly metric: MetricViewModel; readonly className?: string }) {
  if (["LOADING", "EMPTY", "ERROR", "OFFLINE"].includes(metric.lifecycle)) {
    return <StatePanel state={metric.lifecycle} title={metric.label} reason={metric.availability.reason} className={className} />
  }

  const available = metric.availability.state === "AVAILABLE" || metric.availability.state === "STALE" || metric.availability.state === "EXPERIMENTAL"
  const hasValue = metric.value !== null && metric.value !== undefined

  return (
    <article data-qt-foundation="metric-card" className={cn("grid gap-3 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface)] p-[var(--qt-space-4)]", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-[var(--qt-color-text-secondary)]">{metric.label}</h3>
        <AvailabilityBadge availability={metric.availability} />
      </header>
      {available && hasValue ? (
        <p className="break-words font-[var(--qt-font-mono)] text-xl font-semibold text-[var(--qt-color-text-primary)]">{String(metric.value)}{metric.unit ? <span className="ml-1 text-xs text-[var(--qt-color-text-muted)]">{metric.unit}</span> : null}</p>
      ) : (
        <p role="status" className="text-sm text-[var(--qt-color-text-muted)]">{metric.availability.state}{metric.availability.reason ? `: ${metric.availability.reason}` : ""}</p>
      )}
      {available && metric.delta !== null && metric.delta !== undefined ? <p className="text-xs text-[var(--qt-color-text-secondary)]">Change: {String(metric.delta)}</p> : null}
      {metric.freshness ? <FreshnessIndicator freshness={metric.freshness} /> : null}
      {metric.provenance ? <ProvenanceLabel provenance={metric.provenance} /> : null}
    </article>
  )
}
