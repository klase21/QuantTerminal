# MVP downstream lineage and transaction boundaries

Status: authenticated rollback-only certification complete.

## Scope

The certified path begins with a persisted D3 Candidate and ends with an inactive candidate manifest:

`Candidate -> Canonical Fact -> Coverage -> Consistency -> Evidence -> Projection -> Replay -> Dataset Watermark -> Common Watermark -> Candidate Manifest`

The certification does not run the live 23-unit resume and does not modify live units, leases, source artifacts, canonical truth, watermarks, Replay output, serving exposure, or Production systems.

## Physical ownership

| Stage | Physical owner | Local parent | External lineage |
| --- | --- | --- | --- |
| Persisted Candidate | integrated D3 population role | Retrieval Attempt and Raw Object lineage in the integrated durable topology | refresh unit and source contract identities |
| Canonical Fact | integrated D2 canonical role | D2 governance and canonical repository rows | D3 Candidate identity and checksum |
| Coverage | isolated D4 | bounded coverage identity | D2 Fact identities and checksums |
| Consistency | isolated D4 | Coverage | none |
| Evidence | isolated D4 | Consistency Result | none |
| Projection | isolated D4 | Evidence Packet | none |
| Replay | isolated D4 certification boundary; source observations remain in D2/object storage | Projection | D2 price, OI, Funding, and AggTrades identities/checksums |
| Dataset Watermark | isolated refresh control plane | dataset watermark audit record | validated Replay and six-slot completeness identities/checksums |
| Common Watermark | isolated refresh control plane | four dataset watermark records | none |
| Candidate Manifest | isolated local serving publisher | candidate corpus and immutable membership | common watermark and active baseline identities/checksums |

There is no cross-database foreign key. A database boundary carries an immutable identity and checksum pair. Foreign keys are used only where parent and child share a physical database owner.

## Transactions and resume

Each physical owner commits its own append-only transaction. There is no distributed commit. A stage checkpoint is valid only after its local transaction has committed and its output identity/checksum is attributable. Resume begins at the first missing durable checkpoint. A checksum-matching repeat is `DUPLICATE`; the same identity with different immutable content is `CONFLICT` and stops the pipeline.

The rollback certification opens authenticated transactions for integrated D2, isolated D4, refresh control, and isolated serving. It reads an existing persisted D3 Candidate as the external lineage parent. Disposable local tables enforce parent-before-child ordering within each database, while cross-database edges contain identity/checksum metadata only. The full path is executed twice inside the same transaction set and then deliberately rolled back.

## Failure behavior

Failure injection after Consistency executes Canonical Commit, Coverage, and Consistency only. Evidence, Projection, Replay, both watermark stages, and manifest persistence are not invoked. The outer rollback removes every disposable row. No object-storage write is part of this downstream-only probe.

## Certified result

- First pass: nine `CREATED` outcomes.
- Exact second pass: nine `DUPLICATE` outcomes.
- Injected failure: stopped after Consistency; zero downstream stages executed.
- Cross-database foreign keys: none.
- Retained database rows: zero.
- Retained artifacts: zero.
- Candidate lifecycle contract: `WITHHELD` and `INTERNAL_ONLY`.
