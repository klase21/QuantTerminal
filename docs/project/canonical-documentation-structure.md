# Canonical Documentation Structure

**Epic:** D0.2  
**Milestone:** v0.8-data-foundation  
**Input:** `docs/project/documentation-inventory.md`  
**Scope:** Documentation consolidation plan only. No files are moved, deleted, or rewritten by this document.

## Decision

Canonical documentation ownership is finalized.

The permanent documentation model should use a small set of master entry points
with domain-specific canonical documents underneath. Sprint reports, audits,
wireframes, early plans, and implementation notes remain valuable references,
but they should not be the first documents a human or AI reads.

## Canonical Documentation Tree

This is the recommended future tree. It is a structure proposal only.

```text
docs/
  master/
    MASTER_PLAN.md
    MASTER_ARCHITECTURE.md
    MASTER_PRODUCT.md
    MASTER_ROADMAP.md
    DATA_FOUNDATION_STATUS.md
    AUTOMATION_ENTRY_CRITERIA.md
    REASONING_ENTRY_CRITERIA.md

  architecture/
    decisions/
    runtime/
    repository/
    coverage/
    projection/
    context/
    evidence/
    replay/
    research/
    automation/
    reasoning/

  product/
    overview/
    dashboard/
    markets/
    scanner/
    research/
    replay/
    trade/
    design-system/

  data-foundation/
    governance/
    historical-backfill/
    funding/
    open-interest/
    liquidation/
    aggtrade/
    recent-gap-sync/
    freshness/

  audits/
    phase/
    product/
    data/
    replay/
    research/
    source-governance/

  operations/
    runbooks/
    smoke-tests/
    provider-tests/

  archive/
    phase-local/
    superseded-mockups/
    old-strategy/
    duplicate-stubs/
```

Current files should remain in place until a separate file-movement sprint.
The hierarchy above is the permanent ownership target.

## Canonical Entry Documents

Each domain has exactly one entry document.

| Domain | Entry document | Why this is the entry |
| --- | --- | --- |
| Project Status | `docs/project/phase5-final-certification.md` | Current platform freeze and v0.8 baseline. |
| Repository Platform | `docs/project/phase5-persistence-certification.md` | Certifies provider-neutral Repository and adapters. |
| Runtime | `docs/project/phase4-runtime-foundation-certification.md` | Freezes Facts/Knowledge runtime boundaries. |
| Execution | `docs/project/phase5-execution-foundation-certification.md` | Freezes Scheduler/Worker/Operational Repository boundaries. |
| Context | `docs/project/context-snapshot-architecture.md` | Defines immutable signal-time Context Snapshot ownership. |
| Context Wiring | `docs/project/context-wiring-pack.md` | Current implemented context evidence wiring status. |
| Data Governance | `docs/project/data-source-governance.md` | Canonical source identity, freshness, fallback, and no-fabrication rules. |
| Source Envelopes | `docs/project/source-envelope-rollout-status.md` | Current source-envelope migration state. |
| Historical Backfill | `docs/project/historical-backfill-architecture.md` | Backfill architecture and no-fabrication boundary. |
| Dataset Resolution | `docs/project/dataset-resolution-metadata-contract.md` | Dataset resolution and coverage-mode contract. |
| Funding | `docs/project/funding-recent-gap-sync-official-rest.md` | Current Funding state after historical and recent-gap REST sync. |
| Open Interest | `docs/project/historical-open-interest-backfill.md` | Canonical OI historical backfill entry. |
| Liquidation | `docs/project/historical-liquidation-backfill.md` | Canonical liquidation backfill entry, with experimental provider relationship. |
| AggTrade | `docs/project/historical-aggtrade-backfill.md` | Canonical AggTrade historical backfill entry. |
| Coverage | `docs/project/repository-coverage-engine.md` | Reusable Repository coverage evaluation. |
| Projection | `docs/project/projection-lifecycle-framework.md` | Projection read freshness and lifecycle status. |
| Coverage API | `docs/project/repository-coverage-api.md` | Projection-only request path contract. |
| Replay | `docs/project/repository-replay-mode.md` | Current repository-backed Replay behavior. |
| Research | `docs/project/research-repository-migration.md` | Current repository-backed Research behavior. |
| Evidence | `docs/project/evidence-packet-engine.md` | Availability-only Evidence Packet container. |
| Recent Gap Sync | `docs/project/recent-gap-sync-orchestrator.md` | Manual recent-gap sync planner/dispatcher boundary. |
| Automation | `docs/automation/AUTOMATION_ROADMAP.md` | Current automation roadmap and gate model. |
| Product | `docs/project/DESIGN.md` | Product principles and page responsibility framing. |
| Page Ownership | `docs/project/PAGE_RESPONSIBILITY_MATRIX.md` | Page-level ownership matrix. |
| Dashboard | `docs/project/dashboard-v2-state.md` | Current Dashboard state. |
| Markets | `docs/project/markets-v2-state.md` | Current Markets state. |
| Scanner | `docs/project/scanner-v2-state.md` | Current Scanner state. |
| Research Page | `docs/project/research-v2-state.md` | Current Research page state. |
| Replay Page | `docs/project/replay-v2-state.md` | Current Replay page state. |
| Trade | `docs/project/trade-v2-state.md` | Current Trade state. |
| Design System | `docs/project/design-token-registry.md` | Canonical design token registry. |
| ADRs | `docs/decisions/ADR-005-historical-intelligence-cache-foundation.md` | Most relevant platform ADR; ADR directory remains the decision record set. |
| Investigations | `docs/investigations/replay-cache-builder.md` | Most complete current investigation artifact. |

