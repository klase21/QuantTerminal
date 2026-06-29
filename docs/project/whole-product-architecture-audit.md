# Whole Product Architecture Audit

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D23  
**Date:** 2026-06-28  
**Scope:** Dashboard, Markets, Scanner, Research, Replay, and Trade  
**Decision:** PHASE 3 NEEDS FINAL CLEANUP

## 1. Executive Summary

The six-page decision pipeline is coherent and operational:

```text
Dashboard -> Markets -> Scanner -> Research -> Replay -> Trade
```

All five page handoffs use the Shared Product Context runtime, preserve context
identity, validate lifecycle state, degrade without blocking direct entry, and
respect wrapper ownership. ETF flow, Macro, Sector Rotation, Replay context,
and Trade context have all passed their Phase 3 certification gates.

Phase 3 is not ready to freeze yet. The remaining work is cleanup and
governance reconciliation, not new intelligence:

1. Dashboard still loads and renders Historical Analog despite `AGENTS.md` and
   ADR-001 assigning historical workflows to Research and Replay.
2. Dashboard `Execution Guidance` and Markets `Ranked Opportunities` overlap
   Trade and Scanner language/ownership respectively.
3. Canonical source envelopes are deployed on only five routes; most critical
   Dashboard, Scanner, Replay, and Trade dependencies still expose legacy
   provenance and freshness contracts.
4. The source audit reports one inactive Yahoo implementation, one unregistered
   SaveTicker use, and eleven production-reachable mock-backed routes.
5. An inactive duplicate file, `app/api/macro/route (2).ts`, contains randomized
   pseudo Macro data. It is not a Next.js route, but it remains inside production
   source scope and conflicts with the no-fabrication rule.
6. Shared context is session-scoped and snapshot-based; every handoff creates a
   new revision-1 context instead of updating one end-to-end context lineage.

No runtime or API correction is made by this audit.

## 2. Whole Product Ownership

### 2.1 Page Ownership Review

| Page | Canonical ownership | Result | Remaining overlap |
| --- | --- | --- | --- |
| Dashboard | Market conclusion, direction, reasons, evidence preview, health | PASS WITH LIMITATIONS | Historical Analog violates ADR-001. `Signal Evidence` and `Execution Guidance` extend beyond a lightweight evidence preview toward Research/Trade language. |
| Markets | Live market exploration, breadth, rotation, venues, structure, movers | PASS WITH LIMITATIONS | `Ranked Opportunities` uses Scanner-owned ranking/opportunity language and the same Market Movers domain. |
| Scanner | Opportunity discovery, prioritization, ranking, filtering, signal visibility | PASS | Scanner does not create thesis, evidence, validation, or execution context. |
| Research | Thesis evaluation, supporting/conflicting evidence, narratives, attribution, confidence context | PASS | Manual historical workflows remain correctly scoped; Research does not create validation. |
| Replay | Historical validation presentation, replay metadata, outcomes, failure context | PASS | Replay creates only display-level validation/replay availability; it does not create execution. |
| Trade | Execution presentation, setup, entries/exits, risk checklist, local setup tracking | PASS | Trade reads inherited validation but keeps candidate-driven planning independent. No sizing or execution engine exists. |

### 2.2 Duplication Review

**Conclusions:** Dashboard alone owns the primary market conclusion. No other
page recreates the Dashboard conclusion.

**Evidence generation:** Research remains the evidence owner. Dashboard uses
evidence previews and mover-derived signal summaries, but its detailed `Signal
Evidence` presentation is an ownership-language overlap that should be
reconciled before freeze.

**Prioritization:** Scanner remains the canonical prioritization owner.
Markets displays an existing Market Movers ranking for exploration, producing
a documented overlap but not a second ranking algorithm.

**Validation:** Replay alone creates Replay validation display state. Research
selects a replay target but does not validate it. Trade reads Replay status
without recomputation.

**Execution:** Trade alone owns the execution plan and checklist. Dashboard's
`Execution Guidance` is a presentation overlap; it does not use the Trade
engine or create a durable execution plan.

Ownership result: **PASS WITH CLEANUP REQUIRED**.

## 3. Shared Product Context

### 3.1 Handoff Matrix

