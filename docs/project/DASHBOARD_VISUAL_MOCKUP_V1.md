# Dashboard Visual Mockup V1

Status: high-fidelity visual specification  
Audience: Figma AI, Figma Make, Lovable, v0, Claude Code, Codex, product reviewers  
Source documents: `DESIGN.md`, `DASHBOARD_MOCKUP_V2.md`, `MAKE_ANALYSIS.md`  
Non-goals: React implementation, runtime changes, component code, new data generation

This document defines a desktop-first visual mockup for the QuantTerminal Dashboard. It is a visual design specification, not executable UI.

The dashboard must preserve:

- Bloomberg Density
- Valley Clarity
- GMGN Actionability
- terminal feel
- dark green theme
- monospace typography
- professional trading workstation aesthetic

The dashboard must follow:

```text
Conclusion
-> Drivers
-> Evidence
-> Analytics
```

---

## 1. Visual Hierarchy Summary

The Dashboard is an intelligence surface, not a widget board.

The first viewport must answer:

1. What is happening?
2. Why is it happening?
3. What evidence supports it?

Primary visual priority:

| Priority | Element | Required visual behavior |
|---:|---|---|
| 1 | Market Direction | Largest, highest contrast, first eye landing |
| 2 | Confidence | Visible but secondary to direction |
| 3 | Top Drivers | Exactly 3 visible, ranked, action-oriented |
| 4 | Evidence Preview | Compact proof cards, no metric wall |
| 5 | Historical Analog Strip | Lightweight historical context |
| 6 | Analytics | Below fold, lower visual emphasis |

The page should feel like:

```text
One market conclusion
with ranked reasons
and compact evidence
inside a dense terminal workstation.
```

---

## 2. Canvas And Grid

Primary canvas:

- Resolution: `1440 x 1024`
- Outer margin: `12px`
- Grid: `12 columns`
- Gutter: `8px`
- Background: dark green-black terminal surface
- Panel corner radius: `2px`
- Panel stroke: `1px` dark olive
- Section rails: amber
- Typography: monospace throughout

Recommended canvas colors:

| Role | Color |
|---|---|
| Page background | `#070d07` |
| Panel surface | `#0c140c` |
| Raised panel | `#111911` |
| Active/input surface | `#141e14` |
| Border | `#1c2c1c` |
| Amber rail | `#f97316` |
| Amber dim | `#7c3d12` |
| Positive | `#22c55e` |
| Negative | `#e53535` |
| Caution | `#facc15` |
| Info | `#38bdf8` |
| Text primary | `#d4dbd4` |
| Text secondary | `#a0b0a0` |
| Text muted | `#6b7d6b` |

---

## 3. Desktop Mockup Description

Viewport: `1440 x 1024`

### Desktop Layout Allocation

| Zone | X | Y | W | H | Visual role |
|---|---:|---:|---:|---:|---|
| App chrome / utility bar | 12 | 12 | 1416 | 40 | context and health |
| Market Direction Hero | 12 | 60 | 1416 | 250 | conclusion |
| Top Drivers | 12 | 318 | 1416 | 150 | primary reasons |
| Evidence Preview | 12 | 476 | 1416 | 220 | proof |
| Historical Analog Strip | 12 | 704 | 1416 | 68 | lightweight context |
| Below-fold analytics | 12 | 796 | 1416 | variable | detail support |

The first fold on a `1440 x 1024` canvas includes the hero, drivers, evidence preview, and historical strip. Dense analytics begin below the primary comprehension layer.

### Desktop Above The Fold

```text
12px margin
--------------------------------------------------------------------------------
UTILITY BAR 40px
BTCUSDT / BINANCE_FUTURES / 1H                 DATA HEALTH: PARTIAL  UPDATED UTC
--------------------------------------------------------------------------------
MARKET DIRECTION HERO 250px
| AMBER RAIL |
| BULLISH                                                        CONFIDENCE 74 |
| One-line market conclusion.                                     REGIME TREND |
| Evidence coverage: 6/8                                          HEALTH PARTIAL|
--------------------------------------------------------------------------------
TOP DRIVERS 150px
| #1 ETF INFLOWS              | #2 RESERVE INCREASE       | #3 TREASURY ACCUM |
| impact 92 / current         | impact 78 / current       | impact 64 / partial|
| observation line            | observation line          | observation line   |
| + 3 More Drivers                                                              |
--------------------------------------------------------------------------------
EVIDENCE PREVIEW 220px
| ETF                     | RESERVE                 | TREASURY              |
| top observation         | top observation         | top observation       |
| current / source        | current / source        | partial / source      |

| OPEN INTEREST compact | LIQUIDATION compact | EXCHANGE FLOW compact | FUNDING compact |
--------------------------------------------------------------------------------
HISTORICAL ANALOG STRIP 68px
Historical Context  Similar Cases  24h Avg  Win Rate  Dominant Outcome  Source
--------------------------------------------------------------------------------
```

