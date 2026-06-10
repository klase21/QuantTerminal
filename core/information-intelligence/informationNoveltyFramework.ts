export type InformationNoveltyState = "new" | "known" | "recycled" | "saturated"

export interface InformationNoveltyDefinition {
  state: InformationNoveltyState
  definition: string
  signals: string[]
  tacticalRead: string
}

export interface InformationNoveltyContract {
  itemId: string
  firstSeenAt: string
  lastSeenSimilarAt?: string
  similarItemIds: string[]
  state: InformationNoveltyState
  repetitionPenalty: number
}

export const informationNoveltyDefinitions: InformationNoveltyDefinition[] = [
  {
    state: "new",
    definition: "The information has not been seen in recent memory or related clusters.",
    signals: ["no similar recent items", "first source appearance", "novel claim"],
    tacticalRead: "High watch priority if reliability and impact are also rising.",
  },
  {
    state: "known",
    definition: "The information is already in circulation but remains relevant.",
    signals: ["existing cluster", "moderate repetition", "new corroboration"],
    tacticalRead: "Useful as confirmation, less useful as surprise.",
  },
  {
    state: "recycled",
    definition: "The information repeats an old claim with limited new evidence.",
    signals: ["similar historical items", "weak new source", "low incremental detail"],
    tacticalRead: "Avoid overreacting unless impact or attention changes materially.",
  },
  {
    state: "saturated",
    definition: "The information is widely known and likely priced into the narrative.",
    signals: ["dominant narrative", "high repetition", "low novelty"],
    tacticalRead: "Watch for reversal or exhaustion rather than discovery.",
  },
]

