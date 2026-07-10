# Color System

**Owner:** Product Design  
**Status:** Canonical semantic guidance  
**Constraint:** No color values are defined here.

## Philosophy

Color communicates hierarchy, state, and ownership. It must remain calm enough
for long professional sessions and redundant enough for color-independent use.

## Semantic Roles

| Role | Meaning | Required companion |
| --- | --- | --- |
| Primary | Main intentional action or active context | Text or icon label |
| Secondary | Supporting action or lower emphasis | Visible affordance |
| Success | Completed, valid, or positively verified state | Status text/icon |
| Warning | Attention required; may remain usable | Reason and next step |
| Danger | Destructive action, critical failure, or material risk | Explicit label and confirmation where needed |
| Info | Neutral explanation or operational context | Descriptive label |
| Background | Application field behind working surfaces | Contrast boundary |
| Surface | Working region, panel, menu, or overlay | Elevation/border when needed |
| Border | Separation, grouping, focus, or state boundary | Structure, not decoration |
| Muted | Secondary information that remains readable | Never used for critical content |
| Evidence | Source-backed factual material | Source and timestamp |
| Reasoning | Interpretation derived from evidence | Evidence references |
| Counter Evidence | Contradictory or limiting evidence | Explicit contradiction label |
| Repository | Raw fact lineage and audit detail | Record/source identity |

## Data and Market Color

Market direction colors may describe observed movement but never imply advice.
Series colors must remain distinguishable without relying on red/green alone.
Provider tier, freshness, availability, and confidence each require labels or
symbols in addition to color.

## State Integrity

- `UNAVAILABLE`, `NO DATA`, `STALE`, `PARTIAL`, `EXPERIMENTAL`, and `ERROR` are
  distinct semantic states.
- Missing data is not neutral data.
- Experimental evidence never receives canonical styling.
- Confidence color never replaces a numerical or verbal source-backed value.
- Decorative color must not compete with evidence status.

## Contrast

All text, controls, focus indicators, charts, and state marks must meet the
accessibility policy. High-density interfaces require stronger, not weaker,
contrast discipline.

