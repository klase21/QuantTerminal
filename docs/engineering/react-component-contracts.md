# React Component Contracts

## Independent State Concepts

| Concept | Values | Owner |
|---|---|---|
| Lifecycle | `LOADING`, `EMPTY`, `READY`, `ERROR`, `PARTIAL`, `OFFLINE`, `REFRESHING` | Component rendering state |
| Availability | `AVAILABLE`, `UNAVAILABLE`, `STALE`, `MISSING`, `EXPERIMENTAL` | Data usability state |
| Freshness | supplied observation and freshness description | Source-time limitation |
| Coverage | supplied status and optional measured amount | Dataset completeness |
| Confidence | supplied qualitative level or unavailable reason | Evidence trust, never coverage |

No contract derives one concept from another.

## P0 Contracts

- `EvidenceCard`: renders supplied claim, source, observation time, provenance, availability, freshness, counts, limitations, and optional valid Repository handoff.
- `MetricCard`: renders an explicitly supplied value. Missing or unavailable values render a textual unavailable state, never zero or neutral.
- `ConfidenceIndicator`: renders supplied qualitative confidence only; it never converts confidence to a percentage.
- `ReasoningCard`: requires supporting evidence references before it renders reasoning content.
- `CounterEvidenceCard`: preserves contradiction, affected claim, source, unresolved state, confidence, and availability.
- `RepositoryLink`: renders a link only when a handoff is explicitly available and has an `href`.
- feedback components: expose state through text and semantic structure, not color alone.

## Primitive Contracts

`Button`, `IconButton`, `Badge`, `Chip`, `Divider`, `Spinner`, `Progress`, and `VisuallyHidden` use semantic tokens. Native controls retain native keyboard behavior. Icon-only controls require an accessible label. Disabled controls use the native disabled state.

`Panel`, `Section`, `Stack`, and `Inline` are layout-only and never own market semantics.

## Fixture Contract

Preview fixtures are deterministic, fixed-time, and labeled `Synthetic preview`, `Example fixture`, or `Demonstration value`. They are not valid production inputs and must never be imported into product orchestration.

