import React from "react"

import { StatePanel } from "@/components/feedback"
import { Section } from "@/components/layout/foundation-layout"

export function ReasoningSummarySection({ reason }: { readonly reason: string }) {
  return (
    <Section aria-labelledby="dashboard-reasoning-title">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--qt-color-reasoning)]">Level 3 · Evidence-linked interpretation</p>
        <h2 id="dashboard-reasoning-title" className="mt-1 text-xl font-bold text-[var(--qt-color-text-primary)]">Reasoning Summary</h2>
      </div>
      <StatePanel state="PARTIAL" title="Reasoning unavailable" reason={reason} />
    </Section>
  )
}
