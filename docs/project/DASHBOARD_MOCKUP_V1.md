# Dashboard Mockup V1

Status: Wireframe specification  
Source: `docs/project/DESIGN.md`  
Scope: Dashboard layout only  

This document is not implementation guidance for React components. It is a
visual placement specification for the Dashboard information hierarchy.

Principle:

```text
Conclusion
  -> Drivers
  -> Evidence
  -> Analytics
```

Identity blend:

- Bloomberg Density: compact evidence and tabular detail.
- Valley Clarity: first screen answers the main question.
- GMGN Actionability: top drivers and next paths are visible without hunting.

## Desktop Wireframe

Target: wide desktop, primary analyst workstation.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: QuantTerminal | Symbol | Timeframe | Data Health | Last Updated | Actions           │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ L1 CONCLUSION: MARKET DIRECTION HERO                                                        │
│ ┌───────────────────────────────┬────────────────────┬────────────────────┬───────────────┐ │
│ │ DIRECTION                     │ CONFIDENCE         │ REGIME             │ HEALTH        │ │
│ │ BULLISH / BEARISH / NEUTRAL   │ coverage/quality   │ risk-on/off/mixed  │ current/stale │ │
│ │ One-line conclusion           │ driver count       │ regime evidence    │ missing flags │ │
│ └───────────────────────────────┴────────────────────┴────────────────────┴───────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ L2 DRIVERS: WHY MARKET IS MOVING                                                            │
│ ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┬────────────┐ │
│ │ #1 Driver        │ #2 Driver        │ #3 Driver        │ #4 Driver        │ #5 Driver  │ │
│ │ category         │ category         │ category         │ category         │ category   │ │
│ │ impact / quality │ impact / quality │ impact / quality │ impact / quality │ impact     │ │
│ └──────────────────┴──────────────────┴──────────────────┴──────────────────┴────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ L3 EVIDENCE GRID                                                                             │
│ ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┬────────────┐ │
│ │ ETF Evidence     │ Reserve Evidence │ Treasury Evidence│ OI Evidence      │ Liquidation│ │
│ │ observed fact    │ observed fact    │ observed fact    │ observed fact    │ observed   │ │
│ │ source + health  │ source + health  │ source + health  │ source + health  │ health     │ │
│ └──────────────────┴──────────────────┴──────────────────┴──────────────────┴────────────┘ │
│ ┌───────────────────────────────┬───────────────────────────────┬────────────────────────┐ │
│ │ Exchange Flow Evidence        │ Funding Evidence              │ Prediction Markets     │ │
│ │ compact observation           │ compact observation           │ attention / probability│ │
│ └───────────────────────────────┴───────────────────────────────┴────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ L3.5 HISTORICAL ANALOG STRIP                                                                  │
│ Similar cases | 24h average outcome | win rate | dominant outcome | source + generated time  │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ L4 ANALYTICS                                                                                  │
│ ┌────────────────────────┬────────────────────────┬───────────────────────────────────────┐ │
│ │ Tactical Alerts        │ Narrative Heatmap      │ Information Flow / System Status      │ │
│ │ compact list           │ compact tags           │ feed health + recent events           │ │
│ └────────────────────────┴────────────────────────┴───────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Section Explanation

**Top Bar**

Provides operating context. It should not compete with the conclusion. Keep it
thin and utility-oriented.

**Market Direction Hero**

The first thing a user reads. It answers: `What is happening?`

Required content:

- direction;
- confidence as evidence quality, not prediction;
- regime;
- data health;
- concise conclusion.

**Top Drivers**

Answers: `Why is it happening?`

Rules:

- maximum five drivers;
- ranked left to right;
- each driver shows category, title, impact, and quality;
- no long explanation.

**Evidence Grid**

Answers: `What supports the drivers?`

Rules:

- Tier 1 evidence appears first: ETF, Reserve, Treasury;
- Tier 2 evidence follows: OI, Liquidation, Exchange Flow;
- Tier 3 evidence follows: Funding, Sentiment, Misc;
- each card includes source and health;
- missing evidence remains visible when important.

**Historical Analog Strip**

Provides compact historical context without restoring a heavy historical
workflow to Dashboard.

**Analytics**

Rawer, denser, or lower-priority panels live here. Analytics never appears above
Drivers.

## Tablet Wireframe

Target: tablet or mid-width laptop.

