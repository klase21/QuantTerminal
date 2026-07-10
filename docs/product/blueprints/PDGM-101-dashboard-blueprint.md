# PDGM-101 Dashboard Blueprint

## Blueprint Metadata

| Field | Value |
| --- | --- |
| Blueprint ID | PDGM-101 |
| Version | v1.0 |
| Owner | Product / Design |
| Dependencies | Dashboard IA, Pattern Library, Evidence Cards, Repository, Markets, Replay, Research |
| Related MASTER documents | `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`, `MASTER_ARCHITECTURE.md` |
| Related diagrams | DGM-001, DGM-002, DGM-004, future Product Diagram Pack |
| Status | Canonical |
| Review cycle | Review before Dashboard design, Figma, frontend implementation, and product QA. |

## 1. Purpose

Dashboard exists to provide 5-second market understanding.

Primary user question: `What is happening now, and why should I care?`

Expected user outcome: the user understands market direction, key evidence,
and the correct next screen for deeper work.

## 2. Inputs

| Input | Role |
| --- | --- |
| Repository | Source of durable facts and availability state. |
| Evidence | Primary support for market direction. |
| Reasoning | Optional bounded summary when approved. |
| Research | Deep follow-up path. |
| Replay | Historical validation path. |
| Signals | Candidate/opportunity context from Scanner when source-backed. |
| Historical Context | Historical analog only when source-backed. |
| Macro | Context only when available and source-backed. |
| Prediction Markets | Probability evidence, not prediction. |
| User Preferences | Saved symbols, density, and watch context. |

## 3. Outputs

- User can decide whether to inspect, ignore, monitor, replay, research, or
  prepare a trade candidate.
- User can navigate to Markets, Scanner, Replay, Research, Trade, or Repository.
- User gains a concise understanding of market state and evidence quality.

## 4. Information Hierarchy

| Level | Information | Why |
| ---: | --- | --- |
| Level 1 | Market Direction | Gives the first read and satisfies the 5-second rule. |
| Level 2 | Evidence Cards | Shows why the direction is supported or limited. |
| Level 3 | Reasoning Summary | Connects evidence only when reasoning is approved. |
| Level 4 | Historical Analog | Adds source-backed historical context when available. |
| Level 5 | Market Movers / Supporting Charts | Lets users inspect visual drivers without leaving orientation. |
| Level 6 | Research | Routes deeper thesis and contradiction review. |
| Level 7 | Repository | Provides audit trail for expert review. |

## 5. User Journey

Entry: user lands from primary navigation, saved workspace, alert, or search.

Primary workflow: read direction -> inspect evidence -> choose next screen.

Secondary workflow: expand chart, open source detail, compare market movers.

Exit: Markets for live verification, Replay for historical validation,
Research for depth, Trade for candidate planning, Repository for audit.

Context preservation: symbol, timeframe, evidence card, source state, and
selected market context travel to destination screens.

## 6. Interaction Model

Click opens evidence, chart, or destination screen. Hover may show source,
freshness, or limitation. Expand reveals supporting detail. Drill-down routes
to Replay, Research, or Repository. Cross-navigation preserves context. Search
finds symbols and evidence. Filtering narrows market/evidence groups.
Workspace and saved views preserve layout and watch context.

## 7. Dependencies

Dashboard depends on `MASTER_PRODUCT.md`, Information Architecture, Pattern
Library, Design DNA, Evidence Cards, Repository, Replay, Research, and future
Reasoning. It must not bypass Repository or source governance.

## 8. Success Criteria

- User understands the primary market state within 5 seconds.
- Evidence is discoverable without scrolling through raw data.
- Missing/stale/unavailable states are explicit.
- Navigation to deeper screens is obvious.
- Cognitive load is lower than metric-first dashboards.

## 9. DO

- Always show evidence before conclusions.
- Always preserve navigation context.
- Always expose unavailable evidence.
- Always route heavy historical work to Replay or Research.
- Always support drill-down to source detail.

## 10. DO NOT

- Never overwhelm beginners with equal-weight metric panels.
- Never prioritize engagement over clarity.
- Never hide critical evidence.
- Never present unsupported AI conclusions.
- Never duplicate information across cards without a distinct purpose.

## 11. Future Expansion

Dashboard may evolve with plugins, enterprise summaries, AI-assisted
navigation, workspace personalization, collaboration notes, and richer market
context. Expansion must preserve 5-second understanding and evidence-first
hierarchy.
