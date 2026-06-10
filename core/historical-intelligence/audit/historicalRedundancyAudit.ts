export type HistoricalRedundancyRecommendation = "KEEP" | "MERGE" | "REMOVE" | "HIDE" | "ADVANCED_ONLY"

export interface HistoricalRedundancyAuditItem {
  panels: string[]
  recommendation: HistoricalRedundancyRecommendation
  severity: number
  reason: string
  suggestedResolution: string
}

export const historicalRedundancyAudit: HistoricalRedundancyAuditItem[] = [
  {
    panels: ["Replay Learning Summary", "Replay Explanation"],
    recommendation: "MERGE",
    severity: 92,
    reason: "Both explain case result, factors, caveats, and future rule.",
    suggestedResolution: "Create one Case Brief / Explanation card with a short top summary and expandable factor detail.",
  },
  {
    panels: ["Market Memory", "Event Memory Linker"],
    recommendation: "MERGE",
    severity: 88,
    reason: "Both connect the case to broader memory, analogs, expectation context, and execution implication.",
    suggestedResolution: "Merge into Historical Memory Context with explicit sections for memory, links, and confidence.",
  },
  {
    panels: ["Expectation Intelligence", "Prediction Markets"],
    recommendation: "MERGE",
    severity: 84,
    reason: "Both answer what participants expected and whether the event was priced in.",
    suggestedResolution: "Use Expectation Intelligence as the user-facing card and embed prediction market rows inside it.",
  },
  {
    panels: ["Agent Accuracy", "Agent Committee"],
    recommendation: "MERGE",
    severity: 78,
    reason: "Both present agent lens quality; one is historical calibration and one is current-frame opinion.",
    suggestedResolution: "Create Agent Read card with current stance, alignment verdict, and calibration note per agent.",
  },
  {
    panels: ["Similar Historical Events", "Setup Outcome Memory"],
    recommendation: "MERGE",
    severity: 76,
    reason: "Both use analog history to answer outcome likelihood and lesson.",
    suggestedResolution: "Combine into Historical Context: analogs at top, outcome stats below.",
  },
  {
    panels: ["Historical Query Explorer", "Record Inspector"],
    recommendation: "ADVANCED_ONLY",
    severity: 74,
    reason: "Both are inspection tools for stored records rather than default replay insight.",
    suggestedResolution: "Move into a Data Ops drawer or developer mode.",
  },
  {
    panels: ["External Adapter Preview", "Polymarket Live Validation", "External Review Queue"],
    recommendation: "ADVANCED_ONLY",
    severity: 90,
    reason: "These are ingestion QA workflows and can overwhelm replay users.",
    suggestedResolution: "Group under one Source Intake Workbench hidden behind an advanced section.",
  },
  {
    panels: ["Accepted Event Linker", "Relationship Graph"],
    recommendation: "MERGE",
    severity: 70,
    reason: "Link creation and graph inspection are two phases of the same relationship workflow.",
    suggestedResolution: "Use a single Relationship Workbench with candidate review and accepted graph tabs.",
  },
  {
    panels: ["Historical Scoring", "Relationship Graph"],
    recommendation: "HIDE",
    severity: 64,
    reason: "Scoring is more useful as metadata on graph nodes than as a standalone panel.",
    suggestedResolution: "Show score badges beside nodes, records, and memory items.",
  },
  {
    panels: ["Decision Write Test", "Event Ingestion Test"],
    recommendation: "ADVANCED_ONLY",
    severity: 82,
    reason: "Both are internal validation forms and interrupt user-facing forensics.",
    suggestedResolution: "Remove from default replay surface and keep only in a development/storage mode.",
  },
  {
    panels: ["Possible Drivers"],
    recommendation: "KEEP",
    severity: 10,
    reason: "It is the clearest immediate causal anchor.",
    suggestedResolution: "Keep visible near the top right or directly under the case brief.",
  },
  {
    panels: ["Tactical Playbook"],
    recommendation: "KEEP",
    severity: 18,
    reason: "It converts history into future execution behavior.",
    suggestedResolution: "Keep visible after the evidence and outcome memory sections.",
  },
]

