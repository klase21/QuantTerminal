# PDGM-107 Navigation Blueprint

## Blueprint Metadata

| Field | Value |
| --- | --- |
| Blueprint ID | PDGM-107 |
| Version | v1.0 |
| Owner | Product / Navigation |
| Dependencies | MASTER_PRODUCT, master-information-architecture, navigation-map, cross-navigation, pattern-library |
| Related MASTER documents | MASTER_PLAN, MASTER_PRODUCT, MASTER_ENGINEERING |
| Related diagrams | DGM-001 System Context, DGM-005 Ownership Model |
| Status | Canonical |
| Review cycle | Review with every navigation, workspace, or primary screen change |

## 1. Purpose

Navigation exists to let users move through QuantTerminal without losing market context.

Primary user question: Where should I go next without losing the evidence I am already reviewing?

Expected user outcome: The user can move between Dashboard, Markets, Scanner, Replay, Research, Trade, and Repository-backed detail views while preserving symbol, time, evidence, and investigation state.

## 2. Inputs

| Input | Role |
| --- | --- |
| Repository | Supplies canonical destinations for raw facts and source-backed drill-down. |
| Evidence | Carries the context that should move across screens. |
| Reasoning | Future destination for interpreted evidence, never a navigation prerequisite. |
| Research | Deep investigation destination. |
| Replay | Historical investigation destination. |
| Signals | Candidate context for Scanner and Trade navigation. |
| Historical Context | Date, hour, event, and replay window context. |
| Macro | Cross-market context when available. |
| Prediction Markets | Contextual market expectation input when available. |
| User Preferences | Saved views, pinned context, density preference, and workspace state. |

## 3. Outputs

The user can decide which product surface owns the next step.

The user can move to the correct screen, reopen saved context, search for a symbol or event, and return to the previous investigation without restarting.

The user gains orientation: current location, current context, next available paths, and unavailable paths with explicit reasons.

## 4. Information Hierarchy

Level 1: Primary Navigation  
Defines stable product ownership: Dashboard, Markets, Research, Replay, Scanner, Trade.

Level 2: Secondary Navigation  
Exposes screen-specific views without changing product ownership.

Level 3: Context Switching  
Preserves symbol, date, hour, evidence card, and selected candidate across transitions.

Level 4: Breadcrumbs  
Shows how the user arrived at the current investigation state.

Level 5: Search  
Lets users directly enter a symbol, topic, date, dataset, or evidence object.

Level 6: Workspace  
Preserves repeated workflows through saved views and pinned context.

## 5. User Journey

Entry: User enters through any primary screen, a saved view, search, or a cross-navigation link.

Primary workflow: Identify current context, select the next product surface, preserve context, and continue the investigation.

Secondary workflow: Search, filter, open a saved view, pin context, or return through breadcrumbs.

Exit: User reaches a destination screen with the originating context intact.

Context preservation: Symbol, date, hour, selected evidence, selected candidate, and density mode should persist whenever the destination can support them.

## 6. Interaction Model

Click: Primary navigation, breadcrumbs, saved views, cross-navigation links.

Hover: Reveal concise labels, source status, and destination purpose.

Expand: Secondary navigation groups, saved view lists, workspace panels.

Drill-down: Evidence to Replay, Replay to Research, Research to Repository, Scanner to Trade.

Cross-navigation: Dashboard to Replay, Markets to Scanner, Scanner to Replay, Trade to Research.

Search: Symbol, dataset, evidence, topic, date, and saved view entry.

Filtering: Scope navigation by symbol, market, dataset, time, or evidence status.

Workspace: Pin investigation context and restore saved layouts.

Saved Views: Store navigation state without storing unsupported conclusions.

## 7. Dependencies

Navigation depends on MASTER_PRODUCT, the Information Architecture, cross-navigation rules, Design DNA, and the Product Pattern Library.

It also depends on Repository and Evidence contracts for source-backed destination clarity.

## 8. Success Criteria

- Users can reach the correct destination in minimal steps.
- Context is preserved across screen transitions.
- Navigation does not duplicate screen responsibilities.
- Missing or unavailable destinations fail clearly.
- Advanced workflows remain discoverable without overwhelming beginners.

## 9. DO

- Always preserve user context when the target screen supports it.
- Always make primary product ownership clear.
- Always provide a return path from deep investigation surfaces.
- Always mark unavailable destinations explicitly.
- Always keep primary navigation stable.

## 10. DO NOT

- Do not create navigation overload.
- Do not hide critical actions behind unclear menus.
- Do not merge screen responsibilities through navigation shortcuts.
- Do not silently drop context.
- Do not present stale saved views as current evidence.

## 11. Future Expansion

Navigation may evolve toward plugin destinations, team workspaces, enterprise saved views, AI-assisted routing, and personalized command search.

Future expansion must preserve stable primary navigation and context continuity.

