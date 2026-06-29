# Signal Evaluation Runtime Foundation

This directory implements the pure Signal Evaluation model defined by
`docs/project/signal-evaluation-constitution.md`. It accepts an existing Signal
Snapshot reference, one canonical tracking window, and caller-supplied
source-backed price observations. It returns deterministic metrics or an
explicit unavailable result.

It does not fetch, schedule, persist, track, or evaluate live signals
automatically.

## Modules

* `types.ts`: versioned input, window, observation, metric, result, status, and
  structured error contracts.
* `direction.ts`: LONG, SHORT, and NEUTRAL direction handling, correctness, and
  invalidation checks.
* `outcomeStatus.ts`: deterministic `FAVORABLE`, `ADVERSE`, `FLAT`, or
  `UNAVAILABLE` classification.
* `validation.ts`: input, timestamp, canonical-window, metric, and result
  validation.
* `metrics.ts`: pure calculation from supplied source-backed observations.
* `serialize.ts`: non-throwing JSON serialization and deserialization.
* `index.ts`: public exports.

## Runtime Purpose

The runtime provides a canonical result model for one completed tracking
window. `evaluateSignalWindow()` is a pure function. It reads no clock, file,
browser storage, network, API, queue, or process state.

The input field `entryPrice` is the source-backed signal reference price at
emission. It is not a Trade fill, and the calculated `returnPercent` is not
realized user PnL.

Window timestamps must match the Signal Snapshot `createdAt` and the duration
from `lib/signal-tracking/windows.ts`. The final observation must match the
canonical window end. Observations must be ordered, inside the window,
positive, finite, timestamped, and source-attributed.

## Supported Metrics

The runtime supports only:

* `returnPercent`;
* `maxFavorableExcursion`;
* `maxAdverseExcursion`;
* `drawdown`;
* `runup`;
* `timeToMaxFavorable`;
* `timeToMaxAdverse`;
* `invalidationHit`;
* `directionCorrect`;
* `outcomeStatus`.

LONG uses raw percentage return for direction adjustment. SHORT negates it.
NEUTRAL has no directional claim, so favorable/adverse excursion, time to
directional extremes, invalidation, and correctness remain `null`.
`outcomeStatus` is `FLAT` for an exact zero NEUTRAL return and `UNAVAILABLE`
otherwise; no synthetic neutral tolerance is invented.

Drawdown and runup describe the supplied market-price path. They do not imply
a trade, fees, slippage, leverage, size, or execution.

## No-Fabrication Rules

* Missing entry or observation prices produce a canonical `UNAVAILABLE` result
  with null metrics and a reason.
* Malformed prices, identities, windows, metrics, or timestamps return
  structured errors.
* Missing confidence, evidence, freshness, source health, invalidation level,
  or user behavior is never inferred.
* Retrieval time never replaces signal or market observation time.
* The runtime never interpolates candles, fills gaps, chooses fallback sources,
  or claims observation coverage beyond the supplied points.
* No subjective score, narrative, confidence adjustment, or AI output exists.

Callers remain responsible for supplying price observations that satisfy the
approved source-coverage policy. This model validates identity, boundaries,
ordering, endpoint, numeric safety, and provenance fields; it does not certify
provider completeness.

## Relationship to Signal Tracking

Signal Tracking owns immutable schedule identity and forward-only window state.
It may pass a frozen snapshot reference and canonical window into this runtime
after a future collector supplies observations. Signal Evaluation owns the
metrics and signal outcome only.

This runtime does not transition Tracking state. A future integration must mark
a Tracking window complete only after receiving and validating an Evaluation
result. One window remains independent from every other window.

## Intentionally Not Implemented

P4-6 includes no:

* cron job, scheduler, timer, queue, lease, or background worker;
* database, file, memory repository, browser storage, or persistence adapter;
* network call, API route, fetch, WebSocket, or price collector;
* automatic signal enrollment or live evaluation;
* Learning, Pattern, Playbook, AI, LLM, broker, Trade, or Outcome integration;
* page or product-runtime integration.

## Future P4-7 Dependency

P4-7 may consume validated `SignalEvaluationResult` records and the existing
Tracking lifecycle to define the next integration boundary. It must preserve:

* immutable Signal Snapshot and window identity;
* source-backed observations only;
* `UNAVAILABLE` rather than inferred metrics;
* independent window results;
* signal return distinct from user trade PnL;
* no mutation of completed Tracking windows.

Persistence, scheduling, collection, APIs, and autonomous execution require
separate approved sprints.

