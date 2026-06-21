export const INVESTIGATION_THESIS_VERSION = 1

export const INVESTIGATION_THESIS_STATUSES = [
  "active",
  "resolved",
  "invalidated",
  "archived",
] as const

export type InvestigationThesisStatus = typeof INVESTIGATION_THESIS_STATUSES[number]

export interface InvestigationThesis {
  thesisVersion: typeof INVESTIGATION_THESIS_VERSION
  thesisId: string
  title: string
  question: string
  decisionHorizon: string
  status: InvestigationThesisStatus
  createdAt: string
  updatedAt: string
  hypothesis?: string
  currentView?: string
  tags?: string[]
}
