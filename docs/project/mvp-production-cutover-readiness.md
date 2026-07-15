# MVP Production Cutover Readiness

Assessment date: 2026-07-16
Decision: **MVP-7C certified; Production remains unapplied pending user approval**

## Certified Preview baseline

The Git-backed Preview deployment for committed source `9017dcf4e50e8caeddbd146070c800480e3a06d1` is READY and reads the Neon serving plane in `SERVING_POSTGRES` mode. Health is HTTP 200/HEALTHY with the certified corpus identity, checksum, governed-through date, 870 Projections, 84 Evidence summaries, 84 Replay snapshots, both demo profiles, one active exposure, and a verified fallback bundle.

All six direct routes return HTTP 200 from clean entry. Research and Replay deterministically normalize to the primary BTCUSDT demo window. At 1920x1680 all six routes preserve the 190px navigation rail, fluid workspace geometry, and no page-level horizontal overflow. No application-origin browser console errors were observed.

Primary BTCUSDT and backup SOLUSDT Replay responses each contain 288 price points, 288 OI points, three provider-native Funding events, and 48 AggTrades buckets. Both model checksums reproduce exactly. Unsupported Replay requests fail closed without default substitution.

## Closure reconciliation

The Replay view count is 10 and passes the governed contract. The facade explicitly includes both eligible supplemental contexts, Macro and Bitcoin ETF Flow; the earlier expectation of 9 omitted ETF context. No Projection was hidden or changed, and the 870-row serving corpus and checksum remain unchanged.

The deployed topology is request edge Seoul (`icn1`), Vercel Function Singapore (`sin1`), and Neon PostgreSQL Singapore. It is classified `APPROVED_EDGE_FUNCTION_REGION_SEPARATION`: users enter through the Seoul edge while compute is colocated with the serving database.

An isolated Git-backed `CERTIFIED_SNAPSHOT` Preview was created from the unchanged committed SHA with a branch-only mode override. Health was HTTP 200/HEALTHY with the exact fallback checksum, 59 bounded Projections, two Evidence summaries, two Replay snapshots, and two demo profiles. All six default routes returned HTTP 200. Primary BTCUSDT and backup SOLUSDT Replay each passed 288/288/3/48 and reproduced their model checksums. An unsupported ETHUSDT Replay request returned HTTP 404 `SERVING_PROJECTION_MISSING` with `no-store`. The temporary environment override and local/remote branch pointers were removed; the primary Preview and Production were not changed.

`FIRST_OBSERVED_INVOCATION` was 3297.6 ms immediately after the isolated deployment reached READY. This includes Vercel CLI/project lookup overhead and is not a guaranteed infrastructure cold start. That distinction is retained as a measurement limitation, not a functional Production blocker.

## Preview environment contract

Preview contains these names only for MVP serving:

- `MVP_SERVING_MODE`
- `MVP_SERVING_POSTGRES_URL` (secret, pooled reader only)
- `MVP_SERVING_EXPECTED_CORPUS_ID`
- `MVP_SERVING_EXPECTED_CHECKSUM`
- `MVP_SERVING_FALLBACK_POLICY`

`MVP_SERVING_PUBLISHER_POSTGRES_URL` and D2/D3/D4/D5 truth-plane variables are absent from Preview. No values are recorded here. Production scope was not modified.

## Latency evidence

| API | Warm samples | p50 | p95 | Maximum |
|---|---:|---:|---:|---:|
| Health | 10 | 241 ms | 931 ms | 931 ms |
| Dashboard Projection | 10 | 454 ms | 511 ms | 511 ms |
| Primary Replay | 10 | 431 ms | 478 ms | 478 ms |

The Vercel edge-to-function/database contribution is not separately observable from the public response. No SLO is inferred from these measurements. The prior warm measurements remain authoritative for the primary `SERVING_POSTGRES` Preview.

## Remaining Production gates

1. User approval to configure and deploy Production.
2. Production-scope variables remain intentionally unapplied.
3. After an approved Production deployment, repeat the health, six-route, Replay, governance-header, and redacted-log gates before traffic promotion.

## Production environment plan

Do not apply until approval:

- `MVP_SERVING_MODE=serving_postgres`
- `MVP_SERVING_POSTGRES_URL=<pooled mvp_serving_reader URL>` (secret)
- `MVP_SERVING_EXPECTED_CORPUS_ID=<certified corpus ID>`
- `MVP_SERVING_EXPECTED_CHECKSUM=<certified checksum>`
- `MVP_SERVING_FALLBACK_POLICY=certified_snapshot_on_unavailable`

The publisher/owner connection must never enter Vercel. Preview and Production values remain separate. A Production deployment requires the health gate, all six routes, both Replay profiles, governance headers, and log scan to pass again.

## Rollback

1. Stop traffic promotion; leave the current Production deployment and domain unchanged.
2. Restore the prior approved serving corpus exposure through the append-only publication boundary, then verify its exact corpus identity/checksum.
3. If the database is unavailable and the approved policy permits it, deploy the already-certified immutable snapshot mode as a separately reviewed configuration. Never use snapshot mode for checksum mismatch, invalid query, missing/withheld data, or rollback state.
4. Verify `/api/health/mvp-serving`, all default routes, both Replay profiles, data-mode labels, and no-store error behavior before restoring traffic.

Production approval remains a user decision. MVP-7C does not modify Production scope or promote a deployment.
