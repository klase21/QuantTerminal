# Scanner Cross-Page Integration Review

Status: Sprint S7 review  
Scope: Dashboard, Markets, Scanner integration coherence  
Runtime impact: none

## 1. Review Inputs

Frozen state documents:

- `docs/project/dashboard-v2-state.md`
- `docs/project/markets-v2-state.md`
- `docs/project/scanner-v2-state.md`

Inspected implementation:

- `components/product/DashboardV1.tsx`
- `components/markets/MarketsPage.tsx`
- `components/scanner/ScannerPage.tsx`

This is a review-only document. No runtime code was modified.

## 2. Workflow Review

Intended product flow:

```text
Dashboard
  -> Markets
  -> Scanner
  -> Research
  -> Replay
  -> Trade
```

### Dashboard

Role in flow:

- establishes market state;
- answers what is happening;
- presents conclusion, drivers, evidence, and analytics in that order.

Review:

- Dashboard correctly remains the conclusion surface.
- Dashboard links tactical opportunities toward Markets rather than trying to become Scanner.
- Dashboard does not need to own Scanner's ranked signal queue.

### Markets

Role in flow:

- validates live market structure;
- compares ranked live markets;
- exposes breadth, sector rotation, exchange context, capital flow, and market movers.

Review:

- Markets correctly remains the dense live validation workspace.
- Markets and Scanner both touch opportunity discovery, but the split is coherent:
  - Markets validates live market structure.
  - Scanner prioritizes which signals deserve attention.

### Scanner

Role in flow:

- turns market activity into an attention queue;
- prioritizes signals;
- routes the user to deeper pages.

Review:

- Scanner occupies the correct position as attention triage between live market validation and deeper investigation.
- Scanner can also function as a direct entry point for active traders, but its frozen state does not conflict with the Dashboard or Markets reference boundaries.

### Research

Role in flow:

- explains implications and evidence.

Review:

- Scanner provides Research handoff links.
- Scanner does not embed Research narratives.

### Replay

Role in flow:

- validates what happened historically.

Review:

- Scanner provides Replay handoff links.
- Scanner does not load replay data or perform replay validation.

### Trade

Role in flow:

- supports execution planning after a candidate is selected.

Review:

- Scanner provides Trade handoff links.
- Scanner does not expose entries, stops, take-profit levels, position sizing, or execution plans.

Workflow decision:

```text
PASS WITH KNOWN LIMITATIONS
```

Scanner occupies the correct position as the attention layer. The main limitation is that Markets and Scanner both use market-mover concepts, so future work must keep their language and section ownership distinct.

## 3. Boundary Review

### Dashboard Conclusions

Result: PASS

Scanner does not duplicate:

- Market Direction;
- Dashboard hero;
- Dashboard top-level market conclusion;
- Dashboard conclusion-first framing.

Overlap:

- Scanner Summary exposes source health and scan metrics, but it does not state overall market direction.

Disposition:

- acceptable.

### Markets Exploration

Result: PASS WITH KNOWN LIMITATION

Scanner does not duplicate:

- full Markets hierarchy;
- sector rotation workspace;
- exchange overview workspace;
- dense live analytics;
- orderbook or trade-flow exploration.

Overlap:

- Scanner and Markets both use market movers and ranked opportunities.
- Scanner shows Supporting Context with market breadth summary.

Disposition:

- acceptable as long as Scanner remains signal triage and Markets remains live structure validation.
- Future Scanner work must not expand Supporting Context into a Markets clone.

### Research Narratives

Result: PASS

Scanner does not duplicate:

- narrative panels;
- article-style investigation;
- Historical Analog workflow;
- Event Impact workflow;
- Market Memory workflow.

Overlap:

- Scanner links to Research and uses existing Scanner opportunity context that may incorporate narrative heat internally.

Disposition:

- acceptable.

### Replay Validation

Result: PASS

Scanner does not duplicate:

- Replay chart;
- liquidation replay;
- OI replay;
- funding replay;
- orderbook replay;
- Flow Replay validation.

Overlap:

- Scanner has Replay handoff links only.

Disposition:

- acceptable.

### Trade Execution

Result: PASS WITH KNOWN LIMITATION

Scanner does not duplicate:

- execution planning;
- position sizing;
- stop-loss levels;
- take-profit levels;
- entry planning.

Overlap:

- Scanner exposes `Open Trade`.
- Scanner rows display `RR` and `Tradeable`.

Disposition:

- accepted limitation from Scanner freeze.
- Future Scanner work must keep execution details inside Trade.

## 4. Navigation Review

