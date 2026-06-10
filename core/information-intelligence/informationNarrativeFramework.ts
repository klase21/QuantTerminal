export type InformationNarrativeStage = "emerging" | "growing" | "dominant" | "declining" | "dead"

export interface InformationNarrativeStageDefinition {
  stage: InformationNarrativeStage
  definition: string
  expectedSignals: string[]
  tacticalRead: string
}

export interface InformationNarrativeTransition {
  from: InformationNarrativeStage
  to: InformationNarrativeStage
  trigger: string
  risk: string
}

export const informationNarrativeStages: InformationNarrativeStageDefinition[] = [
  {
    stage: "emerging",
    definition: "A new explanation or claim is appearing but has limited spread.",
    expectedSignals: ["first sightings", "low corroboration", "early social/news mentions"],
    tacticalRead: "Watch for confirmation before acting on narrative attribution.",
  },
  {
    stage: "growing",
    definition: "The narrative is spreading across sources and becoming recognizable.",
    expectedSignals: ["rising mentions", "cross-platform presence", "repeated framing"],
    tacticalRead: "Check whether price/flow already moved before accepting the narrative.",
  },
  {
    stage: "dominant",
    definition: "The narrative is the main public explanation for the market move.",
    expectedSignals: ["high attention", "broad repetition", "mainstream adoption"],
    tacticalRead: "Beware crowded attribution and late entries.",
  },
  {
    stage: "declining",
    definition: "The narrative is losing attention or being contradicted.",
    expectedSignals: ["falling velocity", "contradictions", "new competing explanations"],
    tacticalRead: "Review whether the market is repricing away from the story.",
  },
  {
    stage: "dead",
    definition: "The narrative no longer explains current market behavior.",
    expectedSignals: ["low mentions", "resolved event", "contradicted thesis"],
    tacticalRead: "Archive as historical memory, not active driver.",
  },
]

export const informationNarrativeTransitions: InformationNarrativeTransition[] = [
  { from: "emerging", to: "growing", trigger: "cross-platform spread and repeat framing", risk: "early false attribution" },
  { from: "growing", to: "dominant", trigger: "broad attention plus price/flow alignment", risk: "crowded narrative chase" },
  { from: "dominant", to: "declining", trigger: "attention decay or contradictory evidence", risk: "stale thesis" },
  { from: "declining", to: "dead", trigger: "resolved event or no current market relevance", risk: "recycled narrative" },
]

