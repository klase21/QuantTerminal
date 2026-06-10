export interface HistoricalReplayHierarchyLevel {
  level: number
  question: string
  primaryPanels: string[]
  secondaryPanels: string[]
  recommendedUiRole: string
  notes: string
}

export const historicalReplayHierarchyAudit: HistoricalReplayHierarchyLevel[] = [
  {
    level: 1,
    question: "What Happened?",
    primaryPanels: ["Selected Case Summary", "Replay Learning Summary", "Replay Timeline"],
    secondaryPanels: ["Replay Explanation"],
    recommendedUiRole: "Pinned top case brief with compact evidence timeline below.",
    notes: "This must be immediately readable before any advanced intelligence is opened.",
  },
  {
    level: 2,
    question: "Why Happened?",
    primaryPanels: ["Possible Drivers", "Narrative vs Reality", "Replay Explanation"],
    secondaryPanels: ["Expectation Intelligence", "Agent Committee"],
    recommendedUiRole: "Driver stack beside or directly below the case brief.",
    notes: "Possible Drivers should remain visible as the causal anchor.",
  },
  {
    level: 3,
    question: "Historical Context",
    primaryPanels: ["Similar Historical Events", "Market Memory", "Event Memory Linker"],
    secondaryPanels: ["Relationship Graph", "Historical Query Explorer"],
    recommendedUiRole: "One Historical Context module with analogs, memory notes, and link evidence.",
    notes: "Current memory-related panels are valuable but too fragmented.",
  },
  {
    level: 4,
    question: "What Worked Before?",
    primaryPanels: ["Setup Outcome Memory", "Historical Scoring"],
    secondaryPanels: ["Record Inspector", "Relationship Graph"],
    recommendedUiRole: "Outcome memory strip with sample size, win rate, best condition, and failure mode.",
    notes: "Scoring should annotate records rather than stand alone.",
  },
  {
    level: 5,
    question: "Suggested Focus",
    primaryPanels: ["Tactical Playbook", "Replay Decision Journal", "Agent Accuracy"],
    secondaryPanels: ["Agent Committee", "Prediction Markets"],
    recommendedUiRole: "Final action-read area with watch signals, invalidation, and next-time rule.",
    notes: "The current action guidance is strong but split across multiple panels.",
  },
]

