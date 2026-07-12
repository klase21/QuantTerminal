# Population SQL Blueprint

The unapplied D3 migration is isolated under `lib/data-platform/population/postgres/migrations`. It is not listed in the D2 migration runner.

The blueprint adds a bounded `population` schema for immutable Candidates and canonical submissions. Existing `control`, `raw`, `quality`, `coverage`, and `quarantine` schemas retain their responsibilities.

Control tables cover Jobs, Runs, Units, append-only events, leases, checkpoints, Retrieval Attempts, outcomes, retries, and watermark eligibility. Candidate validation and quality histories are append-only. One Candidate has at most one canonical submission.

Claim, heartbeat, and state advancement are controlled SQL functions. Claim uses `FOR UPDATE SKIP LOCKED`; heartbeat and advancement require the current fencing token. Runtime roles receive procedure-level access later and no arbitrary history deletion.

Indexes are limited to known claim, expiry, resume, retrieval, outcome, and candidate-source lookups. No table is partitioned in Phase 1 because production volume has not demonstrated a need.

Static checks verify filenames, required tables, fencing clauses, event histories, Candidate submission uniqueness, raw-byte exclusion, and separation from D2 migrations. SQL was not applied or live-parsed.
