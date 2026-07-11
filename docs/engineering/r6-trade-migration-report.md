# R6 V2.1 Trade / Decision Workspace React Migration Report

## Decision

`READY WITH EXPLICIT LIMITATIONS`

Trade V2 is migrated as a planning-only Decision Workspace. `TradePage.tsx` remains the sole runtime controller. Browser validation was attempted through both available browser surfaces, but neither could navigate or attach to the local page; responsive, focus, and console checks remain `NOT RUN`.

## Exact Files Changed

### New

- `lib/trade-presentation/contracts.ts`
- `lib/trade-presentation/adapters.ts`
- `components/trade-v2/TradeV2View.tsx`
- `components/trade-v2/DecisionWorkspaceShell.tsx`
- `components/trade-v2/DecisionSummarySection.tsx`
- `components/trade-v2/EvidenceSummarySection.tsx`
- `components/trade-v2/SupportingEvidenceSection.tsx`
- `components/trade-v2/CounterEvidenceSection.tsx`
- `components/trade-v2/ScenarioAnalysisSection.tsx`
- `components/trade-v2/RiskAssessmentSection.tsx`
- `components/trade-v2/ExecutionPlanSection.tsx`
- `components/trade-v2/DecisionHandoffs.tsx`
- `components/trade-v2/index.ts`
- `workers/component-tests/tradeAdapterTypeChecks.ts`
- `workers/component-tests/runTradeV2SmokeTest.tsx`
- `docs/engineering/r6-trade-migration-report.md`

### Modified

- `components/trade/TradePage.tsx`
- `components/foundation-preview/ReactFoundationPreview.tsx`

No route, API, context contract/storage, hook, store, Repository, package, lockfile, global CSS, provider, scheduler, worker-runtime, backfill, or Figma file changed.

## Models and Adapter Rules

Bounded models cover Decision Context, Summary, Snapshot, Preparation Readiness, structured observations, unavailable Counter Evidence, unavailable Scenarios, separated risk sources, Decision Plan, local Planning Records, review state, identity, handoffs, and unavailable Repository traceability.

The adapter performs no request, timer, subscription, persistence, evidence generation, scenario generation, counter-evidence generation, confidence calculation, order operation, position mutation, context mutation, or Repository operation. Score, readiness, confidence, coverage, checklist completion, recommendation, execution status, and identity remain separate.

## Sections Migrated

1. Permanent planning-only boundary
2. Decision Summary and candidate context selection
3. Decision Snapshot and Preparation Readiness
4. Evidence Summary and structured observations
5. Counter Evidence unavailable boundary
6. Scenario Analysis unavailable boundary
7. Risk Assessment with source separation
8. Decision Plan and local Planning Records
9. Monitoring/Review boundary and contextual handoffs
10. Repository unavailable boundary

Legacy presentation remains present but unreachable during the parity window.

## Runtime Preservation

- URL symbol and Replay product-context intake remain unchanged.
- Candidate fallback, focus selection, active-memory selection, 10-item bounds, and five-minute retention remain unchanged.
- Market Movers behavior remains in the protected hook.
- Trade, liquidation, market, and orderbook realtime subscriptions remain controller-owned.
- Futures intelligence performs its existing immediate request and 30-second polling with active-flag and interval cleanup.
- The existing runtime has no request-timeout implementation for futures polling; none was invented during R6.
- Active-setup persistence remains mounted and unchanged.
- `qt.trade.setupMemory.v2` load/write behavior, random local IDs, record creation, status updates, and deletion remain unchanged.
- Existing Markets URL construction and generic navigation remain unchanged.

## Decision Boundaries

`PLANNING ONLY / NO ORDER ENTRY` appears before all decision content. No order ticket, side selector, quantity, price, leverage, wallet, broker, exchange connection, or order-submit control exists.

The Decision Snapshot reports explicit availability only. Preparation Readiness remains `INCOMPLETE` when Counter Evidence, Scenarios, user risk limits, or durable identity are absent. It is not confidence, probability, recommendation, checklist completion, or execution permission.

Candidate scores remain source-model scores and never become confidence or readiness. Canonical confidence is unavailable.

Only supplied numeric ticker, futures, trade-flow, orderbook, and liquidation observations are presented as structured facts. Candidate reasons and generated explanatory strings remain source-model context and are not Evidence Cards or evidence identities.

Counter Evidence and Scenario Analysis render `UNAVAILABLE`. Invalidation text remains a source-model planning condition and does not become counter evidence or a scenario.

Risk Assessment separates source-model risk, local heuristic risk with basis, user-supplied risk, and missing risk inputs. User risk limits, position sizing, macro risk, and canonical liquidity risk remain unavailable.

Decision Plan levels are source-model, planning-only, non-interactive, and unsupported by order entry. Existing localStorage records are labeled Local Planning Records. Stored `Won` and `Lost` values remain unchanged internally but render as `Favorable review` and `Adverse review`.

## Identity and Repository Boundary

URL symbol, Replay context ID, selected candidate, local planning-record ID, durable decision identity, and Repository identity remain distinct. A random local ID is local planning identity only. Durable decision identity and Repository traceability remain unavailable; no Repository link or request was added.

## Preview Strategy

The development-only foundation preview contains deterministic synthetic Trade fixtures and performs no request or Repository write. It covers the planning-only boundary, selected context, available Replay envelope, structured observations, separated model explanation, unavailable Counter Evidence and Scenarios, partial risk, model planning levels, preparation requirements, local Planning Record, missing durable identity, unavailable Repository, long text, and narrow composition.

