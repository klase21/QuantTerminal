export interface HistoricalVisibilityAuditItem {
  panelName: string
  visibilityScore: number
  discoveryScore: number
  actionabilityScore: number
  importanceScore: number
  notes: string
}

export const historicalVisibilityAudit: HistoricalVisibilityAuditItem[] = [
  { panelName: "Replay Case Selector", visibilityScore: 95, discoveryScore: 90, actionabilityScore: 94, importanceScore: 96, notes: "Primary control is visible and correctly drives the workspace." },
  { panelName: "Selected Case Summary", visibilityScore: 92, discoveryScore: 88, actionabilityScore: 72, importanceScore: 94, notes: "Strong orientation surface, but could carry a clearer action state." },
  { panelName: "Replay Learning Summary", visibilityScore: 88, discoveryScore: 82, actionabilityScore: 84, importanceScore: 92, notes: "High-value card; overlaps with Replay Explanation." },
  { panelName: "Narrative vs Reality", visibilityScore: 76, discoveryScore: 70, actionabilityScore: 78, importanceScore: 88, notes: "Important concept, but competes with timeline and explanation." },
  { panelName: "Replay Timeline", visibilityScore: 78, discoveryScore: 72, actionabilityScore: 68, importanceScore: 84, notes: "Chronology is useful but should be more tightly connected to drivers." },
  { panelName: "Possible Drivers", visibilityScore: 90, discoveryScore: 86, actionabilityScore: 86, importanceScore: 94, notes: "Best immediate causal anchor and should remain pinned." },
  { panelName: "Replay Explanation", visibilityScore: 70, discoveryScore: 66, actionabilityScore: 84, importanceScore: 90, notes: "High value, but currently nested inside a collapsible group with overlapping summary above." },
  { panelName: "Replay Decision Journal", visibilityScore: 68, discoveryScore: 64, actionabilityScore: 88, importanceScore: 82, notes: "Good bridge from analysis to decision process." },
  { panelName: "Similar Historical Events", visibilityScore: 62, discoveryScore: 58, actionabilityScore: 74, importanceScore: 82, notes: "Strong value but partially hidden inside Core Replay Forensics." },
  { panelName: "Setup Outcome Memory", visibilityScore: 62, discoveryScore: 58, actionabilityScore: 82, importanceScore: 84, notes: "Important but should be presented with analogs as one historical context layer." },
  { panelName: "Historical Query Explorer", visibilityScore: 36, discoveryScore: 34, actionabilityScore: 48, importanceScore: 50, notes: "Power-user search tool; not essential to first-pass replay." },
  { panelName: "Market Memory", visibilityScore: 40, discoveryScore: 38, actionabilityScore: 62, importanceScore: 74, notes: "Valuable context is hidden and conceptually overlaps with Event Memory Linker." },
  { panelName: "Expectation Intelligence", visibilityScore: 42, discoveryScore: 42, actionabilityScore: 76, importanceScore: 82, notes: "Should be easier to find because expectation surprise is core to event review." },
  { panelName: "Prediction Markets", visibilityScore: 38, discoveryScore: 36, actionabilityScore: 58, importanceScore: 70, notes: "Useful as source detail inside expectation layer rather than a separate card." },
  { panelName: "Event Memory Linker", visibilityScore: 36, discoveryScore: 32, actionabilityScore: 62, importanceScore: 68, notes: "Powerful but abstract; should be reframed as memory linkage evidence." },
  { panelName: "External Adapter Preview", visibilityScore: 22, discoveryScore: 20, actionabilityScore: 44, importanceScore: 34, notes: "Internal source intake utility; correct to keep collapsed." },
  { panelName: "Polymarket Live Validation", visibilityScore: 20, discoveryScore: 18, actionabilityScore: 42, importanceScore: 32, notes: "Schema QA belongs in advanced workflow." },
  { panelName: "External Review Queue", visibilityScore: 22, discoveryScore: 20, actionabilityScore: 52, importanceScore: 40, notes: "Important for ingestion governance, but not user-facing forensics." },
  { panelName: "Accepted Event Linker", visibilityScore: 20, discoveryScore: 18, actionabilityScore: 48, importanceScore: 38, notes: "Advanced relationship authoring should remain hidden." },
  { panelName: "Relationship Graph", visibilityScore: 24, discoveryScore: 22, actionabilityScore: 54, importanceScore: 56, notes: "Graph becomes useful after links exist; needs better empty-state guidance." },
  { panelName: "Historical Scoring", visibilityScore: 24, discoveryScore: 22, actionabilityScore: 54, importanceScore: 58, notes: "Better as score badges than a full panel." },
  { panelName: "Record Inspector", visibilityScore: 20, discoveryScore: 18, actionabilityScore: 40, importanceScore: 32, notes: "Developer inspection tool." },
  { panelName: "Decision Write Test", visibilityScore: 18, discoveryScore: 16, actionabilityScore: 36, importanceScore: 26, notes: "Internal validation form." },
  { panelName: "Event Ingestion Test", visibilityScore: 18, discoveryScore: 16, actionabilityScore: 36, importanceScore: 26, notes: "Internal validation form." },
  { panelName: "Agent Accuracy", visibilityScore: 40, discoveryScore: 38, actionabilityScore: 68, importanceScore: 70, notes: "Useful, but should be attached to agent committee rather than isolated." },
  { panelName: "Tactical Playbook", visibilityScore: 42, discoveryScore: 40, actionabilityScore: 90, importanceScore: 88, notes: "Too hidden for how actionable it is." },
  { panelName: "Agent Committee", visibilityScore: 40, discoveryScore: 38, actionabilityScore: 62, importanceScore: 68, notes: "Readable but needs calibration context from Agent Accuracy." },
]

