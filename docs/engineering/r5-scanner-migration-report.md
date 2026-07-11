# R5 V2.1 Scanner React Migration Report

## Decision

`READY WITH EXPLICIT LIMITATIONS`

Scanner V2 is migrated as an investigation workspace. `ScannerPage.tsx` remains the sole runtime controller. Browser validation was attempted but the available browser surfaces could not attach or navigate to the local development page, so viewport, focus, and console checks remain `NOT RUN`.

## Exact Files Changed

### New

- `lib/scanner-presentation/contracts.ts`
- `lib/scanner-presentation/adapters.ts`
- `components/scanner-v2/ScannerV2View.tsx`
- `components/scanner-v2/ScannerShell.tsx`
- `components/scanner-v2/ScannerSummarySection.tsx`
- `components/scanner-v2/PriorityQueueSection.tsx`
- `components/scanner-v2/CandidateDetailSection.tsx`
- `components/scanner-v2/CandidateEvidenceSection.tsx`
- `components/scanner-v2/CandidateRiskSection.tsx`
- `components/scanner-v2/InvestigationPathSection.tsx`
- `components/scanner-v2/ScannerHandoffs.tsx`
- `components/scanner-v2/RepositoryValidationSection.tsx`
- `components/scanner-v2/index.ts`
- `workers/component-tests/scannerAdapterTypeChecks.ts`
- `workers/component-tests/runScannerV2SmokeTest.tsx`
- `docs/engineering/r5-scanner-migration-report.md`

### Modified

- `components/scanner/ScannerPage.tsx`
- `components/foundation-preview/ReactFoundationPreview.tsx`

No route, API, scoring, candidate generation, hook, product-context contract, storage, Repository, package, lockfile, global CSS, provider, scheduler, worker-runtime, backfill, or Figma file changed.

## View Models and Adapter Rules

Bounded models cover Scanner summary, queue, candidate facts, investigation priority, structured observations, model basis, risk, unavailable counter evidence, investigation identity, destination-specific handoffs, unavailable Repository validation, and unsupported interaction capabilities.

The adapter performs no fetch, timer, socket subscription, persistence, candidate generation, reranking, rescoring, evidence inference, confidence inference, recommendation inference, context write, or Repository operation. Lifecycle, availability, freshness, retention state, score, priority, confidence, coverage, direction, recommendation, and probability remain independent.

## Sections Migrated

1. Investigation Summary
2. Investigation Queue
3. Candidate Detail
4. Structured Observations and Model Basis
5. Risk and unavailable Counter Evidence
6. Investigation Path
7. Repository Validation boundary

The first candidate remains a bounded summary composition. No selection, search, filters, tabs, user sorting, pagination, modal, refresh control, reset, URL synchronization, or persistence was added.

## Runtime Preservation

- Market Movers REST polling and WebSocket fallback remain owned by `useMarketMovers(true)`.
- Scanner opportunity polling remains `/api/scanner/opportunities`, 45 seconds, 9-second timeout, and one retry.
- Market Movers remains primary; Scanner opportunities remain fallback only.
- Candidate arrays remain bounded to 25 and retained for five minutes.
- `useActiveSetupMemory(candidates)` remains mounted, preserving localStorage and trading-database side effects.
- Markets context intake, Research context creation/storage, destination URL builders, navigation, and cleanup remain in `ScannerPage.tsx`.
- Candidate generation, score calculation, ranking, thresholds, and fallback precedence are unchanged.

## Investigation Semantics

Mover and fallback scores are preserved as scores. Mover ordering is labeled source-model investigation priority; fallback ordering is labeled heuristic investigation priority. Neither is confidence, expected return, probability, trade quality, or a recommendation. Canonical confidence is always unavailable because the current contracts do not supply an approved method.

Missing direction remains null and renders `UNAVAILABLE`. Supplied setup, direction, explanation, model basis, and risk are visibly source-model or heuristic context. Unsupported grades, tradeable counts, high-confidence counts, signal-feed framing, and primary Trade calls are absent from Scanner V2.

Structured numeric observations may become Evidence Cards only with supplied value, source ownership, availability, freshness limitation, and provenance limitation. Explanation strings and score breakdown are not treated as evidence proof. No display string becomes evidence identity.

Counter Evidence is explicitly unavailable. Supplied risk text remains source-model risk context without cited evidence linkage. No contradiction, alternative explanation, or invalidation evidence is generated.

## Identity and Handoffs

No durable candidate identity exists. Context ID, symbol, timestamps, queue position, and score are not presented as record identity.

- Replay retains the existing symbol-level URL and discloses that event identity, evidence identity, bounded UTC window, and prior validation are unavailable.
- Research retains the existing context builder, storage owner, context ID generation, and fallback navigation. Model and heuristic fields remain qualified context rather than cited evidence.
- Markets retains the existing URL and does not imply verification.
- Trade is secondary and labeled optional decision planning, not execution or recommendation.
- Repository Validation is `UNAVAILABLE`; no active `RepositoryLink`, request, URL, or record identity is created.

## Preview Strategy

