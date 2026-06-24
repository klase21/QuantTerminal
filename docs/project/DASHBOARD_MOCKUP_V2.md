# Dashboard Visual Mockup V2

Status: visual specification only  
Inputs: `DESIGN.md`, `DASHBOARD_MOCKUP_V1.md`, `MAKE_ANALYSIS.md`  
Non-goals: React, component implementation, runtime behavior, new data sources

This document converts the Dashboard wireframe into a visual specification. It preserves the QuantTerminal terminal identity while changing the information hierarchy from analytics-first to intelligence-first.

Core order:

```text
Conclusion
-> Drivers
-> Evidence
-> Analytics
```

Design blend:

- Bloomberg Density: compact professional data below the decision layer.
- Valley Clarity: first viewport answers the main question immediately.
- GMGN Actionability: ranked drivers and obvious investigation paths.

---

## 1. Visual Hierarchy Findings

The Dashboard should no longer read as a mosaic of equal-weight widgets. It should read as one structured answer.

Primary visual hierarchy:

1. Market Direction dominates the first viewport.
2. Top three drivers explain the direction.
3. Evidence cards prove or weaken those drivers.
4. Historical Analog adds lightweight historical context.
5. Dense analytics appear below the fold as supporting detail.

The first eye landing should be:

```text
BULLISH / BEARISH / NEUTRAL
```

The second eye landing should be:

```text
#1 reason
#2 reason
#3 reason
```

The third eye landing should be:

```text
Evidence quality and source health
```

Dashboard V2 must avoid:

- equal visual weight across all panels
- metric walls above the conclusion
- long narrative blocks
- duplicate widgets showing the same signal
- hidden freshness and health states
- evidence grids that feel like raw Bloomberg data before the user understands the conclusion

---

## 2. Desktop Visual Mockup

Target viewport: 1440px to 1920px wide  
Content frame: full-width terminal surface with 12px outer padding  
Grid: 12 columns, 8px gutters  
Panel radius: 2px to 4px  
Panel border: 1px dark olive line  
Panel background: dark green-black, not pure black

### Above The Fold

Above the fold should fit inside the first 760px to 860px of vertical height on common desktop displays.

Recommended vertical allocation:

| Zone | Height | Purpose |
|---|---:|---|
| Top utility bar | 36-44px | symbol, timestamp, data health |
| Market Direction Hero | 220-260px | conclusion |
| Top Drivers | 132-160px | primary reasons |
| Evidence Preview | 190-240px | supporting proof |
| Historical Analog Strip | 56-72px | historical context |

### Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ BTCUSDT  BINANCE_FUTURES  1H        DATA HEALTH: PARTIAL        UPDATED 12:04 UTC           │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ MARKET DIRECTION                                                                            │
│ ┌──────────────────────────────────────────────┬──────────────────────────┬────────────────┐ │
│ │ BULLISH                                      │ CONFIDENCE               │ REGIME / HEALTH│ │
│ │ 72px direction type                          │ 74 / 100                 │ TRENDING       │ │
│ │ Short conclusion line, max one sentence      │ Evidence coverage: 6/8   │ PARTIAL        │ │
│ │                                              │                          │ CURRENT        │ │
│ └──────────────────────────────────────────────┴──────────────────────────┴────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ WHY MARKET IS MOVING                                                                         │
│ ┌──────────────────────────────┬──────────────────────────────┬────────────────────────────┐ │
│ │ #1 ETF INFLOWS               │ #2 RESERVE INCREASE          │ #3 TREASURY ACCUMULATION   │ │
│ │ impact 92                    │ impact 78                    │ impact 64                  │ │
│ │ source current               │ source current               │ source partial             │ │
│ └──────────────────────────────┴──────────────────────────────┴────────────────────────────┘ │
│ + 3 more drivers collapsed                                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ SUPPORTING EVIDENCE                                                                          │
│ ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┬─────────────┐ │
│ │ ETF              │ RESERVE          │ TREASURY         │ OPEN INTEREST    │ LIQUIDATION │ │
│ │ top observation  │ top observation  │ top observation  │ top observation  │ top obs     │ │
│ │ current          │ current          │ partial          │ stale/current    │ unavailable │ │
│ └──────────────────┴──────────────────┴──────────────────┴──────────────────┴─────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ HISTORICAL CONTEXT  Similar cases: 25   24h avg: +1.8%   Win rate: 61%   Source: cache      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Below The Fold