## Merge Candidates

These documents overlap and should feed future master documents. No merge is
performed in this sprint.

| Theme | Overlapping documents | Why they overlap | Surviving entry | Merge target |
| --- | --- | --- | --- | --- |
| Project plan | `docs/strategy/intelligence-platform-master-plan.md`, `docs/strategy/execution-roadmap.md`, `docs/project/ROADMAP.md`, `docs/NEXT_PHASES_ROADMAP.md`, `docs/PHASE_SUMMARY.md` | All describe phase direction; several predate Repository Platform. | `phase5-final-certification.md` for current state | `MASTER_PLAN.md`, `MASTER_ROADMAP.md` |
| Architecture map | `whole-product-architecture-audit.md`, `phase5-final-certification.md`, `phase4-runtime-foundation-certification.md`, `phase5-execution-foundation-certification.md`, `repository-sync-infrastructure-audit.md` | Multiple audits explain architecture from different sprint angles. | `phase5-final-certification.md` | `MASTER_ARCHITECTURE.md` |
| Product ownership | `DESIGN.md`, `PAGE_RESPONSIBILITY_MATRIX.md`, `whole-product-review.md`, `product-integration-audit.md`, `product-language-audit.md`, `product-phase1-summary.md` | Product boundaries, language, and page responsibilities are split across many docs. | `DESIGN.md` | `MASTER_PRODUCT.md` |
| Page journeys | `USER_JOURNEYS_V1.md`, page-specific `*-user-journey.md`, page-specific `*-information-architecture.md` | General journey pack is now less precise than page-specific docs. | Page-specific current state docs | `MASTER_PRODUCT.md` |
| Dashboard design | `DASHBOARD_MOCKUP_V1.md`, `DASHBOARD_VISUAL_MOCKUP_V1.md`, `DASHBOARD_MOCKUP_V2.md`, `DASHBOARD_IMPLEMENTATION_SPEC_V1.md`, `dashboard-design-system.md`, `dashboard-v2-state.md` | Mockups/specs capture different design iterations. | `dashboard-v2-state.md` and `dashboard-design-system.md` | `MASTER_PRODUCT.md` |
| Repository coverage | `canonical-dataset-audit-btcusdt-2026-07-01.md`, `historical-repository-coverage-reconciliation.md`, `repository-coverage-engine.md`, `repository-coverage-projection.md`, `repository-coverage-api.md`, `projection-lifecycle-framework.md` | Dataset audit, reconciliation, engine, projection, and API are separate sprint layers. | `repository-coverage-engine.md` and `projection-lifecycle-framework.md` | `MASTER_ARCHITECTURE.md`, `DATA_FOUNDATION_STATUS.md` |
| Funding history | `historical-funding-backfill.md`, `funding-backfill-reconciliation.md`, `funding-recent-gap-sync-official-rest.md` | Funding progressed from historical archive to provider-aware reconciliation to recent gap sync. | `funding-recent-gap-sync-official-rest.md` | `DATA_FOUNDATION_STATUS.md` |
| Open Interest recent gap | `open-interest-recent-gap-sync-execution.md`, `open-interest-recent-gap-sync-execution-b11-8b.md` | B11.8B supersedes B11.8A execution state. | `open-interest-recent-gap-sync-execution-b11-8b.md` | `DATA_FOUNDATION_STATUS.md` |
| Replay repository migration | `replay-repository-coverage-gate.md`, `replay-bounded-repository-query.md`, `replay-repository-adapter.md`, `repository-replay-mode.md` | Four sprint docs describe one Replay repository path. | `repository-replay-mode.md` | `MASTER_ARCHITECTURE.md` |
| Research/Evidence | `research-repository-migration.md`, `evidence-packet-engine.md`, older strategy research docs | Research repository summary is now input to Evidence Packet. | `evidence-packet-engine.md` | `MASTER_ARCHITECTURE.md`, `REASONING_ENTRY_CRITERIA.md` |
| Replay cache/orderbook | `docs/architecture/replay-cache-builder.md`, `docs/investigations/replay-cache-builder.md`, `ADR-002`, `ADR-005`, operations orderbook docs | Several docs describe why request-time orderbook rebuild is forbidden. | `ADR-002` and `docs/investigations/replay-cache-builder.md` | `MASTER_ARCHITECTURE.md` |
| Automation | `AGENT_ARCHITECTURE.md`, `AGENT_PROTOCOL.md`, `TASK_SCHEMA.md`, `MESSAGE_CONTRACT.md`, `REVIEW_PROTOCOL.md`, `AUTOMATION_ROADMAP.md`, `DEVSPACE_EVALUATION.md` | Agent roles, contracts, review, and execution tools are split. | `AUTOMATION_ROADMAP.md` | `AUTOMATION_ENTRY_CRITERIA.md` |

