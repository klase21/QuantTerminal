# MVP Target-Window Unit Reconciliation

Status: deterministic planner implemented; live resume blocked by conflicting committed audit evidence.

## Logical slot

A mandatory slot is independent of refresh run identity. Its deterministic identity hashes provider, dataset, canonical instrument, exact UTC start and end, and source contract version. The target cycle always resolves exactly 24 slots: six each for OHLCV, Open Interest, Funding, and AggTrades.

Attempts remain append-only historical records. Resolution is derived from those records, so reconciliation does not update or delete a unit. A verified committed slot is selected by earliest recorded `COMMITTED` transition, then unit ID. Other equivalent attempts and any superseded nonterminal attempt remain preserved and are ignored by future planning.

## Resolution rules

- `EQUIVALENT_COMMITTED_ATTEMPTS`: canonical output evidence, artifact evidence, interval, and source contract agree. Reuse one deterministic authoritative unit.
- `CONFLICTING_COMMITTED_ATTEMPTS`: any immutable output, artifact, or contract evidence conflicts. Fail closed.
- `INCOMPLETE_AUDIT_DATA`: committed state exists without enough evidence to prove equivalence. Fail closed.
- `RECOVERABLE_ACQUIRED`: checkpoint and artifact evidence exist and an active fencing lease remains valid.
- `ORPHANED_ACQUIRED`: required evidence or active fencing lease is absent.
- `SUPERSEDED_BY_COMMITTED_LOGICAL_SLOT`: an equivalent committed resolution wins over a nonterminal attempt.
- `CONTROL_PLANE_CONFLICT`: a nonterminal attempt shares a slot whose committed attempts conflict.

The dry-run planner resolves every logical slot before producing any unit input. A conflict prevents unit creation for the entire plan. In a verified clean case it returns one `REUSE_COMMITTED` outcome and 23 `CREATE_NEW_ON_LIVE_RESUME` outcomes; the creation helper emits only those 23 missing unit inputs. Run identity remains part of the physical unit identity but not the logical slot identity.

## Target audit

The target window contains five OHLCV/BTCUSDT attempts across separate runs. Four are `COMMITTED`; their recorded `factDigest` values are all different. None has a persisted artifact record or source contract version. The fifth attempt is `ACQUIRED`, has only an artifact-checksum checkpoint, and has no artifact row or active lease.

The committed attempts are therefore `CONFLICTING_COMMITTED_ATTEMPTS`, with mismatches `CANONICAL_OUTPUT` and `SOURCE_CONTRACT_VERSION`. No authoritative BTCUSDT unit is selected. The acquired attempt is `CONTROL_PLANE_CONFLICT` and remains fenced from resume. The other 23 slots are missing, but they cannot be created until the BTCUSDT conflict is resolved with authoritative read-only canonical evidence.

No unit, event, artifact, lease, canonical Fact, serving corpus, candidate, manifest, or exposure row was written during this reconciliation. The local serving baseline remains one published corpus, zero inactive corpora, and one active exposure.

## Resume boundary

The next entry point is a read-only canonical-output audit for the four committed unit IDs. It must establish the exact canonical identities/checksums and source contract evidence. If all four resolve to the same immutable output, rerun `workers/data-platform/runMvpRefreshReconciliation.ts`; only a `1 REUSE_COMMITTED + 23 CREATE_NEW_ON_LIVE_RESUME + 0 BLOCKED_CONFLICT` result permits live MVP-8A.2B resume.
