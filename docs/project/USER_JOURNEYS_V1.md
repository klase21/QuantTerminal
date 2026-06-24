# User Journeys V1

Status: canonical workflow draft  
Scope: cross-page workflows for QuantTerminal  
Non-goals: UI redesign, runtime implementation

This document defines the canonical user journeys across the differentiated QuantTerminal pages.

Each journey must preserve context and page responsibility.

---

## Journey A: Discover Opportunity

Workflow:

```text
Scanner
-> Markets
-> Trade
```

### 1. Scanner

User question:

```text
What changed that needs attention?
```

User sees:

- new signals
- active signals
- aging signals
- ranked signal list
- signal reason tags

Output:

- selected signal or candidate
- symbol
- exchange
- reason tags
- freshness state

Handoff:

- go to Markets to verify live structure
- go to Trade only after a candidate is selected

### 2. Markets

User question:

```text
Does live structure confirm this opportunity?
```

User sees:

- selected symbol context
- live OI, funding, liquidation, orderflow, and structure
- evidence health
- ranked assets if still browsing

Output:

- live validation
- confirmation or contradiction
- symbol-level evidence

Handoff:

- go to Trade to build conviction

### 3. Trade

User question:

```text
Should I continue evaluating this candidate?
```

User sees:

- trade thesis
- top drivers
- risk assessment
- invalidation
- execution details

Output:

- candidate-level decision preparation
- evidence and risk context

Journey success:

- user moves from change detection to live validation to conviction without losing symbol context.

---

## Journey B: Market Understanding

Workflow:

```text
Dashboard
-> Research
-> Replay
```

### 1. Dashboard

User question:

```text
What is happening right now?
```

User sees:

- market direction
- top drivers
- compact evidence
- data health

Output:

- active market read
- investigation context
- top driver set

Handoff:

- go to Research for implications and evidence depth

### 2. Research

User question:

```text
Why does this state matter?
```

User sees:

- current observation
- implication
- historical analog summary
- event impact
- market memory
- contradiction and validity metadata

Output:

- selected historical case or evidence thread
- implication review
- supporting and contradicting evidence

Handoff:

- go to Replay for selected case inspection

### 3. Replay

User question:

```text
What happened in the selected historical window?
```

User sees:

- replay context
- timeline
- OI, funding, liquidation, and available flow evidence
- unavailable evidence reasons
- outcome

Output:

- historical evidence validation
- replay outcome
- source quality assessment

Journey success:

- user starts with current market state and ends with historical evidence without re-entering symbol or case context.

---

## Journey C: Operational Review

Workflow:

```text
Dashboard
-> Settings
```

### 1. Dashboard

User question:

```text
Can I trust the current read?
```

User sees:

- market direction
- evidence health
- missing or stale critical sources

Output:

- operational concern if data health is degraded

Handoff:

- go to Settings for source and system health

### 2. Settings

User question:

```text
What is configured, connected, and healthy?
```

User sees:

- data source status
- artifact health
- scheduler status
- production run status
- preferences

Output:

- operational diagnosis
- configuration changes where allowed

Journey success:

- user can distinguish market uncertainty from platform/source health issues.

---

## Journey D: Post-Trade Analysis

Workflow:

```text
Trade
-> Replay
-> Research
```

### 1. Trade

User question:

```text
What thesis did I evaluate, and what evidence mattered?
```

User sees:

- selected candidate
- trade thesis
- drivers
- invalidation and risk

Output:

- candidate context
- relevant window or event to inspect

Handoff:

- go to Replay to inspect what happened

### 2. Replay

User question:

```text
What happened during the relevant window?
```

User sees:

- timeline
- outcome
- available evidence
- unavailable evidence reasons

Output:

- factual event replay
- evidence quality

Handoff:

- go to Research to understand whether the outcome fits broader historical context

### 3. Research

User question:

```text
What does this outcome imply for future investigations?
```

User sees:

- historical context
- event impact
- market memory
- supporting and contradicting evidence

Output:

- post-trade learning context
- durable research insight

Journey success:

- user moves from thesis to factual replay to broader implication without converting observations into unsupported predictions.

---

## Overlap Audit

This audit identifies page elements that risk blurring responsibility. It does not prescribe redesign.

### Dashboard Elements That Belong Elsewhere

- Full Historical Analog case tables belong in Research.
- Replay case inspection belongs in Replay.
- Raw source health diagnostics belong in Settings.
- Full live orderflow detail belongs in Markets.
- Trade execution details belong in Trade.

### Markets Elements That Belong Elsewhere

- Broad market direction hero belongs in Dashboard.
- New/aging candidate lifecycle belongs in Scanner.
- Execution planning belongs in Trade.
- Historical implications belong in Research.
- Historical window playback belongs in Replay.

### Research Elements That Belong Elsewhere

- Live opportunity ranking belongs in Markets.
- New signal monitoring belongs in Scanner.
- Trade execution details belong in Trade.
- Timeline playback belongs in Replay.
- System configuration belongs in Settings.

### Replay Elements That Belong Elsewhere

- Broad current market direction belongs in Dashboard.
- Historical Analog generation belongs outside Replay request paths and is consumed by Research.
- Trade thesis construction belongs in Trade.
- Market Memory synthesis belongs in Research or future memory workflows.
- Data source configuration belongs in Settings.

### Scanner Elements That Belong Elsewhere

- Full symbol market structure belongs in Markets.
- Candidate execution planning belongs in Trade.
- Historical investigation belongs in Research.
- Replay timeline belongs in Replay.

### Trade Elements That Belong Elsewhere

- Broad opportunity discovery belongs in Scanner and Markets.
- Deep historical investigation belongs in Research.
- Replay playback belongs in Replay.
- Operational source health belongs in Settings.

### Settings Elements That Belong Elsewhere

- Market decisions belong in Dashboard.
- Opportunity ranking belongs in Markets and Scanner.
- Candidate conviction belongs in Trade.
- Research implications belong in Research.
- Historical window explanation belongs in Replay.

---

## Journey Validation

Pass:

- Every workflow has a clear starting page.
- Every transition carries context.
- Every page answers a distinct question.
- No journey requires a page to perform another page's primary job.

Fail:

- user must manually preserve context between pages
- Dashboard becomes the deep research workspace
- Scanner becomes the trade planning page
- Replay becomes historical generation
- Settings becomes a market intelligence page