## Archive Candidates

Archive does not mean delete. These should become historical references after
master documents exist.

| Documents | Why archive later |
| --- | --- |
| `docs/project/phase3-freeze.md` | Superseded by `phase3-final-certification.md`. |
| `docs/project/phase5-signal-to-memory-e2e-audit.md` | Superseded by context-aware audit, re-audit, and Phase 5 final certification. |
| `docs/project/open-interest-recent-gap-sync-execution.md` | Superseded by B11.8B OI execution document. |
| `docs/project/PRODUCT_MOCKUP_PACK_V1.md` | Historical visual pack; current product state docs are more authoritative. |
| `docs/project/*-wireframe.md` for Markets, Scanner, Research, Replay, Trade | Useful design history, but current state/certification docs own active page behavior. |
| `docs/project/DASHBOARD_MOCKUP_V1.md`, `DASHBOARD_VISUAL_MOCKUP_V1.md` | Superseded by Dashboard V2 state and design system. |
| `docs/project/markets-v1.png`, `scanner-v1.png`, `research-v1.png`, `replay-v1.png`, `trade-v1.png`, `settings-v1.png` | Historical visual references; not current source of truth. |
| `docs/NEXT_PHASES_ROADMAP.md`, `docs/PHASE_SUMMARY.md`, `docs/INTELLIGENCE_COMPRESSION_DECISION_PACK.md` | Pre-v0.8 summary/planning docs superseded by current certification and future master docs. |
| `docs/architecture/canonical-market-data-cache.md`, `data-storage-optimization-v1.md` | Older storage/cache thinking superseded by Repository Platform. |
| `docs/architecture/historical-analog-v2.md`, `historical-analog-v2-implementation.md` | Historical analog no longer belongs on Dashboard; future reasoning must start from Repository/Evidence. |
| `docs/architecture/market-memory-v1-implementation.md`, `market-memory-v3.md` | Superseded by Historical Memory runtime and future reasoning roadmap. |
| `docs/architecture/replay-cache-builder.md` | Duplicate short stub; investigation doc is fuller. |
| `docs/operations/market-driver-evidence-integration-v2.md` | Superseded by v3. |
| `docs/operations/valley-dashboard-integration-v1.md` | Historical Dashboard integration operation, superseded by current Dashboard state. |

