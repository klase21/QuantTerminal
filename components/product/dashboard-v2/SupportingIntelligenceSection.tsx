import React from "react"

import { EvidenceCard } from "@/components/evidence"
import { AvailabilityBadge, StatePanel } from "@/components/feedback"
import { Section, SurfacePanel } from "@/components/layout/foundation-layout"
import type { SupportingIntelligenceViewModel } from "@/lib/dashboard/contracts"

export function SupportingIntelligenceSection({ items }: { readonly items: readonly SupportingIntelligenceViewModel[] }) {
  return (
    <Section aria-labelledby="dashboard-supporting-title">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--qt-color-info)]">Level 6 · Supporting context</p>
        <h2 id="dashboard-supporting-title" className="mt-1 text-xl font-bold text-[var(--qt-color-text-primary)]">Supporting Intelligence</h2>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {items.map((item) => (
          <SurfacePanel key={item.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <AvailabilityBadge availability={item.availability} />
            </div>
            {item.evidence.length ? (
              <div className="grid gap-3">
                {item.evidence.map((evidence) => <EvidenceCard key={evidence.id} evidence={evidence} variant="compact" />)}
              </div>
            ) : (
              <StatePanel state={item.lifecycle} title={`${item.title} unavailable`} reason={item.availability.reason ?? item.limitation ?? "No supported evidence was supplied."} />
            )}
            {item.limitation ? <p className="mt-3 text-xs leading-5 text-[var(--qt-color-warning)]">{item.limitation}</p> : null}
          </SurfacePanel>
        ))}
      </div>
    </Section>
  )
}
