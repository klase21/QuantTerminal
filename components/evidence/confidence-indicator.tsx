import React from "react"

import { Badge } from "@/components/ui/foundation/badge"
import type { ConfidenceModel } from "@/lib/design-system"

export function ConfidenceIndicator({ confidence }: { readonly confidence: ConfidenceModel }) {
  if (confidence.state === "UNAVAILABLE" || confidence.value === null || confidence.value === undefined) {
    return (
      <span data-qt-foundation="confidence" role="status" className="inline-flex flex-wrap items-center gap-2">
        <Badge tone="neutral">CONFIDENCE UNAVAILABLE</Badge>
        {confidence.reason ? <span className="text-xs text-[var(--qt-color-text-muted)]">{confidence.reason}</span> : null}
      </span>
    )
  }

  return (
    <span data-qt-foundation="confidence" role="status" aria-label={`Confidence ${String(confidence.value)}${confidence.basis ? `, basis ${confidence.basis}` : ""}`} className="inline-flex flex-wrap items-center gap-2">
      <Badge tone="info">CONFIDENCE {String(confidence.value)}</Badge>
      {confidence.scale ? <span className="text-xs text-[var(--qt-color-text-muted)]">Scale: {confidence.scale}</span> : null}
      {confidence.basis ? <span className="text-xs text-[var(--qt-color-text-muted)]">{confidence.basis}</span> : null}
    </span>
  )
}
