# Replay Constitution

Project Epsilon - Replay V2 Sprint P1  
Status: Constitution  
Scope: Product purpose and ownership only  
Runtime behavior: none

## 1. Purpose

Replay answers:

```text
Did this thesis work in comparable historical conditions?
```

Replay is the historical validation layer of QuantTerminal. It receives context from upstream pages, reconstructs or displays what happened when source data is available, and helps the user understand whether the inherited thesis, evidence, or signal held up under comparable conditions.

Replay is not:

- Dashboard;
- Markets;
- Scanner;
- Research;
- Trade.

Replay must inherit upstream context. Replay must not recreate upstream analysis.

## 2. Primary User

### Trader

Entry:

- From Research after reviewing evidence.
- From Scanner when a signal needs historical context.
- From Trade when execution planning needs validation before action.

Use:

- Check whether similar historical conditions produced supportive or adverse outcomes.
- Identify failure modes before moving toward execution.
- Understand whether validation is strong enough to continue to Trade.

Exit:

- Trade, when validation supports execution planning.
- Research, when validation weakens or complicates the thesis.

### Analyst

Entry:

- From Research after selecting a thesis, historical case, or event.
- From Markets when live structure needs historical validation.

Use:

- Compare similar cases.
- Inspect outcome paths.
- Understand which evidence survived historical replay.

Exit:

- Research, when evidence interpretation needs refinement.
- Trade, only when the output supports execution planning.

### Researcher

Entry:

- From Research after loading Historical Analog, Event Impact, or Market Memory context.
- From direct replay navigation when a replay window is already known.

Use:

- Validate whether the thesis was historically plausible.
- Identify repeated failure modes.
- Preserve source-backed validation context.

Exit:

- Research, to update evidence interpretation.
- Trade, only as downstream planning context.

## 3. Core Decisions

Replay should enable users to decide:

- whether a thesis has historical support;
- whether comparable cases behaved similarly;
- whether the outcome path supports or contradicts the thesis;
- what failure modes appeared in comparable conditions;
- whether validation supports moving toward Trade;
- whether the user should return to Research for more evidence.

Replay should not:

- generate a new thesis;
- create new evidence;
- create narratives;
- rank opportunities;
- explore live markets;
- execute trades;
- generate entries, exits, stops, sizing, or take-profit logic;
- fabricate confidence or validation.

## 4. Ownership

### Replay Owns

Replay owns:

- historical validation;
- comparable cases;
- outcome analysis;
- failure modes;
- replay metadata;
- validation context;
- replay source availability;
- replay evidence quality;
- historical case and replay-window presentation;
- graceful unavailable states when replay data is missing.

### Replay Does Not Own

Replay does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Research evidence generation;
- Research narrative generation;
- Trade execution;
- opportunity ranking;
- thesis generation;
- confidence generation;
- complete orderbook claims when evidence is degraded or unavailable.

## 5. Inputs

Replay inherits inputs from upstream pages using the O4 readiness contract. It does not invent missing context.

| Input | Requirement | Owning page | Replay usage |
| --- | --- | --- | --- |
| Symbol | Required | Shared context | Select replay instrument and related source data. |
| Exchange | Required when available | Markets / Research | Select venue-specific replay data. |
| Timeframe | Required when available | Research / Markets | Align replay window and historical case context. |
| Time Window | Required for actual replay | Research or Replay direct entry | Defines date, hour, or session to replay. |
| Thesis | Optional but preferred | Research | Preserve why replay exists. |
| Evidence Summary | Optional but preferred | Research | Display inherited evidence context. |
| Supporting Evidence | Optional | Research | Show inherited supporting evidence. |
| Conflicting Evidence | Optional | Research | Show inherited contradiction context. |
| Narrative | Optional | Research | Frame why the replay window matters. |
| Confidence Context | Optional | Research / Dashboard / Scanner | Display inherited reliability context without recalculation. |
| Market Structure Context | Optional | Markets | Explain live structure that motivated validation. |
| Market Context | Optional | Markets / Dashboard | Display broad context without becoming a market overview. |
| Freshness | Optional | Research / Data Health | Show inherited freshness and coverage. |
| Investigation State | Optional but preferred | Research / shared context | Preserve source page, thesis, selected case, selected event, and investigation intent. |
| Selected Historical Case | Required for historical-case replay | Research / Historical Intelligence | Seed comparable-case validation. |
| Selected Event | Optional | Research / Event Impact | Seed event-based validation if supported. |

Input rules:

- Missing required replay window or selected case must produce an explicit unavailable or needs-selection state.
- Optional inherited context may be displayed, but Replay must not recompute it.
- Replay may compute replay-specific source availability and validation results.
- Replay must preserve real-data-only behavior.

## 6. Outputs

Replay should output:

- validation result;
- comparable cases;
- selected historical case context;
- outcome path;
- failure pattern;
- replay time window;
- replay source availability;
- replay evidence quality;
- confidence adjustment context as inherited or validation-derived context, not fabricated confidence;
- handoff readiness to Trade;
- return path to Research when validation is incomplete, degraded, or contradictory.

Replay output should help answer:

```text
Did the historical evidence strengthen, weaken, or fail to validate the thesis?
```

Replay output should not include:

- generated trade recommendation;
- buy/sell signal;
- generated thesis;
- generated narrative;
- invented confidence score;
- execution plan;
- unsupported orderbook reconstruction claim.

## 7. Success Criteria

A successful Replay page allows a user to understand within approximately 60 seconds:

- what thesis or case is being validated;
- what historical window or comparable case is being replayed;
- what happened;
- what outcome followed;
- what evidence was available, degraded, missing, or unavailable;
- which failure modes appeared;
- whether validation supports moving toward Trade or returning to Research.

Replay succeeds when it validates inherited context clearly.

Replay fails when it:

- makes the user reconstruct the thesis manually;
- hides missing replay data;
- claims validation without source-backed evidence;
- performs Research evidence generation;
- performs Trade execution planning;
- blocks responsiveness on heavy optional data;
- fabricates missing source coverage.

## 8. Validation

- `docs/project/replay-constitution.md` exists.
- Runtime code changes: none.
- Dashboard changes: none.
- Markets changes: none.
- Scanner changes: none.
- Research changes: none.
- Package changes: none.
- Build required: no.
