# ETF / Capital Flow Rollout Certification

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D14  
**Implementation under review:** D13 ETF / Capital Flow Intelligence  
**Decision:** CERTIFIED WITH LIMITATIONS

## 1. Certification Scope

This certification covers only the D13 ETF flow path:

```text
Farside BTC/ETH tables
  -> lib/data-sources/etfFlowClient.ts
  -> GET /api/etf-flow
  -> Dashboard ETF summary/evidence
  -> Markets ETF exploration
```

It does not certify reserve, treasury, exchange flow, historical ETF replay,
or any other P1 unavailable-reduction item.

## 2. Source Certification

**Result: PASS**

### Approved source path

- The external authority is Farside Investors, registered as `farside-etf`.
- The normalized product is registered as `etf-flow`.
- Both registry entries are production-approved.
- BTC current/latest data is read from `https://farside.co.uk/btc/`.
- ETH current/latest data is read from `https://farside.co.uk/eth/`.
- The normalized response retains `source: "farside-investors"` and each row
  retains its source URL and source date.

Static review found no CoinGecko, Yahoo, FRED, mock adapter, or test-source
reference in the ETF API or source client. D13 adds no provider and does not
activate the optional CMC-compatible artifact builder.

### Value provenance

`netFlow` is parsed from the latest dated total in the Farside table and keeps
the reported `USD millions` unit. BTC and ETH are parsed independently. If a
table cannot produce a valid dated numeric row, no estimate is substituted.

### Future all-data item

The Farside all-data page is recorded as a **future historical normalization
item only**. Its URL, schema, date semantics, revision behavior, and durable
artifact contract must be verified in a dedicated sprint before use. D13 does
not fetch it, normalize it, or expose historical ETF series to Research or
Replay.

## 3. API Certification

**Result: PASS**

### Backward compatibility

`GET /api/etf-flow` preserves the existing top-level contract:

- `ok`
- `source`
- `updatedAt`
- `flows`
- `btcFlow`
- `ethFlow`
- `btcSourceDate`
- `ethSourceDate`
- `sourceUrl`
- `isStale`
- `staleReason`, when applicable
- `unavailableReason`, when applicable

D13 adds only:

- `_source`, using the canonical `SourceMetadataEnvelope`;
- `sourceTimestamp` on each returned flow row.

Existing consumers can ignore both additions. The payload is not wrapped and
no legacy field is renamed or removed.

### Timestamp integrity

- `updatedAt` remains the legacy retrieval/generation timestamp.
- Each `sourceTimestamp` is an ISO normalization of the date published in the
  Farside row.
- `_source.lastUpdatedAt` is derived conservatively from the oldest returned
  BTC/ETH source date so the aggregate cannot appear fresher than one of its
  included rows.
- `_source.retrievedAt` is the request retrieval time.
- Retrieval time is never copied into `lastUpdatedAt`.
- If every returned row does not have a valid source timestamp, canonical
  freshness evaluation fails closed rather than creating one.

Farside publishes a daily date, not an intraday event timestamp. The ISO value
normalizes that real date; it must not be interpreted as provider-supplied
intraday precision.

### Response branches

| Condition | Legacy payload | `_source` result |
| --- | --- | --- |
| Two usable rows inside the current window | Existing values preserved | `SUCCESS`, `CURRENT`, `MEDIUM` |
| One usable current row | Existing partial values preserved | `DEGRADED`, `PARTIAL_DATA` |
| Usable rows outside 24 hours but within 7 days | Existing values preserved | `DEGRADED`, `STALE`, `STALE_DATA` |
| Rows older than the stale window | Legacy unavailable fields preserved | `UNAVAILABLE`, `EXPIRED` |
| Empty/unparseable response | Legacy unavailable fields preserved | `UNAVAILABLE`, `EMPTY_RESPONSE` or `INVALID_RESPONSE` |

The route remains dynamic and preserves its existing no-store response policy.

## 4. Freshness Certification

**Result: PASS**

