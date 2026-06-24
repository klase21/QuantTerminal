# Page Responsibility Matrix

Status: canonical responsibility matrix draft  
Scope: Dashboard, Markets, Scanner, Trade, Research, Replay, Settings  
Non-goals: UI redesign, runtime implementation

Legend:

- `Primary`: this page owns the responsibility.
- `Secondary`: this page supports the responsibility.
- `Not Responsible`: this page should not optimize for this responsibility.

Core rule:

```text
No responsibility column should have overlapping Primary ownership unless the responsibility describes a broad product capability and the page owns a distinct sub-question.
```

For this version, each product page has one unique primary responsibility.

---

## Matrix

| Page | Decision | Discovery | Monitoring | Execution | Investigation | Explanation | Operations |
|---|---|---|---|---|---|---|---|
| Dashboard | Primary | Secondary | Secondary | Not Responsible | Secondary | Secondary | Not Responsible |
| Markets | Secondary | Primary | Secondary | Not Responsible | Not Responsible | Secondary | Not Responsible |
| Scanner | Not Responsible | Secondary | Primary | Not Responsible | Not Responsible | Secondary | Not Responsible |
| Trade | Secondary | Not Responsible | Not Responsible | Primary | Secondary | Secondary | Not Responsible |
| Research | Secondary | Not Responsible | Not Responsible | Not Responsible | Primary | Secondary | Not Responsible |
| Replay | Secondary | Not Responsible | Not Responsible | Not Responsible | Secondary | Primary | Not Responsible |
| Settings | Not Responsible | Not Responsible | Secondary | Not Responsible | Not Responsible | Not Responsible | Primary |

---

## Responsibility Definitions

### Decision

Helping the user understand the current state and decide where to focus.

Primary owner:

- Dashboard

Secondary support:

- Markets validates live state.
- Trade supports candidate-level decision preparation.
- Research supports deeper decision evidence.
- Replay supports post-event validation.

### Discovery

Finding markets, opportunities, or symbols that deserve attention.

Primary owner:

- Markets

Secondary support:

- Dashboard may suggest where attention belongs.
- Scanner identifies changes that feed discovery.

### Monitoring

Watching for meaningful changes, lifecycle transitions, or state changes.

Primary owner:

- Scanner

Secondary support:

- Dashboard monitors high-level market state.
- Markets monitors live symbol state.
- Settings monitors operational health.

### Execution

Turning a selected candidate into a trade evaluation and plan.

Primary owner:

- Trade

Secondary support:

- Dashboard, Markets, Scanner, Research, Replay, and Settings should not own execution.

### Investigation

Understanding why a state matters and what historical or event evidence says.

Primary owner:

- Research

Secondary support:

- Dashboard starts the investigation.
- Trade may request validation.
- Replay inspects a selected historical window.

### Explanation

Explaining what happened in a specific context or window.

Primary owner:

- Replay

Secondary support:

- Dashboard explains current drivers.
- Markets explains live structure.
- Scanner explains signal causes.
- Trade explains candidate thesis.
- Research explains implications.

### Operations

Configuring the system and inspecting source or platform health.

Primary owner:

- Settings

Secondary support:

- Dashboard, Markets, Scanner, Trade, Research, and Replay may show health states but do not own operations.

---

## Ownership Guardrails

Dashboard must not become Research.

Markets must not become Scanner.

Scanner must not become Trade.

Trade must not become Markets.

Research must not become Replay.

Replay must not become Historical Analog generation.

Settings must not become an intelligence dashboard.

---

## Validation

Pass:

- Every page has exactly one Primary responsibility.
- No two pages answer the same primary user question.
- Secondary responsibilities support handoff, not ownership.

Fail:

- Dashboard and Research both try to own deep investigation.
- Markets and Scanner both try to own discovery/change detection.
- Trade and Scanner both try to own candidate generation.
- Replay and Research both try to own historical explanation without handoff boundaries.

