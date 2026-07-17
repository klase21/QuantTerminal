# MVP Population resume lease reconciliation

Status: rollback-only certification complete. The live resume command was not executed.

## Incident

The first rejected unit was Open Interest / ETHUSDT. Its durable unit state was `PROCESSING`, its fence-3 lease was released, and its Candidate-boundary checkpoint proved that Canonical Commit was the next stage. Its Population run was already `SUCCEEDED`.

The claim contract required both a `RUNNING` Population run and a unit in `PENDING` or `RETRYABLE`. The old reconciliation reader filtered out terminal parent runs before it could restore the durable unit boundary. The fallback recreated the deterministic attempt-1 run only in memory; the persisted run remained `SUCCEEDED`, so lease acquisition returned no row and surfaced `LIVE_POPULATION_UNIT_LEASE_UNAVAILABLE`.

## Reconciliation contract

A nonterminal unit with no active unexpired lease is reconciled from durable D3 lineage. Retrieval Attempt, Raw Object attribution, Candidate identities, committed outcomes, and the latest checkpoint determine the resume stage.

- A still-running parent run is reused.
- A terminal parent run is preserved and a deterministic next Population run attempt is appended.
- An expired unreleased lease is closed as `EXPIRED`; released leases remain unchanged.
- The unit receives an immutable `RESUME_RECONCILED` event and is projected to `RETRYABLE`.
- A unit-specific lease is inserted with exactly `current fence + 1` while the unit row is locked.
- A fence-scoped stage event and resume checkpoint restore `CANONICAL_COMMIT` without repeating Retrieval, Raw Object, or Candidate work.

The transaction is all-or-nothing. A concurrent reconciler sees the new active lease and receives `POPULATION_RESUME_ACTIVE_LEASE`. An active unexpired lease is never displaced.

## Failure boundary

After reacquisition, Canonical Commit failure uses the existing atomic Population failure operation. It appends the sanitized failure event, persists the Candidate-boundary checkpoint, transitions the unit to `RETRYABLE`, clears the active lease, and releases the lease. Downstream execution remains unreachable after the exception.

## Certification

The authenticated suite copied the four real partial-state shapes into disposable transaction-scoped identities:

- BTCUSDT AggTrades: one Candidate, running parent, expired fence 1;
- DOGEUSDT Funding: three Candidates, succeeded parent, released fence 3;
- ETHUSDT Open Interest: two Candidates, succeeded parent, released fence 3;
- SOLUSDT Open Interest: 288 Candidates, running parent, expired fence 1.

Two complete rollback passes produced eight lease winners. Initial fences advanced to 2 or 4; exact retry after injected failure advanced again and returned reconciliation `DUPLICATE`. Eight competing attempts were rejected while an unexpired lease existed. Retrieval, Raw Object, and Candidate counts did not increase. No duplicate event or checkpoint identity was created, and rollback retained zero rows or artifacts.

Authenticated preflight now reports persisted resume lease eligibility. It cannot pass when a mandatory partial unit has an active lease, terminal unit state, cancellation, or missing durable resume boundary.