### Desktop Below The Fold

```text
--------------------------------------------------------------------------------
PREDICTION MARKETS
compact probability / attention / source rows
--------------------------------------------------------------------------------
TACTICAL ALERTS                                DATA HEALTH
dense alert rows                               source status and freshness
--------------------------------------------------------------------------------
NARRATIVE HEATMAP                              DEEP ANALYTICS
regional narrative grid                        funding / OI / liquidation details
--------------------------------------------------------------------------------
```

### Desktop Visual Treatment

Market Direction Hero:

- occupies the full 12-column width
- has the strongest amber left rail
- uses the largest type on the page
- must not contain dense tables
- must not be visually equal to surrounding panels

Top Drivers:

- three equal cards across the full width
- each card has a large rank marker
- the rank marker and title dominate
- impact score and source quality are secondary
- collapsed row sits below the three cards

Evidence Preview:

- first row contains ETF, Reserve, Treasury
- second row contains compact secondary evidence
- cards are compact, not chart-heavy
- missing or partial state is visible as a health badge

Historical Analog:

- a single strip
- lower contrast than drivers
- no large chart
- no case table
- no heavy loading affordance

Analytics:

- dense but subordinate
- smaller typography
- lower contrast surfaces
- never above drivers

---

## 4. Market Direction Hero Specification

Purpose: answer "What is happening?"

Visual weight: at least 50% of above-fold attention.

### Hero Content

Required fields:

- Direction: `BULLISH`, `BEARISH`, or `NEUTRAL`
- Confidence
- Regime
- Health
- One-line conclusion

### Hero Type Scale

| Element | Size | Weight | Treatment |
|---|---:|---:|---|
| Direction | 72px | 700 | uppercase, high contrast |
| Confidence value | 32px | 700 | secondary block |
| Regime | 12px | 700 | badge |
| Health | 12px | 700 | badge with text |
| Conclusion | 14px | 500 | one line |
| Metadata | 10px | 500 | muted uppercase |

### Hero Layout

```text
| 56% direction block | 22% confidence block | 22% regime / health block |
```

Direction block:

- top label: `MARKET DIRECTION`
- main text: `BULLISH`
- supporting line: one sentence, maximum 96 characters

Confidence block:

- large value
- evidence coverage count
- no fake precision

Regime / health block:

- regime badge
- health badge
- last updated line
- missing critical evidence if applicable

Visual rule:

The eye must land on `BULLISH / BEARISH / NEUTRAL` first, not on the confidence number.

---

## 5. Driver Section Specification

Purpose: answer "Why is it happening?"

Visible driver count: exactly 3.

Driver card height: `112-124px`  
Driver card gap: `8px`  
Driver card padding: `12px`

### Driver Card Anatomy

```text
#1
ETF INFLOWS
impact 92
CURRENT
Observed capital inflow.
```

Typography:

| Element | Size | Treatment |
|---|---:|---|
| Rank | 28px | high contrast, amber or primary text |
| Driver title | 16px | uppercase, strong |
| Impact score | 11px | compact |
| Quality badge | 10px | explicit status |
| Observation | 11px | one line |

Example visible drivers:

```text
#1 ETF INFLOWS
#2 RESERVE INCREASE
#3 TREASURY ACCUMULATION
```

Collapsed row:

```text
+ 3 More Drivers
Funding / Open Interest / Historical Analog
```

Rules:

- Never show more than three full driver cards above the fold.
- Remaining drivers collapse into one row.
- Ranking must be visually obvious.
- Stale or partial evidence can appear, but should show its state.
- No long explanations.

---

## 6. Evidence Preview Specification

Purpose: answer "What evidence supports it?"

Evidence cards must be compact. They should feel like proof points, not independent dashboards.

Primary evidence:

- ETF
- Reserve
- Treasury

Secondary evidence:

- Open Interest
- Liquidation
- Exchange Flow
- Funding

### Evidence Card Anatomy

```text
ETF
Top observation
CURRENT / source
```

Recommended card dimensions:

| Card | Desktop size |
|---|---:|
| Primary evidence card | `calc(4 columns)` by `96px` |
| Secondary evidence card | `calc(3 columns)` by `72px` |

Typography:

| Element | Size | Treatment |
|---|---:|---|
| Evidence title | 11px | uppercase |
| Observation value | 15px | strong |
| Source / health | 10px | muted but visible |

Rules:

