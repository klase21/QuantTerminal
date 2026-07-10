# Information Object Inventory

**Status:** Product Architecture Gate artifact  
**Sprint:** P1.5R Product Architecture Review and Blueprint Certification  
**Owner:** Product / Information Architecture  
**Scope:** Information object ownership only. No implementation.  

## Purpose

This inventory extracts the durable information objects that appear across the
product architecture. Each object must have one owner and clear consumers.

## Inventory

| Information Object | Owner | Source | Consumers | Priority |
| --- | --- | --- | --- | --- |
| Market Direction | Dashboard | Evidence, market state, source-backed inputs | Dashboard, Markets, Trade | P0 |
| Evidence | Evidence Cards / Evidence Engine | Repository, projection metadata, source-backed facts | All screens | P0 |
| Confidence | Evidence | Source-backed method or unavailable state | Evidence Cards, Scanner, Research, Trade | P1 |
| Funding | Repository / Markets / Replay | Historical funding, live approved source when available | Markets, Replay, Research, Evidence | P0 |
| Open Interest | Repository / Markets / Replay | Historical OI, live approved source when available | Markets, Replay, Research, Evidence | P0 |
| Liquidation | Repository / Markets / Replay | Canonical or experimental provider records | Markets, Replay, Research, Evidence | P0 |
| Volume | Repository / Markets | Market data records | Dashboard, Markets, Replay, Research | P1 |
| Historical Analog | Replay / Research | Source-backed historical context | Dashboard as link/context, Replay, Research, Trade | P1 |
| Replay | Replay | Repository coverage, bounded datasets, adapters | Dashboard, Research, Trade | P1 |
| Research | Research | Evidence, replay, repository, future reasoning | Dashboard, Replay, Trade | P1 |
| Prediction Market | Markets / Evidence | Source-backed prediction market data | Dashboard, Markets, Research | P2 |
| ETF Flow | Markets / Evidence | Source-backed ETF flow data | Markets, Dashboard, Research | P2 |
| Macro | Markets / Evidence | Source-backed macro data | Markets, Dashboard, Research | P2 |
| Scenario | Trade / Future Reasoning | User-defined or evidence-backed planning context | Trade, Research | P2 |
| Trade Thesis | Trade | Selected candidate, evidence, risk | Trade, Research | P1 |
| Risk | Trade | Evidence, invalidation, scenario context | Trade, Scanner, Research | P1 |
| Repository | Repository | Durable facts, projections, lineage | Evidence, Replay, Research, QA | P0 |
| Counter Evidence | Research / Evidence | Source-backed contradiction or limitation | Research, Evidence Cards, Trade | P1 |
| Reasoning | Future Reasoning layer | Evidence packets and historical context | Dashboard, Research, Trade, Decision Flow | Future |
| Source Metadata | Repository / Evidence | Provider metadata, source timestamp, freshness | All evidence surfaces | P0 |
| Availability State | Evidence / Projection | Coverage, projection lifecycle, provider status | All screens | P0 |
| Provider Tier | Repository / Evidence | Provider registry and record metadata | Evidence, Research, Replay, QA | P0 |
| Workspace Context | Workspace | User preferences and saved references | Navigation, all screens | P2 |
| Opportunity Candidate | Scanner | Source-backed scanner output | Scanner, Trade, Replay, Research | P1 |
| Execution Notes | Trade | User-authored planning context | Trade | P2 |

## Ownership Findings

- Repository owns durable truth, not product meaning.
- Evidence owns trust containers, not reasoning.
- Dashboard owns fast market orientation, not historical investigation.
- Replay owns historical movement explanation.
- Research owns deep thesis understanding and counter-evidence.
- Trade owns candidate evaluation, not signal generation.
- Workspace owns saved context, not facts.

## Certification Finding

No information object requires two primary owners. Shared objects are
source-backed inputs or reusable product objects, not duplicated ownership.

