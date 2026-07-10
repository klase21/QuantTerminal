# Trade Readiness Review

**Status:** Canonical F5.5 dependency review  
**Owner:** Product / Trade  
**Decision:** READY FOR TRADE WORKSPACE DESIGN

## Single Responsibility

Trade is the **Decision Workspace** for a user-selected candidate.

Trade is not:

- order entry;
- brokerage or exchange routing;
- a signal generator;
- a recommendation engine;
- an autonomous decision maker;
- a place to manufacture missing thesis, confidence, price, or risk.

The user owns the decision and any action outside QuantTerminal.

## Required Inputs

| Dependency | Owner | Status | Trade use |
| --- | --- | --- | --- |
| Selected candidate identity | Scanner / product context | AVAILABLE IN CONTRACT | Anchor the workspace; never silently replace selection |
| Live market context | Markets | AVAILABLE IN DESIGN | Verify current conditions without duplicating Markets |
| Market orientation | Dashboard | AVAILABLE IN DESIGN | Compact parent context only |
| Evidence references | Evidence / Repository | AVAILABLE IN CONTRACT | Support thesis and risk with auditable facts |
| Counter evidence | Research / Evidence | AVAILABLE IN DESIGN | Preserve disagreement and data gaps |
| Historical validation | Replay | AVAILABLE IN CONTRACT | Show bounded validation result and limitations |
| Research thesis | Research | AVAILABLE IN DESIGN | Carry question, assumptions, support, and conflict |
| Freshness / coverage / availability | Evidence / source governance | AVAILABLE IN CONTRACT | Gate what can support a decision |
| Repository lineage | Repository | AVAILABLE IN CONTRACT | Provide audit links |
| User preferences / notes | Workspace / Trade | FUTURE / PARTIAL | Preserve user-authored planning without changing facts |

## Completed Foundations

- MASTER product, architecture, and engineering boundaries are stable.
- PDGM-106 and Trade Information Hierarchy define purpose and depth.
- Dashboard, Markets, Scanner, Replay, and Research handoff responsibilities are certified.
- Evidence, counter-evidence, confidence, freshness, coverage, and Repository states have canonical component contracts.
- Replay -> Trade shared context already requires validation and replay results.
- Selected-candidate stability is an existing Trade rule.
- No-fabrication and human-decision authority are permanent invariants.

## Remaining Design Gaps

| Gap | Required Trade decision |
| --- | --- |
| Candidate entry and replacement | Define explicit selection, replacement confirmation, and return path to Scanner. |
| Risk ownership | Define candidate-specific downside, invalidation, uncertainty, and scenarios without a synthetic aggregate risk score. |
| Scenario model | Separate observed facts, user assumptions, and hypothetical scenarios visually and semantically. |
| Evidence sufficiency | Define when the workspace is Partial, Unavailable, or Ready for user review. |
| Notes and export | Keep user-authored notes distinct from Repository facts and generated reasoning. |
| Shared component realization | Reuse canonical cards and states; do not create Trade-only copies. |
| Responsive and accessibility behavior | Define desktop productivity and mobile review without shrinking the workspace incoherently. |

## Required Information Hierarchy

```text
Selected Candidate
  -> Trade Thesis
  -> Supporting Evidence
  -> Counter Evidence
  -> Risk and Invalidation
  -> Scenarios
  -> Historical Validation
  -> User Notes
  -> User Decision
```

No order ticket, leverage control, exchange account, or execute action belongs in this hierarchy.

## Trade Entry Paths

- Scanner -> Trade after explicit user selection.
- Replay -> Trade after historical validation.
- Research -> Trade after thesis review.
- Dashboard or Markets -> Trade only when a stable selected candidate already exists.

Every entry preserves origin, candidate, symbol, timeframe, evidence references, freshness, coverage, and return path. Direct entry remains possible but displays `NO SELECTED CANDIDATE` rather than creating one.

## Exit Criteria for Trade Design

- Evidence precedes thesis interpretation and action planning.
- Counter-evidence and missing data remain visible.
- Scenarios are labeled as user or reasoning assumptions, never facts.
- Repository lineage remains reachable.
- Trade never changes upstream evidence state.
- The primary action is a user-owned decision state such as monitor, reject, or record a plan, not order execution.

## Decision

Trade has all architectural dependencies required to begin canonical design. Remaining gaps are Trade-specific design decisions, not upstream uncertainty.
