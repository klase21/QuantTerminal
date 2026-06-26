# Scanner Constitution

Status: constitutional foundation V1  
Scope: Scanner V2 product definition  
Runtime impact: none

## 1. Purpose

Scanner answers one question:

```text
What deserves my attention right now?
```

Scanner is the attention layer of QuantTerminal. It detects meaningful market changes, ranks them, and helps the user decide what to inspect next.

Scanner is not:

- a market overview;
- a research workspace;
- an execution workspace;
- a replay validation surface;
- a replacement for Dashboard or Markets.

Scanner should be fast, lightweight, and action-oriented. It should reduce noise before the user moves into a deeper page.

## 2. Primary User

Scanner serves three primary user modes.

| User | Need | Scanner Role |
| --- | --- | --- |
| Active trader | Find actionable changes quickly | Surface ranked opportunities and alert-worthy signals |
| Market analyst | Detect unusual market behavior | Prioritize signals that deserve structural review |
| Researcher | Find investigation candidates | Route notable changes into Research or Replay when deeper evidence is needed |

Expected workflow:

```text
Open Scanner
  -> scan ranked signals
  -> filter out noise
  -> select a candidate
  -> continue to Markets, Research, Replay, or Trade
```

Scanner should not require prior product knowledge. A first-time user should understand within seconds which signal is most important and where to go next.

## 3. Core Decisions

Scanner enables the user to decide:

- which market change deserves attention;
- which opportunities are worth deeper inspection;
- which signals are noise;
- which symbol or theme should be opened in Markets;
- which signal requires Research context;
- which historical event should be validated in Replay;
- which candidate is mature enough to continue into Trade.

Scanner does not decide:

- overall market direction;
- trade sizing;
- entries or exits;
- thesis validity;
- historical causality;
- execution readiness.

## 4. Ownership

Scanner owns:

- opportunity discovery;
- signal ranking;
- signal filtering;
- alerts;
- signal visibility;
- attention triage;
- handoff intent to Markets, Research, Replay, or Trade.

Scanner does not own:

- Dashboard conclusions;
- Markets structure analysis;
- Research narratives;
- Replay validation;
- Trade execution;
- portfolio management;
- long-form explanation;
- historical-heavy workflows.

## 5. Page Boundaries

### Scanner vs Dashboard

Dashboard answers:

```text
What is the market doing?
```

Scanner answers:

```text
What deserves attention?
```

Dashboard owns the conclusion-first market state. Scanner owns the ranked queue of notable changes. Scanner must not duplicate the Dashboard hero, market direction conclusion, or top-level market thesis.

### Scanner vs Markets

Markets answers:

```text
Which live markets deserve structural inspection?
```

Scanner answers:

```text
Which signals deserve attention first?
```

Scanner may surface a ranked opportunity and hand off to Markets. Markets then validates the symbol with market breadth, sector rotation, exchange context, movers, and live analytics.

Scanner owns signal discovery. Markets owns live market structure and dense validation.

### Scanner vs Research

Research answers:

```text
What does this imply?
```

Scanner may identify a signal that needs deeper explanation. Research owns narrative context, evidence synthesis, historical analogs, Event Impact, Market Memory, and investigation continuity.

### Scanner vs Replay

Replay answers:

```text
What happened?
```

Scanner may identify a signal that resembles a past event or requires validation. Replay owns reconstruction and evidence review. Scanner should not attempt historical replay inside the Scanner page.

### Scanner vs Trade

Trade answers:

```text
Can I build conviction for an execution plan?
```

Scanner may route a candidate into Trade. Trade owns execution planning. Scanner must not present entries, stop-losses, take-profits, position sizing, or execution recommendations.

## 6. Inputs

Scanner may consume existing evidence and intelligence sources when available.

Expected inputs include:

- market movers;
- funding;
- open interest;
- liquidations;
- prediction markets;
- ETF flows;
- exchange flow;
- treasury evidence;
- reserve intelligence;
- news or narrative signals when available;
- data health and freshness metadata.

Rules:

- Do not invent new APIs in this constitution.
- Do not fabricate missing inputs.
- If an input is unavailable, Scanner must expose a clear unavailable, missing, stale, or partial state.
- Scanner should prefer prepared or cached evidence over expensive synchronous processing.
- Scanner should not block the page waiting for heavyweight historical systems.

## 7. Outputs

Scanner should produce lightweight, action-oriented outputs.

Expected outputs include:

- ranked opportunity list;
- signal cards;
- filters;
- alert states;
- confidence or quality metadata when backed by existing evidence;
- data health metadata;
- navigation actions into Markets, Research, Replay, or Trade.

Output rules:

- Rankings must be evidence-backed.
- Quality metadata must not become prediction or trade advice.
- Missing data must be explicit.
- Navigation should preserve symbol, exchange, timeframe, and investigation intent when available.

## 8. Information Hierarchy

Scanner follows this hierarchy:

```text
New Signals
  -> Ranked Opportunities
  -> Filters
  -> Evidence Preview
  -> Supporting Analytics
  -> Navigation Actions
```

Scanner should prioritize change before state.

The first read should answer:

1. What changed?
2. Why is it notable?
3. What evidence supports the signal?
4. Where should I go next?

## 9. Design Alignment

Scanner should reuse the QuantTerminal visual system:

- terminal-inspired identity;
- Bloomberg density;
- Valley clarity;
- GMGN actionability;
- dark green surfaces;
- amber structural accents;
- cyan metadata;
- compact monospace typography;
- explicit health and status badges.

Scanner should not introduce a page-specific visual language. It should inherit the Dashboard and Markets design system while remaining distinct in purpose.

## 10. Success Criteria

Scanner succeeds when a user can identify meaningful opportunities within approximately 10 seconds.

Acceptance signals:

- the most important signal is immediately visible;
- ranking is clear;
- filters reduce noise;
- evidence state is visible;
- unavailable data does not appear valid;
- next action is obvious;
- the page remains fast and responsive;
- no historical-heavy workflow blocks interaction.

Scanner fails when:

- it behaves like a general market dashboard;
- it duplicates Dashboard conclusions;
- it becomes a dense Markets page clone;
- it presents execution guidance;
- it hides missing data;
- it requires manual interpretation of too many equal-weight widgets.

## 11. Future Work Rules

Future Scanner implementation sprints must state:

- which Scanner responsibility they touch;
- which inputs they consume;
- which outputs they create;
- which page boundary they preserve;
- which validation proves no synthetic data was introduced.

Allowed future work:

- hierarchy implementation;
- signal card design;
- filter design;
- state and badge consistency;
- navigation handoff behavior;
- responsive certification.

Forbidden without a documented product review:

- trade recommendations;
- invented scores;
- synthetic signals;
- Dashboard conclusion duplication;
- Markets hierarchy duplication;
- Research narratives inside Scanner;
- Replay reconstruction inside Scanner;
- new APIs without documented need.

