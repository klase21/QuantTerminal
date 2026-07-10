# Trade V2 Improvement Backlog

**Status:** Canonical post-F6 backlog  
**Owner:** Product / Design / Engineering  
**Source:** Trade V2 review and F5.5 Product UX Certification

## Critical

| Item | Purpose | Exit condition |
| --- | --- | --- |
| Remove autonomous/execution framing from current Trade implementation | Align runtime presentation with Decision Workspace ownership | No derived action, tradeability, demo P&L, position sizing, or order-entry implication remains |
| Preserve stable candidate identity and source lineage | Prevent the decision from changing during refresh | Candidate replacement is explicit and context remains traceable |
| Implement Evidence and Counter Evidence contracts | Prevent unsupported decision summaries | Every claim has evidence references or an unavailable state |
| Enforce no-fabrication states | Preserve trust | Missing direction, confidence, price, risk, probability, or plan remains unavailable |

## High

| Item | Purpose | Exit condition |
| --- | --- | --- |
| Implement shared component primitives | Prevent V2 screens from drifting | Trade uses canonical Status, Evidence, Reasoning, Risk, Toolbar, and Repository components |
| Complete shared-context handoffs | Preserve investigation state | Scanner/Replay/Research/Markets/Dashboard routes carry origin, candidate, evidence, and return path |
| Build Decision Readiness evaluator | Explain why planning is ready or incomplete | Candidate, evidence, validation, risk inputs, freshness, and coverage are separately visible |
| Implement scenario authoring with assumption labels | Support transparent conditional thinking | Observed facts, user assumptions, reasoning, conditions, and invalidation are visibly distinct |
| Add Repository lineage panel | Preserve auditability | Candidate, evidence, Replay, Research, and user plan references are reachable |
| Validate protected runtime behavior | Keep Trade responsive | Live and historical evidence failures remain local and non-blocking |

## Medium

| Item | Purpose | Exit condition |
| --- | --- | --- |
| User-authored notes | Capture decision context without changing facts | Notes are versioned and labeled as user content |
| Saved decision packet | Support committee and portfolio workflows | A packet preserves references, assumptions, scenarios, and review state |
| Post-decision review | Connect Trade back to Replay and Research | Review uses source-backed outcome context and never rewrites the original plan |
| Responsive layouts | Support laptop, tablet, and mobile review | Hierarchy survives without shrinking dense panels into unreadable cards |
| Keyboard workflow | Improve professional speed | Search, filters, checklist, evidence drilldown, and handoffs are keyboard accessible |
| Visual regression and accessibility QA | Protect consistency | Canonical states pass contrast, focus, reflow, and snapshot checks |

## Low

| Item | Purpose | Exit condition |
| --- | --- | --- |
| Density preferences | Support beginner and professional depth | Density changes layout only, never evidence truth |
| Saved filters | Accelerate repeated review | Filter scope is visible and stale claims are not persisted as current |
| Print/export layout | Support offline committee review | Export includes provenance, limitations, and generation time |
| Cross-screen return trail | Reduce navigation friction | Origin and return state remain visible throughout the investigation |

## Future

| Item | Purpose | Guardrail |
| --- | --- | --- |
| Collaborative review | Support institutional decision processes | Reviewer identity and evidence version remain auditable |
| Decision history | Compare plans and outcomes over time | Historical records remain immutable and source-backed |
| AI-assisted scenario drafting | Reduce planning effort | AI cites evidence, labels assumptions, and cannot approve its own output |
| Multi-agent review | Separate evidence, reasoning, risk, and validation | Human remains final decision maker |
| Enterprise policy templates | Standardize committee controls | Templates organize review; they do not recommend or execute trades |
| Workspace synchronization | Coordinate Markets, Replay, Research, Scanner, and Trade | Sync is explicit and preserves page ownership |

## Explicitly Rejected

- exchange order-entry controls;
- wallet or account execution;
- autonomous trade recommendation;
- hidden position sizing;
- synthetic confidence or probability;
- demo performance used as current-decision evidence;
- automatic candidate replacement;
- AI approval of its own plan;
- unavailable data displayed as neutral or favorable.

## Release Gate

React implementation may begin after the Critical items are included in the implementation scope and the shared component/context work is sequenced. High items may ship incrementally, but Repository lineage and Decision Readiness must precede production certification.
