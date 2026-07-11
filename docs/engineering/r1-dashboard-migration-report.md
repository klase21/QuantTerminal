# R1 V2.1 Dashboard Migration Report

## Decision

**READY WITH EXPLICIT LIMITATIONS**

The Dashboard presentation now uses the canonical React foundation through an
in-place sectional migration. `DashboardV1.tsx` remains the runtime
orchestration owner. No protected runtime, data, API, package, navigation, or
global-style file was changed.

## Exact Files Changed

Modified:

- `components/product/DashboardV1.tsx`
- `components/foundation-preview/ReactFoundationPreview.tsx`

Created:

- `lib/dashboard/contracts.ts`
- `lib/dashboard/adapters.ts`
- `components/product/dashboard-v2/DashboardV2View.tsx`
- `components/product/dashboard-v2/MarketDirectionSection.tsx`
- `components/product/dashboard-v2/KeyEvidenceSection.tsx`
- `components/product/dashboard-v2/ReasoningSummarySection.tsx`
- `components/product/dashboard-v2/OpportunityRiskSection.tsx`
- `components/product/dashboard-v2/SupportingIntelligenceSection.tsx`
- `components/product/dashboard-v2/InvestigationHandoffs.tsx`
- `components/product/dashboard-v2/index.ts`
- `workers/component-tests/dashboardAdapterTypeChecks.ts`
- `workers/component-tests/runDashboardV2SmokeTest.tsx`
- `docs/engineering/r1-dashboard-migration-report.md`

## View Models Introduced

- `DashboardV2ViewModel` composes the migrated sections without owning data
  requests or runtime effects.
- `MarketDirectionViewModel` separates aggregate availability, lifecycle,
  freshness, coverage, direction, score, and Evidence Readiness.
- `EvidenceReadinessViewModel` preserves the supplied value and exposes its
  coverage-and-quality basis without representing confidence.
- `KeyEvidenceViewModel` preserves evidence source, timestamp, availability,
  freshness, coverage, confidence availability, and Repository traceability.
- Opportunity and risk models separate observed facts, source-supplied labels,
  local heuristic interpretation, lineage limitations, and unavailable facts.
- Supporting-intelligence models preserve Prediction, ETF, Reserve, Macro,
  Futures, Narrative, and realtime-session observations without inventing
  confidence or freshness.
- Investigation handoff models distinguish contextual Replay/Research routes
  from record-level Repository traceability.

Lifecycle, availability, freshness, coverage, and confidence remain separate
typed concepts. None is inferred from another.

## Adapter Rules

- A supplied aggregate that contains `historical_analog` influence fails
  closed. Direction and aggregate score are withheld; the adapter does not
  sanitize or recalculate the aggregate.
- The coverage-and-average-quality value is labeled only as **Evidence
  Readiness**, includes its supplied basis, and is never passed to
  `ConfidenceIndicator`.
- Reasoning is unavailable because no approved evidence-reference reasoning
  contract exists. Summaries and heuristic labels are not promoted to
  reasoning.
- Tactical observations and supplied labels remain distinct from qualified
  heuristic interpretation. Unsupported trade direction and recommendations
  are omitted.
- Cached data retained after a failed request produces `PARTIAL` lifecycle and
  `UNKNOWN` freshness unless a source supplied freshness metadata. Failure is
  not converted into readiness.
- Repository links remain unavailable without a supplied record identity or
  destination.
- Replay and Research handoffs preserve symbol, exchange, and timeframe using
  existing routing conventions. They do not invent event, study, document, or
  timestamp identities.
- Adapters are pure and perform no fetch, persistence, polling, or mutation.

## Sections Migrated

1. Market Direction shell and contamination boundary.
2. Key Evidence with provenance and independent state concepts.
3. Explicitly unavailable Reasoning Summary.
4. Opportunity and Risk with qualified heuristics and uncertainty.
5. Supporting Intelligence.
6. Context-preserving Replay and Research handoffs plus unavailable Repository
   handoff.

The preview adds deterministic synthetic fixtures for ready evidence, partial
cached data, stale evidence, unavailable reasoning, contaminated Market
Direction, missing Repository identity, long text, and narrow composition. The
fixtures make no external requests or Repository writes and make no current
market claims.

## Runtime Preservation

