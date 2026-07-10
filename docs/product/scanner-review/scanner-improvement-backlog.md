# Scanner V2 Improvement Backlog

**Status:** Post-design implementation backlog  
**Sprint:** F5  
**Rule:** This backlog does not authorize provider, scoring, API, runtime, or
Repository changes by itself.

## Critical

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Align hierarchy to Scanner V2 | Establish queue -> opportunity -> evidence -> risk -> path -> validation/audit. | PDGM-104, component extraction | Existing polling and retention remain functional. |
| Remove signal-feed and tradeable framing | Preserve investigation ownership. | Canonical terminology | No copy implies a buy/sell recommendation. |
| Stop unsupported fallback labels | Preserve no-fabrication behavior. | Candidate source contract | Missing setup, direction, reason, grade, or confidence remains unavailable. |
| Require priority basis | Prevent black-box ranking. | Priority Queue contract | Score, method, evidence count, freshness, and coverage travel together. |
| Make counter-evidence mandatory | Prevent one-sided prioritization. | Risk Card | Conflict and missing-data review cannot be hidden. |
| Preserve source-backed candidate identity | Support idempotency and audit. | Scanner source / Repository contract | Duplicate UI rows map to one deterministic candidate. |

## High

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Implement evidence-gated Priority Queue | Support fast, honest triage. | Priority Queue Row | Unsupported rankings remain unavailable. |
| Implement canonical Opportunity Card | Consolidate headline, evidence, risk, and path. | Opportunity Card contract | No duplicated candidate metrics. |
| Add Evidence Category Grid | Expose support and source gaps. | Evidence contracts | Ten categories show explicit availability. |
| Add Missing Data and Coverage panel | Make incomplete evidence actionable. | Coverage model | Missing evidence never raises priority. |
| Establish Markets verification handoff | Preserve live context. | Shared product context | Candidate ID, symbol, timeframe, and evidence state preserved. |
| Establish Replay/Research/Repository handoffs | Support validation and audit. | Existing context contracts | No automatic heavy load or lost uncertainty. |

## Medium

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Investigation lifecycle states | Track discovered, reviewed, replayed, researched, and planned. | Lifecycle contract | State transitions are source/user backed. |
| Saved investigation queues | Support professional monitoring. | Workspace and identity | Saved queue does not preserve stale priority as truth. |
| Candidate comparison view | Compare evidence and risk. | Normalized evidence contracts | No synthetic aggregate confidence. |
| Repository candidate availability | Audit captured snapshots and evidence. | Repository query contract | Reads remain bounded and responsive. |
| Responsive Scanner mode | Support laptop and tablet surveillance. | Responsive system | Queue and risk remain readable. |

## Low

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| Collaborative review status | Support institutional triage. | Identity and collaboration | Human notes remain separate from evidence. |
| Custom queue views | Support analyst preferences. | Workspace model | Canonical queue remains available. |
| Watchlist pinning | Preserve monitored investigations. | Candidate identity | Pinning cannot raise priority. |

## Future

| Item | Purpose | Dependency | Acceptance gate |
| --- | --- | --- | --- |
| AI-assisted prioritization | Suggest investigation order. | AI and reasoning governance | Method and evidence references are exposed; AI cannot approve itself. |
| Multi-agent candidate review | Separate generation, challenge, and validation. | Agent governance | Counter-review remains independent. |
| Plugin opportunity categories | Expand market domains. | Plugin and source governance | New categories use canonical evidence contracts. |
| Enterprise surveillance queues | Support team review and escalation. | Permissions and audit | Priority, facts, and human decisions remain distinct. |

## Recommended Sequence

```text
Canonical candidate fields
  -> Priority Queue
  -> Opportunity Card
  -> Supporting Evidence
  -> Risk and Missing Data
  -> Markets / Replay / Research / Repository handoffs
  -> Investigation lifecycle
  -> Workspace productivity
```

## Out of Scope

- New providers or signal sources;
- automatic trade recommendations;
- fabricated direction, setup, reason, freshness, or confidence;
- hidden ranking formulas;
- automatic historical workflows;
- unbounded Repository or Replay reads;
- conversion of Scanner into a screener, ticker, or signal-selling feed.

