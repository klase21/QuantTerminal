# Scanner Information Hierarchy

**Status:** Canonical screen hierarchy  
**Screen:** Scanner  
**Purpose:** Opportunity discovery  

## Purpose

Scanner answers:

```text
What changed, and what deserves attention now?
```

Scanner is a discovery and triage surface. It should remain fast and
lightweight. It does not own execution planning, deep research, or historical
replay.

## Hierarchy

| Level | Information | Why it exists |
| ---: | --- | --- |
| Level 1 | Highest Confidence Opportunities | Surfaces the most relevant candidates first when confidence is source-backed. |
| Level 2 | Filters | Lets users narrow by symbol, timeframe, direction, source, status, and evidence state. |
| Level 3 | Signals | Shows candidate records and status without fabricating unavailable fields. |
| Level 4 | Evidence | Explains why a candidate exists and what data supports it. |
| Level 5 | Replay | Routes to historical validation when needed. |
| Level 6 | Research | Routes to deeper support, contradiction, and source review. |
| Level 7 | Repository | Provides audit trail for candidate/evidence records. |

## Information Rules

- Scanner is opportunity discovery, not a signal-selling surface.
- Confidence must be source-backed or unavailable.
- Missing direction, freshness, or reason must remain unavailable.
- Scanner should not become Trade.
- Scanner should not run deep historical workflows automatically.

## Primary Handoffs

| User need | Handoff |
| --- | --- |
| Validate candidate history | Replay |
| Research the thesis | Research |
| Plan execution | Trade |
| Monitor live structure | Markets |

## Validation

Scanner aligns with:

- fast loading;
- Evidence First;
- no fabricated confidence;
- Search and Filtering patterns;
- context preservation to Replay, Research, and Trade.
