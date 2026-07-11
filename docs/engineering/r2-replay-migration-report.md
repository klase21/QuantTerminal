# R2 V2.1 Replay React Migration Report

## Decision

**READY WITH EXPLICIT LIMITATIONS**

Replay V2 now uses the canonical React foundation as an Investigation
Workspace. `ReplayV1Page.tsx` remains the sole runtime controller. The active
presentation follows the fixed order: Summary, Primary Evidence, Reasoning
Timeline, Historical Context, Market Structure, Research, Repository.

## Exact R2 Files Changed

Modified:

- `components/replay/ReplayV1Page.tsx`
- `components/foundation-preview/ReactFoundationPreview.tsx`

Created:

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
- `docs/engineering/r2-replay-phase0-audit.md`
- `docs/engineering/r2-replay-migration-report.md`

Existing R1 work remains present in the working tree and was not reverted or
reclassified as R2 work.

## Adapters And View Models

- `ReplayV2ViewModel` composes the seven canonical ownership bands.
- `ReplaySummaryViewModel` carries bounded-window identity and factual summary
  observations without causal claims.
- `ReplayPrimaryEvidenceViewModel` carries normalized chart candles and an
  independent dataset-state rail.
- `ReplayTimelineViewModel` preserves supplied timestamp order and separates
  Observation, Evidence, and qualified local interpretation.
- `ReplayOrderbookViewModel` distinguishes request lifecycle and availability;
  missing data is unavailable rather than an observed empty book.
- `ReplayMarketStructureViewModel` carries normalized OI, Funding,
  Liquidation, price, and cached orderbook metrics.
- `ReplayHistoricalContextViewModel` accepts supplied case context only.
- Research and Repository handoffs distinguish contextual navigation from
  record-level traceability.

Lifecycle, availability, freshness, coverage, confidence, provenance, and
interpretation remain independent concepts. The pure adapter performs no
requests, persistence, polling, context writes, or provider normalization.

## Sections Migrated

1. Replay shell and existing bounded-window controls.
2. Factual Replay Summary.
3. Price-first Primary Evidence with dataset availability.
4. Deterministic timeline using Observation -> Evidence -> Interpretation.
5. Explicitly unavailable cited Reasoning boundary.
6. Manual orderbook presentation and the existing `DepthCurve` render path.
7. Market Structure for price, OI, Funding, Liquidations, and orderbook.
8. Supplied Historical Context or explicit unavailable state.
9. Context-preserving Research handoff and identity-gated Repository handoff.

The legacy presentation remains unreachable in `ReplayV1Page.tsx` as a parity
reference during the sectional migration.

## Runtime Behavior Preserved

`ReplayV1Page.tsx` retains all state, effects, request functions, request-key
deduplication, loading stages, continuation cursors, AbortControllers,
timeouts, load IDs, mounted guards, context reads/writes, symbol/date/hour
selection, and unmount cleanup.

- Provider chart remains a bounded one-hour request.
- Liquidations remain background-loaded after the chart.
- OI/Funding precedence remains CryptoHFTData -> Binance historical -> current
  futures-symbol context.
- Repository mode remains projection-gated and bounded to market, OI,
  liquidation, and funding datasets.
- Repository AggTrade remains manual, uses the existing 1,000-record limit,
  preserves cursor continuation, and never auto-continues.
- Provider AggTrade remains manual.
- Orderbook remains a manual `/api/replay/orderbook-cache` request with the
  existing independent cancellation and 12-second timeout.
- Existing timeline sorting remains ISO timestamp lexical order followed by
  the existing final-ten bound.
- Existing cached book data continues through the original `DepthCurve`
  presentation path.

## Reasoning And Interpretation

No cited Replay reasoning contract exists. The Reasoning panel therefore
renders `PARTIAL` with an explicit unavailable explanation. Summary lines are
not converted to reasoning. Timeline threshold labels are visibly identified
as local heuristic interpretations and never claim causality.

No supporting references, counter-evidence, timestamps, confidence, or causal
explanations are generated.

## Repository Identity Boundary

The coverage gate and source-level provenance are retained. Merged Replay
observations currently do not consistently retain the source Repository record
identity. Those observations render record-level traceability as unavailable;
the adapter does not invent record IDs, destinations, or URLs.

## Historical Context Boundary

Only a supplied `selectedHistoricalCase` is rendered. No analog lookup,
similarity score, or market-direction calculation is performed. Replay
Historical Context never feeds Dashboard Market Direction.

## Preview Strategy

