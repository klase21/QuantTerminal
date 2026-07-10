# QuantTerminal Post-Freeze Backlog

**Status:** Post-freeze planning register  
**Scope:** Future epics after Documentation Freeze v1  
**Rule:** This backlog organizes future work only. It does not implement work, approve scope, or override MASTER documents.  

## Priority Scale

| Priority | Meaning |
| --- | --- |
| P0 | Required before safe automation, reasoning, or product construction can proceed. |
| P1 | High-value foundation work for the next product phase. |
| P2 | Important expansion or maturity work after the first product construction wave. |
| P3 | Strategic future work. |

## Automation

### Automation Entry Criteria

Purpose: define the go/no-go gates for cron, workers, scheduled sync,
projection refresh, and operational monitoring.

Dependencies: `MASTER_ENGINEERING.md`, `MASTER_ARCHITECTURE.md`, DGM-006
Runtime Flow, Recent Gap Sync Orchestrator.

Priority: P0.

Suggested starting point: create `AUTOMATION_ENTRY_CRITERIA.md` as an adjunct
operational document.

### Manual Projection Refresh Workflow

Purpose: define a safe manual workflow for refreshing projections after recent
gap sync.

Dependencies: Coverage Engine, Projection Lifecycle, Recent Gap Sync.

Priority: P0.

Suggested starting point: architecture-only sprint for refresh sequencing and
failure policy.

### Scheduler-to-Worker Automation Pilot

Purpose: connect certified runtime foundations to a bounded automation pilot
without business logic leakage.

Dependencies: Automation Entry Criteria, Scheduler Runtime, Worker Runtime,
Repository.

Priority: P1.

Suggested starting point: local manual pilot before production cron.

## Reasoning

### Reasoning Entry Criteria

Purpose: define the minimum evidence readiness, coverage, context, and review
requirements before reasoning can interpret market evidence.

Dependencies: `MASTER_ARCHITECTURE.md`, `MASTER_PRODUCT.md`, Evidence Packet
Engine, Context Snapshot.

Priority: P0.

Suggested starting point: create `REASONING_ENTRY_CRITERIA.md` as an adjunct
gate document.

### Evidence-to-Reasoning Boundary

Purpose: specify how reasoning may reference evidence without fabricating
facts, confidence, predictions, or recommendations.

Dependencies: Evidence Packet Engine, Product Invariants, Architecture ADRs.

Priority: P1.

Suggested starting point: architecture sprint with examples of allowed and
forbidden reasoning outputs.

### Historical Analog Reasoning

Purpose: define source-backed historical analog generation from repository and
context evidence.

Dependencies: Reasoning Entry Criteria, Replay Repository Mode, Historical
Memory, Context Snapshot.

Priority: P2.

Suggested starting point: no-implementation architecture sprint.

## Product Diagram Pack

### Product Navigation Diagram Pack

Purpose: make product navigation, page ownership, handoffs, and return paths
visual.

Dependencies: `MASTER_PRODUCT.md`, DGM-001, DGM-002.

Priority: P1.

Suggested starting point: Mermaid-only diagram pack under
`docs/diagrams/product/`.

### Evidence Card Diagram

Purpose: define the canonical visual structure of Evidence Cards.

Dependencies: `MASTER_PRODUCT.md`, Evidence Packet Engine.

Priority: P1.

Suggested starting point: Mermaid or wireframe-source documentation sprint.

## Case Study

### BTCUSDT 2026-07-01 Case Study

Purpose: create a source-backed case study using repository coverage,
projection, Replay, Research, and Evidence outputs.

Dependencies: Repository datasets, Coverage Projection, Replay Repository Mode,
Research Repository Migration, Evidence Packet Engine.

Priority: P1.

Suggested starting point: documentation-only case study outline before UI work.

### Evidence Walkthrough Library

Purpose: build reusable examples showing how evidence turns into user
understanding.

Dependencies: Product Diagram Pack, Evidence Packet Engine, Replay.

Priority: P2.

Suggested starting point: choose one bounded historical window and document all
available/unavailable evidence.

## UI/UX

### Dashboard Product Construction

Purpose: align Dashboard with the master product hierarchy: headline, market
direction, evidence, reasoning boundary, and tactical alerts.

Dependencies: `MASTER_PRODUCT.md`, Product Diagram Pack, Evidence Packet
Engine.

Priority: P1.

Suggested starting point: UX audit against Product Review Checklist.

### Replay UX Refinement

Purpose: improve repository-backed Replay mode clarity, degraded states,
manual heavy-data behavior, and evidence handoffs.

Dependencies: Repository Replay Mode, Coverage Gate, Product Invariants.

Priority: P1.

Suggested starting point: Replay-specific product review.

### Research UX Refinement

Purpose: improve repository-backed research summary, evidence readiness, and
future reasoning entry points.

Dependencies: Research Repository Migration, Evidence Packet Engine.

Priority: P1.

Suggested starting point: Research-specific product review.

### Design System Canonicalization

Purpose: define reusable visual language, density, tokens, components, states,
and accessibility rules.

Dependencies: `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`.

Priority: P2.

Suggested starting point: future `MASTER_DESIGN_SYSTEM` specification.

## Expansion

### Hyperliquid Expansion Architecture

Purpose: define how Hyperliquid enters the provider, repository, coverage,
projection, evidence, and presentation stack.

Dependencies: Plugin Architecture, Provider Independence, Source Governance.

Priority: P2.

Suggested starting point: architecture-only provider capability audit.

### Macro Evidence Architecture

Purpose: define macro source categories, timestamps, revisions, freshness, and
evidence boundaries.

