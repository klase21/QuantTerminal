# Dashboard Information Hierarchy

**Status:** Canonical screen hierarchy  
**Screen:** Dashboard  
**Purpose:** 5-second market understanding  

## Purpose

Dashboard answers:

```text
What is happening now, and why should I care?
```

Dashboard must remain lightweight. It orients the user and routes them to
Markets, Replay, Research, Scanner, or Trade when deeper work is required.

## Hierarchy

| Level | Information | Why it exists |
| ---: | --- | --- |
| Level 1 | Market Direction | Gives the first read. Users should know the current supported state immediately. |
| Level 2 | Key Evidence | Shows the source-backed reasons behind the market direction. |
| Level 3 | Reasoning Summary | Connects evidence only when reasoning is approved and clearly bounded. |
| Level 4 | Historical Analog | Offers past-context comparison only when source-backed; otherwise remains unavailable. |
| Level 5 | Supporting Charts | Lets users inspect price, derivatives, flows, or other evidence visually. |
| Level 6 | Research | Routes users to deeper thesis, contradiction, and source investigation. |
| Level 7 | Repository | Provides audit trail and raw records for expert review. |

## Information Rules

- Dashboard starts with conclusion, reasons, and evidence.
- Dashboard does not own heavy historical workflows.
- Dashboard does not run expensive replay or repository scans.
- Missing evidence remains explicit.
- Dashboard should not show duplicate metric cards.
- Dashboard should route to the correct owner screen instead of absorbing all
  workflows.

## Primary Handoffs

| User need | Handoff |
| --- | --- |
| Verify live market structure | Markets |
| Investigate opportunity | Scanner |
| Validate historical movement | Replay |
| Research thesis or contradiction | Research |
| Plan candidate execution | Trade |
| Audit raw records | Repository |

## Validation

Dashboard aligns with:

- Visual First;
- Evidence First;
- 5-Second Rule;
- Progressive Disclosure;
- Trust Before Attention;
- responsiveness over completeness.
