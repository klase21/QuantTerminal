import type { QuantCardType, QuantInformationLevel } from "./quantTerminalDesignSystem"
import type { ReplayNofxStrategy } from "./replayPresentationRules"

export interface ReplayNofxMigrationMapItem {
  componentName: string
  currentPath: string
  cardType: QuantCardType
  informationLevel: QuantInformationLevel
  nofxStrategy: ReplayNofxStrategy
  nofxReferencePattern: string
  quantTerminalRole: string
  migrationAction: string
}

export const replayNofxMigrationMap: ReplayNofxMigrationMapItem[] = [
  {
    componentName: "ReplayNarrativeFlow",
    currentPath: "components/replay/ReplayNarrativeFlow.tsx",
    cardType: "primary",
    informationLevel: "level_1",
    nofxStrategy: "adapt",
    nofxReferencePattern: "Route-level workflow separation and guided mode.",
    quantTerminalRole: "Primary market investigation flow.",
    migrationAction: "Keep as the default Replay reader; later add density modes and route shell.",
  },
  {
    componentName: "CaseBriefPanel",
    currentPath: "components/replay/CaseBriefPanel.tsx",
    cardType: "primary",
    informationLevel: "level_1",
    nofxStrategy: "adapt",
    nofxReferencePattern: "Selected trader context drives dashboard state.",
    quantTerminalRole: "Selected replay case context and immediate verdict.",
    migrationAction: "Standardize confidence wording and preserve single primary-card status.",
  },
  {
    componentName: "HistoricalContextPanel",
    currentPath: "components/replay/HistoricalContextPanel.tsx",
    cardType: "secondary",
    informationLevel: "level_3",
    nofxStrategy: "adapt",
    nofxReferencePattern: "Decision logs and performance context live near monitoring, not configuration.",
    quantTerminalRole: "Historical analogs, memory, and outcome patterns.",
    migrationAction: "Keep collapsed in narrative flow; later move deeper research tools to Historical Ops.",
  },
  {
    componentName: "ExpectationContextPanel",
    currentPath: "components/replay/ExpectationContextPanel.tsx",
    cardType: "signal",
    informationLevel: "level_4",
    nofxStrategy: "adapt",
    nofxReferencePattern: "System freshness and market state are shown as operational context.",
    quantTerminalRole: "Crowd expectation, probability changes, and priced-in status.",
    migrationAction: "Use signal card treatment and avoid trading-signal language.",
  },
  {
    componentName: "AgentReadPanel",
    currentPath: "components/replay/AgentReadPanel.tsx",
    cardType: "secondary",
    informationLevel: "level_4",
    nofxStrategy: "adopt",
    nofxReferencePattern: "Expandable AI decision trace and accountability.",
    quantTerminalRole: "Agent stance plus historical calibration.",
    migrationAction: "Keep calibration attached to agent stance; later make agent trace expandable.",
  },
  {
    componentName: "DataOperationsWorkbenchPanel",
    currentPath: "components/replay/DataOperationsWorkbenchPanel.tsx",
    cardType: "secondary",
    informationLevel: "advanced",
    nofxStrategy: "advanced-only",
    nofxReferencePattern: "Advanced setup/configuration is separated from normal dashboard workflow.",
    quantTerminalRole: "Source intake, validation, review, linking, scoring, and inspection.",
    migrationAction: "Keep collapsed and eventually move to Historical Intelligence Ops route.",
  },
]

export const replayNofxMigrationSummary = {
  primaryFlow: "ReplayNarrativeFlow + CaseBriefPanel",
  supportingFlow: ["HistoricalContextPanel", "ExpectationContextPanel", "AgentReadPanel"],
  advancedOnly: ["DataOperationsWorkbenchPanel"],
  rejectedNofxPatterns: ["execution controls", "exchange setup in replay", "competition mechanics"],
} as const

