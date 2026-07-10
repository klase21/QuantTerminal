# Replay Information Hierarchy

**Status:** Canonical screen hierarchy  
**Screen:** Replay  
**Purpose:** Understand why the market moved  

## Purpose

Replay answers:

```text
What happened in this historical window?
```

Replay reconstructs a bounded historical market window. It must remain
responsive and must never auto-load heavy datasets that belong behind manual,
bounded access.

## Hierarchy

| Level | Information | Why it exists |
| ---: | --- | --- |
| Level 1 | Replay Summary | States the selected symbol, time window, and observed movement. |
| Level 2 | Timeline | Orders events and evidence changes so users understand sequence. |
| Level 3 | Evidence | Shows source-backed observations and availability state. |
| Level 4 | Funding | Provides derivatives cost/context when available. |
| Level 5 | Open Interest | Shows positioning change and leverage context. |
| Level 6 | Liquidations | Shows forced-flow stress and intensity. |
| Level 7 | Orderbook | Provides depth/microstructure only when safely available or precomputed. |
| Level 8 | Historical Context | Compares the window to source-backed historical context. |
| Level 9 | Research | Routes to deeper thesis or contradiction review. |
| Level 10 | Repository | Provides raw records and audit trail. |

## Information Rules

- Replay is historical, not live.
- Replay explains movement; it does not generate trading advice.
- Heavy evidence is optional and bounded.
- Missing datasets are explicit.
- Timeline and chart context should appear before raw tables.
- Repository-backed data must preserve source, timestamp, and coverage state.

## Primary Handoffs

| User need | Handoff |
| --- | --- |
| Understand implication | Research |
| Plan candidate response | Trade |
| Compare current state | Dashboard or Markets |
| Audit records | Repository |

## Validation

Replay aligns with:

- Visual First;
- Evidence First;
- Progressive Disclosure;
- bounded heavy-data access;
- no fabricated historical context;
- responsiveness over completeness.
