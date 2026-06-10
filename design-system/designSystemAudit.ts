export interface QuantDesignSystemAuditItem {
  area: string
  finding: string
  recommendation: string
  priority: "low" | "medium" | "high"
}

export const quantDesignSystemAudit: QuantDesignSystemAuditItem[] = [
  {
    area: "Card hierarchy",
    finding: "Replay now has a primary narrative flow, but several cards still carry panel-era styling and labels.",
    recommendation: "Apply Primary, Secondary, Evidence, Signal, Warning, and Decision card rules consistently.",
    priority: "high",
  },
  {
    area: "Confidence display",
    finding: "Confidence appears across case, driver, expectation, and agent contexts with different meanings.",
    recommendation: "Use one confidence display per section and map values through the 0-30, 31-60, 61-80, 81-100 bands.",
    priority: "high",
  },
  {
    area: "Information density",
    finding: "Replay supports beginner, trader, and research workflows but does not yet expose density modes.",
    recommendation: "Use progressive disclosure now; later add explicit density presets.",
    priority: "medium",
  },
  {
    area: "Color semantics",
    finding: "Cyan, emerald, amber, and rose are used mostly consistently but still depend on component-local choices.",
    recommendation: "Use semantic roles: accent, positive, warning, negative, muted.",
    priority: "medium",
  },
  {
    area: "Advanced tools",
    finding: "Data operations are consolidated but still visually similar to user-facing cards.",
    recommendation: "Keep workbench collapsed and use advanced/internal labeling.",
    priority: "medium",
  },
  {
    area: "NOFX readiness",
    finding: "The report flow is ready for a stronger visual redesign, but token-level rules should come first.",
    recommendation: "Migrate card styling to reusable primitives before introducing a major visual treatment.",
    priority: "high",
  },
]

export const quantDesignSystemAuditSummary = {
  status: "foundation_ready",
  strengths: [
    "Question-first replay hierarchy is now defined.",
    "Core card types and confidence semantics are explicit.",
    "Advanced tools have a clear separation rule.",
  ],
  risks: [
    "Component-local styling can drift without shared primitives.",
    "Confidence can be misread if section meaning is not labeled.",
    "Research tools can overwhelm trader flow if not kept collapsed.",
  ],
  nextRecommendedStep: "Create reusable UI primitives for QuantCard, QuantBadge, QuantSectionHeader, and QuantMetric.",
} as const

