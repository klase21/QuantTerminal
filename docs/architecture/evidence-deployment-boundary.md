# Evidence Deployment Boundary

## Services

| Role | Responsibility | Prohibited |
|---|---|---|
| Consistency Worker | Read eligible facts; write Runs/Results/events | Fact updates, Packet publication |
| Evidence Assembler | Read facts/Results/coverage/quality; write Candidates/Packets | Fact normalization, Result rewrite |
| Publication Coordinator | Append Packet decisions/handoffs/outbox | Packet content mutation |
| Projection Builder | Build replaceable consumer read models | Reinterpreting Packet truth |
| Read-only Consumer | Read published projections | Internal writes |
| Migration Owner | Schema changes | Runtime work |

Runtime roles receive least privilege and no arbitrary history deletion.

## Execution

Recommended execution is hybrid: event-driven requests, dependency-graph scheduling, bounded recovery batches, and idempotent leased external Workers.

Vercel request paths may perform bounded Packet/status reads and small authorized commands. Historical rebuild, correction fan-out, cross-dataset batch processing, large lineage traversal, conflict reconciliation, and model-based explanation generation run externally.

No production vendor is selected. A free-tier-compatible PostgreSQL outbox/queue plus external Worker is the initial portability target.

## Failure and Observability

Unknown bindings fail closed; missing inputs become blocked Results/Candidates; retries reuse deterministic identity; immutable conflicts quarantine; partial work is not published; stale leases cannot commit.

Durable records include Consistency Run/Result, Assembly Run, Candidate, Packet, recompute request, invalidation event, publication handoff, and projection refresh. Logs are not truth.

Metrics include latency, blocked inputs, inconsistency rate, conflicts, missing requirements, stale packets, recompute lag, publication lag, and projection lag. Phase 0 sets no thresholds.
