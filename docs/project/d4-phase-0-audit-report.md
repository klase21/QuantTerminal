# D4 V1 Phase 0 Audit Report

## Current Understanding

D4 begins after certified D2 persistence and D3 orchestration. It consumes published/eligible D2 fact versions and governed D3 outcomes, adds deterministic Consistency Results, assembles immutable consumer-neutral Evidence Packets, and hands eligible versions to later publication/projection. It does not alter facts, infer actions, or connect consumers in Phase 0.

## Baseline Verification

- Branch: epic/d2-canonical-persistence
- HEAD: a7fc797255f1cfef11f058c0bdb5740da2bfa396
- D2 tag: d2-canonical-persistence-v2.1 at 1cb1c8d
- D3 runtime tag: d3-population-runtime-v1 at 4bf6f5d
- D3 certification tag: d3-population-certified-v1 at current HEAD
- Initial working tree: clean
- Database/provider/AI execution: none

## Existing Consistency Inventory

Current consistency is fragmented among D1 publication Boolean input, D1 proposed policies, D3 Candidate validation/quality and Watermark decisions, evidence-validity checks, model calibration, and local page heuristics. There is no canonical Result identity, ordered exact input set, temporal policy, or reusable runtime.

## Existing Evidence Inventory

The protected lib/evidence packet is a coverage summary built from Research Repository projections. It lacks durable identity/version, exact D2 fact references, support/conflict references, knowledge cutoff, and canonical lineage. Its numeric confidence is projection metadata and cannot become D4 confidence.

Dashboard, Replay, Research, Markets, Scanner, and Trade reconstruct different evidence views locally. R1-R6 adapters generally fail unsupported reasoning and confidence closed. Research preserves the strongest structured contradiction identities; other consumers frequently have only source-level provenance.

## Existing Architecture Gaps

The blocking gaps are durable Evidence identity, exact version references, correction semantics, knowledge-time, support/conflict/missing/inapplicable categories, component confidence, and lineage. This audit resolves them architecturally for Phase 1.

## Consistency Domain Model

A versioned Rule evaluates declared roles; a Run binds a Rule Set, policy, subject/window, knowledge cutoff, and ordered immutable inputs; each append-only Result binds one Rule and input set. Policy, not consumer code, assigns blocking/advisory effect. Result names remain proposed pending Phase 1 vocabulary reconciliation.

## Consistency Rule Model

Rules declare category, semantic class, applicability, input roles, alignment method, diagnostic schema, and immutable policy. No thresholds exist in Phase 0. Cross-dataset Rules may describe coexistence or bounded hypothesis compatibility but never causation.

## Consistency Run and Result Model

~~~mermaid
flowchart LR
  F["Fact Versions"] --> R["Consistency Run"]
  S["Rule Set + Policy"] --> R
  R --> X1["Result A"]
  R --> X2["Result B"]
  X1 --> E["Evidence Candidate"]
  X2 --> E
~~~

Retries reuse deterministic work identity; Results are append-only. Corrections produce new Runs/Results.

## Temporal Alignment

Supported governed methods are exact match, containment, nearest-prior, nearest-observation where future knowledge is permitted, overlap, as-of, and event-to-window. All need explicit gap/tie/boundary policy. Historical mode applies knowledge cutoff before alignment and forbids lookahead.

## Resolution Compatibility

Resampling is not automatic. Interpolation is initially prohibited. Forward-fill and aggregation require dataset policy. Event data remains irregular; missing intervals remain missing; derived windows reference exact input versions.

## Cross-provider Consistency

Disagreement preserves every provider/version/value and diagnostic. Tier governs eligibility, not truth. Tolerance comes only from policy. No ungoverned consensus number.

## Cross-dataset Consistency

Factual, directional, structural, contextual, and hypothesis consistency are distinct. Co-occurrence is not causation, and no Rule may emit caused-by language.

## Correction and Supersession

