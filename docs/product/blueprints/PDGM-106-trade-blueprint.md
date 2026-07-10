# PDGM-106 Trade Blueprint

## Blueprint Metadata

| Field | Value |
| --- | --- |
| Blueprint ID | PDGM-106 |
| Version | v1.0 |
| Owner | Product / Design |
| Dependencies | Trade IA, Evidence, Scanner, Replay, Research, Markets |
| Related MASTER documents | `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`, `MASTER_ARCHITECTURE.md` |
| Related diagrams | DGM-001, DGM-002, future Product Diagram Pack |
| Status | Canonical |
| Review cycle | Review before Trade redesign, execution-support changes, or implementation. |

## 1. Purpose

Trade exists for execution support and candidate evaluation.

Primary user question: `How should I evaluate this selected candidate?`

Expected user outcome: the user can inspect thesis, evidence, risk, scenarios,
historical analog, and notes while retaining final decision authority.

## 2. Inputs

| Input | Role |
| --- | --- |
| Repository | Audit trail for evidence and candidate records. |
| Evidence | Support, limitations, source state. |
| Reasoning | Future bounded scenario framing only. |
| Research | Thesis support and counter-evidence. |
| Replay | Historical validation and analog context. |
| Signals | Candidate origin from Scanner or Dashboard. |
| Historical Context | Analog only when source-backed. |
| Macro | Context only when available. |
| Prediction Markets | Event evidence only when relevant. |
| User Preferences | Notes, risk preferences, saved candidate context. |

## 3. Outputs

- User can decide whether to watch, reject, research, replay, or prepare an
  execution plan.
- User gains clarity on thesis, evidence, risk, scenarios, and limitations.
- User owns final decision and action.

## 4. Information Hierarchy

| Level | Information | Why |
| ---: | --- | --- |
| Level 1 | Trade Thesis | Frames the selected candidate. |
| Level 2 | Evidence | Shows why the thesis exists. |
| Level 3 | Risk | Shows invalidation, uncertainty, and exposure. |
| Level 4 | Historical Analog | Adds source-backed comparison when available. |
| Level 5 | Execution Notes | Captures user-owned planning context. |
| Level 6 | Scenario Analysis | Helps compare paths without predicting certainty. |

## 5. User Journey

Entry: from Scanner, Dashboard, Markets, Replay, Research, or saved workspace.

Primary workflow: review thesis -> inspect evidence -> assess risk -> compare
scenarios -> write notes.

Secondary workflow: open Replay, Research, or Markets for validation.

Exit: Scanner for candidate origin, Replay for historical context, Research
for thesis review, Markets for live confirmation.

Context preservation: candidate, symbol, evidence, risk, and thesis remain
attached.

## 6. Interaction Model

Click opens evidence, risk, scenario, replay, research, or source detail. Hover
shows source/freshness. Expand reveals detail. Drill-down opens Replay,
Research, Markets, or Repository. Search finds candidates/symbols. Filtering
narrows candidate state. Workspace saves trade notes and selected context.

## 7. Dependencies

Trade depends on `MASTER_PRODUCT.md`, Information Architecture, Pattern
Library, Design DNA, Evidence Cards, Repository, Scanner, Replay, Research,
Markets, and future bounded Reasoning.

## 8. Success Criteria

- User can evaluate a candidate without being pushed into action.
- Evidence appears before scenarios.
- Risk is visible.
- Historical analog is source-backed or unavailable.
- User decision authority is preserved.

## 9. DO

- Always show evidence and risk.
- Always preserve candidate context.
- Always make user authority explicit.
- Always route thesis research to Research.
- Always route historical validation to Replay.

## 10. DO NOT

- Never execute trades.
- Never sell signals.
- Never generate unsupported recommendations.
- Never hide invalidation.
- Never fabricate historical analogs.

## 11. Future Expansion

Trade may evolve with collaborative notes, enterprise review, scenario
templates, AI-assisted evidence navigation, and plugin risk context. Expansion
must preserve human authority and no broker-execution boundaries.
