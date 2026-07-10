import type {
  CounterEvidenceViewModel,
  EvidenceViewModel,
  MetricViewModel,
  ReasoningViewModel,
} from "@/lib/design-system/contracts/view-models"

export const PREVIEW_FIXTURE_LABEL = "Synthetic preview - demonstration values only"
export const PREVIEW_OBSERVED_AT = "2025-01-15T08:00:00.000Z"

export const previewEvidence: EvidenceViewModel = {
  id: "example-evidence-001",
  title: "Example evidence observation",
  summary: "Demonstration value used to verify layout and component states.",
  evidenceType: "Example fixture",
  lifecycle: "READY",
  availability: { state: "AVAILABLE" },
  freshness: { state: "CURRENT", observedAt: PREVIEW_OBSERVED_AT },
  coverage: { state: "PARTIAL", actualRecords: 2, expectedRecords: 3, percent: 66.67 },
  confidence: { state: "AVAILABLE", value: "Moderate", basis: "Example fixture basis" },
  provenance: {
    sourceId: "example-fixture",
    sourceName: "Example fixture",
    providerTier: "UNKNOWN",
    observedAt: PREVIEW_OBSERVED_AT,
  },
  supportingEvidenceCount: 2,
  hasCounterEvidence: true,
  limitation: "Synthetic preview. Not current market evidence.",
  repository: { available: false, unavailableReason: "Synthetic fixtures have no Repository record." },
}

export const previewUnavailableEvidence: EvidenceViewModel = {
  ...previewEvidence,
  id: "example-evidence-unavailable",
  title: "Unavailable evidence example",
  summary: null,
  lifecycle: "READY",
  availability: { state: "UNAVAILABLE", reason: "Example source was not supplied." },
  freshness: { state: "UNKNOWN", reason: "No provider timestamp is available." },
  coverage: { state: "MISSING", reason: "No example records are available." },
  confidence: { state: "UNAVAILABLE", reason: "Confidence was not supplied." },
  provenance: null,
  supportingEvidenceCount: null,
  hasCounterEvidence: null,
}

export const previewMetric: MetricViewModel = {
  id: "example-metric-001",
  label: "Demonstration metric",
  value: 42,
  unit: "example units",
  delta: "+2 example units",
  lifecycle: "READY",
  availability: { state: "AVAILABLE" },
  freshness: { state: "CURRENT", observedAt: PREVIEW_OBSERVED_AT },
  provenance: { sourceId: "example-fixture", sourceName: "Example fixture" },
}

export const previewReasoning: ReasoningViewModel = {
  id: "example-reasoning-001",
  summary: "Demonstration reasoning linked to explicit synthetic evidence references.",
  lifecycle: "READY",
  availability: { state: "AVAILABLE" },
  supportingEvidence: [{ id: previewEvidence.id, label: previewEvidence.title }],
  counterEvidence: [{ id: "example-counter-001", label: "Example counter evidence" }],
  assumptions: ["This is a synthetic preview assumption."],
  confidence: { state: "AVAILABLE", value: "Limited", basis: "Example fixture basis" },
  freshness: { state: "CURRENT", observedAt: PREVIEW_OBSERVED_AT },
}

export const previewCounterEvidence: CounterEvidenceViewModel = {
  id: "example-counter-001",
  observation: "Demonstration observation that limits the example claim.",
  affectedClaim: "Example evidence observation",
  lifecycle: "READY",
  availability: { state: "EXPERIMENTAL", reason: "Synthetic preview evidence is non-canonical." },
  freshness: { state: "CURRENT", observedAt: PREVIEW_OBSERVED_AT },
  confidence: { state: "UNAVAILABLE", reason: "No confidence supplied for the example." },
  provenance: { sourceId: "example-fixture", sourceName: "Example fixture", providerTier: "UNKNOWN" },
  unresolved: true,
  repository: { available: false, unavailableReason: "Synthetic fixtures have no Repository record." },
}