Fact V1 and Evidence V1 remain immutable when Fact V2 arrives. D4 creates new Results and Candidate/Packet V2. Packet V1 becomes superseded only through publication state, remains queryable, and retains original lineage.

## Evidence Candidate

A Candidate is a deterministic unpublished assembly proposal with exact facts, Results, evaluations, conflicts, missing requirements, Profile/policy/schema bindings, event window, and knowledge cutoff. Eligibility fails closed.

## Evidence Packet

A Packet is an immutable structured version with stable identity, exact fact and Result references, support/conflict/missing/unsupported/inapplicable categories, separate evaluation summaries, explanation codes, lineage, policy/schema, supersession, and publication state. It contains no action or primary free-form narrative.

## Evidence Identity and Versioning

Business identity uses ordered Profile, subject, bounded event window, optional scenario/hypothesis, and knowledge mode dimensions. Input/policy/Profile changes create versions; scope changes create identities. Prose is excluded. Duplicate and immutable conflict remain distinct.

## Evidence Profiles

Profiles are governed recipes. Recommended initial candidates are consumer-neutral Market State, Market Move Context, Replay Event Context, Sector Context, and Macro/ETF Context. Scanner/Trade consume projections initially. No Profile is approved merely by this audit.

## Supporting, Conflicting, Missing, and Inapplicable Evidence

All are distinct. Unsupported is also explicit. Missing is not absence, unavailable is not zero, and conflicts cannot be omitted.

## Confidence Components

Availability, coverage, freshness, quality, consistency, diversity, conflict burden, policy completeness, and model certainty remain separate. No weights/thresholds or aggregate are approved. Provider Tier and prediction probability remain separate.

## Hypothesis and Interpretation Boundary

~~~text
Fact -> Consistency Result -> Evidence -> Interpretation -> Hypothesis
~~~

Hypotheses use bounded statement codes and Packet references, not fact tables. They remain uncertain and cannot become investment actions.

## Explanation Model

~~~mermaid
flowchart TD
  C["Conclusion Code"] --> R["Reason Codes"]
  R --> E["Supporting + Conflicting Evidence"]
  E --> F["Fact Versions"]
  F --> S["Raw Sources"]
~~~

Missing inputs and alternatives are peer branches. UI order is a projection.

## Evidence Lineage

Raw Artifact to Fact remains D2-owned; D4 adds Fact-to-Result, Result/Fact-to-Packet, and Packet-to-projection edges. Exact versions are mandatory. Lineage and supersession remain separate DAG relations.

## Event-time and Knowledge-time

Event time states what happened; knowledge time states what was knowable. Proposed modes are AS_KNOWN_THEN, LATEST_CORRECTED, and RETROSPECTIVE, pending Phase 1 vocabulary review. Replay must select explicitly and prohibit future knowledge leakage.

## Recompute and Invalidation

New/corrected/revoked facts, evaluation changes, freshness, policy, Profile, and publication policy create durable recompute/invalidation requests. History is never deleted. Current projections may become stale or withdrawn.

## Publication Interaction

Population is not publication; assembly is not publication. Packet eligibility precedes append-only decision and consumer projection. Conflicts/revocations can hold or withdraw publication without deleting facts or packets.

## Consumer-neutral versus Consumer-specific Models

Option A (packet per consumer) maximizes duplication and drift. Option B (one core packet plus projections) maximizes consistency and is simplest. Option C (hierarchical packets) scales domains but adds version complexity. Recommend Option B initially, retaining Option C as a future extension.

## AI/LLM Boundary

AI may render or translate structured Packet content later. It cannot create facts, change classifications/Results/confidence/lineage, hide conflict, or select favorable evidence. Generated text binds Packet/version, input checksum, model, renderer/prompt, time, and output checksum.

## Persistence Boundary

Phase 1 should blueprint additive consistency, evidence, and projection tables. Immutable histories and references are append-only; only controlled current-state and queue/read-model projections are mutable. D2/D3 tables and migrations remain untouched.

## Runtime Boundary