| Scanner Area | Current Destination | Review |
| --- | --- | --- |
| Priority Opportunity | Markets and Research | Correct. Markets validates live structure; Research reviews evidence. |
| Signal Feed | Markets and Trade | Partially correct. Markets is appropriate; Trade handoff is acceptable but sensitive. Research and Replay are not row-level actions here. |
| Opportunity Filters | None | Acceptable. Filters are non-interactive in the frozen state. |
| Watchlist Candidates | None | Known limitation. Future handoff point could route candidate to Markets or Research. |
| Supporting Context | None | Correct. Context is secondary and should not become a destination driver. |
| Navigation Actions | Markets, Research, Replay, Trade | Correct. This provides the explicit cross-page handoff layer from the highest-priority available signal. |

Future handoff points:

- Watchlist Candidate -> Markets.
- Watchlist Candidate -> Research.
- Signal Feed item -> Research.
- Signal Feed item -> Replay when historical context exists.

Do not implement these without a documented post-freeze sprint.

## 5. Consistency Review

### Terminology

Aligned:

- Dashboard uses `Market Direction`, `Top Drivers`, `Evidence Preview`.
- Markets uses `Ranked Opportunities`, `Market Breadth`, `Supporting Analytics`.
- Scanner uses `Priority Opportunities`, `Signal Feed`, `Opportunity Filters`, and `Navigation Actions`.

Inconsistencies:

- Scanner still uses source terms such as `Tradeable`, `RR`, `FRESH`, `DEVELOPING`, `MATURE`, `LATE`, `AGING`, and setup lifecycle labels.
- Dashboard uses `Confidence`, `Driver Count`, and `Data Health`; Scanner uses source-health language and scan freshness instead.

Disposition:

- acceptable for frozen state.
- Badge and terminology normalization is a documented future item.

### Badge Vocabulary

Aligned:

- Scanner uses text plus color for statuses.
- Scanner maps loading, missing, unavailable, stale-like, current-like, and intermediate states visually.

Inconsistencies:

- Scanner source labels are not fully canonicalized to `CURRENT`, `VERIFIED`, `PARTIAL`, `DEGRADED`, `STALE`, `LOADING`, `MISSING`, and `UNAVAILABLE`.

Disposition:

- accepted limitation.

### Section Naming

Aligned:

- Scanner section names match the frozen hierarchy.
- Scanner names do not duplicate Dashboard or Markets exactly except where concepts are intentionally adjacent.

Inconsistencies:

- `Opportunity Filters` currently reads like a filter section but is non-interactive category readiness.

Disposition:

- accepted limitation.

### Visual Hierarchy

Aligned:

- Scanner Summary appears first.
- Priority Opportunities appear before Signal Feed.
- Supporting Context appears below signal-priority sections.
- Navigation Actions appear at the end.

Inconsistencies:

- Scanner has not received a dedicated responsive certification.
- Some dense row treatment remains closer to Markets than Dashboard.

Disposition:

- acceptable for frozen state, but should be checked in a future responsive certification sprint.

### Design Language

Aligned:

- Dashboard, Markets, and Scanner share terminal surfaces, dense monospace typography, cyan metadata, amber hierarchy, and explicit unavailable states.

Inconsistencies:

- Scanner implements local visual constants rather than a shared token module.
- Markets and Scanner both use market-mover language, so future product review should guard against page convergence.

Disposition:

- accepted limitation.

## 6. Known Cross-Page Limitations

Do not fix these in this sprint.

### Missing Handoffs

- Watchlist Candidates do not yet provide explicit row-level handoffs.
- Signal Feed lacks Research and Replay row-level handoffs.
- Replay handoffs do not guarantee replay-compatible case context.

### Duplicated Concepts

- Markets and Scanner both expose ranked opportunities / market movers.
- Scanner Supporting Context includes market breadth, which also belongs to Markets.
- Scanner still displays Trade-adjacent `RR` and `Tradeable` labels.

### Future Integration Points

- Shared investigation context handoff from Scanner to Research.
- Replay-compatible signal detection before showing Replay as a strong action.
- Row-level Scanner -> Markets context preservation.
- Row-level Scanner -> Research context preservation.
- Scanner data health alignment with Dashboard and Markets health badges.
- Badge vocabulary normalization across Dashboard, Markets, and Scanner.

## 7. Recommendation

Decision:

```text
PASS WITH KNOWN LIMITATIONS
```

Justification:

Scanner integrates coherently with the frozen Dashboard and Markets pages. Dashboard remains the conclusion surface, Markets remains the dense live validation workspace, and Scanner now occupies the attention-triage role. Scanner provides appropriate handoffs to Markets, Research, Replay, and Trade without embedding those workflows.

The recommendation is limited because Scanner and Markets share market-mover concepts, Scanner filters are not interactive, some handoffs are section-level rather than row-level, and badge vocabulary is not fully canonicalized.

## 8. Validation

Sprint S7 validation:

- `docs/project/scanner-cross-page-review.md` exists.
- No runtime files were modified for this sprint.
- No Dashboard files were modified for this sprint.
- No Markets files were modified for this sprint.
- No package files were modified for this sprint.
- No build was required.

