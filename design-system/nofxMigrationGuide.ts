export interface QuantNofxMigrationStep {
  phase: string
  goal: string
  actions: string[]
  avoid: string[]
}

export const quantNofxMigrationGuide: QuantNofxMigrationStep[] = [
  {
    phase: "Phase 1: Token discipline",
    goal: "Make current dark fintech UI consistent before visual redesign.",
    actions: [
      "Replace component-local confidence badges with shared confidence bands.",
      "Normalize card types across Replay consolidated panels.",
      "Use semantic color roles instead of ad hoc color meaning.",
    ],
    avoid: ["Large visual redesign", "new engines", "new APIs"],
  },
  {
    phase: "Phase 2: Component primitives",
    goal: "Introduce reusable primitives without changing intelligence contracts.",
    actions: [
      "Create QuantCard, QuantBadge, QuantMetric, QuantEvidenceList, and QuantSectionHeader.",
      "Migrate Case Brief first, then Historical Context, Expectation Context, Agent Read.",
      "Keep Data Operations Workbench visually separate.",
    ],
    avoid: ["Changing replay logic", "rewiring repositories", "touching realtime data"],
  },
  {
    phase: "Phase 3: NOFX visual layer",
    goal: "Apply a more distinct investigation-report aesthetic.",
    actions: [
      "Use stronger report-like section rhythm.",
      "Represent the memory chain as a compact trace.",
      "Make the primary narrative feel editorial while retaining terminal density.",
    ],
    avoid: ["Marketing-page hero patterns", "decorative gradients without information value", "large empty panels"],
  },
  {
    phase: "Phase 4: Density modes",
    goal: "Support Beginner, Trader, and Research views without separate products.",
    actions: [
      "Beginner: default to narrative flow and explanations.",
      "Trader: pin drivers, playbook, invalidation, and watch signals.",
      "Research: expose query, graph, inspector, scoring, and review workflow.",
    ],
    avoid: ["Showing all panels to all users", "duplicating routes for each mode"],
  },
]

export const futureNofxCardStructure = {
  primaryReportCard: ["question", "verdict", "confidence", "one-sentence read", "supporting evidence"],
  investigationStep: ["section question", "causal read", "evidence for", "evidence against", "next prompt"],
  memoryTrace: ["event", "analog", "decision", "outcome", "playbook"],
  decisionBlock: ["hypothetical decision", "invalidation", "mistake", "future rule"],
} as const

