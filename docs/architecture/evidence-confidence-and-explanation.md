# Evidence Confidence and Explanation

## Independent Dimensions

Coverage, Freshness, Quality, Consistency, Availability, and Confidence are distinct. Provider Tier is eligibility metadata. Prediction probability is context. Evidence readiness is not confidence.

## Components

Future governed components may include input availability, coverage, freshness, quality, consistency, provider diversity, conflict burden, policy completeness, and model/explanation certainty where applicable.

Each component records status, evaluation references, policy/version, applicability, limitations, and optional governed value. Missing components remain missing and components need not be comparable across Profiles.

Phase 0 approves no weights or thresholds. An aggregate is prohibited until policy defines calculation, missing behavior, comparability, precision, and reconstruction. Component detail remains inspectable.

## Explanation Model

~~~mermaid
flowchart TD
  C["Bounded Conclusion / State Code"] --> R["Primary Reason Codes"]
  R --> E["Supporting and Conflicting Evidence"]
  E --> F["Exact Canonical Fact Versions"]
  F --> S["Raw Source Lineage"]
  E --> M["Missing / Unsupported / Uncertain Inputs"]
  E --> A["Alternative Explanation Codes"]
~~~

UI ordering is a projection, not truth. A conclusion code cannot omit conflict or uncertainty references.

## AI/LLM Boundary

AI may later render prose, summarize, simplify, translate, or propose explicitly labeled alternative hypotheses. It may not invent facts, alter classifications, override Results, hide conflicts, calculate canonical components, or mutate lineage.

Generated text binds Packet ID/version, structured input checksum, model ID/version, prompt/renderer version, generation time, and output checksum. It is replaceable and excluded from Evidence identity.
