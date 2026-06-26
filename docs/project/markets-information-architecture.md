# Markets Information Architecture

Status: Project Beta Sprint M1  
Scope: Markets V2 IA design  
Non-goals: runtime implementation, API changes, Dashboard changes

Markets V2 is organized around live opportunity discovery.

Primary hierarchy:

```text
Market Context
↓
Ranked Opportunities
↓
Market Breadth
↓
Sector Rotation
↓
Exchange Overview
↓
ETF / Capital Flow
↓
Market Movers
↓
Supporting Analytics
```

## 1. Market Context

Why it exists:

Markets must show the active universe before ranking anything. Users need to know whether they are looking at all markets, majors, alts, a sector, one exchange, spot, futures, or a filtered subset.

User decision enabled:

Can I trust this ranking for my intended universe?

Inputs:

- selected exchange;
- symbol universe;
- timeframe;
- asset category;
- active filters;
- data health.

Outputs:

- visible filter state;
- universe summary;
- source freshness;
- reset or modify filter actions.

Dependencies:

- shared investigation context when present;
- market metadata;
- data health engine;
- symbol/exchange registry.

## 2. Ranked Opportunities

Why it exists:

This is the primary Markets section. It answers which live symbols deserve attention.

User decision enabled:

Which market should I inspect first?

Inputs:

- price and volume;
- funding;
- OI;
- liquidations;
- exchange flow;
- ETF/capital flow when relevant;
- market driver evidence;
- freshness and coverage status.

Outputs:

- ranked symbol rows;
- reason tags;
- evidence health;
- next actions to Trade, Research, or symbol detail.

Dependencies:

- market data snapshots;
- market driver outputs;
- funding/OI/liquidation evidence;
- capital flow artifacts;
- data health policies.

## 3. Market Breadth

Why it exists:

Breadth explains whether opportunity is broad-based or concentrated in a few names.

User decision enabled:

Is this a market-wide move or isolated symbol action?

Inputs:

- advancing/declining symbol counts;
- volume participation;
- sector/category participation;
- majors vs alts behavior;
- exchange coverage.

Outputs:

- breadth state;
- concentration warning;
- participation summary.

Dependencies:

- symbol universe;
- OHLCV snapshots;
- volume data;
- category mapping.

## 4. Sector Rotation

Why it exists:

Crypto opportunities often cluster by narrative, sector, asset class, or theme. Rotation helps users identify where attention is moving.

User decision enabled:

Which category is gaining or losing leadership?

Inputs:

- asset categories;
- sector tags;
- narrative tags where available;
- price and volume changes;
- capital flow evidence.

Outputs:

- ranked sectors;
- leading symbols per sector;
- rotation direction;
- evidence health.

Dependencies:

- category metadata;
- symbol rankings;
- narrative tags if available;
- price/volume snapshots.

## 5. Exchange Overview

Why it exists:

Exchange-level differences reveal whether a move is broad, venue-specific, spot-led, or futures-led.

User decision enabled:

Is this opportunity confirmed across venues or isolated to one exchange?

Inputs:

- exchange-level price/volume;
- funding by venue;
- OI by venue;
- liquidation by venue;
- exchange flow/reserve evidence when available.

Outputs:

- exchange participation summary;
- exchange-specific anomalies;
- venue health states.

Dependencies:

- exchange metadata;
- futures data;
- liquidation evidence;
- exchange flow/reserve artifacts;
- data health.

## 6. ETF / Capital Flow

Why it exists:

Capital flow is high-priority evidence for major assets. It should appear on Markets when it helps compare assets or explain live attention.

User decision enabled:

Is capital flow supporting this market move?

Inputs:

- ETF snapshots;
- treasury snapshots;
- exchange reserve intelligence;
- exchange flow artifacts;
- freshness and coverage metadata.

Outputs:

- capital flow summary;
- asset-level support or contradiction;
- unavailable states for missing flow evidence.

Dependencies:

- deployable artifacts;
- data health engine;
- asset mapping.

## 7. Market Movers

Why it exists:

Movers provide fast discovery for abnormal price, volume, OI, funding, or liquidation changes.

User decision enabled:

Which symbols are moving enough to deserve follow-up?

Inputs:

- price change;
- volume change;
- OI change;
- funding change;
- liquidation spikes;
- data freshness.

Outputs:

- top gainers/losers;
- unusual volume;
- unusual positioning;
- handoff to symbol detail.

Dependencies:

- OHLCV;
- funding/OI/liquidation readers;
- symbol metadata.

## 8. Supporting Analytics

Why it exists:

Analytics lets expert users verify the ranking after the opportunity is visible.

User decision enabled:

What evidence explains or weakens this ranking?

Inputs:

- raw or semi-aggregated market data;
- detailed funding/OI/liquidation tables;
- exchange comparisons;
- data health diagnostics.

Outputs:

- diagnostic detail;
- evidence trace;
- missing source reasons.

Dependencies:

- existing market data sources;
- data health engine;
- evidence contracts.

## Dashboard Boundary

Must remain on Dashboard:

- current market direction;
- top market drivers;
- compact evidence preview;
- high-level data health;
- prediction markets summary;
- tactical alerts.

Belongs on Markets:

- ranked symbols;
- market breadth;
- sector rotation;
- exchange overview;
- dense live structure;
- market movers;
- symbol comparison analytics.

Should move later if currently elsewhere:

- broad ranked asset tables from Dashboard;
- dense OI/funding/liquidation comparison grids;
- exchange-by-exchange participation tables;
- sector leadership panels.

## IA Validation

Pass:

- ranked opportunities appear before supporting analytics;
- every section has a decision purpose;
- Dashboard remains the broad conclusion surface;
- Markets remains the dense live verification surface.

Fail:

- IA starts with raw analytics;
- section purpose is unclear;
- Markets duplicates Dashboard's primary question;
- historical-heavy workflows become central.
