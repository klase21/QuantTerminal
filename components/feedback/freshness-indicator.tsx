import React from "react"

import { Badge } from "@/components/ui/foundation/badge"
import type { FreshnessModel } from "@/lib/design-system"

export function FreshnessIndicator({ freshness }: { readonly freshness: FreshnessModel }) {
  const tone = freshness.state === "CURRENT" ? "success" : freshness.state === "STALE" || freshness.state === "EXPIRED" ? "warning" : "neutral"
  const detail = [freshness.state, freshness.observedAt, freshness.reason].filter(Boolean).join(" - ")
  return (
    <span data-qt-foundation="freshness" className="inline-flex flex-wrap items-center gap-2 text-xs text-[var(--qt-color-text-muted)]">
      <Badge tone={tone} role="status" aria-label={detail}>{freshness.state}</Badge>
      {freshness.observedAt ? <time dateTime={freshness.observedAt}>{freshness.observedAt}</time> : null}
      {freshness.reason ? <span>{freshness.reason}</span> : null}
    </span>
  )
}
