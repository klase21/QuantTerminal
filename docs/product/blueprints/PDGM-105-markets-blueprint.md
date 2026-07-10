# PDGM-105 Markets Blueprint

## Blueprint Metadata

| Field | Value |
| --- | --- |
| Blueprint ID | PDGM-105 |
| Version | v1.0 |
| Owner | Product / Design |
| Dependencies | Markets IA, Evidence, Repository, Scanner, Replay, Research |
| Related MASTER documents | `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`, `MASTER_ARCHITECTURE.md` |
| Related diagrams | DGM-001, DGM-002, DGM-004, future Product Diagram Pack |
| Status | Canonical |
| Review cycle | Review before Markets redesign, market data changes, or implementation. |

## 1. Purpose

Markets exists for market monitoring.

Primary user question: `Which markets deserve attention, and does live structure confirm it?`

Expected user outcome: the user can monitor market state, inspect sectors,
flows, derivatives, macro, prediction evidence, and route to Scanner, Replay,
Research, or Trade.

## 2. Inputs

| Input | Role |
| --- | --- |
| Repository | Historical and source-backed context. |
| Evidence | Market observations, freshness, and warnings. |
| Reasoning | Future bounded summaries only. |
| Research | Deep context path. |
| Replay | Historical validation path. |
| Signals | Candidate context from Scanner. |
| Historical Context | Baselines and comparisons when source-backed. |
| Macro | Macro context only when source-backed. |
| Prediction Markets | Probability evidence only. |
| User Preferences | Watchlists, sectors, symbols, density. |

## 3. Outputs

- User can identify markets requiring attention.
- User can verify live market structure.
- User can route to Scanner, Replay, Research, or Trade.

## 4. Information Hierarchy

| Level | Information | Why |
| ---: | --- | --- |
| Level 1 | Market Overview | Establishes live monitoring state. |
| Level 2 | Sector Rotation | Groups market behavior by durable context. |
| Level 3 | ETF | Adds ETF flow context when source-backed. |
| Level 4 | Macro | Adds macro state only when available. |
| Level 5 | Prediction Markets | Adds event/probability evidence without predicting. |
| Level 6 | Flows | Shows movement and capital context. |
| Level 7 | Derivatives | Shows funding, OI, liquidations, and leverage evidence. |

## 5. User Journey

Entry: from Dashboard, primary navigation, search, or saved workspace.

Primary workflow: scan overview -> inspect sectors/flows/derivatives -> filter
symbols -> route to Scanner or Replay.

Secondary workflow: inspect macro/prediction context, save market view, open
Research.

Exit: Scanner, Replay, Research, Trade, Dashboard.

Context preservation: symbol, sector, exchange, timeframe, evidence category,
and source state travel to destination.

## 6. Interaction Model

Click selects market, sector, or evidence. Hover shows source/freshness. Expand
reveals detail. Drill-down opens Scanner, Replay, Research, Trade, or
Repository. Search finds markets/symbols. Filtering narrows sectors, evidence
types, exchanges, and timeframes. Workspace saves monitoring views.

## 7. Dependencies

Markets depends on `MASTER_PRODUCT.md`, Information Architecture, Pattern
Library, Design DNA, Evidence Cards, Repository, Scanner, Replay, Research,
and future Reasoning.

## 8. Success Criteria

- User can monitor markets without deep research.
- Derivatives and flow evidence are visible and source-backed.
- Macro and prediction evidence remain unavailable when missing.
- Search and filtering are fast.
- Live monitoring stays responsive.

## 9. DO

- Always prioritize live market monitoring.
- Always show source/freshness for evidence.
- Always separate prediction evidence from prediction.
- Always route historical validation to Replay.
- Always preserve symbol and timeframe context.

## 10. DO NOT

- Never make Markets a historical-heavy workspace.
- Never fabricate macro or prediction context.
- Never bury warnings under heatmaps.
- Never use color without state labels.
- Never replace Scanner or Research ownership.

## 11. Future Expansion

Markets may evolve with plugin sectors, macro providers, prediction-market
evidence, enterprise monitoring, AI-assisted navigation, and workspace
personalization. Expansion must preserve real-time-first ownership.