```text
┌──────────────────────────────────────────────────────────┐
│ TOP BAR: Symbol | Health | Updated | Actions             │
├──────────────────────────────────────────────────────────┤
│ L1 MARKET DIRECTION HERO                                 │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Direction + one-line conclusion                      │ │
│ │ Confidence | Regime | Driver Count | Health          │ │
│ └──────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│ L2 TOP DRIVERS                                           │
│ ┌──────────────────────────┬──────────────────────────┐ │
│ │ #1 Driver                │ #2 Driver                │ │
│ ├──────────────────────────┼──────────────────────────┤ │
│ │ #3 Driver                │ #4 Driver                │ │
│ ├──────────────────────────┴──────────────────────────┤ │
│ │ #5 Driver                                            │ │
│ └──────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│ L3 EVIDENCE GRID                                         │
│ ┌──────────────────────────┬──────────────────────────┐ │
│ │ ETF                      │ Reserve                  │ │
│ ├──────────────────────────┼──────────────────────────┤ │
│ │ Treasury                 │ OI                       │ │
│ ├──────────────────────────┼──────────────────────────┤ │
│ │ Liquidation              │ Exchange Flow            │ │
│ ├──────────────────────────┴──────────────────────────┤ │
│ │ Funding / Prediction Markets                         │ │
│ └──────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│ HISTORICAL ANALOG STRIP                                  │
├──────────────────────────────────────────────────────────┤
│ L4 ANALYTICS STACK                                        │
│ Tactical Alerts                                           │
│ Narrative Heatmap                                         │
│ Information Flow                                          │
│ System Status                                             │
└──────────────────────────────────────────────────────────┘
```

### Tablet Section Explanation

**Market Direction Hero**

Condenses the desktop hero into a single full-width card. The user should still
understand the state without scrolling.

**Top Drivers**

Uses a two-column grid. The fifth driver spans full width only if useful; if
space is tight, show four drivers and expose the rest below analytics.

**Evidence Grid**

Uses two columns. Tier 1 evidence remains above lower-tier evidence.

**Historical Analog Strip**

Stays compact and horizontal where possible. If it wraps, it must remain one
small section, not a large card.

**Analytics Stack**

Stacks vertically after evidence. This preserves clarity while allowing
Bloomberg-style density lower on the page.

## Mobile Wireframe

Target: phone-width emergency read, not full analytical workstation.

```text
┌────────────────────────────────────┐
│ TOP: Symbol | Health | Updated     │
├────────────────────────────────────┤
│ L1 CONCLUSION                      │
│ ┌────────────────────────────────┐ │
│ │ Direction                      │ │
│ │ One-line conclusion            │ │
│ │ Confidence | Regime | Health   │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ L2 TOP DRIVERS                     │
│ ┌────────────────────────────────┐ │
│ │ #1 Driver                      │ │
│ ├────────────────────────────────┤ │
│ │ #2 Driver                      │ │
│ ├────────────────────────────────┤ │
│ │ #3 Driver                      │ │
│ └────────────────────────────────┘ │
│ [Show 2 more]                      │
├────────────────────────────────────┤
│ L3 EVIDENCE                        │
│ ┌────────────────────────────────┐ │
│ │ ETF                            │ │
│ ├────────────────────────────────┤ │
│ │ Reserve                        │ │
│ ├────────────────────────────────┤ │
│ │ Treasury                       │ │
│ ├────────────────────────────────┤ │
│ │ OI / Liquidation               │ │
│ └────────────────────────────────┘ │
│ [Show all evidence]                │
├────────────────────────────────────┤
│ HISTORICAL ANALOG                  │
│ Similar cases | 24h avg | win rate │
├────────────────────────────────────┤
│ L4 ANALYTICS                       │
│ Collapsed sections                 │
│ - Tactical Alerts                  │
│ - Narrative Heatmap                │
│ - Information Flow                 │
│ - System Status                    │
└────────────────────────────────────┘
```

### Mobile Section Explanation

**Conclusion**

Mobile must preserve Valley Clarity. The user should see direction, confidence,
regime, and health before any card list.

**Top Drivers**

Show the top three by default. Use a compact reveal for the remaining two. Do
not force five driver cards into the first viewport.

**Evidence**

Show Tier 1 evidence first. Combine lower-tier evidence where necessary, but do
not erase missing or stale states.

**Historical Analog**

Keep as a strip. Do not expand into a historical dashboard.

**Analytics**

Collapsed by default. Analytics is available, but never blocks the conclusion,
drivers, or evidence.

## Section Rules

### Conclusion Rules

- Direction is always first.
- Confidence means evidence quality and coverage, not market prediction.
- Regime must be short and explainable.
- If the conclusion is unavailable, show why.

### Driver Rules

- Maximum five drivers on desktop and tablet.
- Maximum three visible drivers on mobile before reveal.
- Drivers are ranked.
- Drivers never contain paragraph-length prose.

### Evidence Rules

- Evidence cards show observations only.
- Every evidence card shows source and health.
- Tier 1 evidence is visually earlier than Tier 2 and Tier 3 evidence.
- Missing evidence can be shown if it affects trust.

### Analytics Rules

- Analytics never appears above Drivers.
- Analytics never replaces Evidence.
- Analytics may be dense.
- Analytics may be collapsed on mobile.

## Interaction Notes

- Card clicks should lead to the relevant detail page or panel, not open hidden
  dashboards inside Dashboard.
- Filters, if added, belong in the top bar or evidence section, not inside the
  Market Direction Hero.
- Dashboard should not support arbitrary drag/reorder until the hierarchy is
  stable.
- Health badges should be visible without hover.

## Design Intent Summary

Dashboard should feel like:

```text
Bloomberg density below the fold
Valley clarity above the fold
GMGN actionability in the driver/evidence path
```

The first viewport must answer:

1. What is happening?
2. Why is it happening?
3. What evidence supports it?

Only then should it expose deeper analytics.