Consistency Worker, Evidence Assembler, Publication Coordinator, and Projection Builder are separate. Shared components and consumers never execute Rules or assemble packets.

## Deployment Boundary

Heavy consistency, historical rebuild, lineage traversal, correction fan-out, and explanation generation run outside Vercel. Vercel may serve bounded reads/status and small commands. Infrastructure selection is deferred.

## Security and Roles

Least-privilege roles separate fact reads, Result writes, Packet writes, publication decisions, published reads, and migration ownership. No runtime role deletes audit history.

## Observability

Runs, Results, assembly runs, Candidates, Packets, recompute/invalidation, publication handoffs, and projection refreshes are durable. Metrics are defined without thresholds.

## Alternatives

| Option | Correctness | Cost/complexity | Reuse | Decision |
|---|---|---|---|---|
| Rule-first pipeline | Strong global checks | High unnecessary recomputation | High | Not initial |
| Profile-first | Efficient | Duplicate checks and drift | Medium | Not initial |
| Hybrid dependency graph | Strong bounded checks | Moderate scheduler complexity | Highest | Recommended |

The hybrid uses Profiles to declare dependencies, schedules only needed Rules, and reuses immutable Results.

## Recommended Architecture

~~~mermaid
flowchart LR
  D2["D2 Published Fact Versions"] --> G["Hybrid Dependency Graph"]
  D3["D3 Governed Outcomes"] --> G
  G --> C["Consistency Runs / Results"]
  C --> A["Evidence Candidate"]
  D2 --> A
  A --> P["Immutable Core Packet"]
  P --> U["Publication Decision"]
  U --> V["Consumer Projections"]
~~~

## D4 Roadmap

1. Phase 1: contracts, identity algorithms, SQL blueprint, static tests.
2. Phase 2: isolated Consistency Runtime.
3. Phase 3: isolated Evidence Assembly Runtime.
4. Phase 4: publication and projection runtime.
5. Phase V: live isolated PostgreSQL certification across Phases 2-4.
6. Phase 5: one limited read-only consumer pilot after certification.

This ordering keeps certification before consumer migration.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Legacy packet mistaken for canonical D4 | Critical | Additive naming/contracts; explicit deprecation plan |
| Lookahead in Replay | Critical | Knowledge cutoff before alignment |
| Consumer heuristics promoted to facts | High | Profile eligibility and exact D2 references |
| Opaque confidence returns | High | Components only; no aggregate Phase 1 |
| Correction fan-out cost | High | Dependency graph and durable recompute |
| Result/Profile vocabulary drift | Medium | Phase 1 closed vocabulary reconciliation |
| Free-tier resource limits | Medium | External bounded Workers and reusable Results |

## Blockers

No Phase 1 architecture blocker remains. Implementation remains blocked until Phase 1 fixes closed contracts for Result vocabulary, identity serialization, Profile approval state, knowledge modes, and SQL atomicity.

## Exact Proposed File Scope

Phase 0 changed only:

- docs/architecture/consistency-evidence-audit.md
- docs/architecture/consistency-domain-model.md
- docs/architecture/evidence-domain-model.md
- docs/architecture/evidence-lineage-and-versioning.md
- docs/architecture/evidence-confidence-and-explanation.md
- docs/architecture/evidence-deployment-boundary.md
- docs/project/d4-phase-0-audit-report.md

Phase 1 should be limited to new lib/data-platform/consistency and lib/data-platform/evidence contracts, new unapplied D4 SQL blueprint/migrations in a D4-owned path, bounded D4 tests, D4 architecture updates, and a new ADR. Existing Evidence/Projection runtimes and D2/D3 files remain protected.

## D4 Phase 1 Recommendation

Proceed with contracts and unapplied SQL blueprint using the hybrid dependency graph and Core Packet plus projection model. Preserve the legacy packet unchanged. Approve no thresholds, live runtime, consumer imports, or AI inference.

## Final Gate

SAFE TO IMPLEMENT D4 PHASE 1 WITH LIMITATIONS
