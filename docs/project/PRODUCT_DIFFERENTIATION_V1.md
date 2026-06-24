# Product Differentiation V1

Status: canonical page differentiation draft  
Scope: Dashboard, Markets, Scanner, Trade, Research, Replay, Settings  
Non-goals: UI redesign, runtime implementation, mockup changes

QuantTerminal now has a consistent visual language. The next product risk is not layout. It is page overlap.

This document defines why each page exists, what question it owns, what it produces, and what should not appear there.

Core rule:

```text
One page may support many workflows.
One page may have only one primary responsibility.
```

---

## 1. Dashboard

### Why It Exists

Dashboard exists for immediate market understanding.

It answers the first question a user has when they open QuantTerminal:

```text
What is happening right now, and why?
```

### Primary Question

What is the current market direction?

### Secondary Question

What are the top drivers and strongest supporting evidence?

### Inputs

- Market Driver summary
- ETF evidence
- Reserve evidence
- Treasury evidence
- Funding and OI evidence
- Liquidation evidence
- Prediction market summary
- Data Health status
- Lightweight historical evidence summary when cache-backed

### Outputs

- Market direction
- Ranked top drivers
- Compact evidence preview
- Data health summary
- Handoff to Research for deeper investigation

### What Should Not Appear Here

- Deep historical workflows
- Request-time historical computation
- Full Historical Analog case exploration
- Replay controls
- Trade execution plans
- Raw source tables
- Long narrative panels
- Operational configuration

---

## 2. Markets

### Why It Exists

Markets exists for live market verification and opportunity inspection.

It lets expert users validate whether live structure supports or contradicts a market read.

### Primary Question

Which live markets deserve attention?

### Secondary Question

Does live structure confirm the current read?

### Inputs

- Price and volume
- Funding
- Open Interest
- Liquidation context
- Orderflow
- Futures intelligence
- Symbol-level market structure
- Active filters

### Outputs

- Ranked assets or symbols
- Live structure summary
- Symbol-level evidence
- Real-time validation context
- Handoff to Trade or Research

### What Should Not Appear Here

- Dashboard-level market conclusion as the main purpose
- Trade execution planning
- Deep historical analog exploration
- Replay timeline inspection
- Market Memory synthesis
- System settings
- Heavy historical processing

---

## 3. Scanner

### Why It Exists

Scanner exists to detect meaningful change.

It should answer what newly appeared, changed, accelerated, aged, or expired.

### Primary Question

What changed that needs attention now?

### Secondary Question

Which changes are worth investigating first?

### Inputs

- Signal detection outputs
- Candidate rankings
- Volume changes
- Funding changes
- Open Interest changes
- Liquidation changes
- Candidate lifecycle state

### Outputs

- New signals
- Active candidates
- Aging candidates
- Expired candidate removal
- Handoff to Markets or Trade

### What Should Not Appear Here

- Full market dashboard
- Trade execution plan
- Deep evidence tables
- Historical Analog workflows
- Replay controls
- Research reports
- System operations

---

## 4. Trade

### Why It Exists

Trade exists to evaluate a selected candidate and build conviction.

It is not a signal discovery page. It is a decision preparation page.

### Primary Question

Should I continue evaluating this candidate as a trade?

### Secondary Question

What supports, invalidates, or complicates the execution plan?

### Inputs

- Selected trade candidate
- Candidate drivers
- Risk evidence
- Invalidation context
- Market structure evidence
- Execution planning data
- Candidate persistence state

### Outputs

- Trade thesis
- Supporting drivers
- Risk assessment
- Invalidation context
- Execution details
- Handoff to Replay or Research for validation

### What Should Not Appear Here

- Broad opportunity discovery as the primary function
- Full Scanner ranking logic
- Dashboard-level market summary
- Deep historical research workspace
- Replay timeline controls
- System settings
- Synthetic conviction scores

---

## 5. Research

### Why It Exists

Research exists for deep investigation and decision support.

It connects current market state, narratives, historical analogs, event impact, memory, and evidence into one investigation workflow.

### Primary Question

Why does this market state matter?

### Secondary Question

What happened in similar situations, and what evidence supports or contradicts the implication?

### Inputs

- Shared investigation context
- Historical Analog cache
- Event Impact cache
- Market Memory artifacts
- Narrative Intelligence
- Prediction Markets
- Information Flow
- Evidence Validity metadata
- Contradiction metadata
- Decision Brief metadata

### Outputs

- Research thesis context
- Historical summary
- Similar cases
- Outcome summary
- Evidence and contradiction review
- Handoff to Replay for case inspection

### What Should Not Appear Here

- Dashboard-first market summary as the main purpose
- Live orderflow terminal as the main view
- Trade execution controls
- Auto historical polling
- Raw cache internals
- Replay-heavy loaders
- Operational settings

---

## 6. Replay

### Why It Exists

Replay exists to understand what happened in a specific historical window.

It is an inspection and evidence validation tool.

### Primary Question

What happened during this selected window?

### Secondary Question

Which evidence sources explain the move, and which sources are unavailable?

### Inputs

- Replay context
- Symbol, exchange, date, hour
- Chart/OHLCV data
- Liquidation evidence
- OI evidence
- Funding evidence
- Flow Replay evidence
- Orderbook cache status
- Selected Historical Analog case when available

### Outputs

- Replay timeline
- Window outcome
- Available evidence summary
- Unavailable evidence reasons
- Handoff back to Research or Trade

### What Should Not Appear Here

- Dashboard market direction
- Broad opportunity ranking
- Scanner candidate discovery
- Trade execution planning as the primary surface
- Historical Analog generation
- Market Memory generation
- System operations
- Request-time heavy orderbook reconstruction

---

## 7. Settings

### Why It Exists

Settings exists to configure and inspect system behavior.

It is an operational control surface, not a market intelligence page.

### Primary Question

What is configured, connected, and healthy?

### Secondary Question

Which preferences, sources, or operational states need attention?

### Inputs

- User or workspace profile
- Preferences
- Data source configuration
- Artifact store status
- Scheduler status
- Run report status
- Credential presence metadata without secret values

### Outputs

- Configuration status
- Preference controls
- Data source health
- System health
- Operational warnings

### What Should Not Appear Here

- Market direction
- Trade recommendations
- Scanner candidates
- Research workflow
- Replay timeline
- Raw secrets
- Market analytics dashboards

---

## 8. Differentiation Summary

| Page | Primary Role | Owned Question |
|---|---|---|
| Dashboard | Decision summary | What is happening right now? |
| Markets | Live market discovery | Which live markets deserve attention? |
| Scanner | Change detection | What changed that needs attention? |
| Trade | Conviction building | Should I continue evaluating this candidate? |
| Research | Investigation | Why does this state matter? |
| Replay | Historical inspection | What happened in this window? |
| Settings | Operations | What is configured and healthy? |

Validation:

- No two pages own the same primary question.
- Pages may hand off to each other, but ownership remains distinct.
- A page that cannot answer its owned question is failing its purpose.

