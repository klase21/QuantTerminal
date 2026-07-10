# Documentation Inventory

**Epic:** D0.1  
**Milestone:** v0.8-data-foundation  
**Scope:** Documentation audit only  
**Decision:** Project is ready to build `MASTER_PLAN` on top of this audit.

## Audit Boundaries

This inventory reviewed the full `docs/` tree, with emphasis on `docs/project/`.
No runtime, Repository, Projection, Replay, Research, Evidence, Scheduler, package,
or git behavior was changed.

Classification terms:

| Term | Meaning |
| --- | --- |
| Canonical | Current source of truth for active product, platform, or data-foundation behavior. |
| Reference | Useful historical or detailed design record; not the first source of truth. |
| Archive candidate | Superseded or phase-local document that should remain available but moved out of the active reading path later. |
| Duplicate | Same subject is covered by a newer or more complete document. |
| Missing | A needed top-level document does not exist yet. |

Recommended actions:

| Action | Meaning |
| --- | --- |
| KEEP | Keep active in current docs hierarchy. |
| MERGE | Fold into a future master document or canonical index, then keep original as reference. |
| ARCHIVE | Move to an archive namespace later; no deletion in this sprint. |
| DELETE | Documentation recommendation only; do not delete files without a separate explicit cleanup sprint. |

## Canonical Hierarchy

Current canonical documentation should be treated in this order:

1. `AGENTS.md`
2. `.skills/quantterminal-rules.md`
3. `docs/project/phase5-final-certification.md`
4. `docs/project/funding-recent-gap-sync-official-rest.md`
5. `docs/project/recent-gap-sync-orchestrator.md`
6. `docs/project/evidence-packet-engine.md`
7. `docs/project/research-repository-migration.md`
8. `docs/project/repository-replay-mode.md`
9. `docs/project/replay-bounded-repository-query.md`
10. `docs/project/repository-coverage-api.md`
11. `docs/project/projection-lifecycle-framework.md`
12. `docs/project/repository-coverage-projection.md`
13. `docs/project/repository-coverage-engine.md`
14. `docs/project/dataset-resolution-metadata-contract.md`
15. `docs/project/historical-repository-coverage-reconciliation.md`
16. `docs/project/historical-aggtrade-backfill.md`
17. `docs/project/historical-funding-backfill.md`
18. `docs/project/historical-open-interest-backfill.md`
19. `docs/project/historical-liquidation-backfill.md`
20. `docs/project/context-wiring-pack.md`
21. `docs/project/context-snapshot-architecture.md`
22. `docs/project/data-source-governance.md`
23. `docs/project/source-envelope-rollout-status.md`
24. `docs/project/phase4-runtime-foundation-certification.md`
25. `docs/project/phase3-final-certification.md`
26. `docs/decisions/*.md`

## Architecture Dependency Graph

```text
Data Source Governance
  -> Historical Backfill
  -> Repository
  -> Coverage Engine
  -> Coverage Projection
  -> Projection Lifecycle
  -> Coverage API
  -> Replay Coverage Gate
  -> Bounded Replay Query
  -> Replay Repository Adapter
  -> Repository Replay Mode
  -> Research Repository Summary
  -> Evidence Packet Engine
  -> Recent Gap Sync
  -> Automation / Reasoning (future)
```

Expanded platform graph:

```text
Runtime Foundations
  -> Signal Tracking
  -> Signal Evaluation
  -> Signal Outcome
  -> Outcome Recorder
  -> Historical Memory
  -> Pattern Runtime
  -> Learning Runtime
  -> Confidence Calibration
  -> Playbook Runtime

Historical Data Foundation
  -> OHLCV
  -> Funding
  -> Open Interest
  -> AggTrade
  -> Liquidation Experimental
  -> Dataset Resolution Contract
  -> Coverage Projection

Context
  -> Context Snapshot Architecture
  -> Context Runtime
  -> Context Wiring
  -> Signal-to-Memory lineage

Consumers
  -> Replay
  -> Research
  -> Evidence
  -> Reasoning (future)
```

## Canonical Documents By Domain

| Domain | Canonical document | Purpose | Related sprint | Dependencies | Recommended action |
| --- | --- | --- | --- | --- | --- |
| Repository Platform | `docs/project/phase5-final-certification.md` | Freezes Phase 5 autonomous Signal-to-Memory platform. | P5-28 | Phase 5 audits, persistence, execution, context, local runner | KEEP |
| Repository Persistence | `docs/project/phase5-persistence-certification.md` | Certifies repository, SQLite, Postgres/Neon adapter contracts. | P5-6 | P5 persistence architecture | KEEP |
| Execution Foundation | `docs/project/phase5-execution-foundation-certification.md` | Certifies Scheduler, Worker, Operational Repository boundaries. | P5-12 | Execution architecture, integration audit | KEEP |
| Runtime Foundation | `docs/project/phase4-runtime-foundation-certification.md` | Certifies Facts and Knowledge runtimes before Phase 5. | P4-15 | Phase 4 runtime audit | KEEP |
| Context | `docs/project/context-snapshot-architecture.md` | Defines immutable signal-time context snapshot. | P5-24 | Outcome, Signal Evaluation, Phase 5 pipeline | KEEP |
| Context Wiring | `docs/project/context-wiring-pack.md` | Records wired and unavailable context categories. | R4 | Contract cleanup, governance | KEEP |
| Coverage | `docs/project/repository-coverage-engine.md` | Defines reusable repository coverage evaluation. | B8 | Dataset resolution contract | KEEP |
| Projection | `docs/project/repository-coverage-projection.md` | Defines cached coverage projections. | B8.5 | Coverage engine | KEEP |
| Projection Lifecycle | `docs/project/projection-lifecycle-framework.md` | Adds projection freshness and lifecycle states. | B9.5 | Coverage projection, API | KEEP |
| Coverage API | `docs/project/repository-coverage-api.md` | Documents projection-only API behavior. | B9 | Projection lifecycle | KEEP |
| Replay | `docs/project/repository-replay-mode.md` | Documents optional repository-backed Replay mode. | B10.7 | Coverage gate, bounded query, adapter | KEEP |
| Replay Bounded Query | `docs/project/replay-bounded-repository-query.md` | Documents safe hourly repository dataset API. | B10.5 | Projection gate | KEEP |
| Research | `docs/project/research-repository-migration.md` | Documents projection-only Research repository summary. | B11 | Coverage API | KEEP |
| Evidence | `docs/project/evidence-packet-engine.md` | Defines availability-only Evidence Packet Engine. | B12 | Research repository client, projections | KEEP |
| Recent Gap Sync | `docs/project/recent-gap-sync-orchestrator.md` | Defines manual recent-gap planning and dispatch. | B11.7 | Freshness audit, dataset runners | KEEP |
| Funding Recent Gap | `docs/project/funding-recent-gap-sync-official-rest.md` | Documents official REST funding recent-gap execution. | B11.8C | Recent Gap Sync, funding backfill | KEEP; update with B11.8C-R result in a later doc sprint |
| Historical Backfill | `docs/project/historical-backfill-architecture.md` | Defines historical backfill model and no-fabrication boundary. | B1 | Phase 5 certification | KEEP |
| Dataset Resolution | `docs/project/dataset-resolution-metadata-contract.md` | Canonical dataset resolution and coverage-mode metadata. | B7.7 | B7.6 reconciliation | KEEP |
| Governance | `docs/project/data-source-governance.md` | Source identity, ownership, freshness, and fallback rules. | Data governance | Source envelope docs | KEEP |
| Automation | `docs/automation/AUTOMATION_ROADMAP.md` | Controlled path toward future automation. | Automation planning | Agent architecture/protocol/schema/review docs | KEEP |

