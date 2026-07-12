# Population Engine Architecture Audit

## Scope

This audit defines the D3 production Population Engine boundary. It introduces no runtime, SQL, provider request, consumer migration, dual write, or D2 persistence change.

## Current Population Inventory

| Surface | Entry and caller | Provider / dataset | Current handling | Classification |
|---|---|---|---|---|
| Fixed OHLCV pilot | `runBinanceVisionHistoricalBackfill` | Binance Vision / 5m OHLCV | Downloads seven archives, parses and validates the whole week, then writes each candle through `PersistenceRepository` | Parser and validation reusable; orchestration migration-only |
| Full OHLCV backfill | `runFullBinanceVisionHistoricalBackfill` | Binance Vision / OHLCV | Discovers archives, validates each archive, persists sequentially; Repository duplicate detection is the resume boundary | Adapt retrieval/parser; replace orchestration later |
| Legacy OHLCV API backfill | `POST /api/admin/backfill/binance-vision/ohlcv` | Binance Vision / monthly OHLCV | Request handler downloads, parses, mutates file-backed jobs and rows, then generates snapshots and outcomes | Retain protected; deprecate after governed migration |
| Funding archive backfill | `runBinanceVisionFundingBackfill` | Binance Vision / funding | HEAD discovery, strict schema parsing, interval validation, deterministic record IDs, direct Repository writes | Adapter candidate; orchestration migration-only |
| Funding recent-gap sync | `runBinanceRestFundingRecentGap` via `runRecentGapSync` | Binance official REST / funding | Bounded request and Repository persistence; gap planning is based on supplied latest observation | Retrieval/parser reusable with governed identity review |
| Open Interest backfill | `runBinanceVisionOpenInterestBackfill` | Binance Vision metrics / OI | Capability-gated archive read, provider schema validation, deterministic writes | Adapter candidate; source semantics must remain explicit |
| Liquidation backfill | `runBinanceVisionLiquidationBackfill` | Binance Vision, optional Coinalyze Internal Web | Official source first; experimental fallback requires explicit enablement, mapping, and ephemeral request key | Split into distinct provider adapters; experimental path remains mapping-gated |
| AggTrade backfill | `runBinanceVisionAggTradeBackfill` | Binance Vision / AggTrade | Validates the archive, iterates records, writes each record through Repository | Retrieval/parser reusable; canonical target should be object manifest, not tick rows |
| Recent-gap orchestrator | `planRecentGapSync` / `runRecentGapSync` | Funding, OI, AggTrade, Liquidation | Deterministic plan IDs, bounded days, sequential dispatch, in-memory outcomes and projection-refresh hints | Useful profile and unit-generation reference; not durable orchestration |
| Coverage evaluator | `evaluateRepositoryCoverage` | Repository facts and dataset metadata | Scans bounded Repository pages and separates provider availability from repository coverage | Protected current runtime; future D3 outcome consumer, not worker responsibility |
| Coverage projection | `writeCoverageProjection` | Repository coverage report | Immutable projection checksum and version metadata; recomputation is explicit | Protected asynchronous projection boundary |
| Intelligence scheduler | `runScheduledProduction` and `FileIntelligenceSchedulerStore` | Intelligence artifacts | File-backed schedule, lock, reports, and skip state | Separate product scheduler; not reusable as Population truth |
| Scheduler Runtime foundation | `lib/scheduler-runtime` | Fixed intelligence job vocabulary | Pure lifecycle and retry metadata; no timer, lease store, persistence, or population jobs | Conceptual patterns reusable; vocabulary incompatible with D3 |
| Worker Runtime foundation | `lib/worker-runtime` | Fixed intelligence job vocabulary | Pure dispatch/result contracts; no leases, persistence, or population handlers | Conceptual patterns reusable; do not extend silently |
| Direct API provider fetches | Multiple `app/api` routes | Market, intelligence, scanner context | Request-local fetch and transformation for page data | Outside D3 Phase 0; must not become canonical population paths |
| D2 Canonical Commit Engine | `lib/data-platform/persistence/postgres` | Typed canonical facts | Isolated atomic commit, duplicate/conflict, lineage, publication decision, outbox | Protected canonical persistence boundary |

