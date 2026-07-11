# R2 V2.1 Replay React Migration: Phase 0 Audit

## Decision

**IMPLEMENTATION NOT STARTED - APPROVAL REQUIRED**

The migration is feasible as an in-place sectional presentation migration.
The existing Replay controller must remain in `ReplayV1Page.tsx`; extracting it
or introducing a parallel controller would create unacceptable risk to bounded
loading, fallbacks, cancellation, and manual heavy-dataset behavior.

## Entry And Ownership

```text
app/replay/page.tsx
  -> TerminalAppShell (protected navigation shell)
  -> ReplayV1Page
       -> investigation URL and inherited Research context
       -> provider / Repository mode selection
       -> coverage gate
       -> bounded loaders and fallbacks
       -> derived Replay observations
       -> current monolithic presentation
```

`ReplayV1Page.tsx` currently owns both runtime orchestration and presentation.
It is the only active page component. `ReplayEngineWorkspace` and the older
historical/intelligence panels are separate workflows and are not called by
`app/replay/page.tsx`.

## Runtime Inventory

### Context and lifecycle

- Reads symbol, exchange, timeframe, selected Replay window, event, case, and
  optional `contextId` from existing investigation/product-context contracts.
- Validates inherited Research-to-Replay context and preserves unavailable,
  stale, partial, and current states.
- Resets Repository mode and gate when symbol or date changes.
- Uses `mountedRef`, monotonically increasing `loadIdRef`, request-key
  deduplication, and AbortControllers to reject obsolete responses.
- Unmount cleanup aborts Replay and orderbook requests.

### Provider-mode load sequence

1. Abort prior orderbook and Replay requests.
2. Reset the current bounded window and request-deduplication set.
3. Start the Repository coverage-gate request.
4. Fetch one-hour Binance chart candles with a 6-second abort timeout.
5. End foreground loading once chart work completes.
6. Start liquidation loading in the background with a 10-second timeout.
7. Start OI/Funding positioning loading with a 12-second timeout.
8. Positioning fallback order is CryptoHFTData, Binance historical, then
   current futures-symbol context.

The current request ordering and timeout values are runtime contracts, not
presentation concerns.

### Repository mode

- Coverage projection must be `AVAILABLE`; stale, missing, and error states
  fail closed.
- Bounded `market`, `open_interest`, `liquidation`, and `funding` requests are
  issued through the existing Repository client.
- The existing Repository adapter validates and maps records into Replay's
  internal data shape.
- There is no exact-scan fallback.
- Repository facts and projection state are read only.

### AggTrade

- AggTrade is not part of the primary load.
- Provider trades load only from the Event Timeline control.
- Repository AggTrade loads only after an available coverage gate, with a
  fixed page limit of 1,000 and continuation cursor.
- Pagination/truncation state is retained and subsequent pages are appended.
- Automatic AggTrade loading would be a protected-runtime regression.

### Orderbook

- Orderbook loads only through an explicit user action.
- The request reads `/api/replay/orderbook-cache` and never performs full event
  reconstruction.
- A second request aborts the first in-flight orderbook request.
- The request has a 12-second abort timeout and independent loading/reason
  state.
- Missing, failed, incomplete, or unusable orderbook data must map to
  `UNAVAILABLE`, not an observed empty book.
- ADR-002 and the Replay orderbook investigation prohibit synchronous full
  snapshot/update reconstruction.

## Request And Data Inventory

| Source/path | Trigger | Data | Boundary |
| --- | --- | --- | --- |
| `/api/repository/coverage` | Each bounded Replay load | Projection readiness | Read-only, fail closed, no scan fallback |
| `/api/repository/replay` | Repository mode | Hour-bounded facts; manually paged AggTrade | Read-only Repository client/adapter |
| `/api/replay/cryptohftdata` | Provider load/background/manual | Liquidations, OI/mark price, manual trades | Existing provider loader |
| `/api/replay/binance-positioning` | OI/Funding fallback | Historical positioning | Second fallback |
| `/api/market/futures-symbol-context` | Final positioning fallback | Current OI/Funding context | Existing final fallback |
| Binance kline URL selected by exchange | Primary provider chart | 60 one-minute candles | Existing direct chart request |
| `/api/replay/orderbook-cache` | Manual orderbook action | Cached bounded snapshot | No reconstruction |
| Product context storage | Optional Research handoff | Thesis/evidence display context | Existing lifecycle validation |

The main internal payload contains bounded window identity, trades, book
snapshots, liquidations, positioning/funding, candles, and diagnostics.
Repository responses additionally preserve record identity and provider
metadata, but the current merge into the common Replay payload does not retain
record-level Repository identities for every rendered observation.

## Derived Presentation Inventory

- Price candles/series, high/low, and bounded price change.
- OI and funding rows plus first/last deltas.
- Liquidation totals, bias, minute buckets, and largest rows.
- Cached orderbook top-level metrics and depth curve.
- Evidence statuses for chart, positioning, liquidation, orderbook, validation,
  inherited context, trades, and Repository gate.