Below the fold is allowed to be dense. It should support the decision rather than compete with it.

Recommended order:

1. Prediction Markets
2. Tactical Alerts
3. Narrative Heatmap
4. Sector / macro / ETF flow details
5. System and data health detail
6. Deep analytics tables

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ PREDICTION MARKETS                                                                           │
│ compact probability / attention / source rows                                                 │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ TACTICAL ALERTS                                │ NARRATIVE HEATMAP                           │
│ dense alert table                              │ regional narrative grid                     │
├────────────────────────────────────────────────┴──────────────────────────────────────────────┤
│ DEEP ANALYTICS                                                                                │
│ funding detail, OI detail, liquidation detail, exchange flow detail, data health              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Visual Emphasis

- Direction receives 50-60% of hero visual weight.
- Confidence receives 20-25%.
- Regime and health receive 15-20%.
- Drivers are visually ranked with large rank labels.
- Evidence cards are compact and source-labeled.
- Analytics panels use smaller type and lower contrast than the hero.

---

## 3. Hero Section Specification

Purpose: answer "What is happening?" within one glance.

Visual priority:

1. Direction
2. Confidence
3. Regime
4. Health

### Hero Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ MARKET DIRECTION                                                     │
│ ┌───────────────────────────────┬─────────────────┬───────────────┐ │
│ │ BULLISH                       │ CONFIDENCE      │ REGIME        │ │
│ │ direction dominates           │ 74 / 100        │ TRENDING      │ │
│ │ one-line conclusion           │ evidence 6/8    │ HEALTH PARTIAL│ │
│ └───────────────────────────────┴─────────────────┴───────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

Typography:

- Direction: 56-72px desktop, uppercase, monospace, high contrast.
- Direction label: 10-11px, uppercase, muted.
- Conclusion sentence: 13-15px, max one line desktop, max two lines mobile.
- Confidence number: 28-36px desktop.
- Confidence label: 10-11px.
- Regime and health: 11-13px badge typography.

Color:

- Bullish: green foreground with amber rail.
- Bearish: red foreground with amber rail.
- Neutral: muted text with amber rail.
- Health states must use text labels, not color alone.

Behavior:

- If confidence is unavailable, show `CONFIDENCE UNAVAILABLE`, not a fake score.
- If health is partial, show which major evidence groups are missing.
- The hero should not contain raw metrics unless they explain the conclusion.

---

## 4. Driver Section Specification

Purpose: answer "Why is it happening?"

Rules:

- Show exactly 3 primary drivers by default.
- Collapse remaining drivers into a compact reveal row.
- Rank is mandatory.
- Driver title must be shorter than one line where possible.
- Impact score is visible but secondary to the title.
- Source health must be visible.

### Driver Card

```text
┌──────────────────────────────┐
│ #1 ETF INFLOWS               │
│ impact 92     current        │
│ +$420M net inflow observed   │
└──────────────────────────────┘
```

Preferred driver examples:

```text
#1 ETF Inflows
#2 Reserve Increase
#3 Treasury Accumulation
```

Collapsed row:

```text
+ 3 more drivers: Funding, Open Interest, Historical Analog
```

Visual rules:

- Rank number is the strongest visual element inside each card.
- Driver category is a badge, not a paragraph.
- Driver explanation is one short observation.
- Missing or stale drivers may appear in collapsed state but should not outrank current evidence.

---

## 5. Evidence Specification

Purpose: answer "What supports the drivers?"

Evidence must not become a Bloomberg-style wall above the fold. Evidence is proof, not the first thing the user parses.

### Evidence Priority

Primary evidence row:

1. ETF
2. Reserve
3. Treasury

Secondary evidence row or compact continuation:

4. Open Interest
5. Liquidation
6. Exchange Flow
7. Funding

### Evidence Card

```text
┌────────────────────┐
│ ETF                │
│ +$420M net inflow  │
│ current · source   │
└────────────────────┘
```

Card rules:

- One top observation.
- One source or health line.
- No more than three numeric values.
- Missing evidence remains visible only if it changes trust.
- Use progressive disclosure for full tables.

Reveal behavior:

```text
Top evidence visible
Secondary evidence compact
Full evidence details below fold
```

Do not:

- show every available metric at once
- repeat the same value in multiple cards
- bury source quality in tooltips only
- use color without labels

---

## 6. Historical Analog Specification

Purpose: lightweight historical context, not a restored Historical Analog panel.