## Duplicate And Supersession Findings

| Finding | Documents | Superseded by | Recommended action |
| --- | --- | --- | --- |
| Open Interest recent-gap execution has two near-identical docs. | `open-interest-recent-gap-sync-execution.md`, `open-interest-recent-gap-sync-execution-b11-8b.md` | `open-interest-recent-gap-sync-execution-b11-8b.md` | KEEP B11.8B, ARCHIVE B11.8A doc after master migration. |
| Replay cache builder appears in architecture and investigations. | `docs/architecture/replay-cache-builder.md`, `docs/investigations/replay-cache-builder.md` | `docs/investigations/replay-cache-builder.md` plus ADR-005 | ARCHIVE short architecture stub or MERGE into investigation index. |
| Dashboard mockup docs overlap. | `DASHBOARD_MOCKUP_V1.md`, `DASHBOARD_VISUAL_MOCKUP_V1.md`, `DASHBOARD_MOCKUP_V2.md`, PNGs | `dashboard-design-system.md`, `dashboard-v2-state.md` | Keep assets as reference; ARCHIVE older mockups later. |
| Phase 5 audit chain is verbose. | P5 signal/memory/context/local-runner/integration audits | `phase5-final-certification.md` | KEEP final certification; MERGE audit summaries into future `MASTER_ARCHITECTURE`; archive individual audits later. |
| Product overview docs overlap. | `DESIGN.md`, `PRODUCT_DIFFERENTIATION_V1.md`, `PRODUCT_MOCKUP_PACK_V1.md`, `whole-product-review.md`, `whole-product-architecture-audit.md` | Future `MASTER_PRODUCT` | MERGE. |
| Strategy docs predate Repository Platform. | `docs/strategy/*.md` | Future `MASTER_PLAN` and current Phase 5/B-series docs | Keep as historical reference; mark non-canonical. |

## Missing Documentation

| Missing document | Purpose | Depends on | Priority |
| --- | --- | --- | --- |
| `MASTER_PLAN.md` | One authoritative project plan from current v0.8 state into Automation and Reasoning. | This inventory, Phase 5 final certification, B11.8C-R result | P0 |
| `MASTER_ARCHITECTURE.md` | Single architecture map spanning Repository, Coverage, Projection, Replay, Research, Evidence, Runtime, Context, and future Reasoning. | Canonical hierarchy above | P0 |
| `MASTER_PRODUCT.md` | Product/page responsibilities and current user-facing scope. | `DESIGN.md`, page constitutions, whole-product audit | P1 |
| `MASTER_ROADMAP.md` | Sprint roadmap from v0.8-data-foundation onward. | `ROADMAP.md`, Recent Gap Sync, Evidence docs, Automation roadmap | P1 |
| `DATA_FOUNDATION_STATUS.md` | Compact operational status of OHLCV, Funding, OI, AggTrade, Liquidation, Projection, Freshness, Recent Gap Sync. | B-series docs | P0 |
| `AUTOMATION_ENTRY_CRITERIA.md` | Gate checklist before cron/workers/automation begin. | Automation docs, Recent Gap Sync, Repository certifications | P1 |
| `REASONING_ENTRY_CRITERIA.md` | Gate checklist for AI/reasoning layers consuming Evidence Packets. | Evidence Packet Engine, no-fabrication policy | P1 |

## Complete Inventory

Legend for compact table:

- Status: `C` canonical, `R` reference, `A` archive candidate, `D` duplicate, `Asset` binary/supporting asset.
- Canonical?: `Y` or `N`.
- Referenced?: `Y` means direct path reference detected or document is a required known instruction; `N` means no direct path reference found in docs scan.

