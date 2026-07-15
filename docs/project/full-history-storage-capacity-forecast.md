# Full-History Storage Capacity Forecast

Generated: 2026-07-15

Mode: read-only local measurement and forecasting

Universe: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT

Forecast cutoff: 2026-07-11 inclusive

## Executive conclusion

Buy a **2 TB** disk for the six-instrument full-history dataset. A 1 TB disk can hold the expected Lean or Audit-Preserving final dataset, but it is not a defensible operational purchase: the expected capacity requirement reaches **993 GB (925 GiB)** after backfill overhead, one year of growth, and the required 25% free-space reserve. The high case is **1.316 TB (1.226 TiB)**. A 4 TB disk is the long-term-safe choice if the instrument universe or retained dataset classes expand.

No backfill, population runner, Funding command, remote request, vacuum, or database write was performed for this audit.

## Units

- **GB/TB** are decimal vendor units: 1 GB = 1,000,000,000 bytes; 1 TB = 1,000 GB.
- **GiB/TiB** are binary units commonly displayed by Windows: 1 GiB = 1,073,741,824 bytes; 1 TiB = 1,024 GiB.
- Thus a nominal 1 TB disk is about 931.3 GiB before small filesystem metadata losses.

## Current measured storage

| Physical class | Bytes | GB | GiB | Treatment |
|---|---:|---:|---:|---|
| Governed durable artifact root (`D:\QuantTerminalData\raw-artifacts`) | 2,064,939,616 | 2.065 | 1.923 | Counted once |
| Shared D2/D3 PostgreSQL database | 6,271,056,919 | 6.271 | 5.840 | D2 and D3 URLs resolve to this same physical database; counted once |
| D4 PostgreSQL database | 87,792,663 | 0.088 | 0.082 | Counted once |
| **Current governed physical footprint** | **8,423,789,198** | **8.424** | **7.845** | Forecast baseline |
| Repository `.data` legacy/cache tree | 5,331,976,843 | 5.332 | 4.966 | Reported separately; not projected as governed full-history storage |
| Root order-book Parquet and local SQLite/temp files | 26,742,833 | 0.027 | 0.025 | Separate protected/legacy data |
| **All relevant local files observed** | **13,782,508,874** | **13.783** | **12.836** | Not all are part of the governed forecast |

The durable artifact root contains 3,209 files: 1,509 ZIP files (629,279,710 bytes), 86 Parquet files (1,434,698,774 bytes), 1 HTML Raw Artifact (699,484 bytes), and 1,613 JSON/control files (261,648 bytes). `.segment-build` was empty. The repository `.data` tree includes a 3,150,319,616-byte legacy SQLite database and 1,063,730,375 bytes of stale `.tmp` files; neither is silently added to future governed storage.

Drive observations at audit time:

| Drive | Used | Free |
|---|---:|---:|
| C: | 189.918 GB / 176.875 GiB | 309.197 GB / 287.962 GiB |
| D: | 1,081.440 GB / 1,007.170 GiB | 918.941 GB / 855.830 GiB |

## PostgreSQL measurement

Read-only `pg_database_size`, `pg_total_relation_size`, and `pg_indexes_size` queries produced:

| Database | Database bytes | User heap | Indexes | User relations |
|---|---:|---:|---:|---:|
| Shared D2/D3 | 6,271,056,919 | 3,149,914,112 | 3,076,014,080 | 6,259,474,432 |
| D4 | 87,792,663 | 14,319,616 | 46,465,024 | 63,053,824 |
| **Indexes total** |  |  | **3,122,479,104 (3.122 GB / 2.908 GiB)** |  |

Exact persisted counts are 435,859 Candidates, 435,859 canonical record versions/Facts, 435,859 lineage edges, 1,519 Coverage decisions, 423 Consistency Results, 87 Evidence Packets, and 871 Consumer Projections. The current D2/D3 database is index- and control-plane-heavy: about 14.39 KB per current Candidate end to end. The frozen volume model independently estimates 12.86 KB per projected low-density row, so the expected PostgreSQL forecast uses 12.86 KB and the high case covers the current observed ratio and maintenance growth.

## Current corpus and source ranges

The bounded MVP corpus remains:

- OHLCV, Funding, OI: `[2026-04-13, 2026-07-12)`
- AggTrades Segments: `[2026-06-28, 2026-07-12)`
- 155,520 OHLCV records, 1,620 Funding events, 155,514 OI records, and 45,816,917 AggTrades events across the required corpus cells.