- A deterministic event list sorted lexicographically by normalized ISO
  timestamp and limited to the final ten events.
- Factual `what happened` lines generated from loaded price, OI, funding, and
  liquidation observations.
- Selected historical case context supplied through existing investigation
  context; no comparable-case lookup is performed by the active page.

The current event derivation includes threshold-based labels such as Price
Shock, Liquidation Cluster, OI Spike/Drop, and Funding Shift. These are local
heuristic interpretations and must not be promoted to source-backed reasoning.

## Current Presentation Audit

The current render order is:

```text
Replay Summary
Validation Status
Comparable Historical Cases
Outcome Analysis
  -> Price chart / Market Snapshot / manual Orderbook
  -> Event Timeline / manual AggTrade
  -> OI / Funding / Liquidations
  -> Top Liquidations / What Happened / If You Traded It
Failure Patterns
Evidence Quality
Replay Metadata
Navigation Actions
```

This does not yet match the fixed R2 order. `Outcome Analysis`, `If You Traded
It`, and `Failure Patterns` also imply ownership outside factual Replay
investigation. They are presentation cleanup candidates only; their removal
must not delete or alter the underlying protected data/runtime paths.

## Canonical ViewModel Proposal

```text
Existing Replay runtime data and state
  -> pure Replay presentation adapter
  -> ReplayV2ViewModel
  -> R0 foundation components and Replay-owned sections
```

Proposed view-model groups:

| View model | Responsibility |
| --- | --- |
| `ReplayShellViewModel` | Selected symbol, exchange, UTC day/hour, source mode, loading lifecycle, controls |
| `ReplaySummaryViewModel` | Bounded-window factual movement summary, provenance, limitations; no causal claim |
| `ReplayPrimaryEvidenceViewModel` | Price chart inputs and independent dataset availability/status rail |
| `ReplayTimelineViewModel` | Timestamped observations in existing deterministic order, with heuristic labels qualified |
| `ReplayReasoningViewModel` | Explicitly unavailable unless approved cited reasoning exists |
| `ReplayHistoricalContextViewModel` | Supplied selected-case context or unavailable state; no generated analog |
| `ReplayMarketStructureViewModel` | OI, funding, liquidation, and cached/manual orderbook display inputs |
| `ReplayResearchHandoffViewModel` | Context-preserving Research route without invented document identity |
| `ReplayRepositoryHandoffViewModel` | Gate/audit state and record links only where valid supplied identities survive |

Lifecycle, availability, freshness, coverage, confidence, provenance, and
heuristic interpretation must remain independently typed. An empty array alone
must not establish `EMPTY`; provider diagnostics and request lifecycle determine
whether data is unavailable, not requested, or factually observed as empty.

## Fixed Migration Plan

1. Introduce contracts and pure adapters without moving runtime code.
2. Add the Replay shell and preserve all existing controls/callbacks.
3. Migrate Summary as factual bounded-window observations.
4. Migrate Primary Evidence and existing chart inputs.
5. Migrate Timeline without changing `replayEvents` ordering or timestamps;
   qualify derived labels and keep unsupported reasoning unavailable.
6. Migrate manual Orderbook presentation while preserving its independent
   controller, timeout, endpoint, and unavailable semantics.
7. Migrate Market Structure without changing OI/Funding fallback order.
8. Migrate Historical Context using only supplied case/context identity.
9. Add context-preserving Research and Repository handoffs without fabricated
   identities.
10. Validate source parity before responsive/browser certification.

The final visual order must be exactly:

```text
Summary
Primary Evidence
Reasoning Timeline
Historical Context
Market Structure
Research
Repository
```

## Proposed File Scope

This is a proposal only. No implementation file has been changed.

### Proposed new files

- `lib/replay-presentation/contracts.ts`
- `lib/replay-presentation/adapters.ts`
- `components/replay-v2/ReplayV2View.tsx`
- `components/replay-v2/ReplayShell.tsx`
- `components/replay-v2/ReplaySummarySection.tsx`
- `components/replay-v2/PrimaryEvidenceSection.tsx`
- `components/replay-v2/ReasoningTimelineSection.tsx`
- `components/replay-v2/HistoricalContextSection.tsx`
- `components/replay-v2/MarketStructureSection.tsx`
- `components/replay-v2/InvestigationHandoffs.tsx`
- `components/replay-v2/index.ts`
- `workers/component-tests/replayAdapterTypeChecks.ts`
- `workers/component-tests/runReplayV2SmokeTest.tsx`
- `docs/engineering/r2-replay-migration-report.md`

`lib/replay-presentation` is intentionally separate from protected
`lib/replay` runtime clients and adapters.

### Proposed modified files

- `components/replay/ReplayV1Page.tsx`
- `components/foundation-preview/ReactFoundationPreview.tsx`

