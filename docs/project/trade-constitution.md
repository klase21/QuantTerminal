# Trade Constitution

Project Zeta - Trade V2 Sprint T1  
Status: Constitutional baseline  
Scope: Product definition only; no runtime implementation

## 1. Purpose

Trade has one purpose:

```text
How should this validated opportunity be executed?
```

Trade converts inherited, validated context into an execution plan. It assumes that opportunity discovery, thesis formation, evidence evaluation, and historical validation have already occurred upstream.

Trade is not:

- Dashboard: it does not produce the market conclusion.
- Markets: it does not explore or compare live markets.
- Scanner: it does not discover, rank, or prioritize opportunities.
- Research: it does not generate a thesis, narrative, or evidence set.
- Replay: it does not perform historical validation or comparable-case analysis.

If required context is absent, stale, or unvalidated, Trade must show an explicit not-ready, missing, or unavailable state. It must not fabricate an execution plan.

## 2. Primary Users

### Trader

The trader enters Trade from Replay or another approved handoff with a selected symbol and validated opportunity context. The trader uses Trade to define and review the setup, entries, exits, stop loss, targets, sizing, risk controls, and execution checklist.

The trader exits by executing outside the planning surface, returning upstream when validation is insufficient, or abandoning the candidate.

### Analyst

The analyst enters to inspect whether an execution plan is consistent with inherited thesis, structure, evidence, freshness, and validation context. The analyst may identify missing inputs or readiness blockers but does not recreate upstream analysis inside Trade.

The analyst exits to Research for evidence questions, Replay for validation questions, or Markets for current structure context.

### Researcher

The researcher may inspect an execution plan to understand how validated evidence is translated into execution constraints. Researchers do not generate execution plans, choose entries, set risk, or approve execution.

The researcher exits to Research or Replay when evidence or validation requires further investigation.

## 3. Core Decisions

Trade should enable the user to decide:

- whether the inherited opportunity is ready for execution planning;
- how the setup should be expressed;
- where entry conditions are satisfied;
- where the setup is invalidated;
- how exits and targets are structured;
- how much risk and position size are permitted;
- whether every required execution check has passed.

Trade should support:

- execution planning;
- entry planning;
- exit planning;
- stop-loss and invalidation planning;
- target planning;
- position sizing;
- risk management;
- an execution checklist;
- explicit trade-readiness states.

Trade must not:

- discover or rank opportunities;
- generate or rewrite a thesis;
- generate evidence or narratives;
- perform historical validation;
- claim readiness when required real inputs are missing;
- invent prices, risk limits, targets, sizing, confidence, or validation results.

## 4. Ownership

Trade owns:

- execution;
- setup;
- entries;
- exits;
- stop loss and invalidation;
- targets;
- position sizing;
- risk management;
- execution checklist;
- trade readiness.

Trade does not own:

- Dashboard conclusions;
- Markets exploration or market-structure discovery;
- Scanner prioritization or opportunity ranking;
- Research evidence, thesis, or narrative generation;
- Replay validation or historical outcome analysis.

Ownership rule:

```text
Trade plans execution from inherited context.
Trade does not recreate upstream ownership.
```

## 5. Inherited Inputs

The Trade input contract follows `docs/project/replay-trade-readiness.md`.

| Input | Requirement | Owning source | Trade usage |
| --- | --- | --- | --- |
| Symbol | Required | Shared upstream context | Identifies the instrument; remains stable unless the user explicitly changes the candidate. |
| Exchange | Required when available | Markets / shared context | Defines venue-specific execution context without inference. |
| Timeframe | Required when available | Markets / Research / Replay | Frames the setup horizon. |
| Thesis | Optional but preferred | Research | Preserves why the candidate exists; Trade must not rewrite it. |
| Replay result | Optional | Replay | Shows the historical validation outcome when available. |
| Validation context | Optional | Replay | Distinguishes validated, degraded, unavailable, or not-run states. |
| Confidence context | Optional | Research / Dashboard / Scanner | Displays inherited reliability context without recalculation. |
| Structure context | Optional | Markets | Preserves relevant live market structure without recreating exploration. |
| Evidence summary | Optional but preferred | Research | Preserves supporting and conflicting evidence without generating new evidence. |
| Opportunity context | Optional | Scanner | Preserves the selected candidate, direction, reason, priority, and watchlist context. |
| Freshness / health | Optional | Data Health / source pages | Exposes stale, missing, degraded, or unavailable upstream context. |

Trade must not invent missing inherited inputs or silently substitute unrelated context. Missing required execution inputs must produce a clear not-ready or unavailable state with a reason.

## 6. Outputs

Trade may produce:

- an execution plan;
- setup conditions;
- entry conditions or entry plan;
- exit conditions or exit plan;
- stop-loss and invalidation conditions;
- targets;
- position size and risk allocation when valid user and market inputs exist;
- an execution checklist;
- a trade-readiness result;
- explicit blockers and unavailable states.

Trade outputs execution only. Its outputs must remain traceable to inherited context, current real data, and explicit user risk inputs. They must not be presented as new market evidence, research conclusions, opportunity rankings, or replay validation.

## 7. Success Criteria

A successful Trade page allows a user to convert a validated opportunity into an actionable execution plan within approximately 60 seconds.

Success requires that the user can quickly understand:

1. what validated opportunity is being planned;
2. whether the required context is current and sufficient;
3. the setup, entries, exits, stop, targets, and risk constraints;
4. the position size when sufficient real inputs exist;
5. which checklist items or blockers determine trade readiness.

When sufficient context does not exist, success means clearly explaining why the trade is not ready. Implementation details are out of scope for this constitution.

## 8. Constitutional Rules

- Trade inherits context from upstream pages.
- Replay validation must never be recreated or implied by Trade.
- The selected candidate must remain stable unless the user explicitly changes it.
- Real data and explicit user inputs are required for numeric execution outputs.
- Missing or stale context must remain visible.
- `NO DATA`, `MISSING`, `STALE`, `DEGRADED`, and `UNAVAILABLE` are preferable to fabricated values.
- Execution planning must remain responsive and degrade gracefully.
- Future implementation must reuse the shared QuantTerminal design system and token registry without copying another page's layout.

## 9. Validation

- `docs/project/trade-constitution.md` exists.
- No runtime code changed in Sprint T1.
- No Dashboard, Markets, Scanner, Research, or Replay files changed in Sprint T1.
- No package files changed in Sprint T1.
- No build is required for this documentation-only sprint.

