# Research Wireframe

Status: Research V2 textual wireframe  
Scope: documentation only  
Runtime impact: none

## Wireframe Principle

Research is an evidence workspace.

It should not look like an article, a Dashboard hero, a Markets terminal, a Scanner feed, a Replay surface, or a Trade planner.

The visual order must remain:

```text
Research Summary
  -> Thesis
  -> Supporting Evidence
  -> Conflicting Evidence
  -> Narrative Timeline
  -> Source Intelligence
  -> Related Markets
  -> Navigation Actions
```

## Desktop Wireframe

Target: wide workstation layout.

```text
+--------------------------------------------------------------------------------+
| RESEARCH SUMMARY                                                               |
| Thesis: BTC market continuation after ETF/reserve flow shift                   |
| Symbol BTCUSDT | Exchange binance_futures | Timeframe 1h | Freshness CURRENT   |
| Supporting 6 | Conflicting 2 | Coverage PARTIAL | Source Quality VERIFIED/PART |
+--------------------------------------------------------------------------------+

+--------------------------------------------+-----------------------------------+
| THESIS                                     | CONFIDENCE CONTEXT                |
| Question                                   | Evidence freshness                |
| Why should I believe this thesis?          | Coverage status                   |
| Decision horizon                           | Required next validation          |
| Status: ACTIVE                             | Missing evidence summary          |
+--------------------------------------------+-----------------------------------+

+--------------------------------------------+-----------------------------------+
| SUPPORTING EVIDENCE                        | CONFLICTING EVIDENCE              |
| [ETF] Observation + source + health         | [Funding] Observation + source    |
| [Reserve] Observation + source + health     | [Historical] Failure case         |
| [OI] Observation + source + health          | [Event] Weak consistency          |
| [Market Memory] Observation + source        | Required validation               |
+--------------------------------------------+-----------------------------------+

+--------------------------------------------------------------------------------+
| NARRATIVE TIMELINE                                                             |
| Time / observedAt | Source | Observation | Freshness | Coverage                |
| 12:00             | ETF    | Flow observation                                  |
| 11:00             | News   | Tagged narrative observation                     |
| UNAVAILABLE       | Macro  | No durable macro narrative for this thesis       |
+--------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------+
| SOURCE INTELLIGENCE                                                            |
| Source              | Freshness | Coverage | Quality | Last observed | Reason  |
| ETF                 | CURRENT   | FULL     | VERIFIED| 12:00         | -       |
| Market Memory       | STALE     | PARTIAL  | DEGRADED| previous run  | stale   |
| Narrative Context   | MISSING   | UNAVAIL. | UNKNOWN | -             | no tags |
+--------------------------------------------------------------------------------+

+--------------------------------------------+-----------------------------------+
| RELATED MARKETS                            | NAVIGATION ACTIONS                |
| ETHUSDT | related sector context            | Need live market context -> Markets|
| SOLUSDT | related opportunity context        | Need historical validation -> Replay|
| BTC perp basis | live context available      | Ready to plan execution -> Trade    |
+--------------------------------------------+-----------------------------------+
```

### Desktop Notes

- The summary spans the page and provides orientation.
- Thesis and confidence context sit together, but neither becomes a Dashboard hero.
- Supporting and conflicting evidence are paired to prevent confirmation bias.
- Narrative Timeline is a compact row-based sequence, not an essay.
- Source Intelligence uses dense rows because it is verification detail.
- Navigation Actions remain the exit point, not the main content.

## Tablet Wireframe

Target: medium-width layout with preserved scan order.

```text
+--------------------------------------------------------------+
| RESEARCH SUMMARY                                             |
| Thesis / Symbol / Exchange / Timeframe / Freshness / Coverage|
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| THESIS                                                       |
| Question                                                     |
| Decision horizon                                             |
| Status                                                       |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| CONFIDENCE CONTEXT                                           |
| Supporting count | Conflicting count | Source quality         |
| Missing evidence | Required next validation                   |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| SUPPORTING EVIDENCE                                          |
| Evidence card                                                |
| Evidence card                                                |
| Evidence card                                                |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| CONFLICTING EVIDENCE                                         |
| Contradiction card                                           |
| Contradiction card                                           |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| NARRATIVE TIMELINE                                           |
| Compact chronological rows                                   |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| SOURCE INTELLIGENCE                                          |
| Source rows with freshness, coverage, quality, reason         |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| RELATED MARKETS                                              |
| Related symbol rows                                          |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| NAVIGATION ACTIONS                                           |
| Markets | Replay | Trade                                     |
+--------------------------------------------------------------+
```

