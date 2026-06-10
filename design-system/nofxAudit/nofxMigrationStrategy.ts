export interface NofxInspiredMigrationPhase {
  phase: string
  goal: string
  actions: string[]
  successCriteria: string[]
}

export const nofxInspiredMigrationPhases: NofxInspiredMigrationPhase[] = [
  {
    phase: "Phase 1: Preserve narrative replay",
    goal: "Keep Replay V3 as a question-first intelligence report.",
    actions: [
      "Keep Case Brief visible first.",
      "Keep sections sequential: what happened, why, history, worked before, watch.",
      "Keep advanced operations collapsed at the bottom.",
    ],
    successCriteria: ["A first-time user can explain the replay case in under one minute."],
  },
  {
    phase: "Phase 2: Route-separate advanced operations",
    goal: "Move source intake, validation, review, linking, graph, scoring, and inspector out of normal Replay.",
    actions: [
      "Create a future Historical Intelligence Ops route.",
      "Keep Replay read-only by default.",
      "Expose operational state through compact health badges only.",
    ],
    successCriteria: ["Replay no longer contains internal workbench forms by default."],
  },
  {
    phase: "Phase 3: Add density modes",
    goal: "Serve beginner, trader, and research workflows without duplicating features.",
    actions: [
      "Beginner mode: narrative explanations and fewer cards.",
      "Trader mode: drivers, invalidation, watch signals, and playbook pinned.",
      "Research mode: analogs, graph, scoring, source lineage, and query tools.",
    ],
    successCriteria: ["Users can switch density without losing selected case context."],
  },
  {
    phase: "Phase 4: Build Tactical Playbook Lab",
    goal: "Separate setup rule authoring from replay review.",
    actions: [
      "Turn Tactical Playbook outputs into editable candidate rules.",
      "Link rules to Setup Outcome Memory.",
      "Keep all outputs marked as decision support, not trading execution.",
    ],
    successCriteria: ["Replay lessons can graduate into playbook candidates without changing Replay into an editor."],
  },
  {
    phase: "Phase 5: NOFX-inspired operating shell",
    goal: "Create a route-level Tactical Decision OS shell.",
    actions: [
      "Navigation: Realtime, Replay, Historical Ops, Playbook Lab, Settings.",
      "Shared selected-context header.",
      "Unified freshness, confidence, and risk states.",
    ],
    successCriteria: ["QuantTerminal feels like one operating system rather than separate dashboards."],
  },
]

export const recommendedQuantTerminalFutureLayout = {
  topShell: ["selected context", "freshness", "confidence", "risk state"],
  primaryRoutes: ["Realtime Tactical Dashboard", "Replay Forensics", "Historical Intelligence Ops", "Playbook Lab", "Settings"],
  replayDefault: ["Case Brief", "Market Drivers Story", "Evidence Timeline", "Historical Context", "What Worked Before", "Watch Signals"],
  advancedDefault: ["Source Intake", "Review Queue", "Accepted Links", "Relationship Graph", "Validation", "Inspector"],
} as const

