# Markets Wireframe

Status: Project Beta Sprint M1  
Scope: textual wireframe only  
Non-goals: visual mockups, React implementation, runtime changes

Markets V2 should be dense, but the first read must still answer:

```text
Which live markets deserve attention?
```

## Desktop Textual Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ MARKETS                                                                      │
│ Universe: All Futures | Exchange: Binance Futures | Timeframe: 1h | CURRENT │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ MARKET CONTEXT                                                               │
│ Opportunities Active | Breadth Mixed | Liquidity Concentrated | Data CURRENT │
│ Filters: Majors + Alts | Sort: Opportunity Rank | Health: PARTIAL            │
└──────────────────────────────────────────────────────────────────────────────┘

↓

┌──────────────────────────────────────────────────────────────────────────────┐
│ RANKED OPPORTUNITIES                                                         │
│ #  Symbol   State      Reasons                  Health   Next                │
│ 1  BTCUSDT  Leading    OI ↑ / ETF flow / volume CURRENT  Trade | Research    │
│ 2  ETHUSDT  Watch      funding shift / OI ↑     PARTIAL  Inspect            │
│ 3  SOLUSDT  Volatile   liquidation / volume     CURRENT  Inspect            │
│ 4  ...      ...        ...                      ...      ...                │
└──────────────────────────────────────────────────────────────────────────────┘

↓

┌──────────────────────────────────────────────────────────────────────────────┐
│ MARKET BREADTH                                                               │
│ Advancers / Decliners | Volume Participation | Majors vs Alts | Concentration│
└──────────────────────────────────────────────────────────────────────────────┘

↓

┌──────────────────────────────────────────────────────────────────────────────┐
│ SECTOR ROTATION                                                              │
│ Sector/Narrative     Direction    Leaders            Evidence Health         │
│ Majors               Strong       BTC, ETH           CURRENT                 │
│ L1s                  Mixed        SOL, AVAX          PARTIAL                 │
│ AI/RWA/Other         Watch        ...                MISSING/PARTIAL         │
└──────────────────────────────────────────────────────────────────────────────┘

↓

┌──────────────────────────────────────────────────────────────────────────────┐
│ EXCHANGE OVERVIEW                                                            │
│ Venue            Participation     OI/Funding State     Liquidation Context  │
│ Binance Futures  Leading           OI ↑ / funding +     short liq cluster    │
│ OKX              Confirming        OI stable            low liquidation       │
│ Bybit            Divergent         funding -            watch                │
└──────────────────────────────────────────────────────────────────────────────┘

↓

┌──────────────────────────────────────────────────────────────────────────────┐
│ ETF / CAPITAL FLOW                                                           │
│ ETF Flow | Treasury | Exchange Reserve | Exchange Flow | Health              │
│ Asset-scoped cards only. Missing sources show explicit state and reason.      │
└──────────────────────────────────────────────────────────────────────────────┘

↓

┌──────────────────────────────────────────────────────────────────────────────┐
│ MARKET MOVERS                                                                │
│ Price Movers | Volume Movers | OI Movers | Funding Movers | Liquidation Spikes│
└──────────────────────────────────────────────────────────────────────────────┘

↓

┌──────────────────────────────────────────────────────────────────────────────┐
│ SUPPORTING ANALYTICS                                                         │
│ Dense tables, detailed charts, diagnostics, source health, raw-ish metrics    │
│ Analytics supports ranking. Analytics does not lead the page.                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Section Explanations

### Hero / Market Context

Purpose:

Show the active universe and whether the opportunity set is usable.

Must show:

- exchange;
- timeframe;
- universe;
- active filters;
- data health;
- breadth summary.

Must not show:

- Dashboard-style broad market direction as the main conclusion.

### Ranked Opportunities

Purpose:

Primary page answer. Users should see where attention belongs.

Must show:

- rank;
- symbol;
- state;
- reason tags;
- evidence health;
- next action.

Must not show:

- execution plan;
- historical analog case table;
- long narrative explanation.

### Market Breadth

Purpose:

Explain whether opportunities are broad or concentrated.

Must show:

- participation;
- concentration;
- majors vs alts;
- health state.

### Sector Rotation

Purpose:

Show where attention is rotating by category.

Must show:

- category;
- direction;
- leaders;
- evidence health.

### Exchange Overview

Purpose:

Show whether the move is venue-confirmed or venue-specific.

Must show:

- exchange participation;
- OI/funding state;
- liquidation context;
- missing source states.

### ETF / Capital Flow

Purpose:

Expose high-priority flow evidence when relevant.

Must show:

- ETF evidence;
- reserve evidence;
- treasury evidence;
- exchange flow evidence;
- freshness and coverage.

### Market Movers

Purpose:

Fast discovery for abnormal movement.

Must show:

- price movers;
- volume movers;
- OI movers;
- funding movers;
- liquidation spikes.

### Supporting Analytics

Purpose:

Detailed verification after the ranked opportunity is visible.

Must show:

- dense tables;
- charts;
- diagnostics;
- source health.

Must remain below first-read content.

## Dashboard Boundary

Dashboard first read:

```text
What is happening and why?
```

Markets first read:

```text
Which markets deserve attention?
```

Dashboard must keep:

- Market Direction;
- Top Drivers;
- Evidence Preview;
- Prediction Markets;
- Tactical Alerts.

Markets must own:

- ranked symbols;
- market breadth;
- sector rotation;
- exchange overview;
- market movers;
- dense live structure.

Move later to Markets if present on Dashboard:

- broad symbol comparison;
- deep OI/funding/liquidation analytics;
- sector leadership;
- exchange participation diagnostics.

## Wireframe Validation

Pass:

- opportunities appear before analytics;
- filters are visible;
- evidence health is visible;
- Dashboard boundary is clear;
- exit paths to Trade and Research are implied without becoming those pages.

Fail:

- broad market direction dominates Markets;
- raw analytics appear first;
- Trade execution appears in Markets;
- historical workflows dominate Markets;
- unavailable evidence lacks explicit state.