The nine existing request paths, initial/deferred grouping, delay and timeout
constants, AbortController collection, cleanup, symbol dependencies,
localStorage reads/writes, realtime hooks, alert behavior, URL normalization,
and context propagation remain in `DashboardV1.tsx`. No parallel controller,
duplicate request, or polling loop was introduced. The only request-state
observation added records which existing cached request failed so presentation
can report partial lifecycle truthfully.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Git inspection | PASS | Working tree and changed-file scope inspected. |
| TypeScript | PASS | `npx.cmd tsc --noEmit --pretty false --incremental false`. |
| Dashboard adapter type checks | PASS | Compile-time assertions in `dashboardAdapterTypeChecks.ts`. |
| Dashboard V2 smoke tests | PASS | 16 assertions passed. |
| Existing R0 smoke tests | PASS | Existing foundation smoke suite passed. |
| Request-path parity | PASS | All nine original request expressions remain present. |
| Request-timing parity | PASS | Initial/deferred grouping and 4500/2500/12000/8000 constants checked. |
| Abort and cleanup parity | PASS | AbortController collection and cleanup remain present. |
| Cache behavior parity | PASS | Existing localStorage read/write behavior remains; cached failures are observed only. |
| No new polling | PASS | No `setInterval` added to Dashboard migration scope. |
| Historical Analog contamination gate | PASS | Unit fixture and live Dashboard response both withheld contaminated aggregate direction/score. |
| Evidence Readiness labeling | PASS | Rendered separately with basis and without confidence treatment. |
| Unsupported reasoning unavailable state | PASS | Static render and browser render verified. |
| Repository handoff availability | PASS | Missing identity renders unavailable and omits a link. |
| Desktop responsive smoke | PASS | 1440 x 900 browser inspection; no horizontal overflow. |
| Tablet responsive smoke | PASS | 768 x 1024 browser inspection; no horizontal overflow. |
| 393px mobile smoke | PASS | 393 x 852 browser inspection; no horizontal overflow and controls remained usable. |
| Keyboard and focus smoke | PASS | Keyboard focus reached Replay handoff; visible 2px focus outline verified. |
| Browser console | PASS | No warnings or errors on Dashboard or component preview during checks. |
| Prohibited-behavior scan | PASS | No fetch, WebSocket, polling, random fixture, Repository write, or unsupported live-state addition in new scope. |
| Protected-system diff inspection | PASS | Protected pages, layout/navigation, APIs, global CSS, and runtime/data systems have no diff. |
| Package and lockfile inspection | PASS | `package.json` and `package-lock.json` have no diff. |
| Production build | NOT RUN | Prohibited by `AGENTS.md`. |
| Lint command | NOT RUN | No approved lint command was requested or required. |
| Formal WCAG audit | NOT RUN | Keyboard/focus and responsive smoke checks are not a full conformance audit. |
| Cross-browser validation | NOT RUN | Browser checks used Chromium only. |

`git diff --check` passed with line-ending notices only.

## Browser Observations

The live Dashboard returned a Market Direction aggregate containing Historical
Analog influence. The migrated section correctly rendered an unavailable
aggregate with the unsupported-input explanation while retaining independent
non-historical evidence and Replay/Research handoffs. The preview also rendered
the deterministic synthetic contamination and unavailable-state fixtures.

## Protected Systems Confirmation

No changes were made to `app/dashboard/page.tsx`, `DashboardLayout.tsx`, primary
navigation, API routes, hooks/stores, Repository, Coverage, Projection, Evidence
Packet, Replay, orderbook, OI/Funding fallback, scheduler, workers, backfill,
provider mappings, package files, lockfile, or global CSS. Existing typography
remains unchanged.

## Explicit Limitations

- The legacy Dashboard presentation remains unreachable in
  `DashboardV1.tsx` as a parity reference during the sectional migration. Its
  removal should be a separately reviewed cleanup after runtime parity remains
  stable.
- Real aggregate Market Direction remains unavailable whenever its upstream
  result includes Historical Analog. R1 intentionally does not modify or
  reinterpret that calculation.
- Reasoning remains unavailable until an approved evidence-reference contract
  exists.
- Repository record handoffs remain unavailable where source identities are
  absent.
- Cached records do not have a new TTL and are not represented as current.
- Formal accessibility conformance, cross-browser coverage, and production
  build validation were not run.

## R2 Readiness

**READY WITH EXPLICIT LIMITATIONS**

R2 may proceed using the canonical Dashboard presentation and pure adapter
boundary. It must preserve the protected orchestration and treat the listed
contract gaps as unavailable rather than inferred.
