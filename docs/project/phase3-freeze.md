# Phase 3 Freeze and Release Candidate

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D30  
**Architecture status:** FROZEN  
**Release status:** Phase 4 transition candidate  
**Decision:** PHASE 3 FROZEN WITH LIMITATIONS

## 1. Freeze Summary

Phase 3 establishes the production data-governance and context-continuity
baseline for QuantTerminal's six-page decision pipeline:

```text
Dashboard -> Markets -> Scanner -> Research -> Replay -> Trade
```

The product pipeline, Shared Product Context runtime, production source
registry, canonical freshness and health derivation, additive Source Metadata
Envelope, source-backed ETF and Sector Rotation integrations, graceful Macro
unavailability, Replay/Trade context continuity, production mock isolation,
SaveTicker governance, and Reserve Intelligence envelope have all reached
their approved Phase 3 state.

D23 concluded that Phase 3 needed final cleanup. D24-D29 resolved the freeze
blockers that were approved for Phase 3:

* Dashboard Historical Analog and ownership leakage were removed;
* Markets/Scanner hierarchy ownership was normalized;
* inactive Yahoo and randomized pseudo/mock runtime paths were removed;
* eleven protected mock-backed routes were isolated from production;
* SaveTicker was registered as a production external source;
* critical envelope migrations were classified and blocked items made explicit;
* Reserve Intelligence received and passed certification for additive canonical
  `_source` metadata.

The remaining items are accepted limitations or Phase 4 governance work. They
do not justify fabricated data, unapproved fallbacks, or continued Phase 3
feature development.

## 2. Frozen Architecture

### 2.1 Six-Page Decision Pipeline

| Page | Frozen responsibility | Downstream handoff |
| --- | --- | --- |
| Dashboard | Fast market conclusion, direction, high-level drivers/evidence, prediction and tactical summary | Markets |
| Markets | Live exploration, breadth, rotation, venues, market structure, movers, and symbol analytics | Scanner |
| Scanner | Opportunity discovery, prioritization, ranking, filtering, and signal visibility | Research |
| Research | Thesis evaluation, supporting/conflicting evidence, narratives, attribution, and confidence context | Replay |
| Replay | Historical validation presentation, comparable context, outcomes, failure context, and replay metadata | Trade |
| Trade | Execution readiness and plan presentation, entries/exits, risk checklist, and local setup tracking | Dashboard monitoring |

Page ownership remains exclusive: Dashboard owns conclusions, Markets owns
exploration, Scanner owns prioritization, Research owns evidence, Replay owns
validation, and Trade owns execution presentation.

### 2.2 Shared Product Context

Shared Product Context V1 connects all five page transitions. The frozen
runtime provides:

* versioned context envelopes and stable context IDs;
* typed serialization/deserialization and schema validation;
* sessionStorage persistence with SSR-safe, structured failure behavior;
* source/destination intent validation;
* creation, update, deterministic merge, expiration, conflict, and clear
  lifecycle primitives;
* stale-revision protection and immutable identity fields;
* explicit unavailable behavior without synthetic thesis, evidence,
  validation, or execution context.

The static end-to-end audit passes all 30 checks. Current page handoffs create
new revision-1 snapshots and store rich context only for the browser session;
those are accepted limitations, not validation failures.

### 2.3 Source Governance and Registry

The canonical registry contains **33 registered production-approved sources**.
Registry validation passes with no duplicate IDs, inactive production entries,
missing owners/authorities, missing fallbacks, or fallback loops.

The registry distinguishes external authorities, normalized products, derived
intelligence, and caches. Registry defaults are governance metadata and never
stand in for runtime source health. SaveTicker is classified and registered as
a Research-owned production external source; the combined KR Retail response
does not falsely claim SaveTicker-only provenance.

### 2.4 Freshness and Health Runtime

All 33 registered sources have a canonical freshness policy. The runtime uses
only `LIVE`, `CURRENT`, `STALE`, `EXPIRED`, and `UNAVAILABLE`; missing, invalid,
future, or absent timestamps never become current.

Source Health is derived from canonical identity, runtime freshness, quality,
source status, and degradation/unavailable reasons. It uses only `HEALTHY`,
`DEGRADED`, `UNAVAILABLE`, `DISABLED`, and `UNKNOWN`. Missing metadata never
becomes healthy. Neither runtime polls providers or fabricates observations.

The read-only source-governance diagnostics endpoint exposes registry,
freshness, and derived health metadata without external requests, secrets,
file writes, or mutation.

### 2.5 Source Metadata Envelope

The frozen envelope architecture provides:

* `SourceBackedSuccess<T>`;
* `SourceBackedDegraded<T>`;
* `SourceBackedUnavailable`;
* canonical source identity, freshness, quality, status, timestamps,
  degradation/unavailable reasons, fallback identity, cache status, and
  production approval;
* additive `_source` migration rules that preserve all legacy payloads;
* strict separation between `retrievedAt` and source `lastUpdatedAt`;
* explicit unavailable behavior when data or trustworthy metadata is absent.

