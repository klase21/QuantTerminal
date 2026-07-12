# Persistence Verification Suite

## Entry Points

```text
npx tsx tests/data-platform/persistence/postgres/runUnitSuite.ts
npx tsx tests/data-platform/persistence/postgres/runIsolatedIntegrationSuite.ts
```

The unit suite needs no database. The integration suite requires only `D2_ISOLATED_POSTGRES_URL`; it rejects missing, malformed, or production-looking targets.

## Static and Unit Coverage

- connection bounds, target safety, and credential redaction;
- approved migration discovery, order, checksums, malformed names, and duplicate numbers;
- no implicit environment selection;
- bounded typed writer boundary;
- advisory lock and checksum-aware outcomes;
- bounded retry policy.

## Live Integration Coverage

- migration application, ledger, rerun skip, changed-checksum rejection, and isolated reset;
- complete commit reconciliation and outbox atomicity;
- exact duplicate and conflicting candidate behavior;
- correction, certification, publication, and atomic supersession;
- illegal transitions;
- real concurrent identical/incompatible writes;
- competing corrections and concurrent publication;
- failure injection after every transaction stage;
- lineage acyclicity;
- actual denied privileges and approved procedure access.

## Safety

Reset requires both a safe target identity and explicit opt-in. The suite cleans the isolated schemas in `finally` and shuts down the client. It never uses `DATABASE_URL`, starts automatically, or runs in the application. Fixture values are deterministic and explicitly isolated; they make no current market claim and perform no production population.

## Evidence Vocabulary

Results are `PASS`, `FAIL`, or `BLOCKED`. A suite that cannot connect is `BLOCKED`, not `PASS`. Static inspection cannot certify PostgreSQL grammar, rollback, locking, privileges, or concurrency.