### Tablet Notes

- Sections stack in the same hierarchy as desktop.
- Confidence context becomes its own block so metadata remains readable.
- Evidence cards stack before narrative detail.
- Navigation remains visible after the evidence and source review.

## Mobile Wireframe

Target: narrow single-column layout.

```text
+--------------------------------------+
| RESEARCH SUMMARY                     |
| Thesis                               |
| BTCUSDT / binance_futures / 1h       |
| Freshness CURRENT | Coverage PARTIAL |
+--------------------------------------+

+--------------------------------------+
| THESIS                               |
| Why should I believe this thesis?    |
| Horizon: intraday                    |
| Status: ACTIVE                       |
+--------------------------------------+

+--------------------------------------+
| EVIDENCE SNAPSHOT                    |
| Supporting: 6                        |
| Conflicting: 2                       |
| Missing: narrative tags              |
+--------------------------------------+

+--------------------------------------+
| SUPPORTING EVIDENCE                  |
| [ETF] observation                    |
| [Reserve] observation                |
| [OI] observation                     |
+--------------------------------------+

+--------------------------------------+
| CONFLICTING EVIDENCE                 |
| [Funding] adverse observation        |
| [Historical] failure case            |
+--------------------------------------+

+--------------------------------------+
| NARRATIVE TIMELINE                   |
| Timeline row                         |
| Timeline row                         |
| UNAVAILABLE state if no tags         |
+--------------------------------------+

+--------------------------------------+
| SOURCE INTELLIGENCE                  |
| ETF CURRENT FULL VERIFIED            |
| Memory STALE PARTIAL DEGRADED        |
| Narrative MISSING UNAVAILABLE        |
+--------------------------------------+

+--------------------------------------+
| RELATED MARKETS                      |
| ETHUSDT -> Markets                   |
| SOLUSDT -> Markets                   |
+--------------------------------------+

+--------------------------------------+
| NAVIGATION ACTIONS                   |
| Markets                              |
| Replay                               |
| Trade                                |
+--------------------------------------+
```

### Mobile Notes

- The first viewport must expose thesis, freshness, and coverage.
- Supporting evidence appears before conflicting evidence, but contradiction remains near the top.
- Long source tables collapse into compact source rows.
- No horizontal scrolling should be required.
- Dense analytics should not appear before evidence and source quality.

## Section Explanations

### Research Summary

Answers:

```text
What investigation am I in, and is the evidence usable?
```

Must show:

- thesis label;
- active symbol, exchange, timeframe;
- evidence freshness;
- coverage;
- source health.

### Thesis

Answers:

```text
What question am I evaluating?
```

Must show:

- title;
- question;
- decision horizon;
- status;
- optional hypothesis if available.

### Supporting Evidence

Answers:

```text
What facts support the thesis?
```

Must show:

- evidence type;
- observation;
- source;
- freshness or quality badge;
- source reference when available.

### Conflicting Evidence

Answers:

```text
What facts weaken or contradict the thesis?
```

Must show:

- contradiction category;
- evidence source;
- observed issue;
- required next validation when available.

### Narrative Timeline

Answers:

```text
How did the context evolve?
```

Must show:

- observedAt or timestamp;
- source;
- concise observation;
- freshness and coverage;
- explicit unavailable state when narrative data is absent.

### Source Intelligence

Answers:

```text
Can I trust the evidence base?
```

Must show:

- source name;
- freshness;
- coverage;
- quality;
- missing/stale/unavailable reason.

### Related Markets

Answers:

```text
What live markets should I inspect next?
```

Must show:

- related symbols or markets when available;
- source state;
- handoff to Markets.

### Navigation Actions

Answers:

```text
What should I do next?
```

Required handoffs:

- Need live market context -> Markets;
- Need historical validation -> Replay;
- Ready to plan execution -> Trade.

## Boundary Rules

Research owns:

- evidence;
- narratives;
- source attribution;
- confidence context.

Research does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Replay validation;
- Trade execution.

## Design System Alignment

Research should use:

- terminal dark green surfaces;
- amber structural hierarchy;
- cyan metadata;
- approved status badge vocabulary;
- compact monospace typography;
- dense evidence rows where useful;
- explicit missing, partial, stale, unavailable, loading, and error states.

Research must not:

- duplicate the Dashboard hero;
- duplicate Markets ranking layouts;
- duplicate Scanner signal-feed ownership;
- become an article page;
- hide missing evidence behind narrative prose.
