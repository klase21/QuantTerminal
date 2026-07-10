# Evidence Flow Audit

**Status:** Canonical F5.5 product audit  
**Owner:** Evidence Presentation / Product  
**Scope:** Cross-product evidence lineage and decision support

## Canonical Flow

```text
Repository Facts
  -> Evidence
  -> Reasoning
  -> Counter Evidence
  -> Historical Context
  -> Decision Support
  -> Optional Trade
```

The flow is ordered by trust, not by visual prominence. No downstream layer may overwrite, upgrade, or reinterpret the availability of an upstream fact.

## Layer Audit

| Layer | Canonical owner | Product presentation | Input | Output | Result |
| --- | --- | --- | --- | --- | --- |
| Facts | Repository | Repository Link / Viewer | Source-backed immutable records | Auditable facts and lineage | PASS |
| Evidence | Evidence layer | Evidence Card, Metric Card | Facts, source, observed time, availability, coverage | Scannable observation with limitations | PASS |
| Reasoning | Reasoning layer | Reasoning Card | Explicit evidence references | Bounded interpretation and assumptions | PASS WITH GATE |
| Counter Evidence | Evidence / Research | Counter Evidence Card, Risk Card | Contradictory facts, gaps, alternative explanations | Visible uncertainty | PASS |
| Historical Context | Replay and Research | Timeline, related study, Repository link | Bounded historical facts | Sequence or comparison without fabricated analog | PASS |
| Decision Support | Product workflows | Investigation path, risk, scenario, next step | Evidence, conflict, context | User-understandable options | PASS |
| Optional Trade | Trade | Future Decision Workspace | Selected candidate and complete evidence trail | User-owned plan | READY FOR DESIGN |

## Screen Contributions

| Screen | Evidence responsibility | Forbidden substitution |
| --- | --- | --- |
| Markets | Present live market, sector, flow, derivatives, macro, and prediction evidence | Missing evidence cannot become market neutrality or a global regime |
| Dashboard | Select the smallest evidence set needed for orientation | Cannot host heavy historical analysis or restore Dashboard Historical Analog |
| Replay | Order factual observations chronologically inside a bounded window | Cannot invent cause or block on expensive orderbook reconstruction |
| Research | Assemble support, contradiction, assumptions, and sources | Cannot become a feed or suppress disagreement |
| Scanner | Rank only source-backed investigation candidates and expose basis | Cannot create a setup, direction, confidence, or trade recommendation |

## Missing Links

| Finding | Severity | Required action |
| --- | --- | --- |
| A universal evidence-reference payload is not yet demonstrated across every lateral handoff. | Minor | Carry evidence identity, source state, and Repository route in the shared context envelope. |
| Reasoning approval/version state is specified but not implemented as a shared product component. | Minor | Keep reasoning unavailable until an approved reasoning contract exists. |
| Repository candidate availability is not yet wired on the current Scanner page. | Minor | Implement explicit available/unavailable Repository state during Scanner realization. |
| Historical analog is named in broad master hierarchy but intentionally excluded from Dashboard. | Resolved boundary | Keep analog work in Replay and Research; Dashboard provides a handoff only. |

## Duplicate Evidence Rules

- The same fact may appear as a compact preview and a detailed card only when each serves a distinct depth.
- Repeated cards must retain one evidence identity and one source state.
- A summary count is not a second piece of evidence.
- Reasoning may cite evidence; it may not restate the evidence as a new fact.
- Scanner priority may reference evidence; it may not duplicate Evidence ownership.

## Broken-Flow Tests

| Condition | Required behavior | Result |
| --- | --- | --- |
| Missing funding | Show missing evidence; never infer neutral leverage | PASS IN CONTRACT |
| Experimental liquidation | Display non-canonical provider tier and limitation | PASS IN CONTRACT |
| Stale source | Preserve last observation and label `STALE` | PASS IN CONTRACT |
| Missing historical window | Replay shows unavailable reason and remains responsive | PASS IN CONTRACT |
| Unsupported reasoning | Show no conclusion; preserve facts and next investigation path | PASS IN CONTRACT |
| No Scanner candidate | Do not create an opportunity from market movement | PASS IN CONTRACT |

## Ownership Conflicts

No structural ownership conflict was found. Risk is distributed by domain but remains semantically distinct: Markets shows market risk context, Scanner shows investigation uncertainty, Research shows contradiction, and Trade will own candidate-specific decision risk. The user owns the decision.

## Decision

**PASS WITH MINOR ACTIONS.** The evidence chain is complete and no screen is authorized to fabricate a missing link. Trade may consume the chain after its decision boundary is documented in the canonical design.
