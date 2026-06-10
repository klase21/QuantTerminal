export type ReplayReadinessStatus = "ready" | "needs_standardization" | "advanced_only" | "defer"

export interface ReplayComponentReadinessItem {
  componentName: string
  readinessStatus: ReplayReadinessStatus
  strengths: string[]
  gaps: string[]
  nextStep: string
}

export const replayComponentReadiness: ReplayComponentReadinessItem[] = [
  {
    componentName: "ReplayNarrativeFlow",
    readinessStatus: "ready",
    strengths: ["Question-first flow", "progressive disclosure", "advanced tools at bottom"],
    gaps: ["Density modes are not implemented", "section helper is still local"],
    nextStep: "Extract FlowSection and narrative score display into reusable primitives during visual migration.",
  },
  {
    componentName: "CaseBriefPanel",
    readinessStatus: "needs_standardization",
    strengths: ["Single primary context", "verdict and future rule are visible", "decision read is integrated"],
    gaps: ["Confidence label should use shared helper", "caveat should use standard copy"],
    nextStep: "Use replayPresentationRules for confidence and caveat wording.",
  },
  {
    componentName: "HistoricalContextPanel",
    readinessStatus: "ready",
    strengths: ["Combines analogs, memory, setup outcomes, and linkage", "hides engine-level labels mostly well"],
    gaps: ["Market Memory label still leaks implementation wording"],
    nextStep: "Rename implementation labels to user-facing historical language in a future polish.",
  },
  {
    componentName: "ExpectationContextPanel",
    readinessStatus: "needs_standardization",
    strengths: ["Combines expectation intelligence and prediction market context", "keeps confidence visible"],
    gaps: ["Confidence wording should use shared helper", "needs standard non-signal caveat if expanded"],
    nextStep: "Use standard expectation confidence presentation.",
  },
  {
    componentName: "AgentReadPanel",
    readinessStatus: "needs_standardization",
    strengths: ["Combines current stance and historical calibration", "shows top/cross-check agents"],
    gaps: ["Accuracy/calibration labels are raw", "agent trace is not yet progressively expandable"],
    nextStep: "Standardize confidence/accuracy badges and consider expandable detail later.",
  },
  {
    componentName: "DataOperationsWorkbenchPanel",
    readinessStatus: "advanced_only",
    strengths: ["All operational tools consolidated", "clearly marked advanced/mock-first"],
    gaps: ["Still physically lives inside Replay", "will keep growing if not route-separated"],
    nextStep: "Move to Historical Intelligence Ops route in future NOFX migration.",
  },
]

export const replayComponentReadinessSummary = {
  ready: ["ReplayNarrativeFlow", "HistoricalContextPanel"],
  needsStandardization: ["CaseBriefPanel", "ExpectationContextPanel", "AgentReadPanel"],
  advancedOnly: ["DataOperationsWorkbenchPanel"],
  nextMigrationGate: "Create reusable QuantCard/QuantBadge primitives before visual redesign.",
} as const

