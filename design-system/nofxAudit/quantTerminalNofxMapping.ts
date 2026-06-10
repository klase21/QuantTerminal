export interface QuantTerminalNofxMappingItem {
  nofxIdea: string
  quantTerminalSurface:
    | "Replay Narrative Flow"
    | "Case Brief"
    | "Historical Context"
    | "Expectation Context"
    | "Agent Read"
    | "Data Operations Workbench"
    | "Information Intelligence"
    | "Tactical Decision OS"
  adoptAdaptReject: "adopt" | "adapt" | "reject"
  migrationNote: string
}

export const quantTerminalNofxMapping: QuantTerminalNofxMappingItem[] = [
  {
    nofxIdea: "One workspace for research, strategy, execution, and monitoring.",
    quantTerminalSurface: "Tactical Decision OS",
    adoptAdaptReject: "adapt",
    migrationNote: "Use one coherent operating system, but keep QuantTerminal focused on intelligence, replay, and tactical decision support.",
  },
  {
    nofxIdea: "Decision logs with expandable AI reasoning.",
    quantTerminalSurface: "Replay Narrative Flow",
    adoptAdaptReject: "adopt",
    migrationNote: "Represent replay reasoning as expandable evidence and agent trace inside the investigation flow.",
  },
  {
    nofxIdea: "Beginner mode and advanced mode split.",
    quantTerminalSurface: "Data Operations Workbench",
    adoptAdaptReject: "adopt",
    migrationNote: "Keep normal replay flow separate from source intake, validation, linking, and persistence tools.",
  },
  {
    nofxIdea: "Strategy Studio route.",
    quantTerminalSurface: "Tactical Decision OS",
    adoptAdaptReject: "adapt",
    migrationNote: "Create a future Tactical Playbook Lab for setup rules, but do not embed strategy authoring in Replay.",
  },
  {
    nofxIdea: "Position close action in dashboard.",
    quantTerminalSurface: "Tactical Decision OS",
    adoptAdaptReject: "reject",
    migrationNote: "QuantTerminal should avoid execution actions until explicitly scoped and risk-reviewed.",
  },
  {
    nofxIdea: "Selected trader context drives dashboard data.",
    quantTerminalSurface: "Case Brief",
    adoptAdaptReject: "adapt",
    migrationNote: "Selected replay case should drive every intelligence section with visible case identity.",
  },
  {
    nofxIdea: "Charts sit near positions and decisions.",
    quantTerminalSurface: "Replay Narrative Flow",
    adoptAdaptReject: "adapt",
    migrationNote: "Place price replay beside evidence timeline and driver story, not as an isolated chart.",
  },
  {
    nofxIdea: "System freshness and polling failure states.",
    quantTerminalSurface: "Information Intelligence",
    adoptAdaptReject: "adopt",
    migrationNote: "Add freshness and data confidence to realtime and external event validation surfaces.",
  },
]

export const quantTerminalMappingSummary = {
  strongestFit: ["guided vs advanced split", "decision traceability", "selected-context workspace", "route-level separation"],
  weakestFit: ["execution controls", "exchange account setup inside core flow", "competition/leaderboard mechanics"],
  designPrinciple: "Adopt structural ideas, not implementation or visual code.",
} as const

