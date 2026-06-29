# Source Envelope Compatibility Audit

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D6  
**Pilot:** `GET /api/market/exchange-comparison`  
**Decision:** PASS - backward compatible; safe for a controlled additive rollout

## 1. Scope

This audit reviews the D5 `_source` metadata addition without expanding envelope usage. It covers the route, all statically discoverable consumers, response assumptions, all three source-result branches, and the validation suite.

No D5 compatibility defect was found. No runtime, page, hook, API, or package changes were required in D6.

## 2. Pilot Compatibility Review

### 2.1 Top-Level Contract

The legacy response keys remain unchanged:

| Key | Preserved | Consumer use |
| --- | --- | --- |
| `ok` | Yes | Controls Exchange Overview status and available/unavailable rendering. |
| `symbol` | Yes | Retains selected-symbol identity. |
| `updatedAt` | Yes | Retains the route retrieval timestamp. |
| `binance` | Yes | Supplies Binance status, funding, OI, and reason. |
| `bybit` | Yes | Supplies Bybit status, funding, OI, and reason. |
| `fundingRelationship` | Yes | Supplies the existing venue relationship label. |
| `openInterestRelationship` | Yes | Supplies the existing venue relationship label. |
| `_source` | Additive | Canonical metadata; ignored by the current consumer. |

The route still returns HTTP 200 with `Cache-Control: no-store, max-age=0`. Fetch count, request timeout, source URLs, symbol normalization, calculations, and error wording are unchanged.

### 2.2 Branch Compatibility

| Existing result | Legacy behavior retained | Added metadata |
| --- | --- | --- |
| Binance and Bybit available | `ok: true`; both venue cards render; relationships are calculated. | `sourceStatus: ACTIVE`, `qualityLevel: MEDIUM`. |
| One venue available | `ok: true`; available venue renders and failed venue retains its reason; relationships remain `Unavailable`. | `sourceStatus: DEGRADED`, `degradedReason: PARTIAL_DATA`. |
| Neither venue available | `ok: false`; both venue failures remain in the payload and Markets uses its existing unavailable branch. | `sourceStatus: UNAVAILABLE`, `unavailableReason: SOURCE_UNAVAILABLE`. |

All branches preserve the complete legacy payload. D5 attaches only `sourceResult.metadata`; it does not expose or substitute the envelope helper's internal `data` field.

### 2.3 Freshness Safety

Neither exchange response provides a reliable observation timestamp. D5 therefore:

- preserves legacy `updatedAt` as retrieval time;
- records the same time as `_source.retrievedAt`;
- leaves `_source.lastUpdatedAt` as `null`;
- leaves `_source.freshnessStatus` as `UNAVAILABLE`.

This is conservative and compliant. Retrieval time is not promoted into provider observation time.

## 3. Consumer Review

Repository-wide static search found one runtime consumer.

| Consumer | Expected shape | `_source` compatibility | Future metadata use |
| --- | --- | --- | --- |
| `components/markets/MarketsPage.tsx` | Local `ExchangeComparisonResponse` with optional legacy fields; generic loader accepts JSON and stores it directly. | Safe. TypeScript structural typing permits extra JSON fields, and rendering accesses named legacy properties only. | Could later use `_source.sourceStatus` and reasons after an explicit consumer migration; not required for compatibility. |

Supporting observations:

- The local response type does not use an exact-object validator.
- The loader does not enumerate, strip, or reject unknown keys.
- The UI does not spread the payload into DOM props or component props.
- No hook, server route, worker, or other page consumes `/api/market/exchange-comparison`.
- `auditSourceRegistryUsage.ts` references the route name for static inventory only; it does not parse its response.
- No snapshot or schema test asserts an exact top-level key count.

## 4. Rollout Rules

Future source-envelope work must follow these rules:

