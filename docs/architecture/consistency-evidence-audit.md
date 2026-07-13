# Consistency and Evidence Architecture Audit

## Current Understanding

D2 owns immutable canonical facts, record versions, publication history, and base lineage. D3 owns population orchestration, Candidate validation/quality links, D2 submission outcomes, and Watermark eligibility. D4 must add reusable consistency evaluation and consumer-neutral Evidence assembly without modifying either layer.

Raw Artifact, Canonical Fact, Consistency Result, Evidence Packet, Projection, and Publication Decision remain distinct.

## Existing Consistency Inventory

| Surface | Current owner | Inputs and behavior | D4 treatment |
|---|---|---|---|
| D1 publication gate | lib/data-platform/contracts/publicationGate.ts | Boolean consistencyMatched plus quality/watermark state | Reuse policy intent; replace Boolean with Result references later |
| D1 quality rules | registry/qualityPolicies.ts | Proposed consistency publication rule; no runtime | Reuse governance boundary |
| D2 consistency schema | reserved tables in D2 blueprint/migrations | Generic runs/results; no certified D4 semantics | Additive D4 blueprint required |
| D3 validation/quality | population control plane | Candidate validation, evaluations, D2 outcomes, Watermark eligibility | Protected upstream eligibility evidence |
| Evidence validity | core/evidence-validity | Deterministic validity state for intelligence artifacts | Reuse as protected legacy evaluation; do not equate with D4 consistency |
| Signal quality/calibration | core and lib confidence-calibration | Consumer/model evaluation and historical calibration | Keep separate; not canonical Evidence confidence |
| Market/sector heuristics | API/core/presentation adapters | Local thresholds and model labels | Consumer context; migrate only through governed Rules |

There is no current reusable cross-provider/cross-dataset Consistency Runtime, exact input-set identity, temporal alignment policy, or correction-triggered Result recomputation.

## Existing Evidence Inventory

| Surface | Facts canonical? | Identity/lineage | Conflict handling | Disposition |
|---|---|---|---|---|
| lib/evidence EvidencePacket | Coverage projection summary, not facts | Symbol/day only; no durable packet/version/fact refs | Missing/warnings only | Protected legacy; later adapter or replacement |
| Dashboard adapters | Mixed API/provider envelopes | Presentation IDs; source metadata varies | Reasoning fails closed | Preserve; future Packet projection |
| Replay adapters | Runtime/Repository observations | Some record identity; merged identity can be unavailable | Reasoning fails closed | Preserve; future event/knowledge projection |
| Research adapters | Structured contradiction objects plus aggregates | Best current support for evidence/artifact IDs | Structured conflicts preserved; reasoning unavailable | Preserve and map later |
| Markets adapters | Facts plus model classifications | Source envelopes, not canonical D2 refs | Missing fails closed | Preserve; future market-context projection |
| Scanner adapters | Heuristic priority context | No canonical evidence bundle | Counter evidence/lineage limited | Keep consumer-specific until pilot |
| Trade adapters | Selected Candidate and observations | No durable decision/evidence identity | Counter evidence unavailable | Keep decision projection only |
| Intelligence Artifact Registry | Versioned artifact envelope | Producer metadata; in-memory reference | Supporting evidence but limited exact facts | Reusable concept; not D4 persistence |
| Narrative and historical systems | Derived text/models/cache artifacts | Implementation-specific | Varies; causality risk | Protected; later bounded interpretation refs |

The legacy Packet includes numeric confidence copied from projection rows and collapses availability metadata into a packet-like object. It must not be renamed canonical D4 Evidence.

## Consumer Reconstruction

Current pages independently adapt API responses into evidence-like cards. R1-R6 introduced valuable fail-closed boundaries: unsupported reasoning, record identity, confidence, freshness, regime, and Repository handoffs remain unavailable. These adapters are presentation compatibility layers, not canonical truth.

## Existing Gaps

- no stable Evidence identity or positive version;
- no exact immutable fact-version input set;
- no reusable Consistency Result identity;
- no governed temporal/cadence alignment;
- no event-time versus knowledge-time selection;
- no correction/supersession fan-out;
- no canonical support/conflict/missing/inapplicable taxonomy;
- no reconstructable Packet lineage;
- confidence includes opaque legacy values;
- no consumer-neutral publication/read model.

## Persistence Boundary

D4 Phase 1 should blueprint additive tables only:

- consistency: rule_sets, rules, runs, inputs, results, diagnostics;
- evidence: profiles, assembly_runs, candidates, packet identities, packet_versions, fact/result/support/conflict references, missing requirements, confidence components, explanation codes, recompute/invalidation/publication handoffs;
- projection: Packet-to-consumer read model versions.

Runs, Results, Candidates, Packet versions, references, invalidation, supersession, and decisions are append-only. Current state, queue eligibility, and consumer projections may be controlled materializations. Foreign keys bind D2 records/versions, D3 governed outcomes where applicable, immutable policies, and registries.

No universal JSON fact or Packet payload is recommended. Bounded diagnostic/source metadata may use constrained JSON with versioned schemas. Partitioning waits for measured volume.

## Publication Interaction

~~~mermaid
flowchart LR
  E["Immutable Packet Version"] --> G["Eligibility Evaluation"]
  G --> D["Append-only Publication Decision"]
  D --> P["Published Consumer Projection"]
~~~

Assembly does not imply publication. Conflicts, stale inputs, revoked inputs, and profile requirements remain visible and policy-controlled. Existing D2 publication semantics inform but do not automatically publish derived Evidence.

## Runtime and Deployment Boundary

Consistency and Evidence are separate external Worker responsibilities. A hybrid dependency graph schedules required reusable Results and affected Profiles. Vercel serves bounded published reads/status and does not execute rebuilds.

## Security

Consistency Worker reads eligible facts and writes only D4 Results. Evidence Assembler writes only Evidence artifacts. Publication Coordinator writes decisions/handoffs. Consumers read published projections. Migration Owner alone changes schema.

## Observability

Durable execution and decision records support reconstruction. Metrics cover latency, blocked/inconsistent inputs, conflicts, missing requirements, stale packets, and recompute/publication/projection lag, without invented alert thresholds.

## Active Import Finding

Current consumers import legacy presentation and Evidence surfaces. No D4 runtime exists or is imported. Phase 0 makes no runtime change.

## Recommended Direction

Adopt a hybrid dependency graph with versioned Rules and Profiles, reusable append-only Results, consumer-neutral Core Packets, and bounded consumer projections. Start with a minimal Market State/Move context profile set only after Phase 1 contracts prove identity, lineage, correction, and knowledge-time semantics.
