# Population to D2 Integration

One eligible Candidate produces at most one `CanonicalCommitCommand`. D3 depends on a narrow `CanonicalCommitPort` and never writes canonical SQL.

| D2 result | Population outcome | Watermark treatment |
|---|---|---|
| `SUCCESS` | `COMMITTED`, with Commit and record/version references | May be eligible |
| `DUPLICATE` | Idempotent `DUPLICATE`; no new commit | May be eligible |
| `CONFLICT` | Durable `CONFLICT` with quarantine references | Blocked conflict |
| `REJECTED` | Permanent/policy failure with supplied reasons | Blocked unless a future policy explicitly classifies non-applicability |
| `RETRYABLE_FAILURE` | Candidate retained and policy retry scheduled | Blocked retry |

Unknown transaction outcomes are reconciled through D2 identity/idempotency before retry. A rolled-back or unresolved commit cannot produce an eligible watermark decision.

Normalization is selected from a bounded registry and receives typed Candidate plus immutable dataset, provider, certification, policy, schema, normalization, and raw-manifest bindings. It is pure and side-effect free. Phase 1 defines the interface but implements no dataset normalizers.
