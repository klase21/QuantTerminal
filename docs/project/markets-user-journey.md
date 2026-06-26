# Markets User Journey

Status: Project Beta Sprint M1  
Scope: Markets V2 journey design  
Non-goals: runtime implementation, UI code, mockups

Markets is a live opportunity discovery and verification workspace. The journey should move from scan to analysis to deep dive to action without forcing users to interpret raw widgets first.

## Journey Summary

```text
5-second scan
↓
30-second analysis
↓
Deep dive
↓
Exit actions
```

The user should always know:

- what universe is being viewed;
- which symbols are ranked highest;
- why those symbols matter;
- what evidence is current, stale, partial, missing, or unavailable;
- where to go next.

## 1. Five-Second Scan

User question:

```text
Where should I look first?
```

Visible immediately:

- active universe and filters;
- market summary;
- highest-ranked symbols;
- primary reason tags;
- evidence health badges.

User should learn:

- whether opportunities are active;
- which symbols are leading;
- whether evidence is current enough to trust;
- whether the page is filtered to a specific exchange, asset group, or timeframe.

Failure cases:

- user sees dense analytics before ranked symbols;
- active filters are hidden;
- every symbol looks equally important;
- unavailable evidence looks like valid evidence.

## 2. Thirty-Second Analysis

User question:

```text
Does live structure support the opportunity?
```

User inspects:

- price and volume movement;
- funding;
- open interest;
- liquidation context;
- exchange flow;
- ETF or capital flow if asset-relevant;
- breadth and rotation;
- evidence freshness and coverage.

User should be able to compare:

- which symbols have rising participation;
- which symbols show stressed positioning;
- which symbols are moving without supporting evidence;
- which symbols are worth sending to Trade or Research.

Output:

- selected symbol or symbol set;
- reason for selection;
- live validation status;
- missing evidence risks.

## 3. Deep Dive

User question:

```text
What exactly is happening inside this symbol?
```

Deep dive should expose:

- symbol-level detail;
- exchange-specific structure;
- futures positioning;
- funding trend;
- OI trend;
- liquidation clusters;
- orderflow when available;
- supporting analytics;
- source health.

Deep dive should not become:

- historical analog exploration;
- replay timeline;
- trade execution plan;
- long research report.

If deeper historical implication is needed, hand off to Research. If factual past-window inspection is needed, hand off to Replay. If execution preparation is needed, hand off to Trade.

## 4. Exit Actions

Markets should make next actions obvious without turning into those pages.

Primary exits:

- Send to Trade: evaluate selected candidate and build conviction.
- Send to Research: investigate implication and historical context.
- Send to Scanner: monitor change lifecycle for similar signals.
- Stay in Markets: compare related symbols or broaden filters.

Exit action rules:

- preserve symbol, exchange, timeframe, and active filters where possible;
- do not lose the selected opportunity context;
- do not imply trade recommendation;
- show unavailable handoff only when required context is missing.

## Dashboard Boundary

Dashboard starts the user with:

```text
What is happening right now?
```

Markets continues with:

```text
Where should I look, and does live structure confirm it?
```

Dashboard should not host the 30-second symbol comparison workflow. Markets should not replace Dashboard's 5-second market direction read.

## Journey Validation

Pass:

- user can identify top opportunities within 5 to 30 seconds;
- evidence health is visible during comparison;
- dense analytics supports selection rather than obscuring it;
- exit actions lead to the correct owner page.

Fail:

- Markets becomes a broad Dashboard clone;
- Markets becomes Scanner lifecycle monitoring;
- Markets becomes Trade execution planning;
- Markets becomes Research historical investigation;
- user cannot tell why a symbol is ranked.
