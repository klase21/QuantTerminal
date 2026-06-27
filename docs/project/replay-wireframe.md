# Replay Wireframe

Project Epsilon - Replay V2 Sprint P2  
Status: Textual wireframe  
Runtime behavior: none  
Visual mockups: none

## Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Replay Summary                                                              │
│ Thesis / Symbol / Exchange / Timeframe / Replay Window / Coverage State     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐ ┌─────────────────────────────────────────────┐
│ Validation Status            │ │ Comparable Historical Cases                 │
│ - status                     │ │ #1 case / similarity / timestamp / outcome  │
│ - coverage                   │ │ #2 case / similarity / timestamp / outcome  │
│ - evidence quality           │ │ #3 case / similarity / timestamp / outcome  │
│ - unavailable reason         │ │ selected case details                       │
└──────────────────────────────┘ └─────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Outcome Analysis                                                            │
│ Outcome path / distribution / support vs contradiction / post-condition move │
└──────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────┐ ┌────────────────────────────────────┐
│ Failure Patterns                      │ │ Evidence Quality                   │
│ repeated adverse outcomes             │ │ price / liquidation / OI / funding │
│ invalidation context                  │ │ orderbook degraded/unavailable     │
│ missing failure data                  │ │ freshness / coverage / source rows │
└───────────────────────────────────────┘ └────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Replay Metadata                                                             │
│ observedAt / generatedAt / selected case / source artifacts / constraints    │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Navigation Actions                                                          │
│ [Research] Need evidence  [Trade] Validation complete                       │
│ [Markets] Market context  [Scanner] New opportunities                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Notes

- Replay Summary is the first orientation layer.
- Validation Status and Comparable Historical Cases sit near the top because replay must answer readiness and comparability before detail.
- Outcome Analysis is the central validation layer.
- Failure Patterns and Evidence Quality are paired because adverse outcomes must be interpreted against source quality.
- Navigation Actions remain last and must not become execution logic.

## Tablet Wireframe

```text
┌──────────────────────────────────────────────┐
│ Replay Summary                               │
│ thesis / symbol / window / coverage          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Validation Status                            │
│ status / coverage / evidence quality         │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Comparable Historical Cases                  │
│ selected case + compact comparable rows      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Outcome Analysis                             │
│ path / distribution / support / contradiction│
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Failure Patterns                             │
│ adverse outcomes / invalidation context      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Evidence Quality                             │
│ source availability / degraded states        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Replay Metadata                              │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Navigation Actions                           │
└──────────────────────────────────────────────┘
```

### Tablet Notes

- Sections stack in the approved IA order.
- Comparable Historical Cases remains above Outcome Analysis.
- No section should require horizontal scrolling.
- Evidence Quality should be compact but visible before Navigation Actions.

## Mobile Wireframe

```text
┌────────────────────────────┐
│ Replay Summary             │
│ thesis                     │
│ symbol / window            │
│ coverage badge             │
└────────────────────────────┘

┌────────────────────────────┐
│ Validation Status          │
│ VALIDATED / PARTIAL / ...  │
│ reason                     │
└────────────────────────────┘

┌────────────────────────────┐
│ Comparable Cases           │
│ selected case              │
│ compact case list          │
└────────────────────────────┘

┌────────────────────────────┐
│ Outcome Analysis           │
│ what happened afterward    │
└────────────────────────────┘

┌────────────────────────────┐
│ Failure Patterns           │
└────────────────────────────┘

┌────────────────────────────┐
│ Evidence Quality           │
└────────────────────────────┘

┌────────────────────────────┐
│ Metadata                   │
└────────────────────────────┘

┌────────────────────────────┐
│ Actions                    │
│ Research                   │
│ Trade                      │
│ Markets                    │
│ Scanner                    │
└────────────────────────────┘
```

### Mobile Notes

- The first viewport must show thesis, replay scope, and validation status.
- Historical cases should use compact rows.
- Outcome Analysis must appear before Failure Patterns.
- Trade action must not appear as a recommendation; it is a handoff only.
- Missing or unavailable replay context must be visible before detail sections.

## Section Explanations

### Replay Summary

Answers:

```text
What am I validating?
```

Shows inherited thesis, symbol, exchange, timeframe, and replay scope.

### Validation Status

Answers:

```text
Can Replay validate this?
```

Shows validation status, coverage, evidence quality, and unavailable/degraded reasons.

### Comparable Historical Cases

Answers:

```text
What historical conditions are comparable?
```

Shows selected case and comparable cases without generating a new thesis.

### Outcome Analysis

Answers:

```text
What happened afterward?
```

Shows outcome path, distribution, and support/contradiction context.

### Failure Patterns

Answers:

```text
How did comparable cases fail?
```

Shows failure modes and adverse outcomes.

### Evidence Quality

Answers:

```text
Can I trust this replay evidence?
```

Shows source quality, freshness, coverage, and degraded states.

### Replay Metadata

Answers:

```text
What exactly was replayed?
```

Shows observed/generated times, selected case, source artifacts, and replay constraints.

### Navigation Actions

Answers:

```text
Where should I go next?
```

Routes to Research, Trade, Markets, or Scanner based on user intent.

## Validation

- `docs/project/replay-wireframe.md` exists.
- Runtime code changes: none.
- Dashboard, Markets, Scanner, Research changes: none.
- Package changes: none.
