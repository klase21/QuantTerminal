import type { QuantCardType, QuantDensityMode, QuantInformationLevel } from "./quantTerminalDesignSystem"

export interface QuantComponentInventoryItem {
  componentName: string
  currentPath: string
  standardizedRole: string
  recommendedCardType: QuantCardType
  informationLevel: QuantInformationLevel
  densityModes: QuantDensityMode[]
  standardizationNotes: string
}

export const quantComponentInventory: QuantComponentInventoryItem[] = [
  {
    componentName: "CaseBriefPanel",
    currentPath: "components/replay/CaseBriefPanel.tsx",
    standardizedRole: "Primary investigation entry point",
    recommendedCardType: "primary",
    informationLevel: "level_1",
    densityModes: ["beginner", "trader", "research"],
    standardizationNotes: "Should be the only primary card in Replay and own verdict/confidence display.",
  },
  {
    componentName: "HistoricalContextPanel",
    currentPath: "components/replay/HistoricalContextPanel.tsx",
    standardizedRole: "Historical analog and outcome memory summary",
    recommendedCardType: "secondary",
    informationLevel: "level_3",
    densityModes: ["trader", "research"],
    standardizationNotes: "Should hide engine names and lead with 'this resembles...' language.",
  },
  {
    componentName: "ExpectationContextPanel",
    currentPath: "components/replay/ExpectationContextPanel.tsx",
    standardizedRole: "Crowd expectation and priced-in context",
    recommendedCardType: "signal",
    informationLevel: "level_4",
    densityModes: ["trader", "research"],
    standardizationNotes: "Prediction market details should be nested under the expectation read.",
  },
  {
    componentName: "AgentReadPanel",
    currentPath: "components/replay/AgentReadPanel.tsx",
    standardizedRole: "Agent stance plus historical calibration",
    recommendedCardType: "secondary",
    informationLevel: "level_4",
    densityModes: ["trader", "research"],
    standardizationNotes: "Pair current agent tone with accuracy and calibration; avoid standalone agent accuracy panels.",
  },
  {
    componentName: "ReplayNarrativeFlow",
    currentPath: "components/replay/ReplayNarrativeFlow.tsx",
    standardizedRole: "Question-first replay investigation container",
    recommendedCardType: "primary",
    informationLevel: "level_1",
    densityModes: ["beginner", "trader", "research"],
    standardizationNotes: "Owns progressive disclosure and narrative completeness display.",
  },
  {
    componentName: "DataOperationsWorkbenchPanel",
    currentPath: "components/replay/DataOperationsWorkbenchPanel.tsx",
    standardizedRole: "Advanced source, storage, review, linking, and inspection workbench",
    recommendedCardType: "secondary",
    informationLevel: "advanced",
    densityModes: ["research"],
    standardizationNotes: "Must remain collapsed and separated from normal replay investigation.",
  },
]

export const standardizedReplaySurfaces = {
  caseBrief: {
    role: "What happened?",
    cardType: "primary",
    mustShow: ["verdict", "confidence", "replay window", "key event summary"],
    mustAvoid: ["multiple caveats", "raw engine names", "deep nested metrics"],
  },
  historicalContext: {
    role: "Has this happened before?",
    cardType: "secondary",
    mustShow: ["similar cases", "analogs", "pattern frequency", "historical lessons"],
    mustAvoid: ["raw repository details", "record inspector language"],
  },
  expectationContext: {
    role: "What was expected?",
    cardType: "signal",
    mustShow: ["market expectations", "expectation changes", "prediction context", "confidence"],
    mustAvoid: ["duplicated probability labels", "trading signal language"],
  },
  agentRead: {
    role: "Which agent lens was useful?",
    cardType: "secondary",
    mustShow: ["current agent view", "confidence", "historical accuracy", "disagreement"],
    mustAvoid: ["uncontextualized agent rankings", "catalog-only results without fallback note"],
  },
} as const

