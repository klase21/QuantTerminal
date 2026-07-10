# PDGM-104 Scanner Blueprint

## Blueprint Metadata

| Field | Value |
| --- | --- |
| Blueprint ID | PDGM-104 |
| Version | v1.0 |
| Owner | Product / Design |
| Dependencies | Scanner IA, Evidence Cards, Signals, Replay, Research, Trade |
| Related MASTER documents | `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`, `MASTER_ARCHITECTURE.md` |
| Related diagrams | DGM-001, DGM-002, future Product Diagram Pack |
| Status | Canonical |
| Review cycle | Review before Scanner redesign, signal display changes, or implementation. |

## 1. Purpose

Scanner exists for opportunity discovery.

Primary user question: `What changed, and what needs attention now?`

Expected user outcome: the user can triage candidates, inspect evidence, and
route to Replay, Research, or Trade without fabricated confidence.

## 2. Inputs

| Input | Role |
| --- | --- |
| Repository | Audit trail for captured candidates. |
| Evidence | Candidate support and limitations. |
| Reasoning | Not primary; future summaries only when approved. |
| Research | Deep follow-up path. |
| Replay | Historical validation path. |
| Signals | Primary candidate source. |
| Historical Context | Analog only if source-backed. |
| Macro | Optional context if source-backed. |
| Prediction Markets | Optional evidence if relevant. |
| User Preferences | Filters, watchlists, symbols, density. |

## 3. Outputs

- User can choose to ignore, monitor, replay, research, or plan a candidate.
- User gains candidate ranking, reason, confidence state, and evidence state.
- User can preserve candidate context across screens.

## 4. Information Hierarchy

| Level | Information | Why |
| ---: | --- | --- |
| Level 1 | Opportunity Ranking | Shows what deserves attention first. |
| Level 2 | Confidence | Shows source-backed confidence or explicit unavailable state. |
| Level 3 | Evidence | Explains why the opportunity exists. |
| Level 4 | Replay | Validates historical behavior. |
| Level 5 | Research | Opens deeper thesis and contradiction. |
| Level 6 | Risk | Shows invalidation or uncertainty when available. |

## 5. User Journey

Entry: from primary navigation, Dashboard, Markets, alerts, or search.

Primary workflow: filter candidates -> inspect ranking -> open evidence ->
choose Replay, Research, or Trade.

Secondary workflow: save candidate, compare candidates, inspect source state.

Exit: Trade, Replay, Research, Markets, or Repository.

Context preservation: candidate ID, symbol, timeframe, direction, confidence
state, and evidence references are preserved.

## 6. Interaction Model

Click selects candidate or destination. Hover shows source/freshness. Expand
reveals evidence and risk. Drill-down routes to Replay, Research, Trade, or
Repository. Search finds symbols/candidates. Filtering narrows status,
timeframe, direction, source, and confidence state. Workspace saves watchlists.

## 7. Dependencies

Scanner depends on `MASTER_PRODUCT.md`, Information Architecture, Pattern
Library, Design DNA, Evidence Cards, Repository, Signals, Replay, Research,
and Trade. It must not generate unsupported signals or confidence.

## 8. Success Criteria

- User can triage opportunities quickly.
- Confidence is source-backed or unavailable.
- Candidate evidence is easy to inspect.
- Replay/Research/Trade handoffs preserve context.
- Scanner remains responsive.

## 9. DO

- Always show evidence before action.
- Always preserve candidate context.
- Always show missing confidence explicitly.
- Always support filters.
- Always route planning to Trade.

## 10. DO NOT

- Never sell signals.
- Never infer confidence.
- Never fabricate direction, reason, or freshness.
- Never make Scanner own Trade or Research.
- Never overload candidates with duplicate metrics.

## 11. Future Expansion

Scanner may evolve with plugin signal categories, workspace watchlists,
collaborative review, AI-assisted triage, and enterprise screening. Expansion
must preserve evidence-first and no-fabrication rules.