- Top observation first.
- Maximum three values per card.
- Source and health visible.
- Do not show raw tables above the fold.
- If evidence is missing, show a compact reason only when trust is affected.

---

## 7. Historical Analog Strip Specification

Purpose: provide lightweight historical context without restoring the old heavy Historical Analog dashboard panel.

Placement:

- directly below Evidence Preview
- before Prediction Markets and Analytics
- near the fold boundary

Size:

- desktop height: `64-72px`
- full width
- no nested cards

Visual treatment:

- muted border
- thin amber prefix rail
- lower contrast than drivers
- one-line metric row

Content pattern:

```text
HISTORICAL CONTEXT
Similar cases: 25
24h avg: +1.8%
Win rate: 61%
Dominant outcome: continuation
Source: cache
Generated: UTC
```

Rules:

- cache-only
- no request-time historical computation
- no large loading state
- if unavailable, show a concise unavailable reason

---

## 8. Analytics Specification

Purpose: support decision review after the user understands conclusion, drivers, and evidence.

Below-fold analytics may be dense.

Include:

- Prediction Markets
- Tactical Alerts
- Data Health
- Narrative Heatmap
- Deep Funding / OI / Liquidation details
- Deep capital flow details

Visual rules:

- lower contrast than hero
- smaller section titles
- no hero-scale type
- may use tabular density
- must show state labels when data is stale, missing, partial, or unavailable

Analytics supports decisions. Analytics does not lead decisions.

---

## 9. Tablet Mockup Description

Target canvas: `834 x 1112`

Tablet keeps the same order but compresses columns.

```text
UTILITY BAR

MARKET DIRECTION HERO
BULLISH
Confidence 74     Regime Trending     Health Partial

TOP DRIVERS
| #1 ETF INFLOWS        | #2 RESERVE INCREASE |
| #3 TREASURY ACCUMULATION                  |
+ More Drivers

EVIDENCE PREVIEW
| ETF        | RESERVE |
| TREASURY   | OI      |
| LIQUIDATION| FLOW    |

HISTORICAL CONTEXT STRIP

PREDICTION MARKETS
TACTICAL ALERTS
DATA HEALTH
DEEP ANALYTICS
```

Tablet rules:

- hero is full width
- direction remains visually dominant
- driver layout becomes two columns plus one spanning card
- evidence uses two columns
- historical strip remains lightweight
- analytics stacks below

Tablet typography:

- Direction: `48-56px`
- Confidence: `26-30px`
- Driver title: `15px`
- Metadata: `10px`

---

## 10. Mobile Mockup Description

Target canvas: `390 x 844`

Mobile first viewport must show:

1. symbol and health
2. direction
3. confidence and regime
4. top three drivers

### Mobile First Viewport

```text
BTCUSDT                         HEALTH PARTIAL

MARKET DIRECTION
BULLISH
Confidence 74
Regime Trending
One-line conclusion.

WHY
#1 ETF INFLOWS                  92
#2 RESERVE INCREASE             78
#3 TREASURY ACCUMULATION        64
+ 3 More Drivers
```

### Mobile Continuation

```text
EVIDENCE
ETF             top observation     current
Reserve         top observation     current
Treasury        top observation     partial
Show all evidence

HISTORICAL CONTEXT
25 cases / 61% win rate / cache

ANALYTICS
Prediction Markets collapsed
Tactical Alerts collapsed
Data Health collapsed
Deep Analytics collapsed
```

Mobile rules:

- no dense evidence wall in the first viewport
- no chart above direction
- top drivers are row cards, not full-width paragraphs
- evidence defaults to three compact rows
- secondary evidence and analytics are collapsed
- all health states must be text-visible

Mobile typography:

- Direction: `36-40px`
- Confidence: `22-26px`
- Driver title: `14-15px`
- Metadata: `10px`

---

## 11. Visual Priority Map

```text
Priority 1
Market Direction Hero
Largest text, strongest contrast, widest area

Priority 2
Top 3 Drivers
Ranked cards, clear impact ordering

Priority 3
Evidence Preview
Compact proof, source and health visible

Priority 4
Historical Analog Strip
Lightweight historical context, cache-only

Priority 5
Prediction Markets / Tactical Alerts / Data Health
Useful supporting intelligence below fold

Priority 6
Deep Analytics
Dense validation layer for expert review
```

The dashboard fails if Priority 5 or 6 visually competes with Priority 1 or 2.

---

## 12. Current Dashboard vs Dashboard V2

| Category | Current Dashboard | Dashboard V2 |
|---|---|---|
| First read | analytics and widgets compete | Market Direction dominates |
| User task | infer state from metrics | understand conclusion immediately |
| Drivers | mixed into panels | top 3 ranked cards |
| Evidence | broad widget grid | compact proof preview |
| Historical context | risk of heavy panel behavior | lightweight cache-only strip |
| Analytics | can lead the page | below-fold support |
| Missing data | may look broken | explicit health states |
| Mobile | dense compression | conclusion and drivers first |

