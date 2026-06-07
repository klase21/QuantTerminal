import type { ReplayCase } from "@/core/replay/replayTypes"

export interface ReplayLearningSummaryQuery {
  caseId?: string
  symbol?: string
}

export interface ReplayLearningSummary {
  ok: true
  generatedAt: string
  caseId: string
  caseTitle: string
  symbol: string
  caseVerdict: ReplayCase["verdict"]
  whatWorked: string
  whatFailedOrWarned: string
  historicalLesson: string
  agentLesson: string
  agentAlignment?: string
  agentAlignmentRead?: string
  agentFallbackNote?: string
  futureExecutionRule: string
  confidence: number
  caveat: string
}
