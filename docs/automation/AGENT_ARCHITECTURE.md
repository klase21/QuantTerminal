# QuantTerminal Automation Agent Architecture

Status: architecture foundation  
Scope: protocols only  
Runtime behavior: none

## Purpose

The QuantTerminal Automation Layer coordinates future AI-assisted product work without bypassing the project constitution, design system, validation rules, or human approval gates.

This sprint defines the agent roles and handoff boundaries only. It does not implement autonomous execution, scheduling, APIs, merge automation, or Telegram integration.

## Operating Model

Automation follows a gated workflow:

```text
Planner Agent
-> Codex Worker
-> QA Agent
-> Screenshot Agent
-> Review Agent
-> Telegram Approval Agent
-> Human-approved merge
```

Each stage must produce durable, reviewable output. No agent may silently mutate product behavior outside its assigned scope.

## Shared Constraints

All automation agents must obey:

- AGENTS.md
- `.skills/quantterminal-rules.md`
- Dashboard Freeze Rule when touching Dashboard
- Real Data Only
- Conclusion -> Reasons -> Evidence product hierarchy
- no synthetic data
- no hidden runtime changes
- no request-time historical computation
- no `npm run build` unless explicitly allowed by a sprint

## Planner Agent

### Responsibility

Translate a user or product objective into a bounded implementation task.

### Inputs

- product goal
- target files or directories
- constraints
- validation requirements
- expected output
- relevant constitution documents

### Outputs

- structured task JSON
- scope boundaries
- forbidden changes
- required validation commands
- acceptance checklist

### Constraints

- must not implement code
- must not expand scope beyond the stated goal
- must preserve existing architecture decisions
- must include validation and rollback expectations

### Failure Handling

If scope is ambiguous, the Planner Agent must produce a blocked task with explicit clarification needs rather than inventing requirements.

## Codex Worker

### Responsibility

Execute the approved task using repository-local context and the Planner Agent task schema.

### Inputs

- planner task JSON
- repository files
- AGENTS.md
- relevant docs and decisions
- validation commands

### Outputs

- code or documentation changes
- validation results
- changed file list
- known limitations

### Constraints

- must not alter protected systems without explicit task scope
- must not introduce synthetic data
- must not run forbidden commands
- must use minimal, targeted edits
- must preserve user or uncommitted work

### Failure Handling

If validation fails, Codex Worker must report the failure and either apply a targeted fix or mark the task blocked with exact failure evidence.

## QA Agent

### Responsibility

Verify that implementation output satisfies task requirements and does not violate project rules.

### Inputs

- changed files
- task JSON
- validation output
- relevant acceptance criteria

### Outputs

- pass/fail QA report
- missed requirements
- validation gaps
- risk notes

### Constraints

- must not modify runtime code
- must not broaden test scope beyond the task unless needed for risk
- must separate objective failures from subjective preferences

### Failure Handling

If QA cannot verify a requirement, it must mark that requirement as unverifiable and explain the missing evidence.

## Screenshot Agent

### Responsibility

Capture visual evidence for UI review across required viewports.

### Inputs

- target route
- viewport matrix
- expected visual hierarchy
- screenshot output path

### Outputs

- desktop screenshot
- tablet screenshot
- mobile screenshot
- screenshot metadata
- visible issue notes

### Constraints

- must not redesign UI
- must not modify runtime code
- must not fake screenshots
- must not certify a route that cannot load

### Failure Handling

If the app cannot be served or the route cannot load, Screenshot Agent must report the blocker and preserve any logs needed for review.

## Review Agent

### Responsibility

Determine whether a completed task should pass, fail, or require changes.

### Inputs

- task JSON
- changed files
- validation results
- QA report
- screenshot report when applicable
- constitution and design references

### Outputs

- review decision
- blocking findings
- non-blocking notes
- merge recommendation

### Constraints

- must prioritize bugs, regressions, and rule violations
- must not request subjective polish after freeze unless design review exists
- must not approve missing validation without documented exception

### Failure Handling

If review evidence is incomplete, Review Agent must return `PARTIAL PASS` or `FAIL` with missing evidence listed.

## Telegram Approval Agent

### Responsibility

Present final review results to a human approver and collect explicit approval for future automation stages.

### Inputs

- review decision
- changed file summary
- validation results
- screenshots or links when applicable
- risk summary

### Outputs

- approval request
- approval status
- human decision timestamp
- explicit approve/reject reason when provided

### Constraints

- must not merge without approval
- must not summarize away blocking failures
- must not transmit secrets or sensitive local data
- must not execute commands

### Failure Handling

If approval cannot be obtained, the automation chain must stop at the approval gate.

## Non-Goals

- autonomous execution
- autonomous merge
- production scheduler
- Telegram bot implementation
- runtime APIs
- background workers
- data generation
- UI redesign

