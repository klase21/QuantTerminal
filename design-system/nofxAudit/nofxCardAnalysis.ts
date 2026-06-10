export interface NofxCardPattern {
  pattern: string
  observedUse: string
  strength: string
  quantTerminalRecommendation: string
}

export const nofxCardAnalysis: NofxCardPattern[] = [
  {
    pattern: "Status cards",
    observedUse: "System status, account equity, PnL, margin, runtime, and freshness.",
    strength: "Fast operational scan before deeper investigation.",
    quantTerminalRecommendation: "Use in Realtime for market freshness, websocket state, flow regime, and event urgency.",
  },
  {
    pattern: "Decision cards",
    observedUse: "Decision records with action, reasoning, execution result, and expandable AI thought process.",
    strength: "Creates accountability and traceability for AI-driven decisions.",
    quantTerminalRecommendation: "Use for Replay Decision Journal and future Setup Outcome Memory, but avoid exposing hidden reasoning as trading authority.",
  },
  {
    pattern: "Position rows",
    observedUse: "Dense tables with symbol, side, entry, mark, quantity, value, leverage, PnL, liquidation, and action.",
    strength: "High density for active monitoring.",
    quantTerminalRecommendation: "Adapt density for orderflow/forensics tables, but avoid execution controls unless explicitly requested.",
  },
  {
    pattern: "Chart tabs",
    observedUse: "Switchable chart modes inside dashboard context.",
    strength: "Keeps visual market context near positions and decisions.",
    quantTerminalRecommendation: "Replay can use tabs for price, narrative, expectation, and memory evidence within one investigation step.",
  },
  {
    pattern: "Configuration cards",
    observedUse: "Setup and settings are separated from monitoring.",
    strength: "Normal user workflow is not overloaded by configuration.",
    quantTerminalRecommendation: "Keep Data Operations Workbench advanced and eventually route-separated.",
  },
]

export const nofxCardHierarchyRead = {
  primaryCards: ["status/account overview", "selected trader header", "decision summary"],
  secondaryCards: ["positions", "charts", "statistics", "decision log"],
  advancedCards: ["setup", "settings", "strategy configuration", "exchange/model configuration"],
  quantTerminalMapping:
    "Case Brief should be primary; drivers/timeline/history/watch should be secondary; ingestion/linking/validation should be advanced.",
} as const