The progress ledgers were inspected without modification. They report 846/13,813 OHLCV partitions, 37/459 Funding partitions, 546/10,560 OI partitions, and 86/13,813 AggTrades segments complete, with zero active leases. The 86 AggTrades segments comprise the 84-day/instrument MVP set plus two historical canaries.

### Verified full-history availability

| Dataset | Symbol | Verified source start | Cutoff | Projected days | Missing range before source |
|---|---|---|---|---:|---|
| OHLCV / AggTrades | BNBUSDT | 2020-02-10 | 2026-07-11 | 2,344 | Earlier provider daily archive unavailable |
| OHLCV / AggTrades | BTCUSDT | 2019-12-31 | 2026-07-11 | 2,385 | Contract activation predates verified archive by about 114 days |
| OHLCV / AggTrades | DOGEUSDT | 2020-07-10 | 2026-07-11 | 2,193 | Earlier provider daily archive unavailable |
| OHLCV / AggTrades | ETHUSDT | 2019-12-31 | 2026-07-11 | 2,385 | Contract activation predates verified archive by about 34 days |
| OHLCV / AggTrades | SOLUSDT | 2020-09-14 | 2026-07-11 | 2,127 | Earlier provider daily archive unavailable |
| OHLCV / AggTrades | XRPUSDT | 2020-01-06 | 2026-07-11 | 2,379 | Earlier provider daily archive unavailable |
| Open Interest | BTCUSDT | 2020-09-01 | 2026-07-11 | 2,140 | No earlier verified Binance Vision archive |
| Open Interest | Other five | 2021-12-01 | 2026-07-11 | 1,684 each | No earlier verified Binance Vision archive |
| Funding | Per-symbol contract/archive start | 2020-01-01 to 2020-09-14 | 2026-07-11 | 2,127-2,384 | Native archive/activation boundary; no synthetic prehistory |

These starts are not guesses: the execution snapshots record complete Binance Vision prefix inventories and verified first objects. Requested history before those boundaries is classified unavailable and contributes zero forecast days.

## Dataset-by-instrument measurement and forecast

Sizes below are decimal. `Measured range` may include sparse historical canaries; `days eq.` is records divided by native cadence and avoids treating gaps between a canary and the recent corpus as populated. `Measured bytes/day` is shown as raw/derived. Low-density derived storage is the allocated canonical PostgreSQL relation size; the later PostgreSQL total also includes Candidates, Facts, lineage, Coverage, indexes, and the control plane, so it is not added twice.

