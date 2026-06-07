import type { ReplayCase } from "@/core/replay/replayTypes"

export type ReplayDecision = "long" | "short" | "wait" | "avoid"

export interface ReplayDecisionJournalQuery {
  caseId?: string
  symbol?: string
}

export interface ReplayDecisionJournal {
  ok: true
  generatedAt: string
  selectedCase: {
    id: string
    title: string
    symbol: string
    verdict: ReplayCase["verdict"]
  }
  hypotheticalDecision: ReplayDecision
  decisionReason: string
  invalidationCondition: string
  expectedOutcome: string
  actualOutcome: string
  mistakeTag: string
  lesson: string
  futureRule: string
  confidence: number
}