| Document | Purpose | Related sprint | Status | Canonical? | Dependencies | Superseded by | Referenced? | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/DATA_SOURCES.md` | Legacy data-source overview. | Pre-v0.8 | R | N | Source docs | `data-source-governance.md` | N | MERGE |
| `docs/INTELLIGENCE_COMPRESSION_DECISION_PACK.md` | Early decision-system pack. | Pre-Phase | A | N | Strategy docs | Phase 4/5 runtime docs | N | ARCHIVE |
| `docs/KNOWN_LIMITATIONS.md` | Legacy limitations list. | Pre-v0.8 | R | N | Product docs | Future `MASTER_PLAN` | N | MERGE |
| `docs/NEXT_PHASES_ROADMAP.md` | Old next-phase pack. | Pre-v0.8 | A | N | Strategy docs | Future `MASTER_ROADMAP` | N | ARCHIVE |
| `docs/PHASE_SUMMARY.md` | Legacy phase summary. | Pre-v0.8 | A | N | Phase docs | Phase 5 final certification | N | ARCHIVE |
| `docs/RELEASE_NOTES.md` | Release notes. | Ongoing | R | N | Product status | Future release index | N | KEEP |
| `docs/RUN_BUILD_DEPLOY.md` | Run/build/deploy notes. | Ongoing | R | N | AGENTS build rule | AGENTS for build constraints | N | MERGE |
| `docs/SCORING_FORMULAS.md` | Legacy scoring formulas. | Pre-v0.8 | R | N | Product scoring | Future reasoning docs | N | KEEP |
| `docs/TERMINAL_GLOSSARY.md` | Product glossary. | Ongoing | R | N | Product docs | Future `MASTER_PRODUCT` | N | MERGE |
| `docs/decisions/ADR-001-dashboard-historical-analog.md` | Dashboard historical analog removal. | ADR | C | Y | AGENTS | None | Y | KEEP |
| `docs/decisions/ADR-002-orderbook-runtime-budget.md` | Orderbook request-budget decision. | ADR | C | Y | Replay investigation | None | Y | KEEP |
| `docs/decisions/ADR-004-event-impact-layer.md` | Event Impact architecture decision. | ADR | R | N | Event impact docs | Current Repository/Evidence docs for v0.8 | N | KEEP |
| `docs/decisions/ADR-005-historical-intelligence-cache-foundation.md` | Cache foundation request-path boundary. | ADR | C | Y | Replay cache investigation | None | Y | KEEP |
| `docs/decisions/ADR-006-intelligence-artifact-registry.md` | Artifact registry boundary. | ADR | R | N | Intelligence artifact docs | Future reasoning architecture | N | KEEP |
| `docs/investigations/replay-orderbook-2026-06.md` | Orderbook runtime investigation. | Investigation | C | Y | ADR-002 | None | Y | KEEP |
| `docs/investigations/replay-cache-builder.md` | Replay orderbook cache builder investigation. | Investigation | R | N | ADR-005 | None | N | KEEP |
| `docs/memory/architecture-memory.md` | Rolling architecture memory. | Memory | R | N | Architecture docs | Future master docs | N | MERGE |
| `docs/memory/investigation-memory.md` | Investigation memory. | Memory | R | N | Investigations | Future master docs | N | MERGE |
| `docs/memory/project-memory.md` | Project memory. | Memory | R | N | Project docs | Future master docs | N | MERGE |
| `docs/automation/AGENT_ARCHITECTURE.md` | Automation agent roles. | Automation | C | Y | Automation roadmap | None | Y | KEEP |
| `docs/automation/AGENT_PROTOCOL.md` | Automation coordination protocol. | Automation | C | Y | Agent architecture | None | Y | KEEP |
| `docs/automation/AUTOMATION_ROADMAP.md` | Automation roadmap. | Automation | C | Y | Agent docs | Future `AUTOMATION_ENTRY_CRITERIA.md` | N | KEEP |
| `docs/automation/DEVSPACE_EVALUATION.md` | DevSpace automation evaluation. | Automation | R | N | Automation docs | Future automation adapter docs | N | KEEP |
| `docs/automation/MESSAGE_CONTRACT.md` | Agent message contract. | Automation | C | Y | Task schema | None | N | KEEP |
| `docs/automation/REVIEW_PROTOCOL.md` | Automation review protocol. | Automation | C | Y | Agent protocol | None | Y | KEEP |
| `docs/automation/TASK_SCHEMA.md` | Automation task schema. | Automation | C | Y | Message contract | None | Y | KEEP |
| `docs/strategy/intelligence-platform-master-plan.md` | Pre-v0.8 intelligence master plan. | Strategy | R | N | Strategy set | Future `MASTER_PLAN` | N | MERGE |
| `docs/strategy/execution-roadmap.md` | Pre-v0.8 execution roadmap. | Strategy | R | N | Strategy set | Future `MASTER_ROADMAP` | N | MERGE |
| `docs/strategy/event-impact-engine-plan.md` | Event Impact plan. | Strategy | R | N | Event impact ADR | Future reasoning docs | N | KEEP |
| `docs/strategy/research-renaissance-plan.md` | Research strategy plan. | Strategy | R | N | Research docs | Research repository migration | N | MERGE |
| `docs/strategy/market-memory-engine-plan.md` | Market Memory plan. | Strategy | R | N | Historical Memory docs | Future reasoning docs | N | KEEP |
| `docs/strategy/shared-investigation-context-plan.md` | Shared investigation context plan. | Strategy | R | N | Shared context docs | Shared product context contract | N | MERGE |
| `docs/product/principal-sdt-usability-audit.md` | Principal product usability audit. | Product audit | R | N | Product docs | Future `MASTER_PRODUCT` | N | MERGE |
| `docs/project/phase3-final-certification.md` | Phase 3 final certification. | P3 | C | Y | Phase 3 freeze | None | Y | KEEP |
| `docs/project/phase3-freeze.md` | Phase 3 freeze details. | P3 | R | N | Phase 3 docs | `phase3-final-certification.md` | N | ARCHIVE |
| `docs/project/phase4-runtime-foundation-certification.md` | Phase 4 runtime certification. | P4-15 | C | Y | Runtime audit | None | Y | KEEP |
| `docs/project/phase4-runtime-integration-audit.md` | Phase 4 runtime audit. | P4-14 | R | N | Runtime docs | `phase4-runtime-foundation-certification.md` | N | KEEP |
| `docs/project/phase5-final-certification.md` | Phase 5 platform certification. | P5-28 | C | Y | Phase 5 audits | None | Y | KEEP |
| `docs/project/phase5-persistence-architecture.md` | Persistence architecture. | P5-1 | R | N | Phase 4 cert | `phase5-persistence-certification.md` | N | KEEP |
| `docs/project/phase5-persistence-certification.md` | Persistence certification. | P5-6 | C | Y | Persistence architecture | None | Y | KEEP |
| `docs/project/phase5-execution-architecture.md` | Execution architecture. | P5-7 | R | N | Persistence cert | Execution certification | N | KEEP |
| `docs/project/phase5-execution-integration-audit.md` | Execution integration audit. | P5-11 | R | N | Scheduler/Worker docs | Execution certification | N | KEEP |
| `docs/project/phase5-execution-foundation-certification.md` | Execution foundation certification. | P5-12 | C | Y | Execution audit | None | Y | KEEP |
| `docs/project/phase5-local-runner-integration-audit.md` | Local Runner integration audit. | P5-15 | R | N | Local Runner docs | Phase 5 final certification | N | KEEP |
| `docs/project/phase5-signal-to-memory-e2e-audit.md` | Signal-to-Memory audit before context. | P5-23 | R | N | Local Runner pipeline | Context-aware audit | N | ARCHIVE |
| `docs/project/phase5-context-signal-memory-e2e-audit.md` | Context-aware pipeline audit. | P5-27 | R | N | Context wiring | Reaudit/final certification | N | KEEP |
| `docs/project/phase5-context-lineage-cleanup.md` | Context lineage cleanup results. | P5-27F | C | Y | Context audit | None | Y | KEEP |
| `docs/project/phase5-context-signal-memory-reaudit.md` | Context pipeline re-audit. | P5-27R | C | Y | Context cleanup | Phase 5 final certification | Y | KEEP |
| `docs/project/outcome-engine-constitution.md` | Outcome Engine constitutional boundary. | P4-1 | C | Y | Phase 3 cert | None | Y | KEEP |
| `docs/project/outcome-engine-information-architecture.md` | Outcome Engine IA. | P4-2 | C | Y | Outcome constitution | None | Y | KEEP |
| `docs/project/signal-evaluation-constitution.md` | Signal Evaluation purpose and rules. | P4-3 | C | Y | Outcome docs | None | Y | KEEP |
| `docs/project/signal-tracking-architecture.md` | Signal Tracking architecture. | P4-4 | C | Y | Signal Evaluation | None | Y | KEEP |
| `docs/project/context-snapshot-architecture.md` | Context Snapshot architecture. | P5-24 | C | Y | Signal/Outcome docs | None | Y | KEEP |
| `docs/project/context-evidence-wiring-audit.md` | Context evidence readiness audit. | R2 | R | N | Data audit | Context wiring pack | N | KEEP |
| `docs/project/contract-cleanup-pack.md` | Contract cleanup report. | R3 | R | N | Context wiring audit | Context wiring pack | N | KEEP |
| `docs/project/context-wiring-pack.md` | Context evidence wiring implementation report. | R4 | C | Y | Contract cleanup | None | Y | KEEP |
| `docs/project/data-availability-root-cause-audit.md` | Availability root-cause audit. | R1 | R | N | Governance/source docs | Context wiring/data foundation docs | N | KEEP |
| `docs/project/data-source-governance.md` | Source governance. | Governance | C | Y | Source registry | None | Y | KEEP |
| `docs/project/source-registry-usage-audit.md` | Source registry usage audit. | Governance | R | N | Data governance | Source rollout status | N | KEEP |
| `docs/project/source-envelope-compatibility-audit.md` | Source envelope compatibility audit. | Governance | R | N | Source registry audit | Source rollout status | N | KEEP |
| `docs/project/source-envelope-rollout-status.md` | Source envelope rollout status. | Governance | C | Y | Compatibility audit | None | Y | KEEP |
| `docs/project/critical-source-envelope-migration-plan.md` | Critical source envelope migration plan. | Governance | R | N | Source audits | Source rollout status | N | KEEP |
| `docs/project/unavailable-reduction-audit.md` | UNAVAILABLE reduction candidate audit. | Governance | R | N | Source governance | Data availability audit | N | KEEP |
| `docs/project/dataset-resolution-metadata-contract.md` | Dataset resolution metadata contract. | B7.7 | C | Y | Historical reconciliation | None | Y | KEEP |
| `docs/project/historical-backfill-architecture.md` | Historical backfill architecture. | B1 | C | Y | Phase 5 cert | None | Y | KEEP |
| `docs/project/historical-backfill-pilot.md` | OHLCV pilot report. | B2 | R | N | Backfill architecture | Full/reconciliation docs | N | KEEP |
| `docs/project/historical-backfill-full.md` | Full OHLCV report. | B3 | R | N | Pilot | Reconciliation/coverage docs | N | KEEP |
| `docs/project/historical-funding-backfill.md` | Funding historical backfill report. | B4 | C | Y | Backfill architecture | Recent-gap doc for current freshness | Y | KEEP |
| `docs/project/funding-backfill-reconciliation.md` | Provider-aware funding reconciliation. | B4R | C | Y | Funding backfill | None | Y | KEEP |
| `docs/project/funding-recent-gap-sync-official-rest.md` | Funding recent-gap REST sync. | B11.8C | C | Y | Recent Gap Sync | Needs B11.8C-R appendix later | Y | KEEP |
| `docs/project/historical-open-interest-backfill.md` | OI backfill report. | B5 | C | Y | Backfill architecture | None | Y | KEEP |
| `docs/project/open-interest-recent-gap-sync-execution.md` | OI recent-gap first execution. | B11.8A | D | N | Recent Gap Sync | B11.8B doc | N | ARCHIVE |
| `docs/project/open-interest-recent-gap-sync-execution-b11-8b.md` | OI recent-gap second execution. | B11.8B | C | Y | B11.8A | None | Y | KEEP |
| `docs/project/historical-liquidation-backfill.md` | Liquidation backfill report. | B6/B6R | C | Y | Provider tier model | Coinalyze doc | Y | KEEP |
| `docs/project/coinalyze-internal-liquidation-provider.md` | Experimental liquidation provider. | B6R | C | Y | Liquidation backfill | None | Y | KEEP |
| `docs/project/historical-aggtrade-backfill.md` | AggTrade backfill report. | B7 | C | Y | Backfill architecture | None | Y | KEEP |
| `docs/project/canonical-dataset-audit-btcusdt-2026-07-01.md` | Dataset audit for BTCUSDT 2026-07-01. | B7.5 | R | N | Backfill docs | Coverage engine/projection docs | N | KEEP |
| `docs/project/historical-repository-coverage-reconciliation.md` | Coverage reconciliation. | B7.6/B7.7 | C | Y | Dataset audit | Dataset resolution contract | Y | KEEP |
| `docs/project/repository-coverage-engine.md` | Coverage Engine. | B8 | C | Y | Dataset resolution | Projection docs | Y | KEEP |
| `docs/project/repository-coverage-projection.md` | Coverage Projection. | B8.5 | C | Y | Coverage Engine | Projection lifecycle | Y | KEEP |
| `docs/project/repository-coverage-api.md` | Projection-only Coverage API. | B9 | C | Y | Projection lifecycle | None | Y | KEEP |
| `docs/project/projection-lifecycle-framework.md` | Projection freshness lifecycle. | B9.5 | C | Y | Coverage projection | None | Y | KEEP |
| `docs/project/repository-freshness-audit.md` | Repository freshness audit. | B11.5 | R | N | Historical facts | Recent Gap Sync | Y | KEEP |
| `docs/project/repository-sync-infrastructure-audit.md` | Sync infrastructure audit. | B11.6 | R | N | Backfill runners | Recent Gap Sync | Y | KEEP |
| `docs/project/recent-gap-sync-orchestrator.md` | Recent Gap Sync Orchestrator. | B11.7 | C | Y | Freshness/sync audits | None | Y | KEEP |
| `docs/project/replay-repository-coverage-gate.md` | Replay repository gate. | B10 | C | Y | Coverage API | Repository Replay Mode | Y | KEEP |
| `docs/project/replay-bounded-repository-query.md` | Bounded Replay repository query. | B10.5 | C | Y | Coverage gate | None | Y | KEEP |
| `docs/project/replay-repository-adapter.md` | Replay repository adapter. | B10.6 | C | Y | Bounded query | Repository Replay Mode | Y | KEEP |
| `docs/project/repository-replay-mode.md` | Repository Replay Mode. | B10.7 | C | Y | Replay adapter | None | Y | KEEP |
| `docs/project/research-repository-migration.md` | Research repository migration. | B11 | C | Y | Coverage API | Evidence Packet | Y | KEEP |
| `docs/project/evidence-packet-engine.md` | Evidence Packet Engine. | B12 | C | Y | Research repository | Future reasoning docs | Y | KEEP |
| `docs/project/markets-constitution.md` | Markets ownership constitution. | Product page | C | Y | Design/page matrix | None | N | KEEP |
| `docs/project/markets-information-architecture.md` | Markets IA. | Product page | R | N | Constitution | Markets state/certification | N | KEEP |
| `docs/project/markets-user-journey.md` | Markets journey. | Product page | R | N | Constitution | Markets state/certification | N | KEEP |
| `docs/project/markets-gap-analysis.md` | Markets gap analysis. | Product page | R | N | Journey/IA | Markets certification | N | KEEP |
| `docs/project/markets-certification.md` | Markets certification. | Product page | C | Y | Gap analysis | None | N | KEEP |
| `docs/project/markets-acceptance.md` | Markets acceptance review. | Product page | R | N | Certification | Markets v2 state | N | KEEP |
| `docs/project/markets-v2-state.md` | Markets current state. | Product page | C | Y | Certification | None | Y | KEEP |
| `docs/project/markets-wireframe.md` | Markets wireframe. | Product page | R | N | IA | Current UI | N | ARCHIVE |
| `docs/project/scanner-constitution.md` | Scanner ownership constitution. | Product page | C | Y | Design/page matrix | None | Y | KEEP |
| `docs/project/scanner-information-architecture.md` | Scanner IA. | Product page | R | N | Constitution | Scanner state | Y | KEEP |
| `docs/project/scanner-user-journey.md` | Scanner journey. | Product page | R | N | Constitution | Scanner state | N | KEEP |
| `docs/project/scanner-gap-analysis.md` | Scanner gap analysis. | Product page | R | N | Journey/IA | Scanner certification | Y | KEEP |
| `docs/project/scanner-certification.md` | Scanner certification. | Product page | C | Y | Gap analysis | None | N | KEEP |
| `docs/project/scanner-cross-page-review.md` | Scanner cross-page review. | Product page | R | N | Scanner docs | Shared context validation | N | KEEP |
| `docs/project/scanner-v2-state.md` | Scanner current state. | Product page | C | Y | Certification | None | Y | KEEP |
| `docs/project/scanner-wireframe.md` | Scanner wireframe. | Product page | R | N | IA | Current UI | N | ARCHIVE |
| `docs/project/research-constitution.md` | Research ownership constitution. | Product page | C | Y | Design/page matrix | Repository migration | Y | KEEP |
| `docs/project/research-information-architecture.md` | Research IA. | Product page | R | N | Constitution | Research state/repository migration | Y | KEEP |
| `docs/project/research-user-journey.md` | Research journey. | Product page | R | N | Constitution | Research state | N | KEEP |
| `docs/project/research-gap-analysis.md` | Research gap analysis. | Product page | R | N | Journey/IA | Research certification | Y | KEEP |
| `docs/project/research-certification.md` | Research certification. | Product page | C | Y | Gap analysis | Repository migration | Y | KEEP |
| `docs/project/research-acceptance.md` | Research acceptance review. | Product page | R | N | Certification | Research state | N | KEEP |
| `docs/project/research-v2-state.md` | Research current state. | Product page | C | Y | Certification | Repository migration | Y | KEEP |
| `docs/project/research-wireframe.md` | Research wireframe. | Product page | R | N | IA | Current UI | N | ARCHIVE |
| `docs/project/replay-constitution.md` | Replay ownership constitution. | Product page | C | Y | Design/page matrix | Repository Replay Mode | N | KEEP |
| `docs/project/replay-information-architecture.md` | Replay IA. | Product page | R | N | Constitution | Replay state/repository mode | N | KEEP |
| `docs/project/replay-user-journey.md` | Replay journey. | Product page | R | N | Constitution | Replay state | N | KEEP |
| `docs/project/replay-gap-analysis.md` | Replay gap analysis. | Product page | R | N | Journey/IA | Replay certification | N | KEEP |
| `docs/project/replay-certification.md` | Replay certification. | Product page | C | Y | Gap analysis | Repository Replay Mode | N | KEEP |
| `docs/project/replay-acceptance.md` | Replay acceptance. | Product page | R | N | Certification | Replay state | N | KEEP |
| `docs/project/replay-v2-state.md` | Replay current state. | Product page | C | Y | Certification | Repository Replay Mode | N | KEEP |
| `docs/project/replay-trade-readiness.md` | Replay/Trade readiness audit. | Product page | R | N | Replay/Trade docs | Readiness certs | Y | KEEP |
| `docs/project/replay-validation-context-certification.md` | Replay validation context cert. | Product page | C | Y | Shared context | None | N | KEEP |
| `docs/project/replay-wireframe.md` | Replay wireframe. | Product page | R | N | IA | Current UI | N | ARCHIVE |
| `docs/project/trade-constitution.md` | Trade ownership constitution. | Product page | C | Y | Design/page matrix | None | N | KEEP |
| `docs/project/trade-information-architecture.md` | Trade IA. | Product page | R | N | Constitution | Trade state | N | KEEP |
| `docs/project/trade-user-journey.md` | Trade journey. | Product page | R | N | Constitution | Trade state | N | KEEP |
| `docs/project/trade-gap-analysis.md` | Trade gap analysis. | Product page | R | N | Journey/IA | Trade certification | N | KEEP |
| `docs/project/trade-certification.md` | Trade certification. | Product page | C | Y | Gap analysis | None | N | KEEP |
| `docs/project/trade-acceptance.md` | Trade acceptance. | Product page | R | N | Certification | Trade state | N | KEEP |
| `docs/project/trade-v2-state.md` | Trade current state. | Product page | C | Y | Certification | None | N | KEEP |
| `docs/project/trade-readiness-context-certification.md` | Trade readiness context cert. | Product page | C | Y | Shared context | None | N | KEEP |
| `docs/project/trade-wireframe.md` | Trade wireframe. | Product page | R | N | IA | Current UI | N | ARCHIVE |
| `docs/project/DESIGN.md` | Product design principles. | Product | C | Y | Page matrix | Future `MASTER_PRODUCT` | Y | KEEP |
| `docs/project/PAGE_RESPONSIBILITY_MATRIX.md` | Page ownership matrix. | Product | C | Y | DESIGN | Future `MASTER_PRODUCT` | N | KEEP |
| `docs/project/USER_JOURNEYS_V1.md` | Legacy journey pack. | Product | R | N | Page docs | Page-specific journey docs | N | MERGE |
| `docs/project/ACCEPTANCE.md` | General acceptance criteria. | Product | R | N | Review rubric | Page-specific acceptances | N | MERGE |
| `docs/project/REVIEW_RUBRIC.md` | Review rubric. | Product | C | Y | Page docs | None | N | KEEP |
| `docs/project/ROADMAP.md` | Project roadmap. | Product | R | N | Product/phase docs | Future `MASTER_ROADMAP` | N | MERGE |
| `docs/project/DECISIONS.md` | Project decisions summary. | Product | R | N | ADRs | ADR directory | N | MERGE |
| `docs/project/whole-product-review.md` | Whole-product review. | Product | R | N | Page docs | Whole-product architecture audit | N | KEEP |
| `docs/project/whole-product-architecture-audit.md` | Whole-product architecture audit. | Product | C | Y | Page docs | Future `MASTER_ARCHITECTURE` | N | KEEP |
| `docs/project/product-integration-audit.md` | Product integration audit. | Product | R | N | Whole-product docs | Product phase summary | Y | KEEP |
| `docs/project/product-language-audit.md` | Product language audit. | Product | R | N | Product docs | Product phase summary | Y | KEEP |
| `docs/project/product-phase1-summary.md` | Product Phase 1 summary. | Product | R | N | Product audits | Future `MASTER_PRODUCT` | N | MERGE |
| `docs/project/PRODUCT_DIFFERENTIATION_V1.md` | Product differentiation. | Product | R | N | Product docs | Future `MASTER_PRODUCT` | N | MERGE |
| `docs/project/PRODUCT_MOCKUP_PACK_V1.md` | Product mockup pack. | Product | A | N | Mockup assets | Current page states | N | ARCHIVE |
| `docs/project/production-mock-route-isolation.md` | Mock route isolation. | Product/data | C | Y | Real-data policy | None | N | KEEP |
| `docs/project/dashboard-design-system.md` | Dashboard design system. | Dashboard | C | Y | Design tokens | None | Y | KEEP |
| `docs/project/dashboard-design-audit.md` | Dashboard design audit. | Dashboard | R | N | Design system | Dashboard state | Y | KEEP |
| `docs/project/dashboard-v2-state.md` | Dashboard current state. | Dashboard | C | Y | Design system | None | Y | KEEP |
| `docs/project/DASHBOARD_IMPLEMENTATION_SPEC_V1.md` | Dashboard implementation spec. | Dashboard | R | N | Mockups | Dashboard v2 state | N | MERGE |
| `docs/project/DASHBOARD_MOCKUP_V1.md` | Dashboard mockup v1. | Dashboard | A | N | Mockups | Mockup v2/state | N | ARCHIVE |
| `docs/project/DASHBOARD_VISUAL_MOCKUP_V1.md` | Dashboard visual mockup v1. | Dashboard | A | N | Mockups | Mockup v2/state | Y | ARCHIVE |
| `docs/project/DASHBOARD_MOCKUP_V2.md` | Dashboard visual mockup v2. | Dashboard | R | N | Mockups | Dashboard design system | Y | KEEP |
| `docs/project/design-token-registry.md` | Design tokens. | Design | C | Y | DESIGN | None | Y | KEEP |
| `docs/project/MAKE_ANALYSIS.md` | Figma Make extraction analysis. | Design | R | N | Mockups | Design token registry | Y | KEEP |
| `docs/project/architecture-cleanup.md` | Architecture cleanup report. | Cleanup | R | N | Whole-product audit | Future master docs | N | MERGE |
| `docs/project/navigation-handoff-audit.md` | Navigation/handoff audit. | Product | R | N | Page state docs | Shared context validation | Y | KEEP |
| `docs/project/shared-product-context-contract.md` | Shared Product Context contract. | Shared context | C | Y | Page constitutions | None | Y | KEEP |
| `docs/project/shared-context-e2e-validation.md` | Shared context validation. | Shared context | C | Y | Shared contract | None | N | KEEP |
| `docs/project/saveticker-governance.md` | SaveTicker governance. | Governance | R | N | Data governance | Future master data doc | N | KEEP |
| `docs/project/etf-capital-flow-certification.md` | ETF/capital flow cert. | Data remediation | R | N | Data governance | Context wiring/availability docs | N | KEEP |
| `docs/project/macro-freshness-certification.md` | Macro freshness cert. | Data remediation | R | N | Data governance | Availability audit | N | KEEP |
| `docs/project/reserve-intelligence-envelope-certification.md` | Reserve envelope cert. | Data remediation | R | N | Source envelope rollout | Context wiring | N | KEEP |
| `docs/project/sector-rotation-certification.md` | Sector rotation cert. | Data remediation | R | N | Source envelope rollout | Context wiring | N | KEEP |
| `docs/architecture/artifact-discovery-v1.md` | Artifact discovery design. | Architecture | R | N | ADR-006 | Future reasoning docs | N | KEEP |
| `docs/architecture/canonical-market-data-cache.md` | Old market-data cache design. | Architecture | A | N | ADR-005 | Repository Platform docs | N | ARCHIVE |
| `docs/architecture/contradiction-engine-v1.md` | Contradiction engine concept. | Architecture | R | N | Evidence validity | Future reasoning docs | N | KEEP |
| `docs/architecture/data-storage-optimization-v1.md` | Old storage optimization. | Architecture | A | N | Cache docs | Repository Platform docs | N | ARCHIVE |
| `docs/architecture/decision-brief-v1.md` | Decision brief concept. | Architecture | R | N | Evidence docs | Future reasoning docs | N | KEEP |
| `docs/architecture/durable-intelligence-artifact-store.md` | Durable artifact store concept. | Architecture | R | N | ADR-006 | Repository/Persistence docs | N | KEEP |
| `docs/architecture/event-impact-cache-foundation.md` | Event Impact cache foundation. | Architecture | R | N | ADR-004 | Repository/Evidence docs | Y | KEEP |
| `docs/architecture/event-impact-v1-implementation.md` | Event Impact implementation report. | Architecture | R | N | Event impact cache | Future reasoning docs | N | KEEP |
| `docs/architecture/evidence-validity-layer.md` | Evidence validity design. | Architecture | R | N | Evidence docs | Evidence Packet Engine for availability layer | N | KEEP |
| `docs/architecture/flow-replay-v1.md` | Flow Replay design. | Architecture | R | N | Replay docs | Repository Replay Mode | N | KEEP |
| `docs/architecture/flow-replay-enrichment-v1.md` | Flow Replay enrichment. | Architecture | R | N | Flow replay | Repository Replay Mode | N | KEEP |
| `docs/architecture/historical-analog-v2.md` | Historical Analog v2 stub. | Architecture | A | N | Strategy docs | Repository/Evidence/Reasoning future | N | ARCHIVE |
| `docs/architecture/historical-analog-v2-implementation.md` | Historical Analog implementation. | Architecture | A | N | Old historical analog | Dashboard ADR / Repository docs | N | ARCHIVE |
| `docs/architecture/intelligence-artifact-registry.md` | Artifact registry design. | Architecture | R | N | ADR-006 | Future reasoning architecture | N | KEEP |
| `docs/architecture/intelligence-artifact-publication.md` | Artifact publication design. | Architecture | R | N | Registry | Future reasoning architecture | N | KEEP |
| `docs/architecture/intelligence-operations-console.md` | Ops console concept. | Architecture | R | N | Automation docs | Future Automation | N | KEEP |
| `docs/architecture/intelligence-production-orchestrator.md` | Production orchestrator concept. | Architecture | R | N | Automation docs | Recent Gap Sync + future automation | N | KEEP |
| `docs/architecture/intelligence-production-run-reports.md` | Production run reports. | Architecture | R | N | Production orchestrator | Future Automation | N | KEEP |
| `docs/architecture/investigation-thesis-layer.md` | Thesis layer concept. | Architecture | R | N | Evidence validity | Future reasoning docs | N | KEEP |
| `docs/architecture/market-memory-v1-implementation.md` | Old Market Memory implementation. | Architecture | A | N | Market memory plan | Historical Memory runtime/future reasoning | N | ARCHIVE |
| `docs/architecture/market-memory-v3.md` | Market Memory v3 stub. | Architecture | A | N | Strategy docs | Historical Memory runtime/future reasoning | N | ARCHIVE |
| `docs/architecture/memory-eligibility-v1.md` | Memory eligibility design. | Architecture | R | N | Historical Memory | Future reasoning docs | N | KEEP |
| `docs/architecture/provider-semantics-investigation-v1.md` | CryptoHFTData semantics investigation. | Architecture | R | N | Replay investigations | Repository Replay Mode | N | KEEP |
| `docs/architecture/reliability-hardening-audit.md` | Reliability hardening audit. | Architecture | R | N | Intelligence docs | Current certifications | N | KEEP |
| `docs/architecture/replay-cache-builder.md` | Short replay cache builder note. | Architecture | D | N | Replay cache | `docs/investigations/replay-cache-builder.md` | N | ARCHIVE |
| `docs/architecture/replay-cache-schema-v2.md` | Replay cache schema v2. | Architecture | R | N | Replay cache | Repository bounded replay docs | N | KEEP |
| `docs/architecture/replay-learning-layer-v1.md` | Replay learning concept. | Architecture | R | N | Replay docs | Future reasoning docs | N | KEEP |
| `docs/architecture/research-durable-market-memory.md` | Research durable memory concept. | Architecture | R | N | Research docs | Historical Memory/Future Reasoning | N | KEEP |
| `docs/architecture/research-integration-implementation.md` | Research integration implementation. | Architecture | R | N | Research docs | Research repository migration | N | KEEP |
| `docs/architecture/scenario-branch-engine.md` | Scenario branch concept. | Architecture | R | N | Strategy docs | Future reasoning docs | N | KEEP |
| `docs/architecture/scheduled-production-runner.md` | Scheduled runner concept. | Architecture | R | N | Automation docs | Recent Gap Sync/future Automation | N | KEEP |
| `docs/architecture/shared-investigation-context-implementation.md` | Shared investigation implementation. | Architecture | R | N | Shared context plan | Shared product context contract | N | KEEP |
| `docs/architecture/temporal-compression.md` | Temporal compression concept. | Architecture | R | N | Strategy docs | Future reasoning docs | N | KEEP |
| `docs/architecture/threat-radar.md` | Threat radar concept. | Architecture | R | N | Strategy docs | Future reasoning docs | N | KEEP |
| `docs/architecture/verified-event-catalog-implementation.md` | Verified event catalog implementation. | Architecture | R | N | Event impact docs | Future reasoning docs | N | KEEP |
| `docs/operations/artifact-standardization-v1.md` | Artifact standardization operation. | Operations | R | N | Artifact docs | Repository docs | N | KEEP |
| `docs/operations/capital-flow-schema-adaptation-v2.md` | Capital flow schema adaptation. | Operations | R | N | ETF/capital flow | Governance docs | N | KEEP |
| `docs/operations/cmc-data-api-direct-test-v1.md` | CMC API direct test. | Operations | R | N | Data source docs | Governance docs | N | KEEP |
| `docs/operations/data-health-engine-v1.md` | Data health engine operation. | Operations | R | N | Source governance | Coverage/projection docs | N | KEEP |
| `docs/operations/deployable-data-snapshot-v1.md` | Deployable snapshot operation. | Operations | R | N | Data snapshots | Repository docs | N | KEEP |
| `docs/operations/etf-snapshot-v1.md` | ETF snapshot operation. | Operations | R | N | ETF docs | Context wiring | N | KEEP |
| `docs/operations/eth-coverage-expansion-v1.md` | ETH coverage expansion. | Operations | R | N | Research coverage | Repository coverage future | N | KEEP |
| `docs/operations/exchange-flow-adapter-v1.md` | Exchange flow adapter. | Operations | R | N | CMC docs | Exchange flow integration | Y | KEEP |
| `docs/operations/exchange-flow-integration-v1.md` | Exchange flow integration. | Operations | R | N | Exchange flow adapter | Governance docs | N | KEEP |
| `docs/operations/exchange-flow-snapshot-v1.md` | Exchange flow snapshot. | Operations | R | N | Exchange flow adapter | Governance docs | N | KEEP |
| `docs/operations/exchange-reserve-delta-engine-v1.md` | Reserve delta engine. | Operations | R | N | Reserve docs | Reserve envelope certification | N | KEEP |
| `docs/operations/exchange-reserve-engine-v1.md` | Reserve engine. | Operations | R | N | Reserve docs | Reserve envelope certification | N | KEEP |
| `docs/operations/flow-replay-multi-window-validation-v1.md` | Flow replay validation. | Operations | R | N | Flow replay | Repository Replay Mode | N | KEEP |
| `docs/operations/historical-snapshot-retention-v1.md` | Snapshot retention policy. | Operations | R | N | Data snapshots | Repository docs | N | KEEP |
| `docs/operations/intelligence-smoke-tests.md` | Intelligence smoke tests. | Operations | R | N | Intelligence docs | Future validation docs | N | KEEP |
| `docs/operations/liquidation-intelligence-v1.md` | Liquidation intelligence operation. | Operations | R | N | Liquidation docs | Historical liquidation backfill | N | KEEP |
| `docs/operations/market-driver-engine-v1.md` | Market driver engine. | Operations | R | N | Market driver docs | Evidence Packet future reasoning | N | KEEP |
| `docs/operations/market-driver-evidence-integration-v2.md` | Market driver integration v2. | Operations | D | N | Market driver engine | v3 integration | N | ARCHIVE |
| `docs/operations/market-driver-evidence-integration-v3.md` | Market driver integration v3. | Operations | R | N | Market driver engine | Evidence Packet future reasoning | N | KEEP |
| `docs/operations/orderbook-backfill-v1.md` | Orderbook backfill operation. | Operations | R | N | ADR-002 | Replay cache builder investigation | N | KEEP |
| `docs/operations/orderbook-quality-audit-v1.md` | Orderbook quality audit. | Operations | R | N | Orderbook backfill | ADR-002/investigation | N | KEEP |
| `docs/operations/replay-cache-v2-poc.md` | Replay cache v2 POC. | Operations | R | N | Replay cache schema | Repository Replay Mode | N | KEEP |
| `docs/operations/replay-coverage-audit-v1.md` | Replay coverage audit. | Operations | R | N | Replay docs | Repository coverage docs | N | KEEP |
| `docs/operations/replay-initialization-discovery-v1.md` | Replay initialization discovery. | Operations | R | N | Replay docs | Repository Replay Mode | N | KEEP |
| `docs/operations/research-coverage-audit.md` | Research coverage audit. | Operations | R | N | Research docs | Research repository migration | N | KEEP |
| `docs/operations/reserve-intelligence-layer-v1.md` | Reserve intelligence layer. | Operations | R | N | Reserve docs | Reserve envelope certification | N | KEEP |
| `docs/operations/treasury-integration-v1.md` | Treasury integration. | Operations | R | N | Treasury docs | Governance docs | N | KEEP |
| `docs/operations/treasury-snapshot-v1.md` | Treasury snapshot. | Operations | R | N | Treasury docs | Governance docs | N | KEEP |
| `docs/operations/valley-dashboard-integration-v1.md` | Dashboard integration operation. | Operations | A | N | Dashboard docs | Current Dashboard state | N | ARCHIVE |

## Asset Inventory

| Asset | Purpose | Status | Canonical? | Dependencies | Superseded by | Referenced? | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/project/dashboard-v2-desktop.png` | Dashboard v2 desktop visual reference. | Asset | N | Dashboard design docs | Current UI | N | KEEP |
| `docs/project/dashboard-v2-mobile.png` | Dashboard v2 mobile visual reference. | Asset | N | Dashboard design docs | Current UI | N | KEEP |
| `docs/project/dashboard-v2-tablet.png` | Dashboard v2 tablet visual reference. | Asset | N | Dashboard design docs | Current UI | N | KEEP |
| `docs/project/markets-v1.png` | Markets visual reference. | Asset | N | Markets docs | Current UI | N | ARCHIVE |
| `docs/project/replay-v1.png` | Replay visual reference. | Asset | N | Replay docs | Current UI | N | ARCHIVE |
| `docs/project/research-v1.png` | Research visual reference. | Asset | N | Research docs | Current UI | N | ARCHIVE |
| `docs/project/scanner-v1.png` | Scanner visual reference. | Asset | N | Scanner docs | Current UI | N | ARCHIVE |
| `docs/project/settings-v1.png` | Settings visual reference. | Asset | N | Product mockup pack | Current UI | N | ARCHIVE |
| `docs/project/trade-v1.png` | Trade visual reference. | Asset | N | Trade docs | Current UI | N | ARCHIVE |
| `docs/ui/replay-reference.png` | Replay external visual reference. | Asset | N | Replay docs | Current UI | N | KEEP |

## Top-Level Documentation Recommendations

Do not create these in this sprint. Recommended future hierarchy:

```text
docs/project/MASTER_PLAN.md
  -> current milestone, accepted scope, next sprint sequence

docs/project/MASTER_ARCHITECTURE.md
  -> system graph, ownership boundaries, canonical docs index

docs/project/MASTER_PRODUCT.md
  -> page responsibilities, product language, user journeys, UI state

docs/project/MASTER_ROADMAP.md
  -> v0.8-data-foundation -> automation -> reasoning roadmap

docs/project/DATA_FOUNDATION_STATUS.md
  -> dataset freshness, coverage, projections, recent gap sync status

docs/project/AUTOMATION_ENTRY_CRITERIA.md
  -> before cron/workers/automation execute unattended

docs/project/REASONING_ENTRY_CRITERIA.md
  -> before Evidence Packet consumption by AI/reasoning layers
```

## Readiness Decision

**DOCUMENTATION INVENTORY COMPLETE.**

The project has enough canonical material to build `MASTER_PLAN`, but the
current tree is sprint-heavy. The next documentation sprint should create
`MASTER_PLAN.md` and `MASTER_ARCHITECTURE.md` as index-and-synthesis documents
without deleting or rewriting the underlying sprint records.