Six page-facing APIs currently emit additive canonical `_source` metadata:

| API | Source ID | Frozen status |
| --- | --- | --- |
| `/api/market/exchange-comparison` | `exchange-comparison` | Compatibility PASS |
| `/api/research/prediction-markets` | `prediction-markets` | Controlled rollout complete |
| `/api/etf-flow` | `etf-flow` | CERTIFIED WITH LIMITATIONS |
| `/api/macro` | `macro` | CERTIFIED WITH BLOCKER; unavailable safely |
| `/api/market/sector-rotation` | `sector-rotation` | CERTIFIED WITH LIMITATIONS |
| `/api/dashboard/reserve-intelligence` | `exchange-reserve` | CERTIFIED WITH LIMITATIONS |

## 3. Product Status

| Page | Status | Phase 3 basis and accepted limitations |
| --- | --- | --- |
| Dashboard | READY WITH LIMITATIONS | Ownership cleanup and integration audit pass. ETF, Macro, Sector Rotation, and Reserve metadata are governed. Market Drivers, Market Movers, Futures, narratives, and Dashboard Prediction Markets retain legacy provenance; current Reserve data may be expired. |
| Markets | READY WITH LIMITATIONS | Frozen hierarchy and exploration ownership remain intact. ETF, Sector Rotation, Exchange Comparison, and Reserve source metadata are additive. Movers, Futures, symbol context, and Market Structure remain deferred migrations; direct live streams retain route-specific health. |
| Scanner | READY WITH LIMITATIONS | Ranking and opportunity ownership are unchanged. Market Movers and the bare-array Scanner Opportunities contract remain unenveloped; missing inputs degrade without invented candidates. |
| Research | READY WITH LIMITATIONS | Evidence workflow, manual historical loading, Macro safe-unavailable behavior, and Research Prediction Markets metadata are certified. Narratives, Event Impact, Historical Analog, and Market Memory retain deferred provenance work. |
| Replay | READY WITH LIMITATIONS | Inherited validation context is certified and direct entry remains functional. Datasets are optional, comparable cases are not generated, and orderbook remains cache/manual with no request-path reconstruction. |
| Trade | READY WITH LIMITATIONS | Replay-to-Trade inherited readiness context is certified. Direct entry remains usable. No execution, sizing, risk, broker, or readiness-scoring engine exists, and none is implied by Phase 3. |

No page is blocked from its approved workflow. Limitations surface as explicit
partial, stale, expired, empty, or unavailable states.

## 4. Governance Status

### 4.1 Completed Governance

* **Registry:** 33/33 sources production-approved and covered by freshness
  policies.
* **Shared Context:** end-to-end audit PASS, 30/30 checks.
* **Mock isolation:** PASS, all eleven D24 routes gated; production fails closed
  without exposing mock payloads. The existing live Polymarket enqueue branch
  remains separate.
* **Source usage audit:** SaveTicker now resolves canonically; watched
  unregistered findings are zero. Retained mock source terms are protected by
  D25 isolation.
* **Envelope compatibility:** additive-only policy and legacy branch
  preservation established.
* **Source-backed certifications:** ETF Flow, Macro safety/freshness, Sector
  Rotation, Reserve Intelligence envelope.
* **Context certifications:** Replay validation context and Trade readiness
  context.
* **No-fabrication policy:** unavailable data remains unavailable; no source
  certification authorizes placeholder metrics, timestamp substitution,
  synthetic validation, or generated execution context.

### 4.2 Certification Record

| Certification | Decision |
| --- | --- |
| ETF / Capital Flow | CERTIFIED WITH LIMITATIONS |
| Macro Freshness | CERTIFIED WITH BLOCKER |
| Sector Rotation | CERTIFIED WITH LIMITATIONS |
| Replay Validation Context | CERTIFIED WITH LIMITATIONS |
| Trade Readiness Context | CERTIFIED WITH LIMITATIONS |
| Reserve Intelligence Envelope | CERTIFIED WITH LIMITATIONS |
| Exchange Comparison Envelope Compatibility | PASS |
| Production Mock Route Isolation | PASS |
| Shared Product Context End-to-End | PASS |

### 4.3 Blocked Envelope Migrations

The following migrations remain blocked and must not be forced after freeze:

| API | Blocker |
| --- | --- |
| `/api/market-drivers` | No canonical aggregate source ID or weakest-constituent health contract. |
| `/api/scanner/opportunities` | Bare-array response cannot receive top-level additive `_source` without a compatibility/versioning decision. |
| `/api/research/market-memory` | `process-local-fallback` is not an approved source or registered fallback. |
| `/api/replay/binance-positioning` | Canonical identity for direct historical-range Binance REST versus `binance-vision` is unresolved. |
| `/api/health` | Process runtime state is not the registered `data-health` artifact and requires a distinct diagnostics contract. |

