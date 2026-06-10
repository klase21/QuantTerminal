export interface HistoricalNofxPreparationAudit {
  panelsToRemove: string[]
  panelsToMerge: Array<{ target: string; panels: string[]; reason: string }>
  panelsToHide: string[]
  panelsToPin: string[]
  suggestedLayout: string[]
  suggestedNavigation: string[]
  suggestedCardStructure: string[]
  suggestedInformationDensity: string[]
}

export const historicalNofxPreparationAudit: HistoricalNofxPreparationAudit = {
  panelsToRemove: [
    "Standalone Historical Scoring panel from default replay view",
    "Standalone Record Inspector from default replay view",
    "Standalone Decision Write Test from default replay view",
    "Standalone Event Ingestion Test from default replay view",
  ],
  panelsToMerge: [
    {
      target: "Case Brief",
      panels: ["Selected Case Summary", "Replay Learning Summary", "Replay Explanation"],
      reason: "They all explain the case state, result, and lesson.",
    },
    {
      target: "Historical Context",
      panels: ["Similar Historical Events", "Setup Outcome Memory", "Market Memory"],
      reason: "They all answer how this case compares to past setups.",
    },
    {
      target: "Expectation Context",
      panels: ["Expectation Intelligence", "Prediction Markets"],
      reason: "They both describe priced-in, surprise, and crowd expectation context.",
    },
    {
      target: "Agent Read",
      panels: ["Agent Committee", "Agent Accuracy"],
      reason: "Agent stance and agent calibration should be read together.",
    },
    {
      target: "Data Operations Workbench",
      panels: [
        "External Adapter Preview",
        "Polymarket Live Validation",
        "External Review Queue",
        "Accepted Event Linker",
        "Relationship Graph",
        "Historical Query Explorer",
        "Record Inspector",
      ],
      reason: "These are internal source, review, relationship, and inspection workflows.",
    },
  ],
  panelsToHide: [
    "External Adapter Preview",
    "Polymarket Live Validation",
    "External Review Queue",
    "Accepted Event Linker",
    "Relationship Graph",
    "Historical Query Explorer",
    "Record Inspector",
    "Decision Write Test",
    "Event Ingestion Test",
  ],
  panelsToPin: [
    "Replay Case Selector",
    "Case Brief",
    "Possible Drivers",
    "Narrative vs Reality",
    "Replay Timeline",
    "Tactical Playbook",
  ],
  suggestedLayout: [
    "Top rail: case selector plus one-line event verdict.",
    "Primary column: Case Brief, Narrative vs Reality, Replay Timeline.",
    "Decision column: Possible Drivers, Historical Context, Tactical Playbook.",
    "Advanced drawer: Data Operations Workbench.",
  ],
  suggestedNavigation: [
    "Use question-based tabs: Brief, Evidence, History, Playbook, Data Ops.",
    "Keep Data Ops hidden by default and visually separate from user-facing replay.",
    "Use source badges to separate mock, live preview, persisted, and derived records.",
  ],
  suggestedCardStructure: [
    "Each card should answer one question in the title.",
    "Start with verdict, then evidence, then caveat.",
    "Use confidence and action labels consistently across all cards.",
    "Move caveats into a compact footer unless risk materially changes interpretation.",
  ],
  suggestedInformationDensity: [
    "Keep Level 1 and Level 2 dense and visible.",
    "Make historical details expandable inside one Historical Context card.",
    "Convert ingestion and persistence panels into tool drawers.",
    "Prefer 3-5 bullets per card and avoid repeated caution text.",
  ],
}

