import React from "react"

import type { ReplayV2ViewModel } from "@/lib/replay-presentation/contracts"
import { HistoricalContextSection } from "./HistoricalContextSection"
import { InvestigationHandoffs } from "./InvestigationHandoffs"
import { MarketStructureSection } from "./MarketStructureSection"
import { PrimaryEvidenceSection } from "./PrimaryEvidenceSection"
import { ReasoningTimelineSection } from "./ReasoningTimelineSection"
import { ReplayShell, type ReplayShellActions } from "./ReplayShell"
import { ReplaySummarySection } from "./ReplaySummarySection"

export function ReplayV2View({ model, actions, embedded = false, orderbookVisualization }: { readonly model: ReplayV2ViewModel; readonly actions: ReplayShellActions & { readonly onLoadTrades: () => void; readonly onLoadOrderbook: () => void }; readonly embedded?: boolean; readonly orderbookVisualization?: React.ReactNode }) {
  const Root = embedded ? "div" : "main"
  return <Root data-qt-foundation="replay-v2" className="min-h-screen bg-[var(--qt-color-background)] px-3 py-4 text-[var(--qt-color-text-primary)] sm:px-5 lg:px-6"><div className="mx-auto grid max-w-[1800px] gap-8"><ReplayShell summary={model.summary} actions={actions} /><ReplaySummarySection model={model.summary} /><PrimaryEvidenceSection model={model.primaryEvidence} /><ReasoningTimelineSection model={model.timeline} onLoadTrades={actions.onLoadTrades} /><HistoricalContextSection model={model.historicalContext} /><MarketStructureSection model={model.marketStructure} onLoadOrderbook={actions.onLoadOrderbook} orderbookVisualization={orderbookVisualization} /><InvestigationHandoffs research={model.researchHandoff} repository={model.repositoryHandoff} repositoryRecord={model.repositoryRecord} /><footer className="border-t border-[var(--qt-color-border)] pt-4"><h2 className="text-sm font-semibold">Known limitations</h2><ul className="mt-2 grid gap-1 text-xs text-[var(--qt-color-text-muted)]">{model.pageLimitations.map((item) => <li key={item}>{item}</li>)}</ul></footer></div></Root>
}
