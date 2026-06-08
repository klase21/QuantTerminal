import type { HistoricalRecordAudit, HistoricalRecordStatus } from "./historicalRecordTypes"

export type PlaybookRecordCategory = "technical" | "flow" | "narrative" | "expectation" | "risk" | "execution" | "macro"
export type PlaybookRecordOutcomeBias = "long" | "short" | "wait" | "avoid" | "mixed"

export interface PlaybookChecklistItemRecord {
  id: string
  label: string
  category: PlaybookRecordCategory
  required: boolean
  weight: number
  failureMode?: string
}

export interface PlaybookRecord {
  id: string
  caseId?: string
  title: string
  category: PlaybookRecordCategory
  outcomeBias: PlaybookRecordOutcomeBias
  historicalLesson: string
  keyMistake: string
  keyConfirmationSignal: string
  bestExecutionCondition: string
  worstExecutionCondition: string
  futurePlaybook: string[]
  executionChecklist: PlaybookChecklistItemRecord[]
  invalidationChecklist: PlaybookChecklistItemRecord[]
  relatedCaseIds: string[]
  relatedMemoryIds: string[]
  confidence: number
  tags: string[]
  status: HistoricalRecordStatus
  audit: HistoricalRecordAudit
}