Dependencies: Context Snapshot Architecture, Evidence Packet Engine.

Priority: P2.

Suggested starting point: source governance audit.

### Prediction Market Expansion

Purpose: define how prediction probability evidence enters without becoming
QuantTerminal prediction.

Dependencies: Source Governance, Evidence Invariants, Product Non-Goals.

Priority: P2.

Suggested starting point: provider/source envelope audit.

## Enterprise

### Enterprise Evidence Export

Purpose: define repeatable, source-transparent exports for evidence packets,
research summaries, and replay windows.

Dependencies: Evidence Packet Engine, Product Invariants, Repository.

Priority: P2.

Suggested starting point: product and architecture specification.

### Team Review Workflow

Purpose: support collaborative review of evidence, research, and future
reasoning.

Dependencies: Enterprise roadmap, Evidence Cards, Research.

Priority: P3.

Suggested starting point: product journey architecture.

### Enterprise API Boundary

Purpose: define bounded source-transparent API contracts for enterprise
consumption.

Dependencies: Repository API patterns, Coverage API, Evidence Packet Engine.

Priority: P3.

Suggested starting point: architecture-only API boundary document.

## AI Agents

### Evidence Agent Specification

Purpose: define an agent that evaluates evidence readiness, warnings, missing
evidence, and experimental evidence.

Dependencies: Evidence Packet Engine, AI Collaboration Model.

Priority: P1.

Suggested starting point: no-implementation agent responsibility spec.

### Review Agent Specification

Purpose: define an agent that challenges unsupported claims, stale evidence,
architecture drift, and product inconsistency.

Dependencies: `MASTER_ENGINEERING.md`, Freeze Policy, MASTER Certification.

Priority: P1.

Suggested starting point: review protocol extension.

### UI Agent Specification

Purpose: define an agent that helps produce UI aligned with product and
accessibility rules.

Dependencies: `MASTER_PRODUCT.md`, Product Diagram Pack, Design System.

Priority: P2.

Suggested starting point: AI collaboration policy extension.

## Developer Experience

### Documentation Navigation Index

Purpose: provide a practical index for humans and AI agents to find canonical
documents quickly.

Dependencies: Documentation Inventory, Canonical Documentation Structure,
MASTER Certification.

Priority: P1.

Suggested starting point: docs-only index sprint.

### Domain Entry Document Refresh

Purpose: update each domain entry document to point to the new five-master
system.

Dependencies: Freeze Policy, Master Certification.

Priority: P2.

Suggested starting point: documentation-only reference update sprint.

### Archive Migration Plan

Purpose: plan physical movement of archive candidates without deletion or
broken references.

Dependencies: Documentation Inventory, Canonical Documentation Structure.

Priority: P3.

Suggested starting point: documentation-operations architecture sprint.

## Testing

### Documentation Consistency Checks

Purpose: create repeatable checks for required master sections, diagram
metadata, links, and heading structure.

Dependencies: Master Certification, Diagram Index.

Priority: P1.

Suggested starting point: docs validation design sprint.

### Repository Invariant Smoke Checks

Purpose: formalize smoke checks for identity, duplicate rejection, bounded
reads, projections, and no direct adapter writes.

Dependencies: Repository Platform, Coverage Projection.

Priority: P1.

Suggested starting point: testing architecture sprint.

### Product Regression Checklist

Purpose: create reusable checks for page ownership, responsiveness, unavailable
states, accessibility, and evidence-first UX.

Dependencies: `MASTER_PRODUCT.md`, `MASTER_ENGINEERING.md`.

Priority: P2.

Suggested starting point: product QA documentation sprint.

## Observability

### Projection Freshness Observability

Purpose: surface projection freshness, stale state, missing projection, and
source watermark health.

Dependencies: Projection Lifecycle, Coverage API.

Priority: P1.

Suggested starting point: architecture-only observability spec.

### Repository Freshness Monitor

Purpose: monitor latest observations by dataset without external fetch or
request-path scans.

Dependencies: Repository Freshness Audit, Coverage Projection.

Priority: P1.

Suggested starting point: bounded read design.

### Provider Health Dashboard

Purpose: summarize source availability, provider tier, stale state, and
unsupported mappings.

Dependencies: Data Source Governance, Source Envelopes.

Priority: P2.

Suggested starting point: product and architecture review.

## Performance

### Bounded Query Performance Budget

Purpose: define latency and record-count budgets for repository-backed Replay,
Research, Evidence, and future APIs.

Dependencies: Bounded Replay Query, Coverage API.

Priority: P1.

Suggested starting point: performance policy document.

### Heavy Dataset Strategy

Purpose: define handling for AggTrade, orderbook, and future large datasets
without blocking request paths.

Dependencies: Replay Orderbook ADR, AggTrade Backfill, Replay Repository Mode.

Priority: P1.

Suggested starting point: architecture-only strategy document.

### Projection Read Optimization

Purpose: improve projection-read responsiveness while preserving exact-scan
separation.

Dependencies: Coverage Projection, Projection Lifecycle.

Priority: P2.

Suggested starting point: profiling and architecture review sprint.

## Product Construction Phase Entry

The next phase should begin with:

1. Automation Entry Criteria.
2. Reasoning Entry Criteria.
3. Product Diagram Pack.
4. BTCUSDT 2026-07-01 Case Study.
5. Dashboard / Replay / Research product construction reviews.

The Product Construction Phase should continue to follow the frozen master
system:

```text
MASTER_PLAN
  -> MASTER_ARCHITECTURE
  -> MASTER_ENGINEERING
  -> MASTER_PRODUCT
  -> MASTER_ROADMAP
  -> Domain document
  -> Sprint prompt
```