| Handoff | Identity preservation | Lifecycle validation | Unavailable behavior | Ownership preservation | Result |
| --- | --- | --- | --- | --- | --- |
| Dashboard -> Markets | Symbol and context ID preserved; optional conclusion wrappers retained | Markets loads and inspects the context and verifies Dashboard/exploration intent | Direct navigation remains available; missing or invalid context does not affect Markets APIs | Dashboard conclusion is display-only; Markets derives its own structure | PASS |
| Markets -> Scanner | Symbol, exchange, timeframe, structure, sector, breadth, and freshness preserved when available | Scanner inspects lifecycle and verifies Markets/prioritization intent | Scanner ranking continues without context | Markets structure remains Markets-owned; Scanner does not convert it into a signal | PASS |
| Scanner -> Research | Symbol, opportunity, signal, confidence, and freshness preserved when available | Research inspects lifecycle and verifies Scanner/evaluation intent | Research remains usable without inherited context | Scanner wrappers remain read-only; Research creates evidence only from Research sources | PASS |
| Research -> Replay | Symbol, exchange, timeframe, thesis, evidence, confidence, structure, freshness, and replay target preserved when available | Replay inspects lifecycle and verifies Research/validation intent | Direct Replay controls remain available; absent fields stay unavailable | Research evidence remains Research-owned; Replay does not rewrite it | PASS |
| Replay -> Trade | Symbol, exchange, timeframe, upstream wrappers, Replay validation, and replay availability preserved | Trade inspects lifecycle and verifies Replay/execution intent | Missing, expired, malformed, or wrong-handoff context becomes `UNAVAILABLE`; direct Trade remains usable | Replay owns validation; Trade keeps inherited context display-only | PASS |

The standalone Shared Product Context audit passes all 30 checks. It confirms
schema versioning, context identity, timestamps, expiration, stale-revision
protection, page integration, ownership exclusions, and the absence of fetches
or synthetic terms in handoff helpers.

### 3.2 Remaining Context Limitations

- Each transition creates a new revision-1 snapshot. Lifecycle update and merge
  are not used across page transitions.
- Context is stored in `sessionStorage`; copied URLs, new sessions, other
  browsers, and other devices cannot recover the rich payload.
- Browser click-through remains a manual integration check.
- Available wrappers are forwarded selectively rather than through one durable
  end-to-end context lineage.
- Fallback vocabulary is inconsistent. Markets, Scanner, Research, and Replay
  may use `MISSING` or `DEGRADED` where Trade uses `UNAVAILABLE` for comparable
  absent or wrong-handoff states.

Shared context result: **PASS WITH KNOWN LIMITATIONS**.

## 4. Source Governance

### 4.1 Registry and Runtime

- The canonical registry contains 32 approved source definitions.
- The static source audit matches all 32 registry entries in current source.
- Freshness, quality, source status, degradation, unavailable, and health
  runtimes exist and remain non-fabricating.
- The internal source-governance diagnostics endpoint is read-only and does not
  poll providers.
- Registry defaults are governance metadata, not live health claims.

### 4.2 Source Envelope Adoption

Five existing API routes currently emit additive `_source` metadata:

| Route | Source ID | Current consumer posture |
| --- | --- | --- |
| `/api/market/exchange-comparison` | `exchange-comparison` | Markets tolerates the additive field but does not yet use canonical freshness. |
| `/api/research/prediction-markets` | `prediction-markets` | Research tolerates the additive field; no trusted source timestamp means freshness remains unavailable. |
| `/api/etf-flow` | `etf-flow` | Dashboard and Markets consume canonical source freshness. |
| `/api/macro` | `macro` | Dashboard and Research consume canonical unavailable/freshness metadata. |
| `/api/market/sector-rotation` | `sector-rotation` | Dashboard and Markets gate display using canonical freshness/status. |

`source-envelope-rollout-status.md` still describes only the original two
pilots. It is now a stale rollout-control document and must be updated before
the next envelope sprint.

### 4.3 Page Migration Status

