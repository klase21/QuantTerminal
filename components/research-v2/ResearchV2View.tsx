import React from "react"
import type { ResearchV2ViewModel } from "@/lib/research-presentation/contracts"
import { EvidenceOverviewSection } from "./EvidenceOverviewSection"
import { PredictionMarketContextSection } from "./PredictionMarketContextSection"
import { PrimarySourcesSection } from "./PrimarySourcesSection"
import { ReasoningCounterEvidenceSection } from "./ReasoningCounterEvidenceSection"
import { RelatedResearchSection, type RelatedResearchActions } from "./RelatedResearchSection"
import { ResearchGraphSection } from "./ResearchGraphSection"
import { ResearchHandoffs, type ResearchHandoffActions } from "./ResearchHandoffs"
import { ResearchShell } from "./ResearchShell"
import { ResearchSummarySection } from "./ResearchSummarySection"

export interface ResearchV2Actions extends ResearchHandoffActions, RelatedResearchActions {}
export function ResearchV2View({ model, actions, embedded = false }: { readonly model: ResearchV2ViewModel; readonly actions: ResearchV2Actions; readonly embedded?: boolean }) { const Root = embedded ? "div" : "main"; return <Root data-qt-foundation="research-v2" className="min-h-screen bg-[var(--qt-color-background)] px-3 py-4 text-[var(--qt-color-text-primary)] sm:px-5 lg:px-6"><div className="mx-auto grid max-w-[1800px] gap-8"><ResearchShell summary={model.summary} /><ResearchSummarySection model={model.summary} /><EvidenceOverviewSection evidence={model.evidence} secondaryContext={model.secondaryContext} /><PrimarySourcesSection sources={model.primarySources} /><ReasoningCounterEvidenceSection reasoning={model.reasoning} counterEvidence={model.counterEvidence} /><PredictionMarketContextSection markets={model.predictionContext} /><ResearchGraphSection model={model.graph} /><RelatedResearchSection items={model.relatedResearch} actions={actions} /><ResearchHandoffs repository={model.repository} handoffs={model.handoffs} actions={actions} /><footer className="border-t border-[var(--qt-color-border)] pt-4"><h2 className="text-sm font-semibold">Known limitations</h2><p className="mt-2 text-xs text-[var(--qt-color-warning)]">Evidence Packet unavailable: {model.evidencePacketUnavailableReason}</p><ul className="mt-2 grid gap-1 text-xs text-[var(--qt-color-text-muted)]">{model.pageLimitations.map((item) => <li key={item}>{item}</li>)}</ul></footer></div></Root> }