The development-only foundation preview includes a deterministic synthetic
Replay fixture covering:

- available summary and price evidence;
- partial coverage;
- stale source;
- unavailable orderbook;
- manual AggTrade continuation state;
- unavailable reasoning;
- merged observation without Repository identity;
- absent historical case;
- long timeline content;
- narrow responsive composition.

The preview is explicitly labeled synthetic, makes no current market claims,
and adds no requests or Repository writes. It remains unavailable in
production through the existing preview-route guard.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Git inspection | PASS | Working tree and approved R2 scope inspected. |
| TypeScript | PASS | `npx.cmd tsc --noEmit --pretty false --incremental false`. |
| Replay adapter type checks | PASS | Compile-time closed-vocabulary and manual-state assertions passed. |
| Replay V2 smoke tests | PASS | 17 adapter, rendering-boundary, and runtime-parity assertions passed. |
| Existing R0 smoke tests | PASS | Existing React foundation smoke suite passed. |
| Existing R1 smoke tests | PASS | Existing Dashboard V2 suite passed all 16 checks. |
| Repository replay-query parity | PASS | Existing client/adapter and API routes have no diff; controller call remains. |
| Coverage-gate parity | PASS | `AVAILABLE` projection gate and fail-closed branch remain unchanged. |
| Bounded-query parity | PASS | Existing four bounded Repository datasets remain unchanged. |
| Continuation parity | PASS | AggTrade limit 1,000, cursor, truncation, append, and manual next-page behavior remain. |
| Timeline ordering | PASS | Existing timestamp comparator retained; adapter preserves supplied order/timestamps. |
| Orderbook protected diff | PASS | Orderbook API, contracts, workers, cache, and Replay runtime clients have no diff. |
| Missing orderbook renders `UNAVAILABLE` | PASS | Static smoke and live browser rendered `Orderbook UNAVAILABLE`. |
| AggTrade remains manual | PASS | Static source assertion and browser manual control verified. |
| OI/Funding fallback parity | PASS | Existing three-source precedence and labels remain in controller. |
| No generated reasoning | PASS | Static render shows explicit unavailable reasoning; no reasoning generator exists in new scope. |
| Repository identity gating | PASS | Missing identity omits Repository link and renders unavailable. |
| Historical Context isolation | PASS | Adapter accepts supplied case only; no Dashboard or analog runtime dependency added. |
| Desktop responsive smoke | PASS | Chromium default viewport, 1265px content width; no document overflow. |
| Tablet responsive smoke | PASS | Chromium 768 x 1024; no document overflow. |
| 393px mobile smoke | PASS | Chromium 393 x 852; no document overflow; primary controls measured 44px high. |
| Keyboard and focus smoke | PASS | Load control received a visible 2px solid focus outline with 2px offset. |
| Browser console | PASS | Clean Replay page and clean post-fix preview tab had no warnings or errors. |
| Prohibited-behavior scan | PASS | New scope has no fetch, WebSocket, polling, persistence, randomness, or context-write call. |
| Protected-system inspection | PASS | Repository, APIs, `lib/replay`, orderbook, workers, scheduler/backfill/provider, navigation, and global CSS have no diff. |
| Package and lockfile inspection | PASS | `package.json` and `package-lock.json` have no diff. |
| Production build | NOT RUN | Prohibited by `AGENTS.md`. |
| Formal WCAG conformance audit | NOT RUN | Responsive and keyboard smoke checks are not a complete conformance audit. |
| Cross-browser validation | NOT RUN | Browser validation used Chromium only. |

`git diff --check` passed with line-ending notices only.

## Protected Systems Confirmation

No R2 changes were made to Replay pages/routes, Repository query contracts,
coverage/projection, Persistence, `lib/replay`, orderbook cache/contracts/
workers, WebSockets, OI/Funding providers, schedulers, workers, backfill,
provider mappings, primary navigation, packages, lockfile, or global CSS.

## Explicit Limitations

- Cited Replay reasoning remains unavailable by contract.
- Merged observations without record identity cannot link to individual
  Repository records.
- Historical Context is limited to supplied investigation context and carries
  no similarity score.
- The legacy presentation remains as unreachable parity reference code and
  should be removed only in a separately reviewed cleanup.
- Formal accessibility conformance and cross-browser validation were not run.
- Production build validation was not run because repository rules prohibit it.

## R3 Readiness

**READY WITH EXPLICIT LIMITATIONS**

R3 may use Replay V2 as the canonical investigation presentation while
preserving the existing protected controller and fail-closed boundaries above.