| Dataset | Instrument | Measured range / days eq. | Records/events | Raw measured | Derived measured | Measured bytes/day raw / derived | Projected days | Raw projected | Derived projected | Uncertainty |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| OHLCV | BNBUSDT | 2020-02-10..2026-07-11 / 136.7 | 39,360 | 1.65 MB | 49.10 MB | 12.1 KB / 359 KB | 2,344 | 28.96 MB | 842.07 MB | Low |
| OHLCV | BTCUSDT | 2019-12-31..2026-07-11 / 177.0 | 50,976 | 2.41 MB | 63.60 MB | 13.6 KB / 359 KB | 2,385 | 33.17 MB | 856.65 MB | Low |
| OHLCV | DOGEUSDT | 2020-07-10..2026-07-11 / 91.6 | 26,388 | 1.16 MB | 32.92 MB | 12.7 KB / 359 KB | 2,193 | 28.48 MB | 787.80 MB | Low |
| OHLCV | ETHUSDT | 2019-12-31..2026-07-11 / 177.0 | 50,976 | 2.35 MB | 63.60 MB | 13.3 KB / 359 KB | 2,385 | 32.37 MB | 856.81 MB | Low |
| OHLCV | SOLUSDT | 2020-09-14..2026-07-11 / 91.7 | 26,412 | 1.16 MB | 32.95 MB | 12.6 KB / 359 KB | 2,127 | 27.45 MB | 764.12 MB | Low |
| OHLCV | XRPUSDT | 2020-01-06..2026-07-11 / 170.7 | 49,148 | 2.05 MB | 61.31 MB | 12.0 KB / 359 KB | 2,379 | 29.27 MB | 854.64 MB | Low |
| Funding | BNBUSDT | 2020-02-10..2026-07-11 / 170.3 | 511 | 8.3 KB | 0.71 MB | 49 B / 4.2 KB | 2,344 | 68.6 KB | 9.83 MB | Low-medium |
| Funding | BTCUSDT | 2020-01-01..2026-07-11 / 211.0 | 633 | 9.9 KB | 0.89 MB | 47 B / 4.2 KB | 2,384 | 69.8 KB | 10.00 MB | Low-medium |
| Funding | DOGEUSDT | 2020-07-10..2026-07-11 / 90.0 | 270 | 6.2 KB | 0.38 MB | 69 B / 4.2 KB | 2,193 | 64.1 KB | 9.20 MB | Low-medium |
| Funding | ETHUSDT | 2020-01-01..2026-07-11 / 181.0 | 543 | 8.8 KB | 0.76 MB | 49 B / 4.2 KB | 2,384 | 69.8 KB | 10.00 MB | Low-medium |
| Funding | SOLUSDT | 2020-09-14..2026-07-11 / 90.0 | 270 | 6.3 KB | 0.38 MB | 70 B / 4.2 KB | 2,127 | 62.2 KB | 8.92 MB | Low-medium |
| Funding | XRPUSDT | 2020-01-06..2026-07-11 / 175.3 | 526 | 8.7 KB | 0.74 MB | 50 B / 4.2 KB | 2,379 | 69.6 KB | 9.98 MB | Low-medium |
| Open Interest | BNBUSDT | 2021-12-01..2026-07-11 / 90.0 | 25,919 | 0.99 MB | 39.21 MB | 11.1 KB / 436 KB | 1,684 | 19.00 MB | 733.60 MB | Low |
| Open Interest | BTCUSDT | 2020-09-01..2026-07-11 / 96.0 | 27,647 | 1.08 MB | 41.82 MB | 11.2 KB / 436 KB | 2,140 | 24.76 MB | 932.25 MB | Low |
| Open Interest | DOGEUSDT | 2021-12-01..2026-07-11 / 90.0 | 25,919 | 1.03 MB | 39.21 MB | 11.5 KB / 436 KB | 1,684 | 19.65 MB | 733.60 MB | Low |
| Open Interest | ETHUSDT | 2021-12-01..2026-07-11 / 90.0 | 25,919 | 1.04 MB | 39.21 MB | 11.6 KB / 436 KB | 1,684 | 19.85 MB | 733.60 MB | Low |
| Open Interest | SOLUSDT | 2021-12-01..2026-07-11 / 90.0 | 25,919 | 1.02 MB | 39.21 MB | 11.4 KB / 436 KB | 1,684 | 18.86 MB | 733.60 MB | Low |
| Open Interest | XRPUSDT | 2021-12-01..2026-07-11 / 90.0 | 25,919 | 1.03 MB | 39.21 MB | 11.4 KB / 436 KB | 1,684 | 19.68 MB | 733.60 MB | Low |
| AggTrades | BNBUSDT | 2026-06-28..2026-07-11 / 14 | 3,263,083 | 43.72 MB | 105.55 MB | 3.12 / 7.54 MB | 2,344 | 11.59 GB | 26.98 GB | Medium-high |
| AggTrades | BTCUSDT | recent 14 days + 2019 canary / 15 | 19,602,101 | 239.10 MB | 564.15 MB | 15.94 / 37.61 MB | 2,385 | 43.71 GB | 94.26 GB | Medium-high |
| AggTrades | DOGEUSDT | 2026-06-28..2026-07-11 / 14 | 1,773,824 | 27.24 MB | 66.68 MB | 1.95 / 4.76 MB | 2,193 | 14.59 GB | 38.49 GB | Medium-high |
| AggTrades | ETHUSDT | 2026-06-28..2026-07-11 / 14 | 15,399,792 | 213.96 MB | 480.13 MB | 15.28 / 34.29 MB | 2,385 | 41.25 GB | 87.59 GB | Medium-high |
| AggTrades | SOLUSDT | 2026-06-28..2026-07-11 / 14 | 3,602,703 | 52.99 MB | 131.43 MB | 3.79 / 9.39 MB | 2,127 | 14.10 GB | 37.41 GB | Medium-high |
| AggTrades | XRPUSDT | recent 14 days + 2020 canary / 15 | 2,307,677 | 35.27 MB | 86.76 MB | 2.35 / 5.78 MB | 2,379 | 11.47 GB | 29.20 GB | Medium-high |

### Measured record density and compression

For low-density Facts, the Raw Artifact and PostgreSQL rowstore are different representations rather than two codecs for the same file. Their ratio is therefore reported as **storage amplification**, not a compression ratio. The measured all-in canonical relation densities are 1,247.6 bytes/OHLCV Fact, 1,398.6 bytes/Funding Fact, and 1,512.6 bytes/OI Fact, including their relation indexes. These densities are applied consistently per instrument; the per-symbol Raw bytes/record can be reproduced directly from the preceding table.