## Validation Results

| Check | Status | Result |
|---|---|---|
| Git inspection | PASS | Branch and diff inspected. |
| TypeScript | PASS | `npx tsc --noEmit` completed; generated cache removed from diff. |
| Trade adapter type checks | PASS | Executed successfully. |
| Trade V2 smoke tests | PASS | All boundary, adapter, rendering, runtime-marker, persistence, and navigation assertions passed. |
| Existing R0 smoke tests | PASS | Executed successfully. |
| Existing R1 Dashboard smoke tests | PASS | Executed successfully. |
| Existing R2 Replay smoke tests | PASS | Executed successfully. |
| Existing R3 Research smoke tests | PASS | Executed successfully. |
| Existing R4 Markets smoke tests | PASS | Executed successfully. |
| Existing R5 Scanner smoke tests | PASS | Executed successfully. |
| URL symbol intake parity | PASS | Existing query ownership remains. |
| Replay context intake parity | PASS | Existing load, lifecycle inspection, source and destination gates remain. |
| Candidate fallback and selection parity | PASS | Existing selection function and state ownership remain. |
| 10-item bounds parity | PASS | Existing bounds remain. |
| Five-minute retention parity | PASS | Existing constant and retention logic remain. |
| Market Movers protected inspection | PASS | Hook implementation unchanged. |
| Four realtime subscriptions protected inspection | PASS | Existing four hook calls remain; hook files unchanged. |
| 30-second futures polling parity | PASS | Existing cadence and cleanup remain. |
| Futures request timeout parity | NOT APPLICABLE | The pre-R6 runtime has no futures request-timeout mechanism. R6 did not add one. |
| Active-setup persistence protected inspection | PASS | Existing hook call and protected implementation remain. |
| Local planning-record load/write parity | PASS | Existing localStorage functions remain. |
| Random local ID behavior parity | PASS | Existing `crypto.randomUUID()` remains. |
| Local status-update parity | PASS | Existing persisted values and update callback remain. |
| Local deletion parity | PASS | Existing deletion callback remains. |
| Markets URL parity | PASS | Existing query construction remains. |
| Generic navigation parity | PASS | Existing destinations remain. |
| No order-entry control | PASS | Static render and prohibited scan contain no order controls. |
| No exchange/broker/wallet integration | PASS | No integration or dependency added. |
| Permanent planning-only boundary | PASS | Static render asserts both required labels. |
| Decision Snapshot availability-only behavior | PASS | Snapshot contains states and no percentage/readiness score. |
| Score-not-confidence rule | PASS | Separate model and unavailable canonical confidence. |
| Readiness-not-confidence rule | PASS | Disclosed prerequisites only. |
| Evidence classification gate | PASS | Only numeric observations render as factual metrics. |
| No display-string evidence identity | PASS | Explanations do not become evidence models or IDs. |
| Unavailable Counter Evidence boundary | PASS | Static render and model assertion passed. |
| Unavailable Scenario Analysis boundary | PASS | Static render and model assertion passed. |
| Risk source separation | PASS | Source-model, heuristic, user, and missing categories remain separate. |
| Source-model planning qualification | PASS | Every level is planning-only and non-executable. |
| Local planning identity versus Repository identity | PASS | Typed separately; durable and Repository IDs remain null. |
| Repository unavailable boundary | PASS | No active destination or identity renders. |
| Desktop responsive smoke | NOT RUN | Both browser surfaces failed before local page inspection. |
| Tablet responsive smoke | NOT RUN | Both browser surfaces failed before local page inspection. |
| 393px mobile smoke | NOT RUN | Both browser surfaces failed before local page inspection. |
| Keyboard and focus smoke | NOT RUN | Both browser surfaces failed before local page inspection. |
| Browser console | NOT RUN | Both browser surfaces failed before local page inspection. |
| Prohibited-behavior scan | PASS | New presentation contains no requests, timers, sockets, persistence, scenario/evidence generation, order APIs, or Repository writes. |
| Protected-system diff inspection | PASS | Diff is limited to approved R6 files. |
| Package and lockfile inspection | PASS | No package or lockfile changes. |

Formal WCAG and cross-browser audits are `NOT RUN`.

## Unresolved Limitations

- Canonical Counter Evidence, Scenario Analysis, confidence, and durable decision identity remain unavailable.
- Structured observations have source limitations but no evidence or Repository record identity.
- Replay context is an envelope, not record-level evidence or causal validation.
- Research and Replay generic links do not carry a new enriched Trade context.
- User risk limits, position sizing, macro risk, canonical liquidity risk, and canonical monitoring/review contracts remain unavailable.
- Browser, viewport, keyboard, focus, console, formal accessibility, and cross-browser checks remain unexecuted.
- The protected futures request has no timeout behavior to preserve.

## Protected Systems Confirmation

Trade routes/APIs, product-context contracts/storage, Market Movers and active-setup hooks, realtime and orderbook hooks, stores, Scanner, Dashboard, Replay, Research, Markets, Repository, providers, scheduler, workers outside approved tests, backfill, packages, lockfile, global CSS, and Figma assets remain unchanged.

## React Migration Completion

`READY WITH EXPLICIT LIMITATIONS`

The canonical Dashboard, Replay, Research, Markets, Scanner, and Trade presentation migrations now share the R0 foundation. All executable static and regression checks pass, while browser validation and unavailable evidence/identity contracts remain explicit limitations.
