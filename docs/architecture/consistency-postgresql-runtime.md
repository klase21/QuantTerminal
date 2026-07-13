# D4 Consistency PostgreSQL Runtime

## Mission

The Part 01 runtime provides explicit isolated PostgreSQL lifecycle and migration infrastructure only. It contains no Rule execution, Result persistence API, Evidence assembly, Projection generation, provider access, object storage, AI, scheduler, or consumer integration.

## Environment

Only `D4_ISOLATED_POSTGRES_URL` is accepted. The database name must be `quantterminal_d4_isolated`. Equality with `DATABASE_URL`, `D2_ISOLATED_POSTGRES_URL`, or `D3_ISOLATED_POSTGRES_URL` fails closed. Production-like host/database markers fail closed. Logs expose only host, port, database, and SSL mode.

## Lifecycle

`ConsistencyPostgresRuntime` is instantiated per owner and is never a singleton.

```text
DISCONNECTED -> CONNECTING -> CONNECTED -> SHUTTING_DOWN -> DISCONNECTED
                                                        -> SHUTDOWN
```

Construction performs no network operation. `connect` is explicit and verifies database identity, PostgreSQL version, and absence of the D3 population schema. The D2 foundation is a separate explicit prerequisite so an empty D4 target can connect for authorized dependency bootstrap. Native D4 migration refuses to run until that prerequisite is complete.

Transactions use bounded `READ COMMITTED` blocks. Pool size is limited to four; connect and idle timeouts are bounded. There is no reconnect loop or automatic migration.

## Migration Architecture

Application order is fixed:

1. Verify the isolated D4 target.
2. Apply the checksum-pinned certified D2 schema foundation.
3. Verify D2 objects and dependency ledger completeness.
4. Apply the three native D4 migrations.
5. Verify native objects and run certification.

`d4_control.dependency_bootstrap_ledger` records the D2 baseline. `d4_control.migration_ledger` records native D4 migrations. Neither substitutes for D2's own `control.migration_ledger`.

The D4 blueprint avoids D2-owned `consistency.runs` and `consistency.results`: D4 owns `consistency.rule_runs` and `consistency.rule_results`.

## Reset

`D4_NATIVE_ONLY` is represented by the explicit `RESET_D4_ISOLATED_DATABASE` command. It drops the enumerated D4 tables and native ledger while preserving the local D2 foundation and dependency ledger.

`D4_FULL_ISOLATED_REBUILD` requires the separate `RESET_D4_FULL_ISOLATED_REBUILD` opt-in. It removes native D4 objects, the locally bootstrapped D2 schemas, and both D4-owned ledgers only through the verified D4 connection.

No generic reset exists.

## Certification

PostgreSQL 16.13 live verification passed for lifecycle, dependency bootstrap, native migrations, checksum drift, stop-on-failure, transaction rollback, rerun, both reset modes, and rebuild. Read-only before/after snapshots confirmed the D2 and D3 databases were unchanged.

## Limitations

Part 01 establishes infrastructure only. Runtime roles, Rule execution, Result persistence behavior, Evidence assembly, and consumer integration remain outside scope.
