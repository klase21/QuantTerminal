# Historical Backfill Architecture

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B1  
**Scope:** Architecture only  
**Decision:** **HISTORICAL BACKFILL ARCHITECTURE APPROVED**

## 1. Purpose

Historical backfill accelerates the accumulation of source-backed historical
observations that can support Historical Memory and, later, Pattern and
Learning execution. It reuses the certified Phase 5 Facts pipeline wherever
the required upstream facts actually exist:

```text
Signal Snapshot + Context Snapshot
  -> Tracking
  -> Price Observation
  -> Signal Evaluation
  -> Signal Outcome
  -> Outcome Event
  -> Historical Memory
```

Backfill does not create facts that were never recorded. In particular,
market history alone is not proof that QuantTerminal emitted a signal. An
observation-only run may build a verified historical observation corpus, but
it may not manufacture `SIGNAL_SNAPSHOT`, `SIGNAL_OUTCOME`, or
`HISTORICAL_MEMORY` records to make the pipeline appear complete.

Historical work must run outside request handlers. It follows the existing
Replay boundary: ingest, validate, cache or persist atomically, then consume.
Heavy reconstruction must never block Replay or another product page.

## 2. Approved Historical Sources

This architecture approves no new provider. A B-series implementation may use
only a source already active and production-approved in the canonical registry.

| Source candidate | Registry sourceId | Permitted historical role | Current boundary |
| --- | --- | --- | --- |
| Binance Futures historical klines/archive | `binance-vision` | Primary OHLCV and exact source timestamps | Existing monthly Futures archive ingestion is present. Coverage must be discovered and verified per symbol, interval, and period. |
| Binance Futures historical REST | `binance-live` | Exact-window observations when the existing client supports the requested boundary | Existing local PriceObservation path uses the 1-minute kline endpoint. It is not a substitute for archive-wide coverage. |
| Binance funding history | `binance-live` or `binance-vision`, according to the existing approved path used | Source-backed funding observations | Include only after the concrete approved dataset, provider timestamp, retention, and gaps are verified. |
| Binance open-interest history | `binance-live` or `binance-vision`, according to the existing approved path used | Source-backed OI observations | Availability is conditional. No historical OI coverage is assumed by this document. |
| CryptoHFTData replay data | `cryptohftdata` | Approved Replay enrichment such as orderbook events where files exist | Authenticated and coverage-limited. Full orderbook reconstruction belongs in an offline/manual worker and cached output, never a request handler. |
| Existing Replay caches and approved historical artifacts | Their registered originating source IDs | Reuse of validated source-backed observations | A derived cache is not a new provider and must retain its source lineage, schema version, and observed timestamps. |

`historical-analog`, `market-memory`, and `replay-cache` are derived
QuantTerminal sources. They may be downstream consumers or validated caches;
they must not conceal the original historical source or become authority for
facts absent from that source.

## 3. Historical Boundary

There is no universal historical start date. The boundary is established per
`sourceId + dataset + symbol + interval/data type`.

For each dataset, a future backfill implementation must record:

* `availableFrom`: first source-backed observation successfully verified;
* `completeFrom`: first boundary after which required continuity checks pass;
* `availableTo`: last verified source observation;
* known gaps and unavailable intervals;
* source dataset/version and verification time.

The effective start of a run is the latest `completeFrom` among all data types
required by that run. Optional evidence does not move the boundary; it remains
explicitly `UNAVAILABLE` for missing intervals. Retrieval or backfill time is
never used as `observedAt`.

BTCUSDT is the first pilot symbol. Its first date range must be selected only
after probing the approved Binance Futures dataset and validating the first and
last rows, monotonic source timestamps, interval continuity, and duplicates.
No hard-coded exchange inception date is certified here. Other symbols follow
only after separate coverage discovery.

## 4. Backfill Record Model

### 4.1 Facts and control records

Backfill control records are operational, not market facts. Examples include a
backfill run manifest, `SCHEDULER_RUN`, `JOB_STATE`, `RETRY_STATE`, and
`DEAD_LETTER`. They may contain request ranges, cursors, checksums, retry state,
and completion counts. Their timestamps describe the backfill operation only.

