# Population Contracts

The additive contracts live under `lib/data-platform/population`. They define Jobs, Runs, Units, Retrieval Attempts, leases, checkpoints, typed Candidates, validation and quality results, normalization input, D2 submissions, population outcomes, retry classifications, watermark eligibility, publication handoff, and provider-neutral ports.

All lifecycle and outcome vocabularies are closed unions. OHLCV, Funding, Open Interest, Liquidation, and Stream Manifest Candidates have bounded domain payloads; no generic canonical payload exists.

## Profiles

| Profile | Unit behavior | Checkpoint and retry | Watermark |
|---|---|---|---|
| `BACKFILL` | Archive, partition, day, or bounded historical window | Resume completed partitions; verified manifests may be reused | Advances only across resolved required Units |
| `INCREMENTAL` | Cursor, event window, or snapshot Unit | Resume supplied deterministic cursor; repeated retrieval remains observable | Evaluates the newest contiguous safe boundary |
| `CORRECTION` | Explicit source correction scope | Reuses retained raw evidence only when policy permits; always renormalizes | Does not displace prior safe boundary until D2/publication governance resolves it |
| `RECONCILIATION` | Compares declared bounded source/canonical scope | Checkpoints comparison boundaries; does not silently repair | Emits decisions and gaps, not fabricated completeness |

## Event History

Job, Run, Unit, lease, checkpoint, retry, outcome, and watermark events are append-only. Materialized state is a controlled read projection. State reconstruction orders immutable events by their supplied canonical timestamp and validates legal transitions; logs are not truth.

## Quality and Publication

Validation and D1 quality are distinct immutable runs. Quality does not calculate AI confidence. Population ends at a D2 `PENDING` version and emits only a publication handoff; providers, workers, and coordinators cannot publish.