The development-only foundation preview uses deterministic synthetic fixtures and performs no external request or Repository write. Fixtures cover source-model and fallback candidates, disclosed score basis, unavailable confidence, missing direction, retained failure, aging separate from freshness, structured observations, explanation/evidence separation, supplied risk, unavailable counter evidence, context-only identity, symbol-only Replay, Research context, unavailable Repository, optional Trade planning, long text, and narrow composition.

## Validation Results

| Check | Status | Result |
|---|---|---|
| Git inspection | PASS | Branch and final diff inspected. |
| TypeScript | PASS | `npx tsc --noEmit` completed successfully; generated build cache removed from diff. |
| Scanner adapter type checks | PASS | Executed successfully. |
| Scanner V2 smoke tests | PASS | All adapter, boundary, runtime-marker, and handoff assertions passed. |
| Existing R0 smoke tests | PASS | Executed successfully. |
| Existing R1 Dashboard smoke tests | PASS | Executed successfully. |
| Existing R2 Replay smoke tests | PASS | Executed successfully. |
| Existing R3 Research smoke tests | PASS | Executed successfully. |
| Existing R4 Markets smoke tests | PASS | Executed successfully. |
| Market Movers REST parity | PASS | Existing hook call and protected implementation remain unchanged. |
| Market Movers WebSocket fallback parity | PASS | Protected hook unchanged; static protected inspection completed. |
| Opportunity request-path parity | PASS | Existing path remains exact. |
| 45-second polling parity | PASS | Existing interval remains `45000`. |
| Timeout and retry parity | PASS | Existing `9000` timeout and one retry remain. |
| Fallback precedence parity | PASS | Existing Market Movers-first branch remains. |
| 25-item bounds parity | PASS | Existing bounds remain. |
| Five-minute retention parity | PASS | Existing constant and retention logic remain. |
| Active-setup persistence protected inspection | PASS | Hook call and protected hook file remain unchanged. |
| Trading-database side-effect protected inspection | PASS | Protected active-setup implementation remains unchanged. |
| Markets context intake parity | PASS | Existing context load, inspection, and ownership remain. |
| Research context creation and storage parity | PASS | Existing builder, `createContext`, context ID, and fallback remain. |
| Destination URL parity | PASS | Existing Markets, Replay, Research, and Trade builders remain. |
| No new search/filter/tab/sort/selection behavior | PASS | Capability contract is false and no controls were added. |
| Score-not-confidence rule | PASS | Separate typed models and smoke assertions passed. |
| Priority-is-investigation-only rule | PASS | Visible labels and limitations passed static rendering checks. |
| Missing-direction fail-closed rule | PASS | Null direction renders `UNAVAILABLE`. |
| No synthetic grades | PASS | Scanner V2 does not render grade. |
| No tradeable summary framing | PASS | Scanner V2 summary contains candidate count and source readiness only. |
| Evidence classification gate | PASS | Only structured numeric observations become evidence cards. |
| No display-string evidence identity | PASS | Evidence IDs derive from bounded observation fields, never display explanations. |
| Unavailable counter-evidence boundary | PASS | Static render and model assertions passed. |
| Investigation identity limitation | PASS | Durable candidate ID is typed null and disclosed. |
| Replay bounded-context limitation | PASS | Symbol-only limitation is visible. |
| Research handoff qualification | PASS | Existing context write is preserved; UI discloses model-context limitation. |
| Repository unavailable boundary | PASS | No active destination or identity renders. |
| Optional Trade handoff | PASS | Trade is last, secondary, and planning-only. |
| Desktop responsive smoke | NOT RUN | Browser could not attach or navigate to the local development page. |
| Tablet responsive smoke | NOT RUN | Browser could not attach or navigate to the local development page. |
| 393px mobile smoke | NOT RUN | Browser could not attach or navigate to the local development page. |
| Keyboard and focus smoke | NOT RUN | Browser could not attach or navigate to the local development page. |
| Browser console | NOT RUN | Browser could not attach or navigate to the local development page. |
| Prohibited-behavior scan | PASS | New adapter/components contain no requests, timers, sockets, persistence, candidate generation, rescoring, context writes, Repository writes, or recommendation conclusions. |
| Protected-system diff inspection | PASS | Diff is limited to the approved R5 scope. |
| Package and lockfile inspection | PASS | No package or lockfile changes. |

Formal WCAG and cross-browser audits are `NOT RUN`.

## Unresolved Limitations

- Canonical confidence and counter evidence remain unavailable.
- Candidates lack durable candidate, evidence, event, and Repository identities.
- Replay receives symbol-level context without a bounded incident window.
- Research context preserves legacy model fields but cannot turn them into cited evidence.
- Repository validation remains unavailable.
- Browser, viewport, keyboard, focus, console, formal accessibility, and cross-browser checks remain unexecuted.

## Protected Systems Confirmation

Scanner APIs, opportunity generation, scoring, ranking, thresholds, Market Movers hook and WebSocket fallback, active-setup memory and persistence, trading-database writes, product-context contracts and storage, Dashboard, Replay, Research, Markets, Trade, Repository, providers, scheduler, workers outside approved component tests, backfill, packages, lockfile, global CSS, and Figma assets remain unchanged.

## R6 Readiness

`READY WITH EXPLICIT LIMITATIONS`

The presentation migration is bounded and all executable static/regression checks pass. R6 may begin with the explicit browser-validation and identity/evidence-contract limitations recorded above.
