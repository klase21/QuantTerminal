import React from "react"
import type { LocalPlanningRecordViewModel, TradeV2ViewModel } from "@/lib/trade-presentation/contracts"
import { CounterEvidenceSection } from "./CounterEvidenceSection"
import { DecisionHandoffs } from "./DecisionHandoffs"
import { DecisionSummarySection } from "./DecisionSummarySection"
import { DecisionWorkspaceShell } from "./DecisionWorkspaceShell"
import { EvidenceSummarySection } from "./EvidenceSummarySection"
import { ExecutionPlanSection } from "./ExecutionPlanSection"
import { RiskAssessmentSection } from "./RiskAssessmentSection"
import { ScenarioAnalysisSection } from "./ScenarioAnalysisSection"
import { SupportingEvidenceSection } from "./SupportingEvidenceSection"

export interface TradeV2Actions { readonly onSelectCandidate: (symbol: string) => void; readonly onTrack: () => void; readonly onUpdateStatus: (id: string, status: LocalPlanningRecordViewModel["persistedStatus"]) => void; readonly onDelete: (id: string) => void }
export function TradeV2View({ model, actions, embedded = false }: { readonly model: TradeV2ViewModel; readonly actions: TradeV2Actions; readonly embedded?: boolean }) { return <DecisionWorkspaceShell embedded={embedded}><DecisionSummarySection context={model.context} readiness={model.readiness} snapshot={model.snapshot} candidates={model.candidateOptions} onSelectCandidate={actions.onSelectCandidate} /><EvidenceSummarySection model={model.evidence} /><SupportingEvidenceSection model={model.evidence} /><CounterEvidenceSection model={model.counterEvidence} /><ScenarioAnalysisSection model={model.scenarios} /><RiskAssessmentSection model={model.risk} /><ExecutionPlanSection model={model.plan} records={model.localRecords} onTrack={actions.onTrack} onUpdateStatus={actions.onUpdateStatus} onDelete={actions.onDelete} /><DecisionHandoffs monitoring={model.monitoring} handoffs={model.handoffs} repository={model.repository} /><footer className="border-t border-[var(--qt-color-border)] pt-4"><ul className="grid gap-1 text-xs text-[var(--qt-color-text-muted)]">{model.limitations.map((item) => <li key={item}>{item}</li>)}</ul></footer></DecisionWorkspaceShell> }
