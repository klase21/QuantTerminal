# PDGM-108 Evidence Card Blueprint

## Blueprint Metadata

| Field | Value |
| --- | --- |
| Blueprint ID | PDGM-108 |
| Version | v1.0 |
| Owner | Product / Evidence |
| Dependencies | MASTER_PRODUCT, Evidence Packet Engine, Design DNA, Product Pattern Library, Repository |
| Related MASTER documents | MASTER_PLAN, MASTER_ARCHITECTURE, MASTER_PRODUCT, MASTER_ENGINEERING |
| Related diagrams | DGM-004 Canonical Data Flow, DGM-005 Ownership Model |
| Status | Canonical |
| Review cycle | Review with every Evidence Card, reasoning, repository, or source transparency change |

## 1. Purpose

Evidence Cards are portable trust units. They make source-backed information visible before users encounter reasoning or conclusions.

Primary user question: What evidence supports or limits this claim?

Expected user outcome: The user can inspect the source, freshness, confidence, limitations, and contradictory evidence behind an insight.

## 2. Inputs

| Input | Role |
| --- | --- |
| Repository | Ultimate source of historical facts, source timestamps, and record lineage. |
| Evidence | Primary content source for readiness, coverage, confidence, warnings, and limitations. |
| Reasoning | Optional downstream consumer that must reference Evidence Cards. |
| Research | Supplies deep context and supporting analysis references. |
| Replay | Supplies event-window context and historical movement evidence. |
| Signals | Supplies candidate context only when source-backed. |
| Historical Context | Supplies analog, replay, and event timing when available. |
| Macro | Evidence category when source-backed and available. |
| Prediction Markets | Evidence category when source-backed and available. |
| User Preferences | Density, pinned cards, and saved evidence sets. |

## 3. Outputs

The user can decide whether evidence is complete, partial, experimental, stale, missing, or contradictory.

The user can drill into Repository, Replay, Research, or related Evidence Cards.

The user gains trust context rather than unsupported certainty.

## 4. Information Hierarchy

Level 1: Evidence Statement  
States the source-backed observation in plain language.

Level 2: Source and Timestamp  
Shows where the evidence came from and when it was observed.

Level 3: Confidence and Availability  
Shows confidence, provider tier, canonical status, and unavailable state.

Level 4: Supporting Data  
Shows the minimum facts needed to understand the evidence.

Level 5: Contradictory Evidence  
Surfaces counter-evidence when available.

Level 6: Repository Link  
Provides traceability to raw source-backed records.

## 5. User Journey

Entry: User sees an Evidence Card on Dashboard, Replay, Research, Scanner, Markets, or Trade.

Primary workflow: Read evidence statement, inspect source status, review support or contradiction, then drill down if needed.

Secondary workflow: Pin the card, compare with related evidence, open historical context, or send context to Research.

Exit: User continues to reasoning, Replay, Research, Repository, or a decision workflow.

Context preservation: Evidence identity, source, timestamp, provider tier, and related symbol/time window must persist.

## 6. Interaction Model

Click: Open detail, source, repository, replay, or research destination.

Hover: Reveal source metadata, timestamp, confidence, and limitation details.

Expand: Show supporting data, warnings, and contradictory evidence.

Drill-down: Evidence to Repository, Replay, Research, or related Evidence Cards.

Cross-navigation: Card can appear consistently across product screens.

Search: Evidence identity, source, symbol, topic, and dataset.

Filtering: Availability, confidence, provider tier, canonical state, and dataset.

Workspace: Pin Evidence Cards into saved investigations.

Saved Views: Preserve evidence references and availability state.

## 7. Dependencies

Evidence Cards depend on MASTER_PRODUCT, MASTER_ARCHITECTURE, Evidence Packet contracts, Repository lineage, Design DNA, and the Product Pattern Library.

They are the product expression of evidence before reasoning.

## 8. Success Criteria

- Users can understand the evidence in seconds.
- Source, timestamp, availability, and confidence are visible.
- Contradictory evidence is not hidden.
- Cards remain reusable across screens.
- Unsupported evidence is marked UNAVAILABLE, not filled with invented content.

## 9. DO

- Always show source transparency.
- Always show unavailable or partial states explicitly.
- Always preserve evidence identity and timestamp.
- Always separate evidence from interpretation.
- Always support drill-down to source-backed context.

## 10. DO NOT

- Do not use Evidence Cards for unsupported conclusions.
- Do not synthesize confidence.
- Do not hide contradictory evidence.
- Do not duplicate the same evidence across a screen without purpose.
- Do not present experimental data as canonical truth.

## 11. Future Expansion

Evidence Cards may support plugin evidence, collaborative annotations, enterprise audit export, AI-generated explanations tied to evidence, and cross-market evidence comparison.

Future expansion must keep Evidence Cards source-first and decision-support oriented.