Market observations and canonical Facts records retain provider timestamps and
source lineage. A control record must never supply a missing market timestamp,
signal, Context item, evaluation, or outcome.

### 4.2 Canonical mapping

| Canonical record | Historical creation rule | Observation-only B2 |
| --- | --- | --- |
| `SIGNAL_SNAPSHOT` | Create only from an immutable, traceable signal actually emitted by QuantTerminal, or from a separately approved replay-signal artifact explicitly identified as backfill-derived. Never infer direction from later price action. | Not created. |
| `CONTEXT_SNAPSHOT` | Create only from evidence provably available at signal time. Preserve all missing categories as `UNAVAILABLE`; never reconstruct later evidence as if it were known then. | Not created. |
| `SIGNAL_TRACKING` | Derive deterministically from a valid Signal Snapshot and its canonical windows. It is lifecycle/control state linked to a factual signal identity. | Not created. |
| `PRICE_OBSERVATION` | Store exact source observations with source timestamp, symbol, window coordinate, source metadata, and unavailable optional fields. A future observation-backfill contract may reuse this payload shape, but must not forge a tracking parent. | Primary factual output, under a dedicated backfill observation identity/contract approved in B2. |
| `SIGNAL_EVALUATION` | Create only when a valid signal direction, source-backed entry observation, source-backed evaluation observation, and canonical window exist. Runtime math remains authoritative. | Not created. |
| `SIGNAL_OUTCOME` | Create only from a valid Signal Evaluation through Signal Outcome Runtime. It is a signal outcome, not simulated user PnL. | Not created. |
| `OUTCOME_EVENT` | Record only a valid Signal Outcome through Outcome Recorder Runtime. | Not created. |
| `HISTORICAL_MEMORY` | Create only from a valid Outcome Event through Historical Memory Runtime, preserving Signal, Context, Evaluation, and Event lineage. | Not created. |

The dedicated observation contract needed by B2 must be settled before code is
written. It may extend the persistence record taxonomy in a later approved
sprint, but it must not overload `PRICE_OBSERVATION` with a fake
`SIGNAL_TRACKING` parent. Observation-only backfill prepares factual inputs;
it does not claim that Historical Memory already exists.

## 5. No-Fabrication Policy

Historical backfill must not fabricate or retrospectively infer:

* signal direction or signal emission;
* Context evidence or evidence availability at signal time;
* prices, funding, open interest, or gaps between observations;
* provider timestamps or canonical freshness;
* confidence, evaluation metrics, outcomes, or user actions.

No interpolation, forward fill, retrieval-time timestamp substitution, or
fallback provider is allowed unless a later governance decision explicitly
approves the source and semantics. Missing source-backed fields remain
`UNAVAILABLE` with a reason. Backfilled historical data is age-independent for
coverage purposes; freshness describes the source observation contract and
must not incorrectly label old historical facts as live/current market data.

## 6. Backfill Modes and Order

| Rank | Mode | Purpose | Gate |
| --- | --- | --- | --- |
| 1 | Observation-only backfill | Build verified BTCUSDT historical price observations, then optional funding/OI where independently available. | No signals, evaluations, outcomes, or memory. Requires an approved observation record contract. |
| 2 | Manual curated event backfill | Attach authoritative, already-recorded event or signal references to exact historical observations. | Curated records must cite an approved source and must not invent direction, Context, or outcome. |
| 3 | Scanner-replay backfill | Reprocess archived Scanner outputs and their exact signal-time inputs. | Requires immutable historical Scanner artifacts, algorithm/version identity, and source-time Context. Current market data alone is insufficient. |
| 4 | Replay-signal backfill | Evaluate separately governed, explicitly backfill-derived replay signals. | Requires a future constitution distinguishing derived replay signals from signals actually emitted. It must never be presented as user trade history. |

Only modes with a valid Signal Snapshot may enter the complete
Signal-to-Memory chain. Modes without one remain observation datasets.

## 7. Recommended B2 Pilot

**B2: Binance Futures BTCUSDT Observation Backfill Pilot**

Keep the implementation deliberately small:

* one symbol: `BTCUSDT`;
* one explicit UTC date range selected after coverage discovery;
* one required data type: Binance Futures klines/OHLCV;
* at most one optional second type: funding, only if its approved historical
  endpoint, timestamp semantics, and range are verified before implementation;
* `binance-vision` as the preferred archive authority, with `binance-live` used
  only where the existing approved exact-window contract applies;
* Repository-only persistence through a dedicated factual observation mapping;
* operational run manifest with range, source, checksum, counts, gaps, and
  completion state;
* no Signal Snapshot, Context Snapshot, evaluation, outcome, Historical Memory,
  Learning, API, or UI.

B2 succeeds when it establishes a duplicate-safe, source-timestamped factual
corpus and an honest coverage manifest. Promotion into the full canonical
pipeline is a later sprint gated by real signal provenance.

## 8. Idempotency and Lineage

Recommended deterministic bases are:

| Artifact | Identity basis |
| --- | --- |
| Backfill run | `mode + sourceId + dataset + symbol + interval/dataType + start + end + contractVersion` |
| Historical observation | `sourceId + dataset + symbol + interval/dataType + observedAt + source-native sequence/open time + schemaVersion` |
| Signal Snapshot | Existing canonical signal identity from the immutable source artifact |
| Context Snapshot | Existing `signalId + snapshotVersion` |
| Tracking | Existing Signal Tracking identity derived from valid signal/snapshot references |
| Evaluation | Existing signal/snapshot/window identity plus immutable observation lineage |
| Signal Outcome | Existing signal + evaluation-window identity |
| Outcome Event | Existing outcome identity + event version |
| Historical Memory | Existing Outcome Event identity |

Every persisted fact carries parent references to its immediate canonical
inputs and retains originating `sourceId`, dataset/version, and source
timestamp. Same identity and same checksum is `DUPLICATE`; same identity with
different source content is `CONFLICT`. Neither case overwrites an existing
fact. Corrections require an explicitly versioned source artifact and a new
identity; facts are never updated in place.

## 9. Validation Plan

B2 and later implementations must verify:

1. Source identity is registered, active, and production-approved.
2. Every market observation uses a real provider timestamp.
3. Retrieval, run, and persistence timestamps are metadata only and never
   substitute for `observedAt`.
4. Requested boundaries, row intervals, monotonic ordering, duplicates, and
   gaps are checked and reported.
5. Running the identical range twice creates no duplicate facts and no
   overwrite; conflicting content returns `CONFLICT`.
6. Record lineage resolves back to source dataset and run manifest and, where
   applicable, forward through Signal, Context, Evaluation, Event, and Memory.
7. All durable writes pass through Repository; workers never write directly to
   SQLite or Postgres.
8. Optional data remains `UNAVAILABLE` when absent; no interpolation or
   provider fallback occurs.
9. No provider outside the canonical registry is introduced.
10. Historical ingestion and reconstruction stay outside page and API request
    paths, preserving Replay responsiveness.

## 10. Architecture Decision

**HISTORICAL BACKFILL ARCHITECTURE APPROVED**

The architecture is approved with a strict staging boundary: observation-only
backfill builds immutable source facts but cannot itself create canonical
Historical Memory. The complete Signal-to-Memory path remains available only
when an authentic or separately governed backfill-derived Signal Snapshot and
its source-time Context exist.

## 11. Validation Summary

| Check | Result |
| --- | --- |
| Required Phase 5, Context, governance, persistence, runtime, and Local Runner contracts reviewed | PASS |
| Existing Binance Vision backfill and Replay/historical workers inspected | PASS |
| Approved source IDs confirmed in canonical registry | PASS |
| Facts versus operational-control boundary defined | PASS |
| Historical boundary avoids unsupported fixed dates | PASS |
| B2 pilot limited to BTCUSDT, one range, and one or two verified data types | PASS |
| No-fabrication and unavailable behavior defined | PASS |
| Deterministic identity, conflict, and lineage rules defined | PASS |
| Runtime, API, page, package, schema, worker, and provider changes | NONE |
| Build or TypeScript validation | Not required; documentation-only sprint |
