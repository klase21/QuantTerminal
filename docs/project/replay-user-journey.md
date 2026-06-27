# Replay User Journey

Project Epsilon - Replay V2 Sprint P2  
Status: User journey definition  
Runtime behavior: none

## Purpose

Replay answers:

```text
Did this thesis work in comparable historical conditions?
```

Replay validates inherited context. It must not recreate upstream Research analysis or Trade execution logic.

## A. 10-Second Orientation

Within 10 seconds, the user should understand:

- what thesis is being validated;
- validation status;
- replay scope;
- historical coverage;
- whether the replay is ready, degraded, missing, or unavailable.

### User Questions

- What am I validating?
- Which symbol, exchange, timeframe, and historical window are in scope?
- Is there a selected historical case?
- Is enough replay evidence available to continue?

### Required First Read

The first viewport should expose:

- thesis or inherited investigation title;
- symbol / exchange / timeframe;
- selected historical case or replay window;
- validation status;
- historical coverage;
- evidence quality state.

### Failure Handling

If required context is missing, Replay should clearly show:

- missing selected case;
- missing time window;
- unavailable source data;
- degraded orderbook evidence;
- return path to Research.

## B. 60-Second Validation

Within 60 seconds, the user should understand:

- comparable historical cases;
- outcome distribution;
- success and failure patterns;
- confidence adjustment context;
- evidence quality;
- whether validation supports moving toward Trade.

### User Questions

- Did similar cases support or contradict this thesis?
- What happened after the comparable setup?
- What were the strongest failure modes?
- Is the outcome path consistent or mixed?
- Is the available evidence reliable enough to use?

### Required Validation Layer

Replay should show:

- comparable case list;
- selected case details;
- outcome analysis;
- failure patterns;
- evidence quality;
- replay metadata.

### Confidence Adjustment Context

Replay may explain whether validation:

- strengthens inherited confidence context;
- weakens inherited confidence context;
- remains mixed;
- is unavailable because source coverage is missing.

Replay must not fabricate confidence or create a new confidence score.

## C. Deep Investigation

Replay deep investigation is focused on validation details only.

### Research Handoff

Use Research when:

- evidence is missing;
- contradictions need interpretation;
- narrative context matters;
- the thesis needs to be revised;
- source quality is insufficient.

Replay should hand back:

- validation result;
- outcome path;
- failure pattern;
- evidence quality state;
- selected historical case or replay window.

### Trade Handoff

Use Trade when:

- validation is complete enough for planning;
- the user wants to assess execution;
- failure modes are understood;
- inherited evidence and replay outcome are sufficient.

Replay should hand off:

- symbol;
- thesis;
- validation result;
- replay result;
- outcome summary;
- evidence quality;
- selected case or window.

Trade owns execution. Replay must not create entries, exits, sizing, stop-loss, take-profit, or execution plans.

## Entry Paths

Replay may be entered from:

- Research, after loading or selecting historical evidence;
- Scanner, when a signal needs historical context;
- Trade, when a setup needs validation before planning continues;
- direct navigation, when replay window context is already known.

## Exit Paths

Replay should exit to:

- Research, when evidence interpretation is needed;
- Trade, when validation supports execution planning;
- Markets, only when broader live market context is needed;
- Scanner, only when the user needs new opportunities.

## Success Criteria

Replay succeeds when the user can answer within approximately 60 seconds:

- what thesis is being validated;
- what comparable historical conditions were used;
- what happened afterward;
- what failure modes appeared;
- what evidence quality supports the replay;
- whether the next step is Research or Trade.

Replay fails when it:

- makes the user reconstruct the thesis manually;
- hides missing historical coverage;
- claims validation without source-backed replay evidence;
- performs Research evidence generation;
- performs Trade execution planning;
- fabricates missing data.

## Validation

- `docs/project/replay-user-journey.md` exists.
- Runtime code changes: none.
- Dashboard, Markets, Scanner, Research changes: none.
- Package changes: none.
