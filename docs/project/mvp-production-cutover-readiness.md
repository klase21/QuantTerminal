# MVP Production Cutover Readiness

Assessment date: 2026-07-16
Decision: **MVP-7D Production cutover certified; Production serving active**

## Cutover result

The user supplied the exact approval phrase before deployment. Vercel rebuilt certified Preview deployment `dpl_9KTDZtLyDA9Cz24ZNHMtEHS9w5Bs` for Production without using the dirty worktree. New Production deployment `dpl_9aBTrz4w29fg7EL94vuvwhAdARRX` is READY and runs certified runtime SHA `9017dcf4e50e8caeddbd146070c800480e3a06d1`.

The repository HEAD was `89306dfd322cdf7e4aea1ac4e5ac39d518404e2d`; its diff from the runtime SHA contained only the four MVP-7C certification documents. No application, API, schema, dependency, configuration, or generated-snapshot file differed.

## Production gate

- Health: HTTP 200, `HEALTHY`, `SERVING_POSTGRES`, database connected, reader `READ_ONLY_VERIFIED`.
- Corpus/checksum: exact certified identity and checksum.
- Counts: 870 Projections, 84 Evidence summaries, 84 Replay snapshots, two demo profiles, three release-inventory entries, one active exposure.
- Views: Dashboard 45, Markets 38, Scanner 31, Trade 8, Research 9, Replay 10.
- Replay: primary BTCUSDT and backup SOLUSDT each passed 288 price / 288 OI / 3 Funding / 48 flow with reproduced model checksums.
- Fail closed: unsupported Replay returned HTTP 404 `SERVING_PROJECTION_MISSING`; invalid Projection query returned HTTP 400 `INVALID_QUERY`; both used `no-store`.
- Browser: root resolved to governed Dashboard context; all six pages retained the 190px rail, had no horizontal overflow at 1920px, and emitted no application console errors.

## Domains and topology

Public application domain:

- `https://quantterminalai.vercel.app`

Vercel-assigned platform aliases:

- `https://quantterminal-klase21s-projects.vercel.app`
- `https://quantterminal-git-epic-d2-canonical-pe-a80ff1-klase21s-projects.vercel.app`

The platform aliases are protected by Vercel authentication for unauthenticated callers; the deployment itself was verified through authenticated deployment-scoped requests. Request edge was Seoul (`icn1`), Functions were Singapore (`sin1`), and Neon remained Singapore. This is `APPROVED_EDGE_FUNCTION_REGION_SEPARATION`.

## Latency

`FIRST_OBSERVED_PRODUCTION_INVOCATION` was 1605.3 ms. It is not claimed to be a guaranteed infrastructure cold start.

| API | Samples | p50 | p95 | Maximum |
|---|---:|---:|---:|---:|
| Health | 10 | 264 ms | 333 ms | 333 ms |
| Dashboard Projection | 10 | 441 ms | 535 ms | 535 ms |
| Primary Replay | 10 | 426 ms | 467 ms | 467 ms |

No SLO is inferred from this bounded observation.

## Observation and logs

Production remained healthy from READY at `2026-07-15T22:35:55.244Z` through the final bounded sample at `2026-07-15T22:47:22.711Z`, exceeding ten minutes. Health, Dashboard, and normalized Replay remained successful; no checksum drift, fallback activation, connection exhaustion, or route regression appeared.

The closing 500-record Production log scan found zero error records and no database URL, serving secret name, password, token, Neon hostname, Windows path, object root, Parquet path, Raw Artifact path, or connection-detail stack trace.

## Rollback

Rollback was **NOT_REQUIRED**. The retained rollback target is `dpl_Bmkcfuk9FAZT7VQ9thzi3yr7nonR`:

```powershell
vercel rollback dpl_Bmkcfuk9FAZT7VQ9thzi3yr7nonR --yes --scope klase21s-projects
```

After any future rollback, verify domain assignment and the prior baseline before restoring traffic. Do not mutate Neon or retry a failed cutover automatically.

## Operational limitations

- Platform aliases require Vercel authentication; the canonical public domain does not.
- The first observed invocation is not a provably isolated platform cold start.
- Production remains governed through `2026-07-15T00:00:00.000Z`; continuing publication is a separate background operation.
- Certification does not authorize owner/publisher credentials, truth-plane variables, request-time Parquet, or canonical reads in Vercel.
