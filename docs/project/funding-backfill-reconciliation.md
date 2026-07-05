# Funding Backfill Reconciliation

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B4R  
**Status:** RECONCILED

## 1. Reconciliation Result

The existing BTCUSDT Binance Vision funding dataset remains canonical and
unchanged:

| Item | Result |
| --- | --- |
| Existing record kind | `HISTORICAL_FUNDING` |
| Existing provider | `binance-vision` |
| Existing symbol | `BTCUSDT` |
| Existing records | 7,119 |
| First timestamp | `2020-01-01T00:00:00.000Z` |
| Last timestamp | `2026-06-30T16:00:00.005Z` |
| Deleted or overwritten | 0 |
| Reconciliation rerun | `DUPLICATE`; 7,119 duplicates, 0 writes |
| Existing identity compatibility | PASS |

The generalized identity remains:

```text
sourceId + symbol + provider fundingTime
```

The previous BTCUSDT helper call still defaults to
`binance-vision + BTCUSDT`, so every existing record ID and idempotency key is
preserved.

## 2. Funding Source Architecture

Funding providers are explicit authority boundaries, not interchangeable URL
sources.

| Provider | Role | Boundary | Authority | Current production status |
| --- | --- | --- | --- | --- |
| Binance Vision (`binance-vision`) | Primary | Direct official provider archive | Authoritative Binance Futures funding facts | Registered and production-approved |
| Coinalyze (`coinalyze`) | Optional secondary cross-check | Explicit provider adapter and instrument map required | Comparison only; never replaces Binance facts | Not registered; no production ingestion enabled |

The runtime model is implemented in
`lib/historical-backfill/fundingSources.ts`. It records provider role,
authority, production approval, provider boundary, and per-symbol capability.

An internal QuantTerminal API is not a funding provider. Future orchestration
must call a direct provider adapter or consume an already persisted record
whose external provider identity is preserved. An internal route must never be
assigned `sourceId: coinalyze` or `sourceId: binance-vision` merely because it
proxies or reshapes unknown data.

## 3. Binance Multi-Symbol Strategy

`runBinanceVisionHistoricalFundingBackfill()` now accepts an optional canonical
Binance Futures symbol. For each symbol it:

1. normalizes and validates the Binance symbol;
2. probes the official Binance Vision monthly `fundingRate` archives;
3. discovers that symbol's first and last available complete month;
4. requires contiguous monthly coverage between those boundaries;
5. parses only the official `calc_time`, `funding_interval_hours`, and
   `last_funding_rate` fields;
6. validates ordering, duplicate timestamps, and detectable missing intervals;
7. writes through Repository with source-aware deterministic identity.

This supports any Binance Futures symbol that has an official Binance Vision
funding archive. It does not force BTCUSDT's `2020-01` start onto a later-listed
symbol. ETHUSDT capability validation resolved a contiguous official range
from `2020-01` through `2026-06`.

The caller must obtain the Binance symbol universe from an explicit official
Binance provider boundary. B4R does not add an internal API, scheduler, symbol
poller, or automatic multi-symbol execution.

## 4. Symbol Capability Mapping

Capability maps are built from:

* an explicit list of canonical Binance Futures symbols; and
* an optional explicit map from Binance symbols to Coinalyze instrument IDs.

The map never derives a Coinalyze instrument name from a Binance ticker.

| Situation | Binance primary | Coinalyze cross-check |
| --- | --- | --- |
| Valid official Binance symbol with archive | `AVAILABLE` | Data-dependent |
| Explicit Coinalyze instrument mapping exists | Unchanged | `AVAILABLE` |
| No Coinalyze instrument mapping | Unchanged | `UNAVAILABLE` with reason |
| Invalid Binance symbol | `UNAVAILABLE` | `UNAVAILABLE` |

CAP-like symbols are the important failure case: if a Binance symbol is absent
from the explicitly supplied Coinalyze instrument catalog, its Coinalyze
capability is:

```text
UNAVAILABLE
Coinalyze has no explicit provider instrument mapping for this Binance Futures symbol.
```

No provider symbol, funding value, timestamp, or fallback is fabricated.
Binance primary ingestion remains independent of optional Coinalyze support.

## 5. Coinalyze Boundary

Coinalyze is modeled but not activated. Production use requires a separately
approved sprint that supplies all of:

* canonical Source Registry registration and governance ownership;
* an explicit direct-provider adapter contract;
* credential handling outside response payloads and records;
* an authoritative provider instrument catalog;
* timestamp and funding-unit normalization certification;
* independent record identities using `sourceId: coinalyze`;
* conflict and cross-check rules that never overwrite Binance facts.

Until then, Coinalyze is optional metadata in the capability layer only.
Unsupported symbols remain `UNAVAILABLE`, and no Coinalyze records are written.

## 6. Migration and Reconciliation Plan

### Completed in B4R

1. Preserve all existing BTCUSDT records and identity semantics.
2. Generalize Binance Vision archive planning, parsing, validation, and
   persistence to a caller-supplied Binance Futures symbol.
3. Add provider-aware source definitions and per-symbol capability contracts.
4. Add explicit Coinalyze unsupported behavior.
5. Verify BTCUSDT duplicate rerun and a second Binance symbol's archive plan.

### Future controlled rollout

1. Load the current Binance Futures symbol universe from a direct official
   Binance boundary and freeze the input catalog for the run.
2. Build the capability map and exclude symbols without official funding
   archives as explicit `UNAVAILABLE`.
3. Backfill one additional Binance symbol as a certified pilot.
4. Expand in bounded batches with per-symbol progress, ordering, gaps, and
   rerun reports.
5. Reconcile aggregate counts without changing existing BTCUSDT records.
6. Consider Coinalyze only after governance and adapter certification; write
   secondary facts under their own provider identity.

There is no destructive migration. Existing facts require no rewrite,
re-keying, reserialization, or archive operation.

## 7. Safety Boundaries

B4R does not generate Signal, Context Snapshot, Tracking, Evaluation, Outcome,
Historical Memory, Pattern, Learning, Calibration, Playbook, recommendation,
or Knowledge. It adds no provider calls beyond the existing direct Binance
Vision archive boundary and does not activate Coinalyze.

## 8. Validation Summary

| Check | Result |
| --- | --- |
| TypeScript validation | PASS |
| Existing BTCUSDT identity preserved | PASS |
| Existing BTCUSDT records overwritten/deleted | PASS; 0 |
| BTCUSDT full rerun | PASS; 7,119 duplicates, 0 writes |
| Generalized Binance symbol plan | PASS |
| ETHUSDT official archive range | PASS; 78 months |
| Explicit Coinalyze mapping | PASS; mapped symbol available |
| Missing Coinalyze mapping | PASS; `UNAVAILABLE` |
| CAP-like unsupported behavior | PASS; no fabricated provider symbol |
| Internal API used as provider | NO |
| Coinalyze production ingestion | NOT ENABLED |
| Package, API, page, Signal-to-Memory changes | NONE |

No production build was run, in accordance with repository instructions.
