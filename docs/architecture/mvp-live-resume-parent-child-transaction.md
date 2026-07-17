# MVP Live Resume Parent-Child Transaction

## Failure

The first live setup failed before acquisition because the coordinator derived a synthetic execution ID and passed it directly to unit persistence. No `refresh_run` row with that identity existed, so PostgreSQL rejected the first `refresh_unit` insert through `refresh_unit_run_id_fkey`. The failed statement retained no unit, candidate, watermark, or downstream output.

## Authoritative Contract

Live setup is now one serializable transaction:

1. validate the certified reconciliation plan and checksum;
2. insert or resolve the immutable `refresh_plan`;
3. insert or resolve the deterministic live `refresh_run` for the exact interval and execution profile;
4. use the persisted run identity to resolve the 23 acquisition units;
5. verify one run identity, exactly 23 units, and zero BTCUSDT OHLCV acquisition units;
6. commit the complete parent-child chain.

The coordinator cannot provide a separate run identity for unit persistence. A setup failure after plan, run, or first-unit insertion rolls back every new row and prevents lease acquisition.

## Resume And Concurrency

The run identity is deterministic over the certified plan identity and checksum, exact interval, and local inactive-candidate execution profile. `run` refuses an existing equivalent live execution. `resume` selects the same eligible live run, reuses completed units, resumes recoverable units, creates missing units, and rejects immutable conflicts. Historical certification and controlled-recovery runs use different identities and are never selected.

Serializable transaction isolation, deterministic primary keys, the unit logical-attempt constraint, and bounded serialization retry converge concurrent identical setup requests on one run and 23 units. Duplicate attempts cannot increase mandatory-slot completeness.

## Status

The worker status command reads the deterministic live plan, run, units, checkpoints, lease, run-scoped candidate, and run-scoped watermarks. Before the first successful setup it reports one authoritative reuse, 23 missing acquisition slots, no persisted live run, and no coordinator stage. It is read-only and no longer returns a certification placeholder.

## Certification

Rollback-only PostgreSQL certification proved parent ordering, persisted run identity propagation, exact resume, concurrent resolution, append-only checkpoints, and complete rollback after injected failures following plan, run, and first-unit insertion. No certification rows were retained. No target-day acquisition or external-system mutation occurred.
