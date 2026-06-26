# Scanner Information Architecture

Status: information architecture foundation V1  
Scope: Scanner V2 page hierarchy  
Runtime impact: none

## 1. IA Principle

Scanner prioritizes change before state.

The page hierarchy should answer:

```text
What changed?
  -> Why is it notable?
  -> How reliable is the evidence?
  -> What should I inspect next?
```

Scanner must reuse QuantTerminal's design language, but it must not duplicate Dashboard or Markets layouts.

## 2. Approved Page Hierarchy

Scanner V2 hierarchy:

1. Scanner Header
2. Priority Opportunities
3. Signal Feed
4. Opportunity Filters
5. Watchlist Candidates
6. Supporting Context
7. Navigation Actions

This hierarchy is designed for attention triage. It is not a market overview and not a deep analysis workspace.

## 3. Section Definitions

### 1. Scanner Header

Purpose:

Establish the scanner mode, current universe, freshness, and data health.

User decision enabled:

- Is the Scanner current enough to trust?
- Which universe or scope am I scanning?

Expected inputs:

- selected universe when available;
- exchange when available;
- timeframe when available;
- data health metadata;
- freshness metadata.

Expected outputs:

- current scan scope;
- health badge;
- timestamp or freshness state;
- compact unavailable state if scan inputs are missing.

Navigation target:

- Settings when data source health needs review;
- Dashboard when the user wants market-level conclusion.

### 2. Priority Opportunities

Purpose:

Show the highest-priority opportunities first.

User decision enabled:

- Which signal deserves attention right now?
- Should I inspect this opportunity or discard it?

Expected inputs:

- market movers;
- funding;
- open interest;
- liquidations;
- prediction markets;
- ETF flows;
- exchange flow;
- treasury evidence;
- reserve intelligence;
- news or narrative signals when available;
- data health and coverage states.

Expected outputs:

- ranked opportunity cards;
- signal category;
- symbol or market;
- compact reason;
- evidence health;
- action target.

Navigation target:

- Markets for live structure validation;
- Research for deeper evidence;
- Replay for historical validation;
- Trade for execution planning when the user chooses to continue.

Rules:

- Do not invent rankings.
- Do not fabricate missing evidence.
- Do not present trade recommendations.

### 3. Signal Feed

Purpose:

Expose the broader stream of notable changes below the top opportunities.

User decision enabled:

- Is the top signal isolated or part of a broader pattern?
- Which additional signals are worth monitoring?

Expected inputs:

- recent signals from existing sources;
- signal type;
- symbol;
- freshness;
- evidence state.

Expected outputs:

- compact signal rows;
- status badges;
- source labels;
- quick handoff action.

Navigation target:

- Markets for symbol-level inspection;
- Research for evidence review.

### 4. Opportunity Filters

Purpose:

Help the user remove noise and narrow attention.

User decision enabled:

- Which category, symbol, exchange, or signal quality should I focus on?
- Which signals should be hidden?

Expected inputs:

- available signal categories;
- symbol universe;
- exchange scope;
- evidence health;
- freshness states.

Expected outputs:

- active filter state;
- filtered opportunity list;
- empty state when no signals match.

Navigation target:

- none by default;
- filtered signal selections continue to Priority Opportunities or Signal Feed.

Rules:

- Filters must not create synthetic data.
- Empty states must explain whether the cause is no matching signals or unavailable data.

### 5. Watchlist Candidates

Purpose:

Collect opportunities that may deserve follow-up but are not the current top priority.

User decision enabled:

- Which signals should I monitor next?
- Which candidates are not ready for action?

Expected inputs:

- filtered opportunities;
- user-selected candidates when available;
- signal persistence metadata when available;
- evidence health.

Expected outputs:

- candidate list;
- current status;
- reason to monitor;
- next-page action.

Navigation target:

- Markets for validation;
- Research for deeper context;
- Trade only when the user explicitly chooses execution planning.

### 6. Supporting Context

Purpose:

Provide compact context that helps the user understand why signals are appearing without becoming an analytics wall.

User decision enabled:

- Are signals broad or isolated?
- Are evidence sources current, stale, partial, or unavailable?

Expected inputs:

- market breadth where available;
- sector or category context where available;
- source health;
- freshness and coverage metadata;
- supporting signal summaries.

Expected outputs:

- compact context cards;
- source health badges;
- unavailable states;
- no dense raw analytics above signal priority.

Navigation target:

- Markets for market structure;
- Dashboard for overall market conclusion;
- Settings for data source issues.

### 7. Navigation Actions

Purpose:

Make next steps explicit.

User decision enabled:

- Where should I continue this investigation?

Expected inputs:

- selected signal;
- symbol;
- exchange;
- timeframe;
- signal category;
- investigation context if available.

Expected outputs:

- open in Markets;
- open in Research;
- open in Replay;
- open in Trade.

Navigation target:

- Markets;
- Research;
- Replay;
- Trade.

Rules:

- Preserve symbol, exchange, timeframe, and investigation intent when available.
- Do not auto-execute Trade or Replay behavior.

## 4. Design System Alignment

Scanner should reuse the same token system as Dashboard and Markets.

Typography:

- use compact monospace section titles;
- use strong rank and signal titles;
- keep metadata small and uppercase;
- avoid long paragraph blocks.

Color:

- preserve dark green terminal surfaces;
- use amber for hierarchy, ranking, and structural rails;
- use cyan for metadata and informational accents;
- use state colors only for evidence state or directional meaning.

Spacing:

- keep dense professional spacing;
- preserve clear section gaps;
- avoid oversized marketing-style panels;
- keep rows compact and readable.

Surfaces:

- highest Scanner surface belongs to Priority Opportunities;
- Signal Feed and Filters use primary or secondary surfaces;
- Supporting Context uses lower-priority surfaces;
- no section should visually compete with Dashboard's Market Direction hero.

Badges:

- use approved states:
  - CURRENT
  - VERIFIED
  - PARTIAL
  - DEGRADED
  - STALE
  - LOADING
  - MISSING
  - UNAVAILABLE
- badges must use text plus color;
- unavailable data must not look valid.

## 5. Boundary Review

Scanner owns:

- opportunity prioritization;
- signal visibility;
- ranking;
- filtering.

Scanner does not own:

- Dashboard conclusions;
- Markets exploration;
- Research narratives;
- Replay validation;
- Trade execution.

Implementation warning:

Scanner may route users to other pages, but it should not absorb their responsibilities.

## 6. IA Acceptance Criteria

The Scanner IA is acceptable when:

- Priority Opportunities appear before Supporting Context;
- ranking is visible before raw analytics;
- filters reduce noise without hiding state;
- navigation targets are explicit;
- unavailable evidence is explicit;
- no section duplicates Dashboard, Markets, Research, Replay, or Trade ownership.

