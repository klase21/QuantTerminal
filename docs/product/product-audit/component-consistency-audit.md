# Component Consistency Audit

**Status:** Canonical F5.5 component audit  
**Owner:** Design System / Product Design

## Summary

The five approved V2 designs share a coherent terminal language and reuse the same conceptual components. Visual and semantic consistency are strong. Implementation reuse remains partial because the canonical component contracts are documented and extracted, but a shared production component library and Storybook catalog are not yet established.

## Component Matrix

| Component | Canonical owner | Used by | Visual consistency | Interaction consistency | Naming consistency | Reuse status |
| --- | --- | --- | --- | --- | --- | --- |
| Evidence Card | Evidence System | All five screens | PASS | PASS | PASS | P0 shared contract |
| Metric Card | Data Display | Dashboard, Markets, Replay | PASS | PASS | PASS | P0 shared contract |
| Reasoning Card | Reasoning Presentation | Dashboard, Replay, Research | PASS | PASS WITH GATE | PASS | P0; reasoning state must be explicit |
| Risk Card | Evidence / Presentation | Scanner, Research, future Trade | PASS | PASS | PARTIAL | Normalize counter/conflict terminology |
| Toolbar | Presentation | All dense screens | PASS | PASS | PARTIAL | Standardize `Context Toolbar` naming |
| Navigation | Presentation | All screens | PASS | PASS | PASS | P0 global shell |
| Panel | Layout / owning organism | All screens | PASS | PASS | PASS | Composition primitive, not a generic card |
| Search | Navigation/Search | All screens | PASS | PASS IN CONTRACT | PASS | P0 shared behavior |
| Filter | Filter System | Markets, Scanner, Replay, Research | PASS | PASS IN CONTRACT | PASS | P0 shared behavior |
| Repository Link | Repository Presentation | All evidence workflows | PASS | PASS | PARTIAL | Normalize audit/link labels |
| Confidence Badge | Evidence System | Dashboard, Replay, Research, Scanner | PASS | PASS | PASS | Only source-backed methods |

## Cross-Screen Rules

- Evidence Card always includes fact, source, timestamp, availability, limitation, and drilldown.
- Confidence Badge never invents confidence and displays `UNAVAILABLE` with a reason when absent.
- Reasoning Card is visually distinct from Evidence Card and cites evidence IDs.
- Risk Card keeps counter-evidence, missing information, alternatives, and low-confidence warnings visible.
- Toolbar preserves active context and gives visible feedback for filters.
- Repository Link carries an auditable identity, not merely a generic destination.
- Cards are not nested inside cards; page bands remain unframed compositions.
- Loading, Empty, Ready, Error, Partial, Offline, and Refreshing states retain stable layout.

## Terminology Normalization

| Current variants | Canonical term |
| --- | --- |
| Counter Evidence / Conflicting Evidence | `Counter Evidence` for the product object; `conflictingEvidence` may remain the data-contract field |
| Repository Audit / Repository + Source Audit / Raw Records | `Repository Link` for the action; `Repository Audit` for the destination section |
| Context Toolbar / Market Toolbar / Replay Toolbar | `Context Toolbar` with screen-owned variants |
| Confidence / Evidence Confidence / Quality | `Evidence Confidence` unless an approved reasoning contract explicitly owns thesis confidence |
| No data / Missing / Unavailable | Preserve distinct canonical states; never collapse them |

## Gaps

| Gap | Impact | Action |
| --- | --- | --- |
| No certified shared Figma component library was demonstrated. | Variants may drift during Trade design. | Build Trade from canonical contracts and promote shared primitives before broad React work. |
| No Storybook configuration was found. | Component states and accessibility cannot be reviewed in isolation. | Establish Storybook or an equivalent component catalog during realization planning. |
| Interactive prototypes are not wired across all V2 artifacts. | Focus, hover, keyboard, and return behavior remain untested. | Add prototype and QA coverage before production certification. |
| Responsive variants are specified, not validated screen by screen. | Mobile/tablet hierarchy risk remains. | Validate stable hierarchy at canonical breakpoints. |

## Decision

**PASS WITH MINOR ACTIONS.** Component semantics and visual language are coherent enough for Trade design. React implementation readiness remains partial until shared components and state fixtures exist.
