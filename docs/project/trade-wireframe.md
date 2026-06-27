# Trade Wireframe

Project Zeta - Trade V2 Sprint T2  
Status: Textual wireframe  
Runtime behavior: none  
Visual mockups: none

## Desktop Wireframe

```text
+----------------------------------------------------------------------------+
| TRADE SUMMARY                                                              |
| Candidate / Thesis                  Symbol / Exchange / Timeframe           |
| Inherited Replay Validation         Freshness / Health                     |
+----------------------------------------------------------------------------+

+-----------------------------+----------------------------------------------+
| EXECUTION READINESS         | EXECUTION SETUP                              |
| READY / NOT READY / ...     | Direction / Conditions / Trigger            |
| Blocking reasons            | Invalidation context / Setup status          |
+-----------------------------+----------------------------------------------+

+--------------------------------------+-------------------------------------+
| ENTRY PLAN                           | EXIT PLAN                           |
| Entry conditions                     | Stop / Invalidation                |
| Level or range, if supported         | Targets / Reduction / Close        |
| Confirmation / Order approach        | Unavailable reasons               |
+--------------------------------------+-------------------------------------+

+--------------------------------------+-------------------------------------+
| RISK MANAGEMENT                      | EXECUTION CHECKLIST                 |
| Risk limit / Position size           | [ ] Validation supplied            |
| Fees / Slippage, when available      | [ ] Setup complete                 |
| Constraints / Not-ready reason       | [ ] Entry / Exit / Risk complete   |
+--------------------------------------+-------------------------------------+

+----------------------------------------------------------------------------+
| TRADE METADATA                                                             |
| Candidate ID / Sources / observedAt / generatedAt / Plan state             |
+----------------------------------------------------------------------------+

+----------------------------------------------------------------------------+
| NAVIGATION ACTIONS                                                         |
| [Research] Need evidence       [Replay] Need validation                    |
| [Markets] Market context       [Scanner] New opportunity                   |
| [Dashboard] Monitor after planning or execution                            |
+----------------------------------------------------------------------------+
```

### Desktop Notes

- Trade Summary and Execution Readiness form the first-read layer.
- Execution Setup follows readiness; it never precedes the gate.
- Entry and Exit Plans are paired for direct comparison.
- Risk Management and Execution Checklist are paired because sizing cannot imply readiness by itself.
- Metadata and navigation remain lower priority.
- Unavailable values retain their space and reason; they are not replaced with estimates.

## Tablet Wireframe

```text
+----------------------------------------------------------+
| TRADE SUMMARY                                            |
| Candidate / Symbol / Exchange / Timeframe                |
| Validation / Freshness / Health                          |
+----------------------------------------------------------+

+----------------------------------------------------------+
| EXECUTION READINESS                                      |
| Status / Reasons / Required handoff                      |
+----------------------------------------------------------+

+----------------------------------------------------------+
| EXECUTION SETUP                                          |
| Conditions / Trigger / Invalidation                      |
+----------------------------------------------------------+

+----------------------------+-----------------------------+
| ENTRY PLAN                 | EXIT PLAN                   |
| Conditions / Levels       | Stop / Targets / Exits      |
+----------------------------+-----------------------------+

+----------------------------+-----------------------------+
| RISK MANAGEMENT            | EXECUTION CHECKLIST         |
| Limit / Size / Constraints | Completion / Blockers       |
+----------------------------+-----------------------------+

+----------------------------------------------------------+
| TRADE METADATA                                           |
+----------------------------------------------------------+

+----------------------------------------------------------+
| NAVIGATION ACTIONS                                       |
| Research / Replay / Markets / Scanner / Dashboard        |
+----------------------------------------------------------+
```

### Tablet Notes

- The approved hierarchy remains unchanged.
- Entry and Exit may remain paired only while text and state reasons fit without clipping.
- Risk and Checklist may remain paired under the same condition.
- If either pair becomes unreadable, sections stack in IA order rather than scroll horizontally.
- Readiness and blocker reasons remain visible before planning detail.

## Mobile Wireframe

```text
+--------------------------------+
| TRADE SUMMARY                  |
| Candidate / Thesis             |
| Symbol / Exchange / Timeframe  |
| Validation / Freshness         |
+--------------------------------+

+--------------------------------+
| EXECUTION READINESS            |
| READY / NOT READY / ...        |
| Reason / Required handoff      |
+--------------------------------+

+--------------------------------+
| EXECUTION SETUP                |
| Conditions / Trigger           |
| Invalidation context           |
+--------------------------------+

+--------------------------------+
| ENTRY PLAN                     |
| Conditions / Level / Order     |
+--------------------------------+

+--------------------------------+
| EXIT PLAN                      |
| Stop / Invalidation / Targets  |
+--------------------------------+

+--------------------------------+
| RISK MANAGEMENT                |
| Limit / Size / Constraints     |
+--------------------------------+

+--------------------------------+
| EXECUTION CHECKLIST            |
| Completion / Blockers          |
+--------------------------------+

+--------------------------------+
| TRADE METADATA                 |
+--------------------------------+

+--------------------------------+
| NAVIGATION ACTIONS             |
| Research                       |
| Replay                         |
| Markets                        |
| Scanner                        |
| Dashboard                      |
+--------------------------------+
```

### Mobile Notes

- The vertical reading order exactly follows the approved IA.
- The first viewport prioritizes candidate identity and readiness.
- No section uses horizontal scrolling for required execution information.
- Entry, exit, risk, and checklist remain separate blocks.
- Missing, stale, degraded, and unavailable reasons remain visible near the affected section.
- Navigation actions are intent-labeled handoffs, not execution recommendations.

## Section Explanations

### Trade Summary

Answers:

```text
What validated opportunity am I planning?
```

Shows candidate identity, symbol, exchange, timeframe, inherited validation, freshness, and health.

### Execution Readiness

Answers:

```text
Can this candidate proceed to execution planning?
```

Shows readiness, blockers, missing inputs, and the page that owns each unresolved issue.

### Execution Setup

Answers:

```text
How is this opportunity expressed as a setup?
```

Shows setup conditions, trigger requirements, direction, invalidation context, and setup status.

### Entry Plan

Answers:

```text
What must happen before a position is opened?
```

Shows entry conditions and real-input-backed levels or order constraints.

### Exit Plan

Answers:

```text
How is the position protected and closed?
```

Shows stop, invalidation, targets, and exit conditions.

### Risk Management

Answers:

```text
What risk and size are permitted?
```

Shows explicit risk limits, position size when valid inputs exist, and unavailable reasons.

### Execution Checklist

Answers:

```text
Is every required condition complete?
```

Shows checklist state, blockers, and final trade readiness.

### Trade Metadata

Answers:

```text
Which context and sources does this plan use?
```

Shows candidate, source, timestamp, validation reference, and plan-state metadata.

### Navigation Actions

Answers:

```text
Where should an unresolved question go next?
```

Routes evidence to Research, validation to Replay, live context to Markets, discovery to Scanner, and completed planning to Dashboard monitoring.

## Boundary Review

- Trade owns execution, setup, entries, exits, stop loss, targets, position sizing, risk management, and the execution checklist.
- Dashboard owns conclusions.
- Markets owns exploration and live structure.
- Scanner owns prioritization and discovery.
- Research owns thesis and evidence.
- Replay owns historical validation.

## Validation

- `docs/project/trade-wireframe.md` exists.
- Runtime code changes: none.
- Dashboard, Markets, Scanner, Research, or Replay changes: none.
- Package changes: none.