## Master Document Mapping

The future master documents should be synthesis/index documents. They should not
replace sprint records; they should point to them.

### MASTER_PLAN

Purpose: current milestone, operating assumptions, accepted scope, and next
initiative sequence.

Inputs:

- `docs/project/phase5-final-certification.md`
- `docs/project/documentation-inventory.md`
- `docs/project/canonical-documentation-structure.md`
- `docs/project/funding-recent-gap-sync-official-rest.md`
- `docs/project/recent-gap-sync-orchestrator.md`
- `docs/project/evidence-packet-engine.md`
- `docs/project/research-repository-migration.md`
- `docs/project/repository-replay-mode.md`
- `docs/automation/AUTOMATION_ROADMAP.md`
- `docs/strategy/intelligence-platform-master-plan.md`
- `docs/strategy/execution-roadmap.md`
- `docs/project/ROADMAP.md`

### MASTER_ARCHITECTURE

Purpose: single dependency graph, ownership map, no-fabrication boundaries, and
canonical entry index.

Inputs:

- `docs/project/phase5-final-certification.md`
- `docs/project/phase4-runtime-foundation-certification.md`
- `docs/project/phase5-persistence-certification.md`
- `docs/project/phase5-execution-foundation-certification.md`
- `docs/project/context-snapshot-architecture.md`
- `docs/project/context-wiring-pack.md`
- `docs/project/historical-backfill-architecture.md`
- `docs/project/dataset-resolution-metadata-contract.md`
- `docs/project/repository-coverage-engine.md`
- `docs/project/projection-lifecycle-framework.md`
- `docs/project/repository-coverage-api.md`
- `docs/project/repository-replay-mode.md`
- `docs/project/research-repository-migration.md`
- `docs/project/evidence-packet-engine.md`
- `docs/project/recent-gap-sync-orchestrator.md`
- `docs/project/whole-product-architecture-audit.md`
- `docs/decisions/ADR-001-dashboard-historical-analog.md`
- `docs/decisions/ADR-002-orderbook-runtime-budget.md`
- `docs/decisions/ADR-005-historical-intelligence-cache-foundation.md`

### MASTER_PRODUCT

Purpose: product/page ownership, user-facing behavior, language, visual system,
and interaction boundaries.

Inputs:

- `docs/project/DESIGN.md`
- `docs/project/PAGE_RESPONSIBILITY_MATRIX.md`
- `docs/project/REVIEW_RUBRIC.md`
- `docs/project/dashboard-v2-state.md`
- `docs/project/markets-v2-state.md`
- `docs/project/scanner-v2-state.md`
- `docs/project/research-v2-state.md`
- `docs/project/replay-v2-state.md`
- `docs/project/trade-v2-state.md`
- `docs/project/design-token-registry.md`
- `docs/project/dashboard-design-system.md`
- `docs/project/whole-product-review.md`
- `docs/project/whole-product-architecture-audit.md`
- `docs/project/product-language-audit.md`
- `docs/product/principal-sdt-usability-audit.md`
- `docs/TERMINAL_GLOSSARY.md`