AggTrades ZIP and Parquet both represent the same events, so a physical representation ratio is meaningful:

| Instrument | Measured Parquet bytes/event | Parquet / source ZIP | Interpretation |
|---|---:|---:|---|
| BNBUSDT | 32.35 | 2.41x | Parquet is larger than the already-compressed ZIP |
| BTCUSDT | 28.78 | 2.36x | Best measured Parquet density in the universe |
| DOGEUSDT | 37.59 | 2.45x | Event density must not be inferred from BTC |
| ETHUSDT | 31.18 | 2.24x | Lowest measured ZIP-to-Parquet expansion |
| SOLUSDT | 36.48 | 2.48x | Highest measured expansion |
| XRPUSDT | 37.60 | 2.46x | Highest measured bytes/event |

Measured low-density storage amplification is 28.16x for OHLCV, 79.93x for Funding, and 38.38x for OI when canonical heap plus indexes are compared with compressed Raw Artifacts. This is why the all-in PostgreSQL forecast is material even though those source archives are small.

### Dataset totals

| Class | Low | Expected | High | Confidence / reason |
|---|---:|---:|---:|---|
| OHLCV source Raw Artifacts | 0.162 GB | 0.180 GB | 0.207 GB | High; frozen estimate validated by measured bytes/day |
| OHLCV canonical relation | 4.22 GB | 4.97 GB | 5.71 GB | Medium-high; linear row extrapolation |
| Funding source Raw Artifacts | 0.0003 GB | 0.0004 GB | 0.0006 GB | High; native-event inventory |
| Funding canonical relation | 0.049 GB | 0.058 GB | 0.075 GB | Medium-high; cadence remains provider-native |
| Open Interest source Raw Artifacts | 0.122 GB | 0.122 GB | 0.122 GB | High; complete source inventory |
| Open Interest canonical relation | 3.92 GB | 4.61 GB | 5.30 GB | Medium-high; linear row extrapolation |
| AggTrades source ZIP | 136.71 GB | 136.71 GB | 136.71 GB | High; exact complete-prefix inventory, not a sample extrapolation |
| AggTrades Parquet | 266.84 GB | 313.93 GB | 379.62 GB | Medium-high; per-symbol actual bytes/event; high uses conservative events plus 15% codec/schema margin |
| Segment manifests/control metadata | 0.04 GB | 0.06 GB | 0.10 GB | Medium; small compared with payloads and included in PostgreSQL policy total |
| D2/D3 PostgreSQL, all canonical/control/index data | 75 GB | 90.91 GB | 115 GB | Medium; 7.07M projected low-density records, 12.86-14.39 KB observed/modelled cost |
| D4 Results/Evidence/Projections/indexes | 10.11 GB | 14.44 GB | 20.21 GB | Medium-low; assumes one daily assessment per eligible instrument-day |
| External context Raw/Facts | 0.01 GB | 0.02 GB | 0.10 GB | Medium; bounded daily sources, Facts largely included in PostgreSQL |

The AggTrades ZIP-to-Parquet size ratio is instrument-specific: Parquet is 2.24x-2.48x the compressed ZIP in the measured corpus. Actual Parquet density ranges from 28.78 bytes/event for BTCUSDT to 37.60 bytes/event for XRPUSDT. Source ZIPs are already compressed, so “Parquet compression” should not be misread as Parquet being smaller than the ZIP; Parquet is compressed relative to extracted CSV, which is not retained.

## Storage policies

| Policy | Low | Expected | High | What is retained |
|---|---:|---:|---:|---|
| A. Lean Derived final | 359 GB / 334 GiB | **428 GB / 399 GiB** | 525 GB / 489 GiB | Parquet, canonical/control PostgreSQL, D4, manifests; source ZIP/Raw removed after verified transform |
| B. Audit-Preserving final | 499 GB / 465 GiB | **568 GB / 529 GiB** | 665 GB / 619 GiB | Lean plus all source ZIP/Raw Artifacts |
| Backfill peak occupied | 545 GB / 508 GiB | **660 GB / 615 GiB** | 862 GB / 803 GiB | Audit final plus bounded temp, WAL/maintenance, retry/partial allowance |
| One-year incremental growth | 60 GB / 56 GiB | **85 GB / 79 GiB** | 125 GB / 116 GiB | New daily ZIP/Parquet, low-density Facts/control plane, and D4 daily outputs |
| C. Operational occupied after one year | 605 GB / 563 GiB | **745 GB / 694 GiB** | 987 GB / 919 GiB | Backfill-safe occupied data plus one year growth |
| C. Required capacity with 25% free | 807 GB / 752 GiB | **993 GB / 925 GiB** | 1,316 GB / 1,226 GiB | Occupied amount divided by 0.75 |
| D. Primary plus complete local backup | 1,306 GB / 1,216 GiB | **1,561 GB / 1,454 GiB** | 1,981 GB / 1,845 GiB | Operational primary capacity plus one Audit-Preserving backup copy |

