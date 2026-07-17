# MVP Live Resume Partial-State Semantics

## Two Plan Views

The immutable logical plan is certified before execution setup as one authoritative BTCUSDT OHLCV reuse plus 23 `CREATE_NEW_ON_LIVE_RESUME` slots. After the atomic parent transaction commits, those same logical slots are represented by persisted unit outcomes. Status and resume must not demand 23 create actions again.

Validation is stage-aware:

- `BEFORE_EXECUTION_SETUP` accepts only the certified 1+23 logical plan.
- `AFTER_EXECUTION_SETUP` requires the 23 persisted acquisition units under the persisted run.
- `DURING_EXECUTION` accepts valid complete, recoverable, blocked, or genuinely missing slot outcomes without counting duplicate attempts.
- `COMPLETE` requires all 23 persisted units complete plus the authoritative reuse.

## Persisted Execution

Status reads the persisted plan, run, units, coordinator events, lease, refresh artifacts, refresh candidates, watermarks, and candidate lifecycle before any plan reconstruction. It also reads legacy double-encoded plan payloads without rewriting them. The failed live execution remains one plan, one run, and 23 `PENDING` units; its coordinator lease is released and its latest successful stage is `UNITS_RESOLVED`.

The database run state remains `PLANNED`, preserving resumability under the existing immutable state machine. Status derives an effective execution state of `BLOCKED` from the append-only `STAGE_FAILURE:SOURCES_ACQUIRED` event. This avoids rewriting history or forcing a terminal run state that cannot legally resume.

Resume loads the same persisted plan and deterministic run identity, verifies governance first, resolves existing units, and continues from the first incomplete checksum-linked coordinator stage. It does not create an equivalent run or a second BTCUSDT OHLCV unit.
