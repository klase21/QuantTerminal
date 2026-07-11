import React from "react"
import type { ScannerHandoffViewModel, ScannerV2ViewModel } from "@/lib/scanner-presentation/contracts"
import { CandidateDetailSection } from "./CandidateDetailSection"
import { CandidateEvidenceSection } from "./CandidateEvidenceSection"
import { CandidateRiskSection } from "./CandidateRiskSection"
import { InvestigationPathSection } from "./InvestigationPathSection"
import { PriorityQueueSection } from "./PriorityQueueSection"
import { RepositoryValidationSection } from "./RepositoryValidationSection"
import { ScannerShell } from "./ScannerShell"
import { ScannerSummarySection } from "./ScannerSummarySection"

export function ScannerV2View({ model, onOpenHandoff, embedded = false }: { readonly model: ScannerV2ViewModel; readonly onOpenHandoff: (id: ScannerHandoffViewModel["id"]) => void; readonly embedded?: boolean }) {
  return <ScannerShell embedded={embedded}><ScannerSummarySection model={model.summary} /><PriorityQueueSection model={model.queue} /><CandidateDetailSection model={model.primaryCandidate} /><CandidateEvidenceSection model={model.primaryCandidate} /><CandidateRiskSection model={model.primaryCandidate} /><InvestigationPathSection handoffs={model.handoffs} onOpen={onOpenHandoff} /><RepositoryValidationSection model={model.repository} /><footer className="border-t border-[var(--qt-color-border)] pt-4"><ul className="grid gap-1 text-xs text-[var(--qt-color-text-muted)]">{model.limitations.map((item) => <li key={item}>{item}</li>)}</ul></footer></ScannerShell>
}
