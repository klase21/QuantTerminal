export interface HistoricalImportanceScore {
  value: number
  eventSignificance: number
  replayFrequency: number
  historicalAnalogCount: number
  rationale: string
}

export interface HistoricalConfidenceScore {
  value: number
  sourceConfidence: number
  reviewAcceptanceQuality: number
  dataCompleteness: number
  rationale: string
}

export interface HistoricalLearningScore {
  value: number
  playbookLinkage: number
  outcomeQuality: number
  decisionUsefulness: number
  rationale: string
}

export interface HistoricalCompositeScore {
  recordId: string
  recordType: "event" | "memory" | "decision" | "outcome" | "playbook"
  title: string
  importance: HistoricalImportanceScore
  confidence: HistoricalConfidenceScore
  learning: HistoricalLearningScore
  composite: number
}

export interface HistoricalScoringResult {
  events: HistoricalCompositeScore[]
  memories: HistoricalCompositeScore[]
  decisions: HistoricalCompositeScore[]
  outcomes: HistoricalCompositeScore[]
  playbooks: HistoricalCompositeScore[]
  summary: {
    averageScore: number
    highestConfidenceItem?: HistoricalCompositeScore
    highestLearningValueItem?: HistoricalCompositeScore
  }
}
