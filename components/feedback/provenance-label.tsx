import React from "react"

import type { ProvenanceViewModel } from "@/lib/design-system"

export function ProvenanceLabel({ provenance }: { readonly provenance: ProvenanceViewModel }) {
  return (
    <dl data-qt-foundation="provenance" className="grid gap-1 font-[var(--qt-font-mono)] text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)] sm:grid-cols-2">
      <div><dt className="sr-only">Source</dt><dd>{provenance.sourceName ?? provenance.sourceId}</dd></div>
      {provenance.providerTier ? <div><dt className="sr-only">Provider tier</dt><dd>{provenance.providerTier}</dd></div> : null}
      {provenance.observedAt ? <div className="sm:col-span-2"><dt className="sr-only">Observed at</dt><dd><time dateTime={provenance.observedAt}>{provenance.observedAt}</time></dd></div> : null}
    </dl>
  )
}
