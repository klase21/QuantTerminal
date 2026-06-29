# Sector Rotation Certification

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D18  
**Implementation under review:** D17 - Sector Rotation Intelligence  
**Decision:** CERTIFIED WITH LIMITATIONS

## 1. Certification Scope

This certification covers only the D17 normalization of the existing Sector
Rotation path:

```text
Binance + Upbit + optional Upbit DataLab
  -> GET /api/market/sector-rotation
  -> Markets breadth and rotation exploration
  -> Dashboard sector summary
  -> Markets-to-Scanner supporting context
```

The audited P1 items are `MKT-03` and `MKT-04`. D18 does not approve a new
provider, ranking model, narrative model, polling path, or product feature.

## 2. Source Certification

**Decision: PASS**

- `binance-live` is registered, active, and production-approved.
- `upbit-live` is registered, active, and production-approved.
- `upbit-datalab` is registered, active, and production-approved.
- The normalized `sector-rotation` source is registered, active, and
  production-approved with Markets ownership.
- The route uses only the existing Binance Spot, Upbit public market/ticker,
  and Upbit DataLab endpoints.
- No CoinGecko, Yahoo, FRED, mock/test source, or unregistered provider is used.
- D17 introduced no external provider or fallback.

DataLab remains optional. Its absence lowers connector coverage; it does not
authorize synthetic replacement data.

## 3. API Certification

**Decision: PASS**

### Backward compatibility

The legacy response remains unwrapped and preserves:

- `ok`
- `source`
- `updatedAt`
- `mode`
- `sectors`
- `assets`
- `endpoints`
- `coverage`
- `coverageAudit`
- `dataQuality`
- `notes`
- `binanceValidation`

D17 adds `_source` only. Existing consumers may ignore it.

### Canonical branches

| Condition | Legacy response | Additive `_source` |
| --- | --- | --- |
| Usable observations inside the current window | Preserved | `CURRENT`, `ACTIVE` or `DEGRADED` for partial coverage |
| Oldest observation inside the stale window | Preserved | `STALE`, `DEGRADED`, `STALE_DATA` |
| Observation beyond the stale window | Preserved | `EXPIRED`, `UNAVAILABLE`, `EXPIRED` reason |
| Missing or invalid contributing timestamp | Preserved | `UNAVAILABLE`, `INVALID_RESPONSE` |
| Empty result | Existing empty/error shape | `UNAVAILABLE`, `EMPTY_RESPONSE` |
| Route/provider failure | Existing HTTP 500 error shape | `UNAVAILABLE`, `SOURCE_UNAVAILABLE` |

The route uses `createSourceSuccess`, `createSourceDegraded`,
`createSourceUnavailable`, and `normalizeSourceMetadata`. No legacy key is
renamed or removed.

## 4. Freshness Certification

**Decision: PASS**

- Binance freshness comes from the provider's `closeTime` field.
- Upbit freshness comes from the provider's `timestamp` field.
- Every contributing ticker must provide a valid timestamp.
- The oldest observation within each contributing provider is retained.
- The oldest provider observation becomes aggregate `lastUpdatedAt`.
- The route's generated `updatedAt` is used only as `retrievedAt`.
- Retrieval time is never substituted for a missing source timestamp.
- Freshness is evaluated through the canonical `sector-rotation` policy.
- The output vocabulary remains `LIVE`, `CURRENT`, `STALE`, `EXPIRED`, or
  `UNAVAILABLE`.

D17 live validation observed a `STALE` result while the oldest contributing
observation remained inside the 15-minute stale window. D18 live validation
later observed the same data path as `EXPIRED` once the oldest observation was
outside that window. This transition confirms that freshness follows provider
time rather than request time.

## 5. UI Certification

**Decision: PASS**

### Dashboard

- Dashboard consumes only the top sector as lightweight summary context.
- Sector context is eligible only for `LIVE`, `CURRENT`, or `STALE` metadata.
- `EXPIRED`, `UNAVAILABLE`, or missing metadata cannot become a Dashboard
  reason.
- No Sector Rotation exploration workflow was moved onto Dashboard.

### Markets

- Markets remains the owner of breadth and Sector Rotation exploration.
- Sector rows and breadth calculations are displayed only for `LIVE`,
  `CURRENT`, or `STALE` source-backed results.
- `STALE` is labeled explicitly.
- Expired, unavailable, or timestamp-invalid results use the existing compact
  unavailable state.
- The Markets-to-Scanner handoff uses `_source.lastUpdatedAt` when Sector
  Rotation supplies the context.

### Scanner

- `ScannerPage.tsx` was unchanged by D17.
- Scanner ranking logic was unchanged.
- Scanner fetch and polling logic were unchanged.
- Scanner receives Markets-owned sector, breadth, and freshness as read-only
  supporting context only.

No page ownership drift was found.

## 6. No-Fabrication Certification

**Decision: PASS**

- D17 adds no sector ranking or ranking formula.
- D17 adds no rotation narrative or narrative generation.
- D17 adds no percentages, confidence values, or placeholder observations.
- D17 adds no source timestamp derived from current or retrieval time.
- D17 adds no artificial freshness override.
- Missing or expired source evidence remains unavailable.

The existing deterministic `buildRealMarketRotation` score, rank, confidence,
and `story` fields predate D17 and were not modified by this sprint. They remain
derived from existing exchange observations and are preserved strictly for
backward compatibility. D18 certifies that D17 introduced no new intelligence
or generated narrative; it does not expand or redesign that legacy model.

## 7. Known Limitations

1. Aggregate Sector freshness depends on the oldest contributing observation.
2. One exchange or low-activity asset can temporarily reduce the aggregate
   from `CURRENT` to `STALE` or `EXPIRED`.
3. DataLab is optional and does not provide the aggregate observation timestamp.
4. Dashboard intentionally consumes only fresh or stale source-backed summaries.
5. Scanner receives Sector Rotation only as supporting context; its ranking is
   independent and unchanged.
6. Replay and Trade remain outside Sector Rotation ownership.
7. The API preserves legacy sector rows on an expired/unavailable branch for
   compatibility, while certified UI consumers suppress them.

These limitations must not be addressed with timestamp substitution,
fabricated rankings, or an unapproved fallback.

## 8. Certification Decision

**CERTIFIED WITH LIMITATIONS**

D17 complies with Source Governance, the canonical Freshness Runtime, and page
ownership. It converts Sector Rotation availability from an implicit request-
time claim into a source-backed `CURRENT`, `STALE`, `EXPIRED`, or
`UNAVAILABLE` result without changing the legacy response, sector model, or
Scanner ranking behavior.

The conservative oldest-observation policy may temporarily suppress otherwise
usable aggregate output. That is an accepted transparency limitation, not a
certification defect.

## 9. Validation Record

Certification validation includes:

- TypeScript compilation;
- Dashboard integration audit;
- intelligence smoke tests;
- production build;
- prohibited-source scan;
- static D17 diff review for provider, ranking, scoring, narrative, fetch, and
  Scanner changes;
- live route verification of legacy fields, source identity, timestamp
  separation, freshness, and unavailable behavior.

Final command results are recorded in the Sprint D18 completion summary.
