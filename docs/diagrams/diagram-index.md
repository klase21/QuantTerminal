# Canonical Mermaid Architecture Diagram Index

**Status:** Canonical diagram index  
**Owner:** Architecture  
**Scope:** Mermaid source only. SVG, PNG, and Figma derivatives must be generated from these files later.  

## Purpose

This index defines the first canonical visual architecture pack for
QuantTerminal. Mermaid source is the canonical artifact. Future diagrams must
continue the `DGM-###` numbering sequence.

## Diagram Inventory

| Diagram ID | Title | Purpose | Owner | Dependencies | MASTER references |
| --- | --- | --- | --- | --- | --- |
| DGM-001 | System Context | Show the highest-level provider-to-user architecture flow. | Architecture | `MASTER_ARCHITECTURE.md`, ADR-001, ADR-004, ADR-005, ADR-007 | `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md` |
| DGM-002 | Container Architecture | Show major containers and ownership boundaries. | Architecture | `MASTER_ARCHITECTURE.md`, Phase 4/5 certifications, ADR-001, ADR-003, ADR-006 | `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md` |
| DGM-003 | Repository Components | Show repository internals for identity, persistence, metadata, registry, storage, and facts. | Architecture / Data | Repository certification, dataset resolution contract, ADR-001, ADR-002, ADR-006 | `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md` |
| DGM-004 | Canonical Data Flow | Show data lifecycle and where mutability stops. | Architecture | `MASTER_ARCHITECTURE.md`, ADR-001, ADR-002, ADR-003, ADR-005 | `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md` |
| DGM-005 | Ownership Model | Show single-owner responsibility chain. | Architecture | Master ownership model, ADR-001, ADR-003, ADR-005, ADR-007 | `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md` |
| DGM-006 | Runtime Flow | Show Scheduler-to-Evidence refresh execution flow without business logic in execution layers. | Architecture / Engineering | Execution certification, Recent Gap Sync, Projection lifecycle, Evidence Packet Engine | `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md` |
| DGM-007 | Plugin Architecture | Show how future domains plug into existing architecture. | Architecture / Expansion | Provider independence, source governance, expansion philosophy, ADR-006 | `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md` |

## Canonical Source Files

| Diagram ID | Mermaid source |
| --- | --- |
| DGM-001 | `docs/diagrams/architecture/DGM-001-system-context.md` |
| DGM-002 | `docs/diagrams/architecture/DGM-002-container-architecture.md` |
| DGM-003 | `docs/diagrams/repository/DGM-003-repository-components.md` |
| DGM-004 | `docs/diagrams/architecture/DGM-004-canonical-data-flow.md` |
| DGM-005 | `docs/diagrams/architecture/DGM-005-ownership-model.md` |
| DGM-006 | `docs/diagrams/runtime/DGM-006-runtime-flow.md` |
| DGM-007 | `docs/diagrams/expansion/DGM-007-plugin-architecture.md` |

## Directory Ownership

| Directory | Intended scope |
| --- | --- |
| `docs/diagrams/architecture/` | System-level and cross-layer diagrams. |
| `docs/diagrams/repository/` | Repository, dataset, persistence, and coverage-adjacent diagrams. |
| `docs/diagrams/runtime/` | Scheduler, Worker, runtime, execution, and orchestration diagrams. |
| `docs/diagrams/evidence/` | Evidence Packet, readiness, and evidence boundary diagrams. |
| `docs/diagrams/reasoning/` | Future reasoning and Knowledge-layer diagrams. |
| `docs/diagrams/product/` | Product and presentation architecture diagrams. |
| `docs/diagrams/expansion/` | Plugin, vertical expansion, API, SDK, and multi-agent diagrams. |

## Rules

1. Mermaid source is canonical.
2. Generated SVG, PNG, or Figma assets must cite the source diagram ID.
3. Future diagrams continue sequential numbering.
4. Diagram content must align with `MASTER_PLAN.md` and
   `MASTER_ARCHITECTURE.md`.
5. Diagrams must not imply implementation capabilities that are not certified.
6. Missing, future, or unsupported capabilities should be shown as future or
   bounded, not active production behavior.