### MASTER_ROADMAP

Purpose: actionable roadmap from v0.8-data-foundation to Automation and
Reasoning without redesigning current architecture.

Inputs:

- `docs/project/phase5-final-certification.md`
- `docs/project/repository-freshness-audit.md`
- `docs/project/repository-sync-infrastructure-audit.md`
- `docs/project/recent-gap-sync-orchestrator.md`
- `docs/project/evidence-packet-engine.md`
- `docs/automation/AUTOMATION_ROADMAP.md`
- `docs/project/ROADMAP.md`
- `docs/strategy/execution-roadmap.md`
- `docs/strategy/market-memory-engine-plan.md`
- `docs/strategy/event-impact-engine-plan.md`
- `docs/architecture/replay-learning-layer-v1.md`
- `docs/architecture/contradiction-engine-v1.md`
- `docs/architecture/decision-brief-v1.md`

## AI Reading Order

### ChatGPT

Use this order for architecture/product reasoning:

```text
AGENTS.md
-> .skills/quantterminal-rules.md
-> docs/project/MASTER_PLAN.md (future)
-> docs/project/MASTER_ARCHITECTURE.md (future)
-> docs/project/phase5-final-certification.md
-> docs/project/evidence-packet-engine.md
-> docs/project/research-repository-migration.md
-> docs/project/repository-replay-mode.md
-> docs/project/recent-gap-sync-orchestrator.md
-> current sprint prompt
```

### Codex

Use this order for implementation or repository work:

```text
AGENTS.md
-> .skills/quantterminal-rules.md
-> relevant docs/decisions/*
-> relevant docs/investigations/*
-> docs/project/MASTER_ARCHITECTURE.md (future)
-> docs/project/phase5-final-certification.md
-> domain entry document
-> matching README files under lib/ or workers/
-> current files to modify
-> current sprint prompt
```

For data-foundation work:

```text
data-source-governance.md
-> historical-backfill-architecture.md
-> dataset-resolution-metadata-contract.md
-> repository-coverage-engine.md
-> projection-lifecycle-framework.md
-> recent-gap-sync-orchestrator.md
-> dataset-specific entry document
```

### New Engineers

Use this order for onboarding:

```text
MASTER_PLAN.md (future)
-> MASTER_PRODUCT.md (future)
-> MASTER_ARCHITECTURE.md (future)
-> phase5-final-certification.md
-> data-source-governance.md
-> context-snapshot-architecture.md
-> historical-backfill-architecture.md
-> repository-coverage-engine.md
-> projection-lifecycle-framework.md
-> repository-replay-mode.md
-> research-repository-migration.md
-> evidence-packet-engine.md
-> automation roadmap only after Repository/Evidence are understood
```

### Current Sprint Work

Use this minimal order:

```text
AGENTS.md
-> .skills/quantterminal-rules.md
-> documentation-inventory.md
-> canonical-documentation-structure.md
-> current sprint prompt
```

## Permanent Ownership Rules

1. Master docs own orientation, not detailed sprint evidence.
2. Domain entry documents own the current source of truth for their domain.
3. Sprint reports remain immutable historical evidence.
4. ADRs own accepted architectural constraints.
5. Investigations own empirical findings.
6. Archive candidates are never deleted automatically.
7. Duplicate documents should be archived only after the surviving entry doc is
   linked from a master document.
8. Future Automation and Reasoning must read Evidence/Repository docs before old
   strategy docs.

## Readiness Decision

**CANONICAL DOCUMENTATION OWNERSHIP FINALIZED.**

Every active domain now has one entry document. Merge and archive strategies are
defined. `MASTER_PLAN.md` can be generated next without redesigning architecture
or changing implementation.