| Page | Governed consumption | Remaining legacy dependencies | Result |
| --- | --- | --- | --- |
| Dashboard | ETF, Macro, and Sector Rotation metadata | Market Drivers, Reserve Intelligence, Market Movers, Futures Intelligence, narratives, prediction markets, Historical Analog | PARTIAL |
| Markets | ETF and Sector Rotation metadata; Exchange Comparison envelope is tolerated | Market Movers, Futures Intelligence, Futures Symbol Context, market structure, live streams, reserve data | PARTIAL |
| Scanner | Inherited Markets freshness only | Market Movers and Scanner Opportunities do not expose canonical envelopes | EARLY |
| Research | Macro metadata; Prediction Markets envelope is tolerated | Narratives, Historical Analog, Event Impact, Market Memory, broad source-health coverage | PARTIAL |
| Replay | Inherited context freshness | Replay datasets expose route-specific diagnostics rather than canonical envelopes/health | EARLY |
| Trade | Inherited context freshness | Market Movers, Futures Intelligence, live streams, and local memory remain legacy contracts | EARLY |

### 4.4 Source Safety Findings

The report-only source audit scanned 496 files and 76 API routes. It reports:

- 2 watched findings:
  - inactive Yahoo implementation in `lib/macro/fetchYahoo.ts`;
  - unregistered SaveTicker usage in `/api/kr-retail`;
- 11 production mock findings, including mock-backed historical persistence,
  external preview/review, mock ingestion, historical market-memory, and
  `/api/replay` routes;
- a duplicate non-route source file, `app/api/macro/route (2).ts`, that emits
  randomized `tradingview-style-pseudo` values from fallback constants.

The six frozen page components do not directly import the inactive Yahoo file
or the duplicate pseudo Macro file. That limits immediate page impact but does
not satisfy production-source hygiene.

Source governance result: **PARTIAL; FINAL CLEANUP REQUIRED**.

## 5. D12 UNAVAILABLE Re-evaluation

The original D12 inventory contains 64 grouped items. Phase 3 reduced selected
items without converting legitimate absence into fabricated completeness.

### 5.1 Status Summary

| Status | Count | D12 IDs |
| --- | ---: | --- |
| Resolved through source-backed or inherited context | 6 | `DASH-09`, `MKT-03`, `MKT-04`, `MKT-06`, `RPL-02`, `TRD-01` |
| Partially resolved or metadata-normalized | 7 | `DASH-03`, `DASH-10`, `MKT-05`, `RES-08`, `RES-09`, `RES-10`, `TRD-07` |
| Intentionally unresolved, boundary-safe, or backlog-only | 19 | `DASH-05`, `DASH-07`, `MKT-01`, `MKT-13`, `SCN-01`, `SCN-04`, `SCN-05`, `SCN-06`, `SCN-08`, `RES-01`, `RES-02`, `RES-03`, `RPL-01`, `RPL-04`, `RPL-06`, `RPL-10`, `TRD-06`, `TRD-09`, `TRD-10` |
| Open source/data/runtime gap | 32 | All remaining D12 IDs |

`Resolved` means the blanket unavailable state now has a truthful source-backed
or inherited-context path. It does not mean the field is always available;
stale, expired, empty, or direct-entry states may still correctly display
`UNAVAILABLE`.

### 5.2 Resolved and Partial Detail

- ETF current/latest data resolves Dashboard ETF summary and Markets selected
  BTC/ETH capital-flow display when Farside supplies a valid row.
- Sector Rotation resolves source-backed Markets breadth/rotation and provides
  a gated Dashboard sector summary.
- Research-to-Replay context now preserves thesis, evidence, confidence,
  structure, freshness, and investigation target (`RPL-02`).
- Replay-to-Trade context now preserves validation/replay availability and
  upstream context (`TRD-01`).
- Exchange Comparison and Research Prediction Markets have additive envelopes,
  but their trusted observation freshness is still unavailable.
- Dashboard Evidence Preview is only partly resolved because ETF is one of
  several evidence categories.
- Trade checklist context is only partly resolved because user risk inputs and
  sizing remain unavailable by design.

### 5.3 Blocked Items

- The Macro portion of `RES-08` remains blocked: Stooq quote access returns 404
  and historical access presents an anti-bot challenge. No approved fallback
  exists.
- `DASH-01` remains difficult to normalize because Market Driver has no
  canonical derived source ID or source envelope.
- Historical and information-intelligence source migration is blocked by
  production-reachable mock repositories/routes.
- `DASH-05` is not a data-availability problem that should be reduced. Its
  current Dashboard presence is a governance conflict requiring an explicit
  product/ADR reconciliation.

### 5.4 Newly Discovered Findings

1. The envelope rollout-control document is stale: it records two routes while
   five routes now emit `_source`.
