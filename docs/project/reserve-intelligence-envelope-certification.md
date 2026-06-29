# Reserve Intelligence Envelope Certification

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D29  
**Certification target:** D28 `/api/dashboard/reserve-intelligence` migration  
**Decision:** CERTIFIED WITH LIMITATIONS

## 1. Certification Summary

D28 is certified as a backward-compatible, additive Source Metadata Envelope
migration. The route retains its existing Reserve Intelligence artifact reader,
selection and ranking behavior, legacy response fields, and HTTP status
semantics. Canonical `_source` metadata is added to every existing response
branch without changing Dashboard or Markets consumers.

The current deployable artifact is expired under the canonical
`exchange-reserve` freshness policy. The envelope reports that state honestly
while preserving the legacy response. This is a source-data limitation, not an
implementation defect.

## 2. Source Certification

**Decision: PASS**

Verified:

* `_source.sourceId` is exactly `exchange-reserve`;
* `exchange-reserve` is registered, `ACTIVE`, and production-approved;
* registry authority remains `QuantTerminal Binance reserve snapshots and
  retained deltas`;
* the route still reads only the existing deployable artifact
  `.data/artifacts/reserve-intelligence-latest.json`;
* no provider, fallback, registry identity, request path, mock source, fixture,
  or test source was added;
* `fallbackSourceId` remains `null`.

The existing legacy `source` value is preserved separately. It does not replace
or override the canonical envelope identity.

## 3. API Compatibility Certification

**Decision: PASS**

Comparison with the pre-D28 route confirms that the only response-shape change
is additive `_source` metadata.

| Branch | Legacy behavior preserved | Envelope addition |
| --- | --- | --- |
| Success | HTTP 200; `ok`, `status`, `source`, `generatedAt`, `observedAt`, `freshness`, `coverage`, and `observations` unchanged | Success, degraded, or unavailable metadata according to canonical timestamp/coverage evaluation |
| Empty observations | HTTP 200; `ok: true`, `status: unavailable`, artifact metadata, empty `observations`, and `reason` unchanged | Explicit `EMPTY_RESPONSE` metadata |
| Invalid artifact | HTTP 200; `ok: false`, `status: unavailable`, and legacy `reason` unchanged | Explicit `INVALID_RESPONSE` metadata |
| Read/parse failure | HTTP 200; `ok: false`, `status: unavailable`, and existing error-derived `reason` unchanged | Explicit `SOURCE_UNAVAILABLE` metadata |

Dashboard and Markets continue parsing the same legacy object fields. Their
response types tolerate unknown additive properties, so no consumer refactor
or page change is required.

## 4. Envelope Certification

**Decision: PASS**

Verified:

* `_source` is present in all four existing response branches;
* the envelope remains a top-level additive property and does not wrap the
  payload;
* `createSourceSuccess`, `createSourceDegraded`,
  `createSourceUnavailable`, and `normalizeSourceMetadata` are used;
* canonical `evaluateFreshness` is used before success/degraded classification;
* stale source data maps to `STALE_DATA` degradation;
* partial coverage, non-current artifact state, or partial observations map to
  `PARTIAL_DATA` degradation when canonical freshness remains usable;
* expired or indeterminate source time maps to explicit unavailable metadata;
* no configured or invented fallback is reported.

The static Dashboard integration audit now verifies the canonical source ID,
freshness helper use, and additive `_source` marker.

## 5. Freshness Certification

**Decision: PASS**

Canonical freshness receives only:

* `lastUpdatedAt`: the artifact's existing `metadata.observedAt`;
* `retrievedAt`: the actual route request/evaluation time.

`generatedAt` and retrieval time are never substituted for missing
`observedAt`. The registered policy is one hour current and six hours stale.
Focused runtime checks confirmed:

* a null `observedAt` returns `UNAVAILABLE` with
  `MISSING_LAST_UPDATED_AT` and `lastUpdatedAt: null`;
* the current artifact observation at `2026-06-23T23:05:58.000Z` returns
  `EXPIRED` rather than inheriting the legacy lowercase `current` label;
* envelope `retrievedAt` records evaluation time only;
* a missing timestamp cannot become `CURRENT`.

## 6. No-Fabrication Certification

**Decision: PASS**

Verified:

* reserve observations and values still come exclusively from the existing
  validated deployable artifact;
* no reserve balance, delta, quality, or observation was created by the
  envelope logic;
* no timestamp is synthesized as source time;
* no freshness or health state is inferred from retrieval time;
* no reserve narrative, confidence, score, or fallback value was introduced;
* unavailable and expired source states remain explicit.

## 7. Known Limitations

* The current deployable artifact may be, and presently is, `EXPIRED` under the
  canonical runtime policy.
* Canonical freshness depends entirely on a valid artifact `observedAt`.
* `_source` is metadata only; it does not refresh or replace Reserve
  Intelligence data.
* Legacy lowercase freshness fields remain unchanged for backward
  compatibility and may differ from canonical `_source.freshnessStatus`.
* No page behavior changed and current pages do not yet consume the new
  envelope directly.
* No new reserve provider or fallback was added.

## 8. Certification Decision

**CERTIFIED WITH LIMITATIONS**

The D28 implementation meets source identity, compatibility, envelope,
freshness, and no-fabrication requirements. The accepted limitation is data
age: the current artifact is expired. Certification does not reinterpret that
artifact as current and does not authorize a new provider or refresh path.

## 9. Validation

* TypeScript (`npx.cmd tsc --noEmit --pretty false --incremental false`): PASS.
* Dashboard Integration Audit: PASS, including
  `reserveSourceEnvelopePresent`.
* Intelligence Smoke Test: PASS, 10 checks passed and 0 failed.
* Production build (`npm run build`): PASS; compilation, type validation, 55
  static pages, and build tracing completed.
* Registry/freshness focused check: PASS; `exchange-reserve` is active and
  production-approved, and null source time returns `UNAVAILABLE`.
* Current-artifact route check: PASS; HTTP 200 and all legacy success keys were
  retained, with canonical `_source.freshnessStatus: EXPIRED`.
* Runtime/API corrections in D29: none.
* Page changes: none.
* Package changes: none.
