export interface NofxCognitiveLoadFinding {
  area: string
  nofxPattern: string
  cognitiveLoadEffect: "reduces_load" | "increases_load" | "contextual"
  quantTerminalDecision: "adopt" | "adapt" | "reject"
  rationale: string
}

export const nofxCognitiveLoadAnalysis: NofxCognitiveLoadFinding[] = [
  {
    area: "Beginner vs Advanced setup",
    nofxPattern: "Guided onboarding exists alongside advanced setup.",
    cognitiveLoadEffect: "reduces_load",
    quantTerminalDecision: "adopt",
    rationale: "QuantTerminal needs beginner/trader/research density modes for Replay and Historical Intelligence.",
  },
  {
    area: "Operational dashboard density",
    nofxPattern: "Account, positions, chart, decisions, and statistics are visible in a dense dashboard.",
    cognitiveLoadEffect: "contextual",
    quantTerminalDecision: "adapt",
    rationale: "High density is good for active traders but Replay should reveal density progressively.",
  },
  {
    area: "AI decision trace",
    nofxPattern: "AI reasoning is expandable rather than always visible.",
    cognitiveLoadEffect: "reduces_load",
    quantTerminalDecision: "adopt",
    rationale: "Agent Committee, Decision Journal, and evidence trace should be expandable under narrative sections.",
  },
  {
    area: "Execution actions in monitoring",
    nofxPattern: "Position close actions are available in position rows.",
    cognitiveLoadEffect: "increases_load",
    quantTerminalDecision: "reject",
    rationale: "QuantTerminal is currently intelligence/forensics first; adding execution controls would violate product scope.",
  },
  {
    area: "Multi-route product scope",
    nofxPattern: "Many workflows exist but are route-separated.",
    cognitiveLoadEffect: "reduces_load",
    quantTerminalDecision: "adapt",
    rationale: "QuantTerminal should route-separate Historical Ops from user-facing Replay before adding more panels.",
  },
]

export const nofxCognitiveLoadRecommendations = [
  "Keep Replay Narrative Flow question-based.",
  "Move Data Operations Workbench to its own route when it grows further.",
  "Use expandable evidence traces instead of always-visible engine output.",
  "Never mix execution controls into Replay unless the product explicitly becomes execution-capable.",
  "Add density presets before adding more intelligence surfaces.",
] as const