- The route evaluates `etf-flow` through the canonical freshness runtime.
- The allowed output vocabulary remains `CURRENT`, `STALE`, `EXPIRED`, or
  `UNAVAILABLE`; `LIVE` is supported by the runtime but is not claimed for a
  daily ETF table.
- The `etf-flow` policy is CURRENT through 24 hours and STALE through 7 days.
- Stale observations remain visible with `STALE`/degraded metadata rather than
  being relabeled current or converted to zero.
- Expired, invalid, and missing observations fail closed to `UNAVAILABLE`.
- `retrievedAt` does not establish observation freshness.

Live certification on 28 Jun 2026 KST returned BTC and ETH rows dated
26 Jun 2026. The endpoint classified them `STALE`, with distinct
`lastUpdatedAt` and `retrievedAt` values. This is the expected behavior.

## 5. UI Certification

**Result: PASS**

### Dashboard

- Dashboard remains summary-only.
- Existing Market Driver ETF evidence retains priority when present.
- When that category is absent, Evidence Preview may use already-loaded ETF
  rows from `/api/etf-flow`.
- The fallback displays only returned BTC/ETH values, their source dates, and
  canonical freshness.
- The lower ETF summary also exposes freshness and does not add analysis,
  confidence, or narrative.

### Markets

- Markets remains an exploration surface.
- The ETF card displays the selected BTC or ETH observation, source date, and
  canonical freshness.
- Partial and stale envelope states map to existing status badges.
- Assets without a returned ETF row remain `NO DATA`; another asset's ETF value
  is not substituted.
- Reserve Intelligence remains a separate card and was not changed by D13.

### Research

- Research was unchanged.
- Research does not currently fetch `/api/etf-flow` or display an ETF
  unavailable state requiring D13 remediation.
- No supporting evidence, thesis, confidence, or historical narrative is
  generated from ETF data.

No page ownership drift was found.

## 6. No-Fabrication Certification

**Result: PASS**

- No placeholder ETF values are emitted.
- No missing flow is converted to zero.
- No BTC value is used as an ETH value or vice versa.
- No synthetic flow total is calculated for display.
- No ETF narrative or explanation is generated.
- No confidence or prediction value is invented.
- No retrieval timestamp is presented as the source observation timestamp.
- No stale source date is promoted to current.
- Empty, expired, and malformed source responses remain explicitly
  unavailable.

## 7. Known Limitations

1. The current Farside `/btc/` and `/eth/` readers are current/latest-oriented.
2. The Farside all-data page is not normalized or consumed.
3. Daily ETF flow may correctly remain `STALE` on weekends, holidays, or when
   Farside has not published a new row.
4. Farside supplies aggregate daily net flow, not gross inflow, gross outflow,
   holdings, or holdings valuation.
5. D13 does not add durable historical ETF retention to the runtime endpoint.
6. Research and Replay historical integration remain future work.
7. The API exposes one aggregate `_source` envelope; per-asset source-health
   envelopes are not yet modeled.

These limitations do not justify placeholder data or broader provider rollout.

## 8. Certification Decision

**CERTIFIED WITH LIMITATIONS**

D13 is source-backed, additive, backward-compatible, freshness-aware, and
ownership-safe. It successfully converts the audited ETF evidence gap from a
blanket unavailable state into a real `CURRENT`, `STALE`, partial, or explicit
unavailable result without fabricating values.

The rollout is certified for current/latest ETF intelligence. Historical
all-data normalization, durable retention, and Research/Replay integration
remain outside the certified boundary.

## 9. Validation Results

- TypeScript: PASS.
- Dashboard integration audit: PASS.
- Intelligence smoke test: PASS (10/10).
- Production build: PASS.
- Prohibited-source scan: PASS.
- Live ETF API compatibility/freshness check: PASS.
- Legacy fields preserved in live response: PASS.
- Research runtime changes in D13/D14: none.
- Runtime/API/page changes in D14: none.
- Package changes: none.