Placement:

- Below Evidence Preview.
- Above deep analytics.
- At or just below first-fold boundary.

Size:

- Desktop: 56-72px strip.
- Tablet: 72-96px strip.
- Mobile: compact card after evidence.

Visual treatment:

- One horizontal strip, not a large panel.
- Muted border and lower contrast than drivers.
- Shows only summary, not case tables.

Content:

```text
HISTORICAL CONTEXT
Similar cases: 25
24h avg: +1.8%
Win rate: 61%
Dominant outcome: continuation
Source: cache
Generated: 12:00 UTC
```

Rules:

- No request-time computation.
- No heavy loading state.
- If cache missing, show a small unavailable reason.
- Historical context should support Research handoff, not dominate Dashboard.

---

## 7. Analytics Specification

Purpose: support decisions after the conclusion, drivers, and evidence are understood.

Analytics belongs below the fold.

Allowed analytics:

- Tactical Alerts
- Prediction Markets
- Narrative Heatmap
- Funding detail
- OI detail
- Liquidation detail
- ETF detail
- Data Health detail

Rules:

- Analytics never appears above Drivers.
- Analytics should not compete with the Market Direction Hero.
- Analytics can remain dense because it is no longer the entry point.
- Analytics panels should have explicit labels and health states.
- Dense tables should default to the most important rows first.

---

## 8. Visual Design Tokens

These are recommended visual tokens for the Dashboard specification. They are not implementation tokens.

### Spacing

| Token | Value | Use |
|---|---:|---|
| `space-1` | 2px | hairline separation |
| `space-2` | 4px | tight internal grouping |
| `space-3` | 8px | default grid gap |
| `space-4` | 12px | panel padding |
| `space-5` | 16px | section separation |
| `space-6` | 24px | major section break |
| `space-7` | 32px | below-fold grouping |

Panel spacing:

- Desktop: 8px grid gap, 12px internal padding.
- Tablet: 6px grid gap, 10px internal padding.
- Mobile: 6px section gap, 10-12px card padding.

### Typography

Primary font: Space Mono or existing terminal monospace  
Secondary font: IBM Plex Mono or existing fallback monospace

| Role | Desktop | Tablet | Mobile |
|---|---:|---:|---:|
| Direction | 56-72px | 44-56px | 32-40px |
| Confidence | 28-36px | 24-30px | 22-26px |
| Section title | 11-12px | 11px | 10-11px |
| Driver title | 15-17px | 14-16px | 14-15px |
| Evidence value | 14-16px | 13-15px | 13-14px |
| Metadata | 10-11px | 10px | 10px |

Typography rules:

- Uppercase for section labels and state badges.
- Avoid long paragraphs.
- Numeric values align visually where possible.
- No hero-scale type inside evidence or analytics panels.

### Color And Surface

Preserve:

- dark green-black surfaces
- amber rails
- green/red semantic movement
- muted olive borders
- compact terminal tone

Recommended hierarchy:

- Hero direction: highest contrast.
- Driver cards: medium-high contrast.
- Evidence cards: medium contrast.
- Analytics: lower contrast, dense.
- Missing or unavailable states: explicit text plus subdued color.

---

## 9. Tablet Specification

Target viewport: 768px to 1024px wide

Tablet should preserve the desktop order while reducing columns.

```text
┌──────────────────────────────────────────────┐
│ BTCUSDT  DATA HEALTH PARTIAL                 │
├──────────────────────────────────────────────┤
│ MARKET DIRECTION                             │
│ BULLISH                                      │
│ Confidence 74     Regime Trending            │
├──────────────────────────────────────────────┤
│ WHY MARKET IS MOVING                         │
│ ┌────────────────────┬─────────────────────┐ │
│ │ #1 ETF INFLOWS     │ #2 RESERVE INCREASE │ │
│ ├────────────────────┴─────────────────────┤ │
│ │ #3 TREASURY ACCUMULATION                 │ │
│ └──────────────────────────────────────────┘ │
│ + more collapsed                             │
├──────────────────────────────────────────────┤
│ SUPPORTING EVIDENCE                          │
│ ┌────────────────────┬─────────────────────┐ │
│ │ ETF                │ RESERVE             │ │
│ ├────────────────────┼─────────────────────┤ │
│ │ TREASURY           │ OPEN INTEREST       │ │
│ └────────────────────┴─────────────────────┘ │
├──────────────────────────────────────────────┤
│ HISTORICAL CONTEXT STRIP                     │
├──────────────────────────────────────────────┤
│ ANALYTICS BELOW                              │
└──────────────────────────────────────────────┘
```

