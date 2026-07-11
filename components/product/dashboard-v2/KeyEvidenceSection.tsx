import React from "react"

import { EvidenceCard } from "@/components/evidence"
import { Section } from "@/components/layout/foundation-layout"
import type { EvidenceViewModel } from "@/lib/design-system"

export function KeyEvidenceSection({ evidence }: { readonly evidence: readonly EvidenceViewModel[] }) {
  return (
    <Section aria-labelledby="dashboard-evidence-title">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Level 2 · Source-backed observations</p>
        <h2 id="dashboard-evidence-title" className="mt-1 text-xl font-bold text-[var(--qt-color-text-primary)]">Key Evidence</h2>
      </div>
      {evidence.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {evidence.map((item) => <EvidenceCard key={item.id} evidence={item} variant="compact" />)}
        </div>
      ) : (
        <div role="status" className="rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface)] p-4 text-sm text-[var(--qt-color-text-muted)]">
          MISSING: No supported key evidence was supplied.
        </div>
      )}
    </Section>
  )
}