After the D28 Reserve migration, fifteen critical APIs remain without
canonical envelopes: two medium-risk, eight high-risk, and the five blocked
routes above. These are deferred governance items, not Phase 3 failures.

## 5. Remaining Objective Limitations

### 5.1 Source Availability and Freshness

* **Macro:** Stooq quote access returns HTTP 404 and historical access presents
  an anti-bot challenge. No approved fallback exists. Macro correctly remains
  `UNAVAILABLE`; Yahoo and FRED remain prohibited.
* **Reserve Intelligence:** the current artifact may be, and at freeze time is,
  `EXPIRED`. Canonical freshness depends on a valid `observedAt`; the envelope
  does not refresh data.
* **ETF / Capital Flow:** Farside `/btc/` and `/eth/` readers are latest-oriented.
  The Farside all-data page is not normalized or consumed. Daily flow may be
  stale outside publication windows; durable historical normalization remains
  future work.
* **Sector Rotation:** aggregate freshness follows the oldest contributing
  observation; one exchange or low-activity asset may reduce aggregate status.
* **Exchange Comparison and Research Prediction Markets:** additive envelopes
  are present, but trusted source observation time may remain unavailable.

### 5.2 Context and Product Boundaries

* Shared context is session-scoped and per-handoff snapshot based; copied URLs,
  other sessions, browsers, and devices cannot recover rich payloads.
* Browser click-through remains a manual integration check.
* Replay direct entry may lack inherited Research context; Trade direct entry
  may lack inherited Replay validation context.
* Replay adds no validation engine, historical matcher, generated comparable
  cases, outcomes, or request-path orderbook reconstruction.
* Trade adds no execution, sizing, risk, broker, or readiness-scoring engine.

### 5.3 Deferred Governance

* The remaining medium/high-risk envelope batches in D27 require Phase 4
  planning and dedicated certification.
* Direct browser Binance REST/WebSocket paths retain their existing runtime
  diagnostics rather than API `_source` envelopes.
* `/api/kr-retail` intentionally exposes no canonical envelope until a
  multi-source or derived KR Retail identity is approved.
* `source-envelope-rollout-status.md` remains the historical D8 two-pilot
  control record; D27 and this freeze document are the current migration
  baseline.
* D12 intentional unavailable and ownership-boundary items remain unavailable.
* Protected historical tooling remains in source for explicit development/test
  use but is production-gated under D25.

## 6. Freeze Policy

Phase 3 functionality and architecture are frozen upon this document's
acceptance.

After freeze:

* new capabilities, providers, intelligence, APIs, page behavior, envelope
  migrations, and context expansion require documented Phase 4 planning;
* Phase 3 runtime may be modified only for objective production defects;
* defect fixes must preserve page ownership, real-data-only behavior,
  responsiveness, backward compatibility, and no-fabrication rules;
* unavailable, stale, expired, and blocked states must not be bypassed with
  placeholders or unapproved fallbacks;
* subjective redesigns, undocumented features, opportunistic refactors, and
  hierarchy drift are prohibited;
* protected Replay, websocket, ingestion, orderbook, and information
  intelligence systems retain their existing approval requirements.

Phase 4 begins only through a separately documented architecture or product
sprint. D30 does not start Phase 4 implementation.

## 7. Final Decision

**PHASE 3 FROZEN WITH LIMITATIONS**

The six-page product is coherent and operational, Shared Product Context and
governance runtimes validate successfully, unsafe mock production access is
isolated, all sources are registered with freshness policy coverage, and the
approved Phase 3 implementations have passed certification. Remaining source
availability, context portability, and envelope coverage limits are explicit,
graceful, ownership-safe, and non-fabricating.

QuantTerminal is ready to transition into Phase 4 planning from this frozen
release-candidate baseline.

## 8. Validation

Required release-candidate suite:

* TypeScript (`npx.cmd tsc --noEmit --pretty false --incremental false`): PASS.
* Dashboard Integration Audit: PASS, including Historical Analog removal,
  hierarchy, Reserve connection, and Reserve envelope checks.
* Intelligence Smoke Test: PASS, 10 checks passed and 0 failed.
* Production build (`npm run build`): PASS; compilation, type validation, all
  55 static pages, and build tracing completed.

Supplemental architecture checks:

* Source Registry validation: PASS, 33 production-approved sources and no
  issues.
* Freshness Rules validation: PASS, 33 policies with no missing, unknown, or
  invalid source IDs.
* Shared Product Context audit: PASS, 30/30 checks; three accepted warnings
  retained for per-hop revisions, selective forwarding, and manual browser
  click-through.
* Production Mock Route Isolation audit: PASS, 11/11 protected routes gated.
* Source Registry Usage audit: REPORT_ONLY; 496 files and 76 API routes scanned,
  33/33 sources matched, zero watched findings, and 11 retained mock source
  findings protected by D25 isolation.
* Page readiness: six pages READY WITH LIMITATIONS; zero BLOCKED.
* Runtime, API, page, and package changes in D30: none.