Tablet rules:

- Hero remains full width.
- Drivers use two columns with the third spanning or stacking.
- Evidence uses two columns.
- Analytics stack below evidence.
- Historical Analog remains compact.

---

## 10. Mobile Dashboard Specification

Target viewport: 360px to 430px wide

The first mobile viewport must answer:

1. What is happening?
2. Why is it happening?

Evidence may begin in the first viewport but full evidence can continue below.

### Mobile First Viewport

```text
┌──────────────────────────────┐
│ BTCUSDT        HEALTH PARTIAL│
├──────────────────────────────┤
│ MARKET DIRECTION             │
│ BULLISH                      │
│ Confidence 74                │
│ Regime Trending              │
├──────────────────────────────┤
│ WHY                          │
│ #1 ETF Inflows        92     │
│ #2 Reserve Increase   78     │
│ #3 Treasury Accum.    64     │
│ + 3 more                      │
└──────────────────────────────┘
```

### Mobile Continuation

```text
┌──────────────────────────────┐
│ EVIDENCE                     │
│ ETF        +$420M current    │
│ Reserve    +412 BTC current  │
│ Treasury   partial           │
│ Show all evidence             │
├──────────────────────────────┤
│ HISTORICAL CONTEXT           │
│ 25 cases · 61% win rate      │
├──────────────────────────────┤
│ ANALYTICS                    │
│ Prediction Markets collapsed │
│ Tactical Alerts collapsed    │
│ Narrative Heatmap collapsed  │
└──────────────────────────────┘
```

Mobile rules:

- Direction must appear before any chart or grid.
- Show 3 drivers, never 5, in the initial viewport.
- Evidence defaults to top 3 cards or rows.
- Secondary evidence and analytics are collapsed.
- Tap targets remain compact but readable.
- Missing states use text labels, not color-only chips.
- Avoid horizontal scrolling except for intentionally tabular deep analytics below fold.

---

## 11. Current Dashboard vs Dashboard V2

| Area | Current Dashboard Risk | Dashboard V2 Change |
|---|---|---|
| First impression | user sees metrics before meaning | Market Direction Hero leads |
| Drivers | mixed among analytics | ranked Top 3 Drivers promoted |
| Evidence | can become wall of widgets | compact evidence preview with disclosure |
| Historical context | historically overloaded Dashboard | lightweight cache-only strip |
| Analytics | competes with conclusion | moved below fold |
| Missing states | may read as dead widgets | explicit health and unavailable reasons |
| Mobile | dense panels compete for attention | conclusion and 3 drivers first |
| Product identity | Bloomberg-style terminal | Intelligence Terminal |

Removed elements:

- large historical analog panel
- metric walls above the conclusion
- duplicate visualizations in first viewport
- long narrative panels in the decision layer

Promoted elements:

- Market Direction
- Top Drivers
- Evidence quality
- Data Health

Simplified elements:

- Historical Analog becomes a strip.
- Evidence becomes top observations.
- Analytics becomes a below-fold support layer.
- Driver list becomes Top 3 plus collapsed remainder.

---

## 12. Success Validation

A new user should answer these within 5 seconds.

### 1. What is happening?

Pass condition:

- Direction is visually dominant.
- The hero provides a one-line market conclusion.
- Confidence and regime are visible but secondary.

Fail condition:

- User must scan multiple cards to infer direction.
- First viewport begins with raw analytics.

### 2. Why is it happening?

Pass condition:

- Top three ranked drivers are visible immediately below the hero.
- Driver titles are plain and evidence-backed.
- Rank and impact are visible.

Fail condition:

- Reasons are hidden in tables, charts, or narrative paragraphs.
- More than five drivers compete for attention.

### 3. What evidence supports it?

Pass condition:

- Evidence preview shows top sources and health.
- Missing or partial data is explicit.
- Full details are discoverable below fold.

Fail condition:

- Evidence appears as a raw wall.
- Source quality is hidden.
- Missing evidence looks like a product bug instead of a data state.

### Overall Validation

Dashboard V2 succeeds if:

- the first viewport reads as one answer, not many widgets
- drivers are ranked before evidence
- evidence is compact before it becomes dense
- analytics supports the conclusion instead of leading it
- terminal identity remains intact

