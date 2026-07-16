# MVP Bounded Market Refresh

Status: bounded adapter foundation complete; target interval awaiting Binance Vision archive finalization.

## Finalization gate

Wall-clock eligibility and source readiness are independent. The state progression is `TIME_NOT_ELIGIBLE -> TIME_ELIGIBLE -> SOURCE_NOT_FINALIZED -> SOURCE_AVAILABLE -> READY_FOR_ACQUISITION`. `READY_FOR_ACQUISITION` requires all six instruments for all mandatory datasets to return the expected non-empty content, match the exact closed UTC interval, parse within the configured record bound, and produce a verified source checksum. Funding readiness is evaluated through its separate provider-native REST contract.

For `[2026-07-15T00:00:00.000Z, 2026-07-16T00:00:00.000Z)`, OHLCV, Open Interest metrics, and AggTrades returned HTTP 404 for all six instruments while the immediately preceding daily archives returned HTTP 200. The truthful aggregate state is `TIME_ELIGIBLE`, `SOURCE_NOT_FINALIZED`, `NOT_READY_FOR_ACQUISITION`. No refresh units or target-day artifacts were created.

## Bounded adapters

`boundedAdapters.ts` accepts only a canonical six-universe instrument, exact UTC day, explicit provider/source contract, and positive maximum record count. It reuses the certified Open Interest and AggTrades parsers, preserves provider timestamps, validates every observation against the requested interval, and computes content-addressed batch identities. OHLCV validates candle boundaries and price invariants. Open Interest is never forward-filled. AggTrades remains event-native and can be passed to the existing SNAPPY Parquet Segment builder through a fenced bounded wrapper.

The generic bounded commit port checks the refresh lease fence before each authoritative write and classifies exact duplicates separately from conflicts. It does not import broad workers, progress snapshots, resume commands, or full-history planners.

## Affected-window generation

Consistency, Evidence, Projection, and Replay wrappers require validated committed inputs sharing one exact interval. Each delegates to an injected existing generator and returns deterministic affected-window output identities. Empty output is `INELIGIBLE`; the wrapper cannot silently broaden the interval. Replay contract enforcement remains in the existing replay materializer.

## Candidate serving boundary

The candidate port accepts only `WITHHELD` / `INTERNAL_ONLY` corpus records and compares active exposure before and after the immutable insertion transaction. Any exposure change fails closed. The local target inspector accepts only `MVP_SERVING_ISOLATED_POSTGRES_URL` for `quantterminal_mvp_serving_isolated`; managed serving, Neon, and truth-plane aliases are rejected. The current execution environment did not provide this variable, so the transaction boundary was fixture-certified but no local serving database write was attempted.

## Availability command

```powershell
npx tsx workers/data-platform/runMvpBoundedAvailability.ts --start=2026-07-15T00:00:00.000Z --end=2026-07-16T00:00:00.000Z
```

The command performs a non-retaining HEAD classification and emits only dataset, instrument, source classification, availability, finalization, observed-through, checksum state, and limitation reason. A successful HEAD remains `NOT_VERIFIED`; payload validation is a separate explicit in-memory verification step. Recommended future polling is bounded to no more than once per hour and stops when all mandatory sources are ready. No scheduler is active.