2. The duplicate pseudo Macro file contains random value generation inside the
   production source tree, although it is not route-addressable.
3. Dashboard's `Execution Guidance` and detailed `Signal Evidence` create
   language/ownership overlap not represented as a D12 unavailable item.
4. Four destination pages use weaker `MISSING`/`DEGRADED` context vocabulary
   where the latest Trade certification requires explicit `UNAVAILABLE`.
5. D19 resolved context continuity (`RPL-02`), not the broader P1 Replay dataset
   availability item (`RPL-03`); Replay evidence coverage remains open.

## 6. Architecture Risks

### High

1. **Dashboard governance contradiction:** runtime Historical Analog conflicts
   with `AGENTS.md` and ADR-001.
2. **Production-source hygiene:** mock-backed routes and randomized pseudo Macro
   code remain reachable or present in production source scope.
3. **Critical provenance gaps:** Market Drivers, Market Movers, Scanner
   Opportunities, Futures Intelligence, Replay datasets, and Trade inputs do
   not yet share canonical source/freshness/health envelopes.

### Medium

4. **Duplicated fetches:** Scanner loads Market Movers directly while
   `/api/scanner/opportunities` also requests Market Movers. Dashboard, Markets,
   and Trade independently request shared market intelligence.
5. **Duplicated live calculations:** Markets and Trade separately aggregate
   trade flow and orderbook pressure; Dashboard and Markets independently
   interpret several shared source domains.
6. **Duplicated state:** selected symbol and investigation state span URL
   parameters, page state, shared context snapshots, global market stores,
   Replay local datasets, and Trade local memory.
7. **Context staleness:** session-scoped revision-1 snapshots do not form one
   mergeable end-to-end lineage.
8. **Ownership overlap:** Markets ranking overlaps Scanner prioritization;
   Dashboard execution/evidence language overlaps Trade/Research.
9. **Terminology drift:** `NO DATA`, `MISSING`, `UNAVAILABLE`, `UNKNOWN`,
   `DEGRADED`, and source-specific states are not applied uniformly.
10. **API inconsistency:** payloads vary among additive envelopes, legacy
    `source`/`updatedAt`, validity objects, route-specific diagnostics, and bare
    arrays.

## 7. Page Readiness

| Page | Readiness | Rationale |
| --- | --- | --- |
| Dashboard | READY WITH LIMITATIONS | Conclusion hierarchy remains functional, but Historical Analog governance and execution/evidence overlaps require cleanup. |
| Markets | READY WITH LIMITATIONS | Exploration is functional and Sector/ETF governance improved; ranking overlap and legacy source contracts remain. |
| Scanner | READY WITH LIMITATIONS | Prioritization ownership is intact; duplicate Market Movers paths and absent canonical source envelopes remain. |
| Research | READY WITH LIMITATIONS | Evidence ownership and manual-load boundaries are intact; Macro is blocked and broad evidence-source metadata is incomplete. |
| Replay | READY WITH LIMITATIONS | Context continuity and protected fallback behavior pass; dataset envelopes, comparable cases, and optional orderbook coverage remain limited. |
| Trade | READY WITH LIMITATIONS | Inherited validation is display-only and execution ownership is intact; sizing, risk inputs, broker integration, and canonical source metadata remain unavailable. |

No page is blocked from its existing direct workflow. Phase 3 freeze is blocked
only by the cross-cutting cleanup items above.

## 8. Final Decision

**PHASE 3 NEEDS FINAL CLEANUP**

The product is not architecture-blocked: ownership is understandable, all five
handoffs pass static validation, unavailable behavior remains non-blocking,
and the certified source-backed improvements do not fabricate data.

It is not ready for Phase 3 freeze because governance documents and runtime
still disagree, source-envelope adoption/control documentation is incomplete,
and mock/pseudo production-source findings remain unresolved. A final cleanup
sprint should reconcile these items without adding intelligence, changing
ranking, or redesigning frozen pages.

## 9. Validation Summary

- Shared Product Context audit: PASS, 30/30 checks.
- Source Registry Usage audit: REPORT_ONLY; 32/32 registered sources matched,
  2 watched findings, and 11 production mock findings.
- TypeScript: PASS.
- Dashboard integration audit: PASS.
- Intelligence smoke test: PASS.
- Production build: PASS.
- Runtime changes in D23: none.
- API changes in D23: none.
- Package changes in D23: none.