`ReplayV1Page.tsx` would remain the orchestration owner. Changes would be
limited to building a memoized presentation model and passing existing action
callbacks into the sectional view. Existing effects, loaders, controllers,
timeouts, request paths, fallback order, deduplication, and cleanup would stay
in place.

## Protected Files And Systems

The following must remain untouched during implementation:

- `app/replay/page.tsx`
- `app/api/replay/**`
- `app/api/repository/replay/route.ts`
- `app/api/repository/coverage/route.ts`
- `app/api/market/futures-symbol-context/route.ts`
- `lib/replay/**`
- Repository, Coverage, Projection, Persistence, and historical fact records
- orderbook cache contracts, builders, transport, normalization, and workers
- websocket and realtime infrastructure
- OI/Funding providers and fallback implementations
- scheduler, workers, backfill, and provider mappings
- shared product-context storage/contracts
- primary navigation and page shell
- package files, lockfile, and global CSS

If implementation requires any protected change, work must stop for a new
approval.

## Risks And Required Gates

| Risk | Impact | Required gate |
| --- | --- | --- |
| Runtime/presentation interleaving | Section extraction could alter load timing or closure state | Source-level parity checks for functions, effects, request paths, timeouts, and dependency arrays |
| Empty versus unavailable orderbook | Empty arrays could be misrepresented as factual emptiness | Adapter must consume request reason/status and render `UNAVAILABLE` |
| Timeline reinterpretation | Sorting or timestamp normalization could change sequence | Preserve existing ISO timestamps and comparator; fixture same-timestamp behavior |
| Heuristic labels presented as reasoning | Derived thresholds could imply causal explanation | Separate observations from qualified heuristics; reasoning unavailable without citations |
| AggTrade auto-load | Large response and responsiveness regression | Assert only manual callbacks call trade loaders; preserve limit/cursor |
| OI/Funding fallback regression | Historical/current semantics could change | Assert exact fallback call order and source labels |
| Repository identity loss | Generic availability could imply traceability | Record link unavailable unless a valid supplied identity reaches the view model |
| Direct Binance chart fetch | Shared view could accidentally own provider fetching | Keep fetch entirely inside protected page controller |
| Trade-oriented legacy labels | Replay could exceed investigation ownership | Remove from primary presentation without changing runtime context contracts |
| Dirty R1 worktree | Unrelated R1 changes could be overwritten | Work with existing changes and restrict R2 diff to separately approved files |

## Blockers

No runtime blocker was found for a presentation-only migration.

Two contract limitations must remain explicit:

1. There is no approved cited Replay reasoning object. The reasoning portion of
   the timeline must remain unavailable; local event labels are heuristics.
2. The common Replay payload does not preserve a record identity for every
   rendered Repository observation. Record-level Repository links must remain
   unavailable where identity is absent.

Neither limitation justifies modifying protected systems in R2.

## Alternatives

### Option A - Recommended

In-place sectional migration with a separate pure presentation adapter and the
existing `ReplayV1Page.tsx` controller preserved. This matches R1's certified
method and keeps protected runtime behavior observable in one owner.

### Option B - Rejected for R2

Extract all Replay effects/loaders into a new controller hook before migrating
the UI. This has a larger runtime blast radius and conflicts with the
presentation-only objective.

### Option C - Rejected

Build a parallel Replay V2 controller or route. This duplicates requests,
fallbacks, cancellation, cache behavior, and Repository gating.

## Phase 0 Validation

| Check | Result | Note |
| --- | --- | --- |
| Git inspection | PASS | Existing R1 changes identified; no R2 implementation changes existed before this audit. |
| Runtime inventory | PASS | Active page, controller state, loaders, and cleanup traced. |
| Repository usage audit | PASS | Projection gate and bounded read-only query path traced. |
| Timeline audit | PASS | Existing timestamp sort and ten-event bound identified. |
| Orderbook audit | PASS | Manual cache-only request, cancellation, timeout, and ADR boundary identified. |
| AggTrade audit | PASS | Manual provider load and gated paginated Repository continuation identified. |
| OI/Funding audit | PASS | Three-stage fallback order identified. |
| Historical Context audit | PASS | Supplied context only; no active comparable-case fetch in the page. |
| Research handoff audit | PASS | Existing inherited Research context traced; outgoing Research link currently loses detailed context. |
| Repository handoff audit | PASS | Coverage status exists; record-level traceability is incomplete after common-payload merge. |
| TypeScript | NOT RUN | Read-only architecture audit did not change TypeScript. |
| Browser validation | NOT RUN | Phase 0 is source/runtime architecture analysis only. |
| Protected-system diff | PASS | Replay/protected paths have no current diff. |
| Package inspection | PASS | No package changes were made by this audit. |

## Approval Request

Approve **Option A** and the proposed file scope to begin R2.1 through R2.9.
Implementation has not started.
