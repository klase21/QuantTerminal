import React from "react"
import { AlertTriangle, Radar } from "lucide-react"

import { AvailabilityBadge, StatePanel } from "@/components/feedback"
import { Section, Stack, SurfacePanel } from "@/components/layout/foundation-layout"
import { Button } from "@/components/ui/foundation"
import type {
  DashboardOpportunityViewModel,
  DashboardRiskViewModel,
} from "@/lib/dashboard/contracts"

export function OpportunityRiskSection({
  opportunities,
  risk,
  onInspectOpportunity,
}: {
  readonly opportunities: readonly DashboardOpportunityViewModel[]
  readonly risk: DashboardRiskViewModel
  readonly onInspectOpportunity?: (opportunityId: string) => void
}) {
  return (
    <Section aria-labelledby="dashboard-opportunity-title">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--qt-color-warning)]">Level 5 · Attention and limitations</p>
        <h2 id="dashboard-opportunity-title" className="mt-1 text-xl font-bold text-[var(--qt-color-text-primary)]">Opportunity and Risk</h2>
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <SurfacePanel>
          <div className="mb-3 flex items-center gap-2 text-[var(--qt-color-evidence)]">
            <Radar className="size-4" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Investigation candidates</h3>
          </div>
          {opportunities.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {opportunities.map((opportunity) => (
                <article key={opportunity.id} className="grid gap-3 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-[var(--qt-font-mono)] text-base font-semibold">{opportunity.symbol}</h4>
                    <AvailabilityBadge availability={opportunity.availability} />
                  </div>
                  <Stack gap="2">
                    {opportunity.observedFacts.map((fact) => <p key={fact} className="text-xs text-[var(--qt-color-text-secondary)]">{fact}</p>)}
                  </Stack>
                  {opportunity.heuristicLabels.length ? (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-[var(--qt-color-warning)]">Qualified heuristic interpretation</summary>
                      <ul className="mt-2 grid gap-1 text-xs text-[var(--qt-color-text-muted)]">
                        {opportunity.heuristicLabels.map((label) => <li key={label}>{label}</li>)}
                      </ul>
                    </details>
                  ) : null}
                  <p className="text-xs leading-5 text-[var(--qt-color-warning)]">{opportunity.limitation}</p>
                  {onInspectOpportunity ? <Button variant="secondary" onClick={() => onInspectOpportunity(opportunity.id)}>Inspect in Markets</Button> : null}
                </article>
              ))}
            </div>
          ) : (
            <StatePanel state="EMPTY" title="No investigation candidates" reason="The current market-mover response supplied no candidates." />
          )}
        </SurfacePanel>

        <SurfacePanel>
          <div className="mb-3 flex items-center gap-2 text-[var(--qt-color-warning)]">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Risk assessment</h3>
          </div>
          <StatePanel state={risk.lifecycle} title="Risk classification unavailable" reason={risk.reason} />
        </SurfacePanel>
      </div>
    </Section>
  )
}