Removed:

- metric walls above the conclusion
- large historical panel
- duplicate first-viewport visualizations
- long primary narrative blocks

Promoted:

- Market Direction
- Top Drivers
- Evidence Health
- Capital-flow evidence

Simplified:

- Historical Analog becomes a strip.
- Evidence becomes compact proof.
- Analytics becomes a lower-priority validation layer.
- Driver list becomes three visible plus collapsed remainder.

---

## 13. Figma Generation Prompt

Use this prompt for Figma Make or Figma AI.

```text
Create a high-fidelity desktop dashboard mockup for QuantTerminal, a professional crypto market intelligence terminal.

Canvas:
- Desktop-first 1440 x 1024.
- Dark green-black terminal background (#070d07).
- 12-column grid, 8px gutters, 12px outer spacing.
- Monospace typography throughout, Space Mono style.
- Sharp professional trading workstation aesthetic.
- Dark panel surfaces (#0c140c, #111911), dark olive borders (#1c2c1c), amber rails (#f97316).

Design identity:
- Bloomberg Density below the fold.
- Valley Clarity above the fold.
- GMGN Actionability through ranked drivers.
- Terminal feel, dark green theme, compact professional density.

Information hierarchy:
1. Conclusion
2. Drivers
3. Evidence
4. Analytics

Above the fold:

1. Market Direction Hero
- Full width, height about 250px.
- Must dominate the viewport with more than 50% visual weight.
- Left amber rail.
- Large direction text at 72px: BULLISH, BEARISH, or NEUTRAL.
- Use BULLISH as placeholder display text only.
- Confidence block at 32px, secondary to direction.
- Regime badge and Health badge as tertiary metadata.
- Include a one-line conclusion under the direction.
- Direction must be the first eye landing.

2. Top Drivers
- Full width row below hero, height about 150px.
- Exactly three visible driver cards.
- Large rank numbers.
- Driver card examples:
  #1 ETF INFLOWS
  #2 RESERVE INCREASE
  #3 TREASURY ACCUMULATION
- Each card includes impact score, quality state, and one short observation line.
- Add a compact collapsed row: + 3 More Drivers.

3. Evidence Preview
- Compact evidence cards, no metric wall.
- First row: ETF, Reserve, Treasury.
- Secondary compact row: Open Interest, Liquidation, Exchange Flow, Funding.
- Each card shows one observation, source/health, and no more than three values.
- Use explicit health labels such as CURRENT, PARTIAL, STALE, UNAVAILABLE.

4. Historical Analog Strip
- Single horizontal strip, height about 68px.
- Not a large panel.
- Lower visual contrast than drivers.
- Show: Similar cases, 24h average return, win rate, dominant outcome, source, generated time.
- Label it Historical Context.

Below the fold:
- Prediction Markets.
- Tactical Alerts.
- Data Health.
- Narrative Heatmap.
- Deep Analytics.
- These sections have lower contrast and smaller typography than the hero.
- Dense analytics are allowed only below the conclusion, drivers, and evidence.

Typography:
- Direction: 72px, uppercase, monospace, high contrast.
- Confidence: 32px.
- Driver title: 16px uppercase.
- Evidence values: 15px.
- Metadata: 10px uppercase.

Mobile and tablet behavior:
- Tablet: hero full width, drivers in two columns plus one spanning card, evidence in two columns, analytics stacked.
- Mobile: first viewport shows symbol/health, direction, confidence/regime, and top three drivers. Evidence begins after the first viewport. Analytics collapsed.

Do not create a generic dashboard. Create an intelligence terminal where the user can answer within five seconds:
What is happening?
Why is it happening?
What evidence supports it?
```

---

## 14. Validation Results

### Five-Second Test

Question: What is happening?

Pass:

- Direction is the largest element.
- Hero is above all analytics.
- One-line conclusion appears directly under direction.

Question: Why is it happening?

Pass:

- Exactly three ranked drivers appear immediately below hero.
- Driver rank and title are visible without scanning dense tables.

Question: What evidence supports it?

Pass:

- ETF, Reserve, and Treasury evidence appear before lower-priority analytics.
- Health and source states are visible.
- Evidence is compact, not a wall.

### Design Consistency Check

Preserved:

- terminal aesthetic
- dark green surfaces
- amber rails
- monospace type
- compact professional density

Changed:

- dashboard now leads with conclusion
- drivers precede evidence
- evidence precedes analytics
- dense analytics move below fold

No runtime code changes are required by this specification.