## Call Hierarchy Findings

The Repository-backed historical modules combine retrieval, parsing, validation, normalization-like mapping, and persistence in one function. They call the generic Repository directly and do not preserve immutable raw objects or durable candidates. The recent-gap orchestrator calls those modules directly and returns refresh-day hints; it has no lease, heartbeat, durable checkpoint, retrieval-attempt history, or fencing token.

The legacy admin route is more tightly coupled: the request owns job mutation, provider download, local JSON persistence, and derived snapshot generation. It is unsuitable for wrapping as a production worker without decomposition.

No active consumer imports the isolated D2 PostgreSQL adapter. D3 must preserve that isolation by depending on a narrow Canonical Commit port supplied to workers, never on SQL or D2 table knowledge.

## Existing Architecture Gaps

- Raw payloads can be discarded after parsing; there is no mandatory object-storage-first boundary.
- Existing `canonical`, `verified`, provider tier, and numeric confidence fields are locally assigned in historical records and do not satisfy D1 governance bindings.
- Parsing output is written directly to the generic Repository; no durable Population Candidate exists.
- Validation and persistence results exist, but D1 quality evaluation is not executed as a separate policy-bound operation.
- Retry is mostly caller repetition or Repository duplicate detection. Network attempts and logical retries are not independently auditable.
- Progress callbacks and file-backed jobs are not durable distributed checkpoints.
- Existing locks have no fencing token; a stale process could act after lock expiry.
- Coverage refresh hints are not governed watermark decisions.
- Empty, unavailable, validation, persistence, and duplicate states vary by module and need one closed D3 taxonomy.
- Large archives are buffered in several paths; AggTrade iteration avoids object expansion but still starts from an in-memory extracted CSV.
- Existing schedulers use unrelated vocabularies and cannot own population state.

## Existing Backfill Migration Strategy

| Module | Reuse | Must change before D3 use |
|---|---|---|
| OHLCV parsers and validators | Adapt | Consume verified raw artifacts; emit candidates; remove direct Repository writes |
| Funding archive and REST parsers | Adapt | Split retrieval from parsing; bind provider/schema/normalization snapshots |
| OI parser and capability map | Adapt | Preserve source timestamp/unit limitations; emit typed candidate |
| Liquidation provider mappings | Adapt cautiously | Separate official and experimental adapters; retain explicit enablement and ephemeral-key rules |
| AggTrade parser | Adapt for stream verification | Emit stream manifest and object metadata rather than millions of PostgreSQL facts |
| Full and recent-gap orchestration | Retain as migration tools | Replace in-memory progress with Jobs/Runs/Units/leases/outcomes |
| Generic Repository writes | Protected, then deprecate from migrated paths | D3 submits only D2 `CanonicalCommitCommand` values |
| Coverage projection | Keep separate | Consume durable outcomes after commit; never run inside canonical transaction |
| Legacy admin route and local store | Retain until cutover | Do not wrap; replace with bounded job submission/status APIs in a later phase |

The migration is additive: certify one dataset adapter and job profile at a time, run shadow verification without dual-writing canonical facts, and leave current consumers untouched until D5.

## Direct Provider Request Boundary

Current page-oriented API routes that fetch provider data are not canonical ingestion. D3 must not silently route their transformed responses into persistence. A provider becomes population-eligible only through a registered adapter, immutable snapshots, raw artifact retention, and D1/D2 gates.

## Baseline Discrepancy

The repository is at commit `1cb1c8d778033cfe89b4c23f51a7d70160b7d906` with tag `d2-canonical-persistence-v2.1`. The D3 brief reports D2 as `SAFE TO COMPLETE D2 WITH LIMITATIONS`, while the checked-in certification document says `LIVE SUITE PASSED; EXTENDED CERTIFICATION REMAINS REQUIRED`. D3 can proceed architecturally, but production schema deployment and cutover remain prohibited until D2 governance reconciles that wording.
