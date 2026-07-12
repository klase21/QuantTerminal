# SQLite to PostgreSQL Semantic Parity

## Boundary

SQLite remains unchanged. Phase 1 defines mapping and certification only; no record is read, migrated, dual-written, or deleted.

## Legacy Mapping

| Legacy record kind | Classification | Target |
|---|---|---|
| `HISTORICAL_MARKET` | Typed fact candidate | `canonical.ohlcv` plus envelope/version |
| `HISTORICAL_FUNDING` | Typed fact candidate | `canonical.funding` plus envelope/version |
| `HISTORICAL_OPEN_INTEREST` | Typed fact candidate | `canonical.open_interest` plus envelope/version |
| `HISTORICAL_LIQUIDATION` | Typed fact candidate | `canonical.liquidations` plus envelope/version |
| `HISTORICAL_AGG_TRADE` | Stream-manifest candidate only after object archival | Otherwise quarantine/unsupported |
| Provider/dataset metadata | Registry or migration-source candidate | Immutable snapshots after canonical verification |
| Coverage projection | Projection candidate | Coverage/projection version after watermark verification |
| Runtime/knowledge records | Unsupported in D2 typed market facts | Remain protected generic Repository records |
| Operational records | D3 migration source | No D2 canonical fact promotion |

Every source row is classified as typed fact candidate, envelope candidate, unsupported candidate, conflict candidate, or quarantine. Classification never fabricates missing lineage, publication state, provider certification, or raw-object identity.

## Certification Dimensions

Parity compares semantic domain values, business identity, Canonical Record ID, record version, checksum, timestamps, publication state, pagination, and bounded Replay results. Counts are supporting diagnostics only.

Expected schema transformation is documented separately from semantic equality. Invalid source rows and checksum conflicts are excluded from success counts and reported as quarantine outcomes. A PostgreSQL record cannot pass parity without exact immutable snapshot bindings.

## Import Sequence

```text
Freeze source snapshot
  -> canonical reserialization
  -> identity and checksum verification
  -> candidate classification
  -> PostgreSQL staging
  -> constraint validation
  -> typed fact/envelope reconciliation
  -> shadow bounded reads
  -> semantic parity certification
```

Legacy rows do not imply historical Canonical Commits. A later governed import creates one deterministic import commit per accepted record version. Dual write remains prohibited.

## Pagination and Replay

SQLite row cursors and generic PostgreSQL record-ID cursors are physically different. Certification compares stable bounded result semantics and continuation completeness, not cursor text. Replay parity compares ordered facts, source metadata, time bounds, truncation behavior, and coverage-gate outcomes.

## Fail-Closed Outcomes

- Missing checksum or unverifiable canonical serialization: quarantine.
- Same identity/version and same checksum: duplicate.
- Same identity/version and different checksum: conflict and quarantine.
- Missing immutable governance snapshot: rejected from canonical import.
- Unsupported record kind: retained in the legacy Repository, not coerced.
