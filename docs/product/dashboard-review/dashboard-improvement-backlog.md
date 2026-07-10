# Dashboard Improvement Backlog

**Status:** Canonical F1 backlog  
**Owner:** Product Design and Frontend Engineering  
**Rule:** Backlog priority does not authorize implementation or architecture changes

## Critical

| Item | Reason | Dependency | Exit criterion |
| --- | --- | --- | --- |
| Remove fabricated or unsupported display values | Product truth is non-negotiable | Source contracts, State Model | Every value is source-backed or explicitly unavailable |
| Standardize all data states | V1 lacks complete loading, empty, stale, offline, partial, and error behavior | Design System State Model | Every data component has reviewed canonical states |
| Put source metadata on evidence | Direction and drivers cannot be trusted without provenance | Evidence Card, Repository Link | Source, timestamp, freshness, availability, limitation visible |
| Enforce evidence-before-reasoning order | Unsupported conclusions violate architecture | PDGM-108, Reasoning Card | Reading and interaction order verified |
| Preserve ADR-001 | Embedded historical workflows would regress responsiveness and ownership | Replay / Research handoff | No Dashboard analog computation or polling exists |
| Establish accessible minimums | V1 includes sub-10px content and color-only state | Typography, Accessibility | Contrast, size, keyboard, focus, and non-color cues pass review |

## High

| Item | Reason | Dependency | Exit criterion |
| --- | --- | --- | --- |
| Replace mosaic with hierarchy-led grid | Equal visual weight slows first understanding | Dashboard blueprint, spacing/grid | First state understood within five seconds |
| Introduce canonical navigation rail | V1 navigation is compressed and incomplete | PDGM-107 | All primary destinations and active context visible |
| Add context toolbar | Professionals need symbol, time, freshness, search, and density context | Toolbar, Search, Filter | Context survives cross-navigation |
| Convert Key Drivers to Evidence Cards | Drivers need source and limitation semantics | Evidence Card | Each driver has evidence identity and drilldown |
| Add Evidence Readiness | Users must know when a market state is sufficiently supported | Status Panel | Complete, partial, stale, unavailable states defined |
| Add Repository provenance path | Raw facts must remain reachable | Repository Link | Evidence-to-record route verified |
| Define responsive layouts | V1 breaks below desktop | Responsive System | Desktop, laptop, tablet, and mobile frames approved |
| Remove duplicate metrics | Repetition adds noise without decision value | Information-object inventory | Each repeated metric has distinct purpose or is removed |

## Medium

| Item | Reason | Dependency | Exit criterion |
| --- | --- | --- | --- |
| Add density / focus modes | Serve beginner and professional users without separate products | PDGM-110 | Density changes preserve evidence and state |
| Add Opportunity and Risk pairing | Trade preparation requires balanced opportunity and limitation | Alerts, Risk Panel | Both sides visible and evidence-backed |
| Reframe News Flow as Research Preview | Dashboard is not a news feed | Research Preview Card | Only approved source-backed items appear |
| Improve market-map semantics | Area and color need explicit meaning | Attention Map | Legend, labels, and accessible alternative present |
| Add keyboard workflow | Professional scanning benefits from fast navigation | Navigation, focus system | Core regions reachable and focus visible |
| Add local refresh feedback | Live updates should not replace content with global loading | Refreshing state | Existing valid content remains visible during refresh |
| Document transition behavior | Changes need orientation without animation noise | Motion system | Reduced-motion and stable-layout behavior approved |

## Low

| Item | Reason | Dependency | Exit criterion |
| --- | --- | --- | --- |
| Refine terminal microcopy | Improve clarity while preserving professional voice | Content review | State and action language consistent |
| Align icon semantics | V1 controls use inconsistent or unlabeled symbols | Iconography | Familiar icons and accessible names verified |
| Normalize panel metadata position | Predictable scanning reduces cognitive load | Component contracts | Source/freshness placement consistent |
| Add saved view affordance | Repeated workflows benefit from preserved layout | PDGM-109 | Core screens stable and Workspace review complete |

## Future

| Item | Why deferred | Required gate |
| --- | --- | --- |
| User-configurable multi-panel layout | Workspace remains partially specified | Core screen and component stabilization |
| Collaborative review and shared layouts | Enterprise collaboration architecture is future work | Workspace and permissions blueprint |
| AI-assisted navigation | AI must remain evidence-bound and independently reviewed | AI interaction architecture and governance |
| Personalized evidence prioritization | Personalization must not alter evidence truth | Preference and explainability contracts |
| Alert automation | Automation and attention routing require separate ownership | Automation architecture |
| Embedded historical analog | Prohibited on Dashboard | No planned gate; historical workflows remain in Replay / Research |

## Suggested Sequence

```text
Truth and state integrity
  -> hierarchy and navigation
  -> evidence and provenance
  -> responsive / accessibility
  -> professional interaction
  -> optional personalization
```

## Backlog Governance

- Critical items block canonical implementation approval.
- High items block Dashboard V2 baseline certification.
- Medium items may ship incrementally after baseline review.
- Low items require no contract change unless semantics shift.
- Future items require their own blueprint or architecture gate.

