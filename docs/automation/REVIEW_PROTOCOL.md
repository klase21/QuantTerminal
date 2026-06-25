# QuantTerminal Automation Review Protocol

Status: review protocol foundation  
Scope: Review Agent behavior  
Runtime behavior: none

## Purpose

The Review Agent determines whether a completed automation task is safe to accept. Reviews must be evidence-based, constitution-aware, and strict about scope.

## Review Inputs

- task schema
- changed files
- validation output
- QA report
- screenshot report when applicable
- relevant constitution documents
- repository status

## Review Decision Values

- `PASS`
- `PARTIAL PASS`
- `FAIL`

## 1. Constitution Review

The Review Agent verifies alignment with:

- AGENTS.md
- `.skills/quantterminal-rules.md`
- Real Data Only
- Responsiveness First
- Conclusion -> Reasons -> Evidence
- page responsibility boundaries
- protected systems

Failure examples:

- synthetic data introduced
- historical computation added to request path
- Dashboard turned into a research workflow
- protected Replay runtime modified outside scope

## 2. Design System Review

For UI changes, verify alignment with:

- `docs/project/DESIGN.md`
- `docs/project/dashboard-design-system.md`
- `docs/project/design-token-registry.md`
- page-specific state documents

The Review Agent must distinguish:

- objective design system violations
- subjective preferences

Subjective preferences must not block frozen sections unless a design review exists.

## 3. Freeze Rule Review

For frozen surfaces, verify changes are limited to:

- objective bugs
- responsive issues
- accessibility
- documented product requirements

Any subjective redesign to a frozen section must fail review unless accompanied by a documented design review.

## 4. Runtime Review

Verify:

- no forbidden API changes
- no router/search-param churn
- no unexpected fetch or `useEffect` changes
- no scoring or calculation changes outside scope
- no request-time heavy historical computation
- graceful unavailable states remain intact

Runtime review must prioritize regressions over style concerns.

## 5. Screenshot Review

Required when UI is touched and the task requests visual validation.

Screenshot review checks:

- desktop target
- tablet target
- mobile target
- no obvious overlap
- no clipped critical text
- preserved information hierarchy
- missing/unavailable/loading states visible where applicable

If screenshots cannot be captured, Review Agent must mark screenshot evidence as missing and decide whether that blocks the task.

## 6. Validation Review

Required validation must be reported with:

- command
- pass/fail
- relevant output
- skipped reason if skipped

Missing required validation is a blocker unless explicitly waived.

## 7. Final Decision

### PASS

Use when:

- all required validations pass
- scope is respected
- no blocking findings remain
- screenshot evidence is sufficient when required

### PARTIAL PASS

Use when:

- implementation is mostly correct
- non-blocking evidence is missing
- follow-up work is needed but current changes are safe

### FAIL

Use when:

- validation fails
- scope is violated
- runtime behavior regresses
- synthetic data is introduced
- freeze rule is violated
- protected systems are changed without authorization

## Review Output Format

```text
Decision: PASS | PARTIAL PASS | FAIL

Findings:
- severity
- file
- evidence
- recommended fix

Validation:
- command: result

Final recommendation:
- accept
- request changes
- block
```

