# MVP Live Resume Environment Bindings

## Scope

The local live-resume environment contract is the sole boundary between the 24-slot coordinator and environment-backed infrastructure. It validates integrated durable D2/D3 with distinct roles, isolated D4, isolated refresh control, isolated inactive serving publication, bounded durable object storage, four dataset executors, and affected-window downstream services. It accepts no managed target, no legacy progress-file worker, and no activation operation.

## Diagnostics

Environment checks expose only `VARIABLE_MISSING`, `AUTHENTICATION_FAILED`, `WRONG_DATABASE`, `WRONG_ROLE`, `NON_LOCAL_TARGET`, `CONNECTION_FAILED`, or `READY`. SQLSTATE may be retained only as a sanitized code. Connection values and physical target details are not emitted.

Every capability reports configuration, locality, database/role match, callability, mode, dataset/instrument scope, exact interval limit, legacy-worker dependency, activation capability, and a limitation reason. Candidate activation is deliberately non-callable.

## Binding Graph

The mandatory graph contains D2 canonical persistence, D3 Candidate lineage, D4 bounded downstream persistence, refresh control, inactive serving publication, local object storage, four bounded dataset executors, planner/authority readers, leases/checkpoints, watermarks, Coverage, Consistency, Evidence, Projections, Replay, manifest persistence, and exact membership comparison.

OHLCV excludes BTCUSDT acquisition because that slot is satisfied only through the certified authoritative recovery record. Open Interest, Funding, and AggTrades each permit the six governed instruments. All dataset bindings are limited to one exact UTC day and depend on D2, D3, and local object storage. No broad worker is a fallback.

## Certification Result

Fixture composition certifies the exact 1+23 graph, 23 executor calls, zero BTCUSDT OHLCV acquisition calls, identity/checksum propagation, all 17 coordinator failure points, deterministic resume, and inactive candidate behavior. The environment-backed preflight found all 18 archives and all six Funding requests ready, and reproduced the certified planner result.

The corrected authenticated preflight is live-ready. Durable D2 and D3 both use `quantterminal_backfill` with exact distinct owner roles, D4 remains isolated with role-intent enforcement, refresh and serving identities pass, and durable object storage passes its cleanup probe. No substitute target was attempted and no target-day acquisition, unit creation, watermark change, candidate build, or external mutation occurred.

## Concrete Port Composition

The environment factory now has four explicit modes: `INSPECT`, `PREFLIGHT`, `CERTIFICATION`, and `LIVE`. Inspection opens no connection. Preflight returns diagnostics without ports. Certification accepts only a complete callable local binding set. Live additionally requires the real environment preflight to pass before returning ports. Every result owns an explicit close lifecycle.

The concrete composition contract covers the four bounded dataset executors, dataset/common watermark persistence, five downstream stages, inactive candidate assembly, manifest persistence, and exact comparison. `createLiveResumeEnvironmentFromProcessEnv` constructs these adapters directly from the verified hybrid environment and returns one close lifecycle. The worker does not inject adapters, and isolated D2/D3 certification variables are not live durable fallbacks.