The 2% filesystem allowance is included in Lean and Audit final sizes. The operational model then adds 1/2/4 GB low/expected/high bounded conversion temp, 20/45/115 GB WAL and maintenance allowance, and 25/45/78 GB retry/partial-download allowance. These allowances are deliberately not described as final retained data.

### Peak conversion detail

- Existing transformation units are daily, not whole-instrument batches.
- The largest inventoried daily AggTrades ZIP is DOGEUSDT at 246.5 MB compressed.
- Using observed extracted-to-ZIP ratios, a largest-day extracted intermediate is approximately 1.1 GB; adding its Parquet output and a retry copy keeps the expected single-conversion transient near 2 GB and the high allowance at 4 GB.
- If the worker were changed to extract an entire instrument before writing partitions, this estimate would no longer apply. The largest expected final instrument Parquet is BTCUSDT at 94.3 GB, and such a workflow would require a separate 100+ GB transient allowance.
- Expected new free space needed to finish the backfill from the current governed baseline is about **652 GB** (660 GB peak less 8.4 GB already present); the high-case requirement is about **854 GB**. D: currently has 918.9 GB free, enough for the high backfill peak, but not enough to preserve the required 25% reserve after the expected one-year state.

## Incremental growth model

Expected annual growth is 85 GB:

| Growth class | Expected per year | Basis |
|---|---:|---|
| AggTrades Parquet | 50 GB | Per-symbol full-history event density and measured bytes/event |
| AggTrades source ZIP | 16 GB | Recent measured ZIP rate; retained only under Audit/Operational policies |
| OHLCV/OI/Funding PostgreSQL and control plane | 16.5 GB | About 1.268M new low-density rows/year at the frozen 12.86 KB end-to-end model |
| D4 Results/Evidence/Projections | 2.3 GB | Six daily instrument windows and current D4 bytes/window |
| Raw low-density/external/filesystem rounding | 0.2 GB | Daily low-density sources are small |

Market activity is nonstationary, which is why the annual high case is 125 GB rather than a falsely precise linear value.

## Consumer disk comparison

Approximate usable formatted capacities assume 0.5% filesystem overhead; actual Windows labels and vendor reserved areas vary slightly.

| Nominal disk | Approx. usable | Lean expected remaining | Audit expected remaining | Operational expected remaining | Assessment |
|---|---:|---:|---:|---:|---|
| 1 TB | 995 GB / 927 GiB | 567 GB | 427 GB | **2 GB** against 993 GB required | Lean/Audit fit; Operational margin is effectively zero and high case does not fit: **MARGIN TOO NARROW** |
| 2 TB | 1,990 GB / 1,853 GiB | 1,562 GB | 1,422 GB | **997 GB**; high case leaves 674 GB | **RECOMMENDED** for six instruments and one year growth; expected local backup also fits with about 429 GB margin |
| 4 TB | 3,980 GB / 3,707 GiB | 3,552 GB | 3,412 GB | **2,987 GB** | **LONG-TERM SAFE** for universe expansion and comfortable local backup retention |

Recommendations:

1. **Minimum workable:** 1 TB only if choosing Lean or Audit-Preserving final storage and accepting that operational reserve requirements are not met.
2. **Minimum operationally safe purchase and recommended disk:** **2 TB**.
3. **Long-term disk for more instruments/datasets:** **4 TB**. AggTrades growth is activity-sensitive and scales roughly with instrument event volume, not merely instrument count.

## Uncertainty register

