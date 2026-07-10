# PDGM-102 Replay Blueprint

## Blueprint Metadata

| Field | Value |
| --- | --- |
| Blueprint ID | PDGM-102 |
| Version | v1.0 |
| Owner | Product / Design |
| Dependencies | Replay IA, Repository, Coverage, Projection, Evidence, Research |
| Related MASTER documents | `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`, `MASTER_ARCHITECTURE.md` |
| Related diagrams | DGM-001, DGM-004, DGM-006, future Product Diagram Pack |
| Status | Canonical |
| Review cycle | Review before Replay design, Figma, repository-backed UI, or frontend implementation. |

## 1. Purpose

Replay exists to explain why the market moved in a bounded historical window.

Primary user question: `What happened in this historical window?`

Expected user outcome: the user understands event sequence, available
evidence, unavailable evidence, and the path to deeper research.

## 2. Inputs

| Input | Role |
| --- | --- |
| Repository | Source of historical facts. |
| Evidence | Replay observations and availability state. |
| Reasoning | Future bounded explanation only after approval. |
| Research | Deeper thesis path. |
| Replay | Current replay window and selected datasets. |
| Signals | Optional candidate context if arriving from Scanner or Dashboard. |
| Historical Context | Comparable windows when source-backed. |
| Macro | Window context if available. |
| Prediction Markets | Event probability context if relevant and source-backed. |
| User Preferences | Selected date, hour, datasets, and density. |

## 3. Outputs

- User can identify sequence and likely evidence drivers.
- User can open Research or Repository for deeper inspection.
- User gains knowledge of what data exists, what is missing, and what remains
  unavailable.

## 4. Information Hierarchy

| Level | Information | Why |
| ---: | --- | --- |
| Level 1 | Replay Summary | Establishes symbol, date, window, and movement. |
| Level 2 | Timeline | Places events and observations in sequence. |
| Level 3 | Evidence | Shows source-backed observations and gaps. |
| Level 4 | Funding | Adds derivatives cost context. |
| Level 5 | Open Interest | Shows positioning and leverage change. |
| Level 6 | Liquidations | Shows forced-flow stress. |
| Level 7 | Orderbook | Adds microstructure only when safely available. |
| Level 8 | Historical Context | Compares with source-backed prior windows. |
| Level 9 | Research | Routes to thesis and counter-evidence. |
| Level 10 | Repository | Provides raw audit trail. |

## 5. User Journey

Entry: from Dashboard, Markets, Scanner, Trade, Research, or search.

Primary workflow: select window -> inspect summary -> read timeline -> inspect
evidence -> open dataset detail.

Secondary workflow: compare historical context, open Research, inspect raw
records.

Exit: Research, Trade, Dashboard, Markets, or Repository.

Context preservation: symbol, exchange, date, hour, evidence, and selected
dataset are preserved.

## 6. Interaction Model

Click selects event, dataset, or evidence. Hover shows timestamp/source. Expand
reveals detail. Drill-down opens Research or Repository. Cross-navigation
preserves window context. Search locates symbols/windows. Filtering narrows
datasets and time ranges. Workspace saves replay windows. Saved views preserve
bounded windows, not stale conclusions.

## 7. Dependencies

Replay depends on `MASTER_PRODUCT.md`, Information Architecture, Pattern
Library, Design DNA, Evidence Cards, Repository, Coverage/Projection,
Research, and future Reasoning. It is also governed by protected Replay and
orderbook rules.

## 8. Success Criteria

- User understands movement sequence without full raw-data inspection.
- Heavy datasets do not block page responsiveness.
- Missing datasets are explicit.
- Evidence can be traced to Repository.
- User can reach Research or Repository with preserved context.

## 9. DO

- Always bound heavy historical data.
- Always show timeline before raw records.
- Always preserve date/hour/symbol context.
- Always expose unavailable data.
- Always support drill-down to evidence and raw records.

## 10. DO NOT

- Never auto-load full orderbook or massive event streams.
- Never fabricate historical context.
- Never present Replay as prediction.
- Never hide missing funding, OI, liquidation, or orderbook evidence.
- Never duplicate Dashboard ownership.

## 11. Future Expansion

Replay may evolve with plugin datasets, enterprise audit exports, AI-assisted
event navigation, collaborative annotations, and richer historical analogs.
Expansion must remain bounded and repository-backed.
