# Cross Navigation

**Status:** Canonical cross-screen movement model  
**Owner:** Product / Design  

## Purpose

Cross navigation defines how users move between screens while preserving
symbol, time, evidence, and thesis context.

## Canonical Paths

### Dashboard to Replay to Research to Repository

```text
Dashboard
  -> Replay
  -> Research
  -> Repository
```

Purpose: move from current market orientation to historical validation, then
deep understanding, then raw audit.

Context preserved:

- symbol;
- market direction;
- evidence card;
- selected date/hour when available;
- source state.

### Markets to Scanner to Replay

```text
Markets
  -> Scanner
  -> Replay
```

Purpose: move from live monitoring to candidate discovery, then historical
validation.

Context preserved:

- symbol;
- exchange;
- timeframe;
- derivatives evidence;
- candidate ID when available.

### Trade to Evidence to Research

```text
Trade
  -> Evidence
  -> Research
```

Purpose: move from candidate planning to evidence review and thesis
investigation.

Context preserved:

- selected candidate;
- thesis;
- risk/invalidation;
- evidence references;
- source state.

## Secondary Paths

| From | To | Reason |
| --- | --- | --- |
| Scanner | Trade | Candidate planning. |
| Scanner | Research | Thesis validation. |
| Replay | Trade | Historical validation informs candidate planning. |
| Research | Replay | Inspect historical window behind a claim. |
| Markets | Research | Investigate live structure or macro context. |
| Dashboard | Markets | Verify current market structure. |

## Cross-Navigation Rules

- Preserve context whenever source-backed and relevant.
- Show explicit unavailable state when context cannot be carried.
- Do not make screens absorb another screen's responsibility.
- Do not bury return paths.
- Do not turn cross-links into hidden actions.

## Validation

Cross navigation aligns with:

- Composable Intelligence;
- Context Preservation;
- Search-First Navigation;
- Investigation Drilldown;
- Product page ownership.
