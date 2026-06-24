# QuantTerminal Project Roadmap

Status: Operating roadmap  
Scope: Current state through Sprint 52+  

## Current State

QuantTerminal has moved from a data display toward an intelligence product. The
strongest foundations are:

- ETF evidence
- Funding evidence
- Open Interest evidence
- Liquidation evidence
- Exchange Flow
- Treasury
- Exchange Reserve
- Reserve Delta
- Reserve Intelligence
- Historical Snapshot Retention
- Data Health
- Deployable Snapshots

Current weakness:

- Product design consistency
- Review standards
- Decision history
- Contributor alignment

## Completed Sprints: 39-51

| Sprint | Outcome |
| --- | --- |
| 39 | Expanded Market Driver evidence integration |
| 40 | Dashboard conclusion-first integration |
| 41 | Added liquidation, exchange flow, and treasury driver coverage |
| 42 | Created deployable intelligence snapshots |
| 43 | Standardized artifact metadata, partitions, and index strategy |
| 44 | Added Data Health Engine |
| 45 | Integrated real-source exchange flow and treasury paths |
| 46 | Adapted capital-flow schemas to real CMC data shapes |
| 47 | Added Binance Exchange Reserve snapshots |
| 48 | Added Exchange Reserve Delta engine |
| 49 | Added Historical Snapshot Retention |
| 50 | Added Reserve Intelligence observations |
| 51 | Added Dashboard Intelligence V2 presentation layer |

## Sprint 52+

Recommended next sprint:

```text
Sprint 52 - Product Consistency Hardening
```

Goals:

- Apply this operating system to active review.
- Audit Dashboard, Markets, Research, Replay, Scanner, and Trade against `REVIEW_RUBRIC.md`.
- Fix only high-confidence regressions.
- Keep runtime code changes minimal.

Deliverables:

- Page review report.
- Prioritized defect list.
- Acceptance results per fixed item.

Risks:

- Over-redesigning pages instead of enforcing hierarchy.
- Treating stale evidence as current.

Success metrics:

- Dashboard 5-second score improves.
- No false `NO DATA` states for valid evidence.
- TypeScript and relevant audits pass.

## Phase 1: Data Collection

Goals:

- Expand real-source coverage.
- Preserve raw/source separation.
- Improve repeatability of ingestion commands.

Deliverables:

- Verified source adapters.
- Coverage audits.
- Clear rejection reasons.

Risks:

- Fragile public endpoints.
- Incomplete schemas.
- Credential and environment drift.

Success metrics:

- Coverage increases for primary assets.
- No synthetic fallback values.
- Raw scan remains clean.

## Phase 2: Data Standardization

Goals:

- Keep all deployable and durable artifacts compact, partitionable, and health-checked.
- Make artifact contracts migration-ready.

Deliverables:

- Standard metadata.
- Artifact index consistency.
- Size and hash validation.

Risks:

- Oversized deployable snapshots.
- Product consumers depending on source-specific formats.

Success metrics:

- Deployable snapshot audit passes.
- Data Health reports no invalid artifacts.

## Phase 3: Intelligence Layer

Goals:

- Convert observations into deterministic intelligence artifacts.
- Keep predictions and recommendations out unless explicitly designed.

Deliverables:

- Market Driver refinements.
- Reserve intelligence maturity.
- Historical and event evidence integration.

Risks:

- Implicit bullish/bearish inference from observation-only data.
- Recomputing history in request paths.

Success metrics:

- Intelligence artifacts are evidence-backed.
- Missing data remains explicit.

## Phase 4: User Experience

Goals:

- Make product surfaces consistent with Conclusion -> Reason -> Evidence.
- Reduce cognitive load.

Deliverables:

- Page-level hierarchy audits.
- State-language consistency.
- Drill-down paths from summary to evidence.

Risks:

- Adding panels without improving decisions.
- Long narratives replacing concise intelligence.

Success metrics:

- Review rubric scores improve.
- Users can identify conclusion, reason, and evidence quickly.

## Phase 5: Agent Layer

Goals:

- Make future AI contributors consistent and safe.
- Prepare agent workflows for review, diagnosis, and operations.

Deliverables:

- Operating-system docs.
- Acceptance templates.
- Review rubrics.
- Decision register.

Risks:

- Agents bypassing architecture decisions.
- Inconsistent validation reporting.

Success metrics:

- Future changes cite acceptance criteria.
- Documentation and validation stay aligned.
- Cross-agent handoffs require less rediscovery.