| Estimate | Confidence | Main uncertainty |
|---|---|---|
| AggTrades ZIP inventory | High | Exact source object inventory through cutoff; future activity still varies |
| AggTrades Parquet | Medium-high | Actual per-symbol ratios measured, but event schemas, row-group behavior, and market activity can shift |
| OHLCV/OI/Funding raw | High | Verified archive counts/ranges; tiny relative to total |
| D2/D3 PostgreSQL | Medium | Index fill, JSON payload size, bloat, and control-plane event count vary with retries and implementation |
| D4 full-history | Medium-low | Full-history Evidence/Projection generation is deferred; estimate assumes current daily output density scales across eligible days |
| WAL/maintenance peak | Medium | Checkpoint cadence and bulk transaction size can move WAL substantially; 45 GB expected and 115 GB high are allowances, not current measured WAL |
| One-year growth | Medium | Trading activity is nonstationary; source cadence is stable but AggTrades event density is not |

The largest uncertainty is not the exact source ZIP inventory; it is the combination of future AggTrades event density, Parquet encoding behavior, and PostgreSQL control/index amplification during a full run.

## Reproduction commands

All commands are read-only. Connection strings and secret values must remain environment-only and must not be printed.

```powershell
# Filesystem totals by durable class
Get-ChildItem -LiteralPath 'D:\QuantTerminalData\raw-artifacts' -Recurse -File |
  Measure-Object -Property Length -Sum
Get-ChildItem -LiteralPath 'D:\QuantTerminalData\raw-artifacts' -Recurse -File |
  Group-Object Extension | ForEach-Object {
    [pscustomobject]@{ Extension=$_.Name; Files=$_.Count; Bytes=(($_.Group | Measure-Object Length -Sum).Sum) }
  }
Get-ChildItem -LiteralPath '.data' -Recurse -File | Measure-Object Length -Sum
Get-ChildItem -LiteralPath 'D:\QuantTerminalData\raw-artifacts\.segment-build' -Recurse -File |
  Measure-Object Length -Sum

# Drives
Get-PSDrive -PSProvider FileSystem | Select-Object Name,Used,Free

# Progress ledgers (summary only; no write)
$files = @(
  'docs/project/d3-phase-3-aggtrades-segment-progress.json',
  'docs/project/d3-phase-3-funding-progress.json',
  'docs/project/d3-phase-3-ohlcv-progress.json',
  'docs/project/d3-phase-3-oi-progress.json',
  'docs/project/mvp-recent-market-corpus-progress.json'
)
$files | ForEach-Object { Get-Content -LiteralPath $_ -Raw | ConvertFrom-Json }

# Frozen source inventories and forecast inputs
Get-Content 'docs/project/d3-phase-3-ohlcv-execution-snapshot.json' -Raw | ConvertFrom-Json
Get-Content 'docs/project/d3-phase-3-funding-execution-snapshot.json' -Raw | ConvertFrom-Json
Get-Content 'docs/project/d3-phase-3-oi-execution-snapshot.json' -Raw | ConvertFrom-Json
Get-Content 'docs/project/d3-phase-3-aggtrades-execution-snapshot.json' -Raw | ConvertFrom-Json
Get-Content 'docs/project/d3-phase-3-volume-summary.json' -Raw | ConvertFrom-Json
```

Representative PostgreSQL queries were issued through the repository's PostgreSQL client with `SET default_transaction_read_only = on`:

```sql
SELECT pg_database_size(current_database());

SELECT
  sum(pg_relation_size(c.oid)) AS heap_bytes,
  sum(pg_indexes_size(c.oid)) AS index_bytes,
  sum(pg_total_relation_size(c.oid)) AS total_relation_bytes
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p')
  AND n.nspname NOT IN ('pg_catalog','information_schema');

SELECT n.nspname, c.relname,
       pg_relation_size(c.oid) AS heap_bytes,
       pg_indexes_size(c.oid) AS index_bytes,
       pg_total_relation_size(c.oid) AS total_bytes
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p')
  AND n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY total_bytes DESC;

SELECT count(*) FROM population.candidates;
SELECT count(*) FROM repository.record_versions;
SELECT count(*) FROM repository.lineage_edges;
SELECT count(*) FROM coverage.coverage_decisions;
```

## Audit boundary

- No physical file is counted twice. D2 and D3 share one PostgreSQL database and are one physical line item.
- Canonical relation projections in the dataset table are explanatory subsets of the all-in PostgreSQL forecast, not additive totals.
- Raw ZIP and Parquet are separate physical files and are both retained only in Audit-Preserving and Operational policies.
- Current legacy SQLite/cache/order-book files are disclosed but excluded from governed full-history extrapolation.
- No operational progress file was changed.
- No population, Funding, Evidence, Projection, or remote download process was started.
