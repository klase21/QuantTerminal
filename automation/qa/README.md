# QA Harness

Status: Sprint A5 foundation

The QA Harness runs standard validation commands and returns a structured report compatible with `automation/contracts/qa.schema.json`.

It is isolated from product runtime code. It does not modify Dashboard, APIs, routes, package scripts, or data artifacts.

## Commands

The standard command set is defined in `commands.ts`.

| Check | Command | Blocking |
| --- | --- | --- |
| TypeScript | `npx.cmd tsc --noEmit --pretty false --incremental false` | Yes |
| Dashboard Integration Audit | `npm run audit:dashboard-integration` | No |
| Intelligence Smoke Test | `npm run test:intelligence` | No |

## Execution Flow

```text
runQaChecks()
↓
run each command sequentially
↓
capture exit code, stdout, stderr, duration
↓
stop only when a blocking command fails
↓
return structured QA report
```

## Output Shape

The harness returns:

```ts
{
  status,
  generatedAt,
  checks,
  tsc,
  tests,
  audits,
  warnings,
  failures
}
```

The `tsc`, `tests`, `audits`, `warnings`, and `failures` fields align with the Sprint A2 QA message contract.

## Failure Handling

Supported failure reasons:

- `command_failed`
- `command_timed_out`
- `command_unavailable`
- `unknown_error`

Blocking failures stop the remaining command sequence. Non-blocking failures are recorded and the harness continues.

## Future Orchestrator Integration

Future automation sprints can call `runQaChecks()` from the QA stage in the Automation Orchestrator.

The orchestrator should pass:

- task id
- working directory
- command overrides when a sprint needs a narrower validation set

The QA Harness should continue to produce the same schema-aligned report so Review Agent behavior remains stable.
