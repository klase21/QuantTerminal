import type {
  AvailabilityModel,
  ConfidenceModel,
  EvidenceViewModel,
  FreshnessModel,
  LifecycleState,
} from "@/lib/design-system"

const lifecycle = "READY" satisfies LifecycleState
const availability = { state: "UNAVAILABLE", reason: "Type fixture" } satisfies AvailabilityModel
const freshness = { state: "UNKNOWN", reason: "Type fixture" } satisfies FreshnessModel
const confidence = { state: "UNAVAILABLE", reason: "Type fixture" } satisfies ConfidenceModel

const evidence = {
  id: "type-fixture",
  title: "Type fixture",
  evidenceType: "Synthetic preview",
  lifecycle,
  availability,
  freshness,
  confidence,
} satisfies EvidenceViewModel

// @ts-expect-error lifecycle and availability are separate closed unions.
const invalidLifecycle: LifecycleState = "UNAVAILABLE"

// @ts-expect-error unsupported availability labels must fail compilation.
const invalidAvailability: AvailabilityModel = { state: "NOT_A_STATE" }

export { availability, confidence, evidence, freshness, lifecycle, invalidAvailability, invalidLifecycle }
