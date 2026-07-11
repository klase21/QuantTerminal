import React from "react"

import { KeyEvidenceSection } from "@/components/product/dashboard-v2/KeyEvidenceSection"
import { InvestigationHandoffs } from "@/components/product/dashboard-v2/InvestigationHandoffs"
import { MarketDirectionSection } from "@/components/product/dashboard-v2/MarketDirectionSection"
import { OpportunityRiskSection } from "@/components/product/dashboard-v2/OpportunityRiskSection"
import { ReasoningSummarySection } from "@/components/product/dashboard-v2/ReasoningSummarySection"
import { SupportingIntelligenceSection } from "@/components/product/dashboard-v2/SupportingIntelligenceSection"
import { Badge } from "@/components/ui/foundation"
import type { DashboardV2ViewModel } from "@/lib/dashboard/contracts"

export function DashboardV2View({
  model,
  onInspectOpportunity,
  embedded = false,
}: {
  readonly model: DashboardV2ViewModel
  readonly onInspectOpportunity?: (opportunityId: string) => void
  readonly embedded?: boolean
}) {
  const Root = embedded ? "div" : "main"
  return (
    <Root data-qt-foundation="dashboard-v2" className="min-h-screen bg-[var(--qt-color-background)] px-3 py-4 text-[var(--qt-color-text-primary)] sm:px-5 lg:px-6">
      <div className="mx-auto grid max-w-[1800px] gap-6">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--qt-color-border)] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">QuantTerminal Dashboard V2</p>
            <p className="mt-1 text-sm text-[var(--qt-color-text-secondary)]">Fast orientation · Evidence before interpretation · {model.symbol}</p>
          </div>
          <Badge tone="neutral">Source-backed or unavailable</Badge>
        </header>

        <MarketDirectionSection model={model.marketDirection} />
        <KeyEvidenceSection evidence={model.keyEvidence} />
        <ReasoningSummarySection reason={model.reasoningUnavailableReason} />
        <OpportunityRiskSection opportunities={model.opportunities} risk={model.risk} onInspectOpportunity={onInspectOpportunity} />
        <SupportingIntelligenceSection items={model.supportingIntelligence} />
        <InvestigationHandoffs handoffs={model.handoffs} repository={model.repository} />

        <footer className="border-t border-[var(--qt-color-border)] pt-4">
          <h2 className="text-sm font-semibold">Known limitations</h2>
          <ul className="mt-2 grid gap-1 text-xs text-[var(--qt-color-text-muted)]">
            {model.pageLimitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
        </footer>
      </div>
    </Root>
  )
}
