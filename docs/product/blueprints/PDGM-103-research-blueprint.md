# PDGM-103 Research Blueprint

## Blueprint Metadata

| Field | Value |
| --- | --- |
| Blueprint ID | PDGM-103 |
| Version | v1.0 |
| Owner | Product / Design |
| Dependencies | Research IA, Evidence, Repository, Replay, future Reasoning |
| Related MASTER documents | `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`, `MASTER_ARCHITECTURE.md` |
| Related diagrams | DGM-001, DGM-004, DGM-005, future Product Diagram Pack |
| Status | Canonical |
| Review cycle | Review before Research design, reasoning integration, Figma, or implementation. |

## 1. Purpose

Research exists for deep understanding.

Primary user question: `Why should I believe this thesis, and what contradicts it?`

Expected user outcome: the user can inspect support, conflict, source quality,
charts, and raw evidence without losing context.

## 2. Inputs

| Input | Role |
| --- | --- |
| Repository | Raw facts and audit trail. |
| Evidence | Supporting and contradictory observations. |
| Reasoning | Future bounded interpretation. |
| Research | Current thesis, notes, and investigation path. |
| Replay | Historical windows and movement context. |
| Signals | Candidate origin when relevant. |
| Historical Context | Source-backed analogs and comparisons. |
| Macro | Source-backed macro context. |
| Prediction Markets | Probability evidence, not conclusion. |
| User Preferences | Saved research trails, density, and workspace. |

## 3. Outputs

- User can decide whether a thesis is supported, weak, contradicted, or needs
  more evidence.
- User can open Replay, Trade, or Repository.
- User gains organized knowledge and evidence limitations.

## 4. Information Hierarchy

| Level | Information | Why |
| ---: | --- | --- |
| Level 1 | Headline | Frames the research question. |
| Level 2 | Executive Summary | Provides orientation without raw-data burden. |
| Level 3 | Evidence | Shows support before reasoning. |
| Level 4 | Reasoning | Connects evidence only when approved. |
| Level 5 | Charts | Makes trends, flows, and comparisons visible. |
| Level 6 | Counter Evidence | Prevents one-sided interpretation. |
| Level 7 | Repository | Provides audit trail and raw facts. |

## 5. User Journey

Entry: from Dashboard, Replay, Trade, Scanner, Markets, or search.

Primary workflow: read headline -> inspect summary -> review evidence -> check
counter-evidence -> inspect charts -> open sources.

Secondary workflow: jump to Replay, compare historical context, save research
trail.

Exit: Trade for planning, Replay for window inspection, Repository for audit,
Dashboard for current state.

Context preservation: thesis, evidence references, symbol, date/hour, and
source state remain attached.

## 6. Interaction Model

Click opens evidence, chart, source, replay, or repository detail. Hover shows
source and limitation. Expand reveals evidence detail. Drill-down moves to raw
records or replay. Cross-navigation preserves thesis context. Search finds
theses, evidence, and symbols. Filtering narrows evidence and source status.
Workspace saves trails and views.

## 7. Dependencies

Research depends on `MASTER_PRODUCT.md`, Information Architecture, Pattern
Library, Design DNA, Evidence Cards, Repository, Replay, and future Reasoning.
Reasoning cannot appear without approved evidence boundaries.

## 8. Success Criteria

- User can identify support and counter-evidence.
- Evidence precedes reasoning.
- Source and freshness are visible.
- Research can hand off to Replay, Trade, or Repository.
- Cognitive load is high-capacity but organized.

## 9. DO

- Always show evidence and counter-evidence.
- Always separate facts from reasoning.
- Always preserve thesis context.
- Always show source limitations.
- Always support repository drill-down.

## 10. DO NOT

- Never fabricate missing evidence.
- Never present unsupported AI conclusions.
- Never hide contradictory evidence.
- Never make Research a signal generator.
- Never bury sources below unsupported narrative.

## 11. Future Expansion

Research may evolve with reasoning agents, collaborative review, enterprise
exports, plugin evidence, saved research trails, and historical analogs. All
expansion must preserve evidence and counter-evidence discipline.
