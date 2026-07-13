# D4 Phase 2 Part 02 Report

## Baseline

- Branch: `epic/d2-canonical-persistence`
- Starting HEAD: `d1c8dcc77c38fca13d6e05588a442ddedfb5457c`
- Prerequisite: D4 Phase 2 Part 01 certified
- Scope: pure Consistency Rule Registry and evaluation runtime only

## Changed Files

- `lib/data-platform/consistency/ruleRuntimeContracts.ts`
- `lib/data-platform/consistency/ruleLifecycle.ts`
- `lib/data-platform/consistency/ruleRegistryRuntime.ts`
- `lib/data-platform/consistency/ruleEvaluationRuntime.ts`
- `lib/data-platform/consistency/index.ts`
- `tests/data-platform/consistency/rules/runUnitSuite.ts`
- `docs/project/d4-phase-2-part02-report.md`

Part 01 working-tree files remain present and were not redesigned by Part 02.

## Rule Registry

`ConsistencyRuleRegistry` is instance-owned and immutable. Construction validates and freezes every metadata record, sorts identities deterministically by rule ID and semantic version, and builds exact-version lookup state without exporting a mutable global registry.

Each rule carries:

- rule ID and semantic version;
- owner and category;
- activation state and bounded activation window;
- creation time;
- compatibility version;
- optional deprecation metadata;
- an exact successor identity only when superseded.

The registry rejects duplicate rule identities, malformed semantic versions, incomplete metadata, invalid activation windows, ambiguous supersession, missing successor versions, non-increasing successor versions, and overlapping active versions under the same compatibility contract.

## Versioning

Execution always resolves an exact `(ruleId, semanticVersion)` identity. It never selects the latest version dynamically. Compatibility version and knowledge-time activation are independent gates.

Supersession is explicit and must point to a higher semantic version of the same rule ID. Historic replay never resolves through the current registry: it verifies the original execution ID, exact rule version, input digest, and knowledge time, then returns the immutable original record unchanged.

## State Machine

Legal lifecycle transitions are closed:

```text
REGISTERED -> ACTIVE
REGISTERED -> DISABLED
ACTIVE -> DEPRECATED
ACTIVE -> SUPERSEDED
ACTIVE -> DISABLED
DEPRECATED -> SUPERSEDED
DEPRECATED -> DISABLED
```

`SUPERSEDED` and `DISABLED` are terminal. Duplicate and undocumented transitions fail closed.

Execution transitions are `PENDING -> RUNNING -> COMPLETED`, with `FAILED` available from `PENDING` or `RUNNING`. Completed and failed execution states are terminal.

## Execution Runtime

`RuleEvaluationRuntime` receives an immutable registry, an explicit exact-version evaluator map, and an explicit monotonic clock. It has no singleton, mutable global state, retries, timers, background work, provider access, or implicit persistence.

Requests contain an explicit execution ID, rule identity, dataset identity, canonical fact reference, knowledge time, evaluation time, compatibility version, and ordered canonical inputs. Inputs are copied and deeply frozen before evaluator invocation.

Single execution and deterministic batch execution are supported. Batch order is rule identity followed by execution ID. Outputs include all required identity, time, state, outcome, confidence-component, failure, duration, diagnostic, input-digest, and deterministic outcome-checksum fields.

Confidence components expose bounded evaluation basis only. The runtime does not invent or aggregate a numeric confidence score.

## Fail-Closed Behavior

The runtime emits immutable failed records for:

- missing rules;
- inactive knowledge-time windows;
- incompatible versions;
- missing inputs;
- invalid context or canonical reference;
- missing evaluators;
- evaluator exceptions;
- invalid evaluator outputs.

Failed records use `INDETERMINATE`, contain no confidence components or diagnostics, and preserve an explicit closed failure reason. There are no retries.

## PostgreSQL

No migration was added. The certified Part 01 schema already contains `consistency.rules`, `consistency.rule_runs`, `consistency.inputs`, `consistency.rule_results`, and diagnostics tables.

Part 02 does not add a PostgreSQL write adapter. The runtime returns immutable execution records only; durable write orchestration and live database certification require a separately approved scope. Part 01 migration numbering, ledgers, runtime lifecycle, and reset behavior are unchanged.

## Validation

| Check | Result |
|---|---|
| TypeScript | PASS |
| D1 regression | PASS |
| D2 Phase 1 | PASS |
| D2 Phase 2 unit | PASS |
| D3 Phase 1 | PASS |
| D3 Phase 2 unit | PASS |
| D4 Phase 1 | PASS |
| D4 Part 01 unit | PASS |
| D4 Part 02 unit | PASS, 35 checks |
| Registry determinism and immutability | PASS |
| Duplicate and supersession rejection | PASS |
| Activation and terminal-state rules | PASS |
| Exact-version and compatibility execution | PASS |
| Fail-closed execution | PASS |
| Deterministic ordering and outcome checksum | PASS |
| Historic replay identity verification | PASS |
| Retry/background scan | PASS, absent |
| Protected-system scan | PASS |
| Active runtime import scan | PASS, no consumer imports |
| Package and lockfile review | PASS, unchanged |
| Production build | NOT RUN, prohibited by `AGENTS.md` |

## Bounded Corrections

TypeScript validation required explicit readonly union annotations for closed transition arrays and empty failed-result tuples. No architecture, schema, or protected runtime behavior changed.

## Remaining Limitations

- No approved production rule evaluator or active production rule was introduced.
- Execution records are not persisted by Part 02.
- PostgreSQL role enforcement and durable execution reconciliation are not exercised here.
- Evaluation duration is operational metadata; deterministic outcome identity excludes duration and evaluation time.
- Historic replay reproduces only a supplied, verified immutable original record. It does not recompute through a newer rule version.

## Next Part

Part 03 may consume these immutable Consistency results for its approved scope. It must not reinterpret failed results, select a dynamic latest rule version, or bypass exact evidence references.

## Final Gate

SAFE TO IMPLEMENT D4 PHASE 2 PART 03 WITH LIMITATIONS
