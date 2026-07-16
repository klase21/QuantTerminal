# MVP Bounded Funding Refresh

Status: locally certified with source fixtures and the isolated refresh PostgreSQL control plane. The primary interval was not source-finalized at certification time, so no live acquisition or canonical truth mutation occurred.

## Provider decision

The selected source is Binance USD-M Futures official REST `fundingRate`, identified internally as `binance-official-rest-funding-rate`. It requires no credential and accepts explicit symbol, start, end, and limit parameters. The adapter preserves each provider `fundingTime` and decimal `fundingRate` exactly as returned.

The Binance Vision monthly archive and `runD3FundingBackfill.ts` remain historical compatibility paths. They are rejected for incremental use because they are coupled to broad partitions and operational progress snapshots. Funding resume, status, reconcile, and the compatibility runner are neither imported nor invoked by the bounded module.

## Existing source audit

| File / symbol | Provider and source | Bounded/native behavior | Reuse decision |
| --- | --- | --- | --- |
| `lib/historical-backfill/fundingSources.ts` / source registry | Binance Vision, Binance official REST, Coinalyze | Classifies source authority and approval | Reuse official REST provider identity |
| `lib/historical-backfill/fundingRecentGapBackfill.ts` / `runBinanceRestFundingRecentGap` | Binance official REST API | Explicit interval and native timestamp parsing, but owns persistence and slot assumptions | Reuse endpoint semantics only |
| `lib/historical-backfill/funding.ts` | Binance Vision monthly ZIP | Native archive rows in broad monthly partitions | Reject for one-day incremental execution |
| `lib/data-platform/population/backfill/fundingExecution.ts` | archive plus recent-gap orchestration | Integrates compatibility snapshots and historical partitions | Reject for bounded worker |
| `workers/data-platform/runD3FundingBackfill.ts` | legacy compatibility command | Resume/status/reconcile and progress snapshot behavior | Protected; never called |
| `lib/data-platform/population/backfill/normalizers.ts` / `ProductionNormalizerRegistry` | canonical Funding normalizer | Deterministic Fact identity and immutable commit command | Reused unchanged |
| `lib/data-platform/population/contracts.ts` / artifact and commit ports | provider-neutral persistence | Immutable artifact and append-only canonical boundaries | Reused through injected ports |

## Contract

`BoundedFundingRefreshRequest` requires one of the six canonical symbols, an exact UTC start/end pair, the official provider identity, a source-contract version, an optional event ceiling, and a request time. The interval must be positive, no longer than one day, fully closed, and at least two hours finalized. There is no unbounded default.

`BoundedFundingRefreshResult` records deterministic request/retrieval/artifact/Candidate identities, commit results, observed/finalized watermarks, native event count, duplicate/conflict/malformed counts, Coverage, limitations, checksum, and a classified status.

## Native events and lineage

The parser accepts only finite decimal strings and provider-native millisecond timestamps inside the requested half-open interval. It sorts canonically without shifting timestamps. It does not enforce an event count or cadence, interpolate, forward-fill, synthesize events, or turn absence into zero.

Exact response bytes receive a SHA-256 digest and immutable object identity. The refresh artifact retains the raw identity, retrieval identity, provider, instrument, interval, source-contract version, byte count, and digest. It excludes credentials and physical paths.

One native event produces one deterministic Funding Candidate, which passes through `ProductionNormalizerRegistry`. The existing canonical Funding contract retains the certified eight-hour interval metadata while the actual event timestamp/rate remain provider-native. Exact canonical duplicates are classified `DUPLICATE`; immutable conflicts fail closed.

## Control plane

The unit key is provider x instrument x interval x Funding. A fenced worker follows `PENDING -> LEASED -> ACQUIRED -> NORMALIZED -> COMMITTED -> VALIDATED -> COMPLETE`. It validates its fence before retrieval and before each canonical commit. Artifact, checkpoints, availability observation, and source watermark are persisted in `quantterminal_mvp_refresh_isolated`. A stale worker is rejected before retrieval.

Funding advances its mandatory watermark only when all six instrument results are finalized, checksum-valid, conflict-free, validation-passing, and `CREATED` or `DUPLICATE`. Any missing or blocked instrument yields no Funding common watermark.

## Command surface

`workers/data-platform/runMvpFundingRefresh.ts` provides `inspect`, `plan`, `preflight`, `acquire`, `normalize`, `commit`, `verify`, `run`, `resume`, and `status`. Every command requires `--provider`, `--instrument`, `--start`, and `--end`. Acquisition/commit commands fail closed until certified artifact and canonical runtime ports are supplied; they never fall through to the legacy runner.

## Certification

Fixture certification covered all six instruments with three native events per fixture, including positive, negative, and actual-zero rates. PostgreSQL integration persisted one duplicate-safe Funding unit through `COMPLETE`, including one artifact, one availability observation, and one watermark. Lease recovery invalidated a stale worker before fetch. Production, Neon, Vercel, historical Facts, and operational progress files were unchanged.