1. **Add metadata first.** Add `_source` at the top level without moving or renaming existing data.
2. **Do not wrap by default.** A `{ data, metadata }` replacement is allowed only after every consumer has migrated and the API contract is versioned or explicitly approved.
3. **Preserve legacy keys and types.** Existing success, partial, empty, and error fields remain authoritative during migration.
4. **Preserve branch behavior.** Envelope status must describe the existing branch; it must not change HTTP status, fallback selection, or UI availability behavior.
5. **Audit unavailable compatibility.** Confirm the old unavailable payload, reason fields, empty collections, and status code remain unchanged before adding `_source`.
6. **Use a canonical registry ID.** Do not copy route aliases such as `binance-direct` into `_source.sourceId`. Stop if no correct registry entry exists.
7. **Record actual fallbacks only.** Do not populate `fallbackSourceId` from registry configuration unless that fallback supplied the response.
8. **Separate timestamps.** `retrievedAt` may record request completion; `lastUpdatedAt` requires a real provider or artifact observation timestamp.
9. **Do not infer freshness.** Missing observation time remains explicit rather than becoming `CURRENT` from request time.
10. **Do not invent data.** Metadata cannot supply placeholder values, zero-filled records, synthetic scores, or fabricated success.
11. **Do not require page changes for the additive phase.** Existing consumers must remain valid while ignoring `_source`.
12. **Test every existing branch.** At minimum test complete success, partial/degraded, and unavailable responses with legacy-key assertions.
13. **Keep rollout atomic.** One API per pilot sprint unless a later approved migration plan explicitly changes that limit.

## 5. Future API Risk Classification

Risk is determined by consumer count, criticality, fallback complexity, and response strictness, not route size alone.

### Low Risk

Characteristics:

- one tolerant consumer;
- simple object payload;
- non-critical UI path;
- existing explicit availability branch;
- canonical source ID already registered.

Candidates:

- `/api/market/exchange-comparison` - completed pilot.
- `/api/research/prediction-markets` - one tolerant Research consumer, simple additive object contract, registered `prediction-markets` derived source.

`/api/health` is not currently eligible: process health is not equivalent to the registered `data-health` artifact. A source ownership decision is required before envelope adoption.

### Medium Risk

Characteristics:

- multiple consumers;
- partial fallback branches;
- downstream API consumption;
- dashboard-adjacent display;
- locally defined response variants.

Examples:

- `/api/market/sector-rotation` - many page and API consumers, connector-level partial states, in-memory cache.
- `/api/macro` - multiple page/hook consumers and unresolved observation-time handling.
- `/api/etf-flow` - Dashboard and Markets consumers plus established stale semantics.
- `/api/prediction-markets` - Dashboard critical-adjacent consumer and source timestamp caveat.
- `/api/market/futures-intelligence` - multiple product consumers and partial connector coverage.
- `/api/news` and `/api/narratives` - multiple consumers, provider subsets, and timestamp normalization exceptions.

### High Risk

Characteristics:

- page-critical decision path;
- fragile or bare-array payload;
- polling/WebSocket interaction;
- historical cache or manual-load behavior;
- execution or validation ownership.

Includes:

- Replay APIs and caches;
- `/api/scanner/opportunities`;
- Trade-related data paths;
- Dashboard critical-path APIs, including Market Drivers and Reserve Intelligence;
- routes consumed by Replay such as `/api/market/futures-symbol-context`;
- historical/manual-load Research APIs;
- any API with a production-reachable mock or unregistered source.

## 6. D7 Acceptance Criteria

D7 may apply the envelope to one additional API only when all criteria pass:

- The aggregate route source has an exact canonical registry entry.
- Every direct and transitive consumer is inventoried.
- Consumers tolerate additive keys and do not enforce exact schemas or key counts.
- Legacy success, degraded/partial, and unavailable branches are documented.
- Existing top-level keys, types, HTTP statuses, headers, caching, and reasons remain unchanged.
- A real observation timestamp is available, or `lastUpdatedAt` and freshness remain conservative.
- Fallback provenance is known; configured fallback is not mistaken for actual fallback use.
- No new fetch, polling, scoring, normalization, or source behavior is required.
- A network-free branch contract check can assert legacy keys plus `_source` status.
- TypeScript, Dashboard audit, intelligence smoke test, and production build pass.
- The sprint changes exactly one API route and no consumers.

## 7. D7 Recommendation

Use `/api/research/prediction-markets` as the next low-risk candidate, subject to a fresh consumer inventory at the start of D7. Use canonical source ID `prediction-markets`, preserve its current `status`, `source`, `updatedAt`, `markets`, and `diagnostics` keys, and do not treat request time as provider observation time.

Defer `/api/market/sector-rotation` until a medium-risk rollout sprint defines how connector quality, cache state, and downstream API consumers map to the canonical envelope.

## 8. Validation

- Pilot top-level legacy keys: PASS.
- Success/degraded/unavailable branch contract check: PASS.
- Known runtime consumers: one.
- Additive `_source` ignored safely: PASS.
- D5 compatibility defect found: no.
- Runtime fixes made in D6: none.
- Envelope expanded to another API: no.
- Page, hook, and package changes: none.
