# QuantTerminal Design Principles

Status: Canonical product design guide  
Audience: AI agents, engineers, designers, reviewers  

## Core Principle

```text
Conclusion
  -> Reason
  -> Evidence
```

QuantTerminal should help a user understand the market state before asking them
to inspect raw data. Product surfaces should make the conclusion visible first,
then show why it exists, then expose the evidence trail.

## Design Principles

### 5 Second Rule

A first-time user should understand the primary state of a page within five
seconds. If the page requires scanning many widgets before the answer is clear,
the hierarchy is wrong.

### Observation First

Show what was observed. Do not imply prediction, advice, or certainty unless a
versioned intelligence contract explicitly supports it.

### Human Judgment Preserved

QuantTerminal prepares evidence. The user makes the decision. Avoid UI that
pretends to decide for the user.

### Compression > Explanation

Compress intelligence into clear labels, counts, ranked drivers, and short
evidence statements. Put deeper detail behind drill-down flows.

### No Long Narratives

Avoid paragraphs in primary workflows. Long explanations belong in docs,
reports, or explicit research detail views.

### Signal > Noise

Hide low-value metrics until they answer a user question. A visible metric must
support conclusion, reason, evidence, or validation.

### Intelligence > Analytics

Analytics describes data. Intelligence explains relevance. Prefer surfaces that
answer what matters and why.

## Page Guidance

| Page | Purpose | Primary user question | Visible first | Hidden by default |
| --- | --- | --- | --- | --- |
| Dashboard | Fast market intelligence surface | What is happening and why? | Market direction, top drivers, supporting evidence | Deep historical workflows, raw tables, slow sources |
| Markets | Real-time symbol verification | Does live structure confirm the read? | Price, funding, OI, orderflow, liquidation context | Historical analogs, research workflows |
| Scanner | Opportunity discovery | What needs attention now? | Ranked candidates and reason tags | Deep evidence, full execution plans |
| Trade | Execution planning | How should I evaluate this candidate? | Selected candidate, plan, invalidation, evidence | Candidate generation internals |
| Research | Deep investigation workspace | Why does this state matter? | Current state, historical context, outcomes, evidence | Auto historical polling, raw cache internals |
| Replay | Historical event inspection | What happened in this window? | Chart, liquidations, OI, funding, available evidence | Heavy orderbook/trades until requested or cached |
| Settings | Operational configuration | What controls or credentials are active? | Health, configured sources, safe toggles | Secret values, raw internal files |

## State Language

Use explicit states:

- `LOADING` only while a request is active.
- `NO DATA` only after a successful empty response.
- `UNAVAILABLE` when a source, cache, or artifact cannot be used.
- `STALE` when evidence exists but fails freshness policy.

Never mask missing data with synthetic values.

## Design Evolution

QuantTerminal is evolving from:

```text
Bloomberg-style analytics terminal
  -> Intelligence Terminal
```

The Make analysis confirmed that the original visual model is a dense,
terminal-inspired market workspace. That identity remains valuable. The product
model must change.

### Preserved

- Terminal aesthetic.
- Monospace typography.
- Dark green-black surfaces.
- Amber rails and headers.
- Dense professional appearance.
- Tabular values.
- Compact evidence panels.

### Changed

- Dashboard moves from widget mosaic to intelligence surface.
- Metrics become evidence, not the first thing shown.
- Panels must answer a user question.
- Data freshness becomes explicit through health states.
- Color-only meaning must be reinforced with text, shape, or labels.
- Density is applied differently by page purpose.

### Removed

- Raw metric walls as primary surfaces.
- Dashboard-first historical workflows.
- Static widget mosaics that hide the main conclusion.
- Long narrative panels in primary workflows.
- Implicit live/fresh assumptions.

## Information Hierarchy

All product surfaces follow four levels.

```text
L1 Conclusion
  -> L2 Drivers
  -> L3 Evidence
  -> L4 Analytics
```

### L1 Conclusion

The answer the user needs first.

Examples:

- Market direction.
- Selected candidate status.
- Replay window availability.
- Investigation state.

### L2 Drivers

The ranked reasons behind the conclusion.

Drivers should be compact, comparable, and ordered by relevance. Drivers do not
replace evidence; they summarize it.

### L3 Evidence

The observed facts supporting or contradicting the drivers.

Evidence must include source, freshness, coverage, and unavailable reason when
applicable.

### L4 Analytics

Raw metrics, charts, tables, and detailed diagnostics.

Analytics must never appear before conclusion. It may be dense, but it must not
force users to reverse-engineer the product's answer.

## Density Principles

Density is valuable. Confusion is not.

QuantTerminal should keep the terminal density discovered in the Make analysis,
but density must serve the page's job.

| Page | Density goal |
| --- | --- |
| Dashboard | Optimize for comprehension. Show conclusion, drivers, and evidence before analytics. |
| Markets | Optimize for density. Let expert users verify live structure quickly. |
| Replay | Optimize for reconstruction. Show what happened in the selected window and label unavailable evidence. |
| Research | Optimize for investigation. Guide users from current state to historical context, outcomes, and evidence. |
| Scanner | Optimize for change detection. Surface new, active, aging, and expired candidates clearly. |
| Trade | Optimize for conviction. Keep selected candidate, plan, invalidation, and evidence aligned. |

Rules:

- Dense panels belong below the first-read answer unless the page is Markets.
- Use compact labels instead of explanatory paragraphs.
- Use progressive disclosure for secondary analytics.
- Do not add density where it delays comprehension.

## Component Philosophy

Prefer components that encode intelligence, state, and evidence.

### Preferred

- Intelligence Card: conclusion, status, source, observed time.
- Driver Card: ranked reason, category, impact, quality.
- Evidence Card: observed fact, source, freshness, coverage.
- Signal Badge: compact status or direction label.
- Health Badge: current, stale, missing, partial, unavailable, loading, error.
- Regime Indicator: compact market-state label with evidence link.

### Discouraged

- Metric Walls: many values without hierarchy.
- Widget Mosaics: panels arranged by visual fit rather than user question.
- Narrative Panels: long prose in primary workflows.
- Duplicate Visualizations: multiple charts or tiles saying the same thing.

### Component Contract

Every intelligence component should define:

- title;
- state;
- observedAt or generatedAt;
- source;
- freshness;
- coverage;
- reason when unavailable;
- evidence summary;
- drill-down target when applicable.

## Missing State Standards

Every page and evidence component must support:

- `CURRENT`: valid and inside freshness policy.
- `STALE`: valid but outside freshness policy.
- `MISSING`: expected evidence is absent.
- `PARTIAL`: some evidence exists but coverage is incomplete.
- `UNAVAILABLE`: source, cache, artifact, or computation cannot be used.
- `LOADING`: active request or manual load in progress.
- `ERROR`: failed request, invalid payload, or unexpected failure.

Data Health should be visible wherever evidence freshness affects user trust.

Rules:

- Do not show `NO DATA` while a request is still loading.
- Do not label stale evidence as current.
- Do not collapse partial evidence into unavailable.
- Do not hide the reason for unavailable critical evidence.
- Do not fabricate values to fill empty states.

## Visual Identity

QuantTerminal remains terminal-inspired.

Preserve:

- dark green-black canvas;
- dark panel surfaces;
- amber rails and section headers;
- monospace typography;
- tabular numbers;
- sharp or near-sharp panel edges;
- compact professional density.

Information hierarchy changes. Visual identity does not.

The Make analysis is useful as a visual system reference, but not as final
product architecture. QuantTerminal should keep the terminal look while moving
from raw dashboards to intelligence-first workflows.

## QuantTerminal Identity

QuantTerminal is not:

- TradingView: chart-first technical analysis.
- Bloomberg: all-purpose financial terminal.
- GMGN: action-first speculative trading surface.

QuantTerminal combines:

- Bloomberg Density: many evidence sources available to expert users.
- Valley Clarity: the main answer is obvious within seconds.
- GMGN Actionability: users can move from signal to investigation to trade
  planning without losing context.

The resulting product category is:

```text
Intelligence Terminal
```

The product should not compete by showing more data. It should compete by
turning real evidence into usable market understanding.

## Design Laws

### Law 001: Users See Conclusion Before Analytics

If analytics appear before the conclusion, the page is asking the user to do
the product's job.

### Law 002: Drivers Before Evidence

Users should first see the ranked reasons, then inspect the evidence behind
them.

### Law 003: Evidence Before Raw Data

Raw data is useful after the user understands why it matters.

### Law 004: Density Is A Feature. Confusion Is Not.

Dense interfaces are acceptable only when hierarchy remains clear.

### Law 005: Every Panel Must Answer "Why Should I Care?"

A panel without a user question is decoration or noise.

### Law 006: Freshness Is Part Of Meaning

Evidence without freshness can mislead. Current, stale, missing, partial, and
unavailable states must be explicit.

### Law 007: Observation Is Not Prediction

Observed reserve changes, flows, liquidations, funding, or OI changes must not
be silently converted into bullish or bearish claims unless a versioned
intelligence contract supports that interpretation.

### Law 008: Preserve Human Judgment

QuantTerminal prepares the conclusion, reasons, and evidence. The final
decision remains with the user.

## Layout Blueprints

These blueprints define page structure and placement rules. They are not UI
mockups. They describe what each page must make visible first.

## Dashboard Blueprint

Purpose: understand the market in 5 seconds.

Layout:

```text
Row 1: Market Direction Hero
  - Direction
  - Confidence
  - Regime

Row 2: Top Drivers
  - maximum 5 drivers

Row 3: Evidence Grid
  - ETF
  - Reserve
  - Treasury
  - OI
  - Liquidation

Row 4: Historical Analog

Row 5: Deep Analytics
```

Rules:

- Analytics never appears above Drivers.
- Dashboard must answer `what is happening?` before showing raw metrics.
- Deep historical workflows stay out of the first viewport.
- Missing evidence must show health state, not blank space.

## Markets Blueprint

Purpose: discover opportunities.

Layout:

```text
Top: Filters
  - symbol
  - exchange
  - timeframe
  - market state

Middle: Ranked Assets
  - opportunity ranking
  - direction or state
  - reason tags
  - freshness

Bottom: Deep Market Details
  - price
  - orderflow
  - funding
  - OI
  - liquidation
  - orderbook
```

Rules:

- Opportunities before analytics.
- Filters must be visible when active.
- Symbol changes must not carry stale evidence forward.
- Deep details validate the opportunity; they do not replace ranking.

## Scanner Blueprint

Purpose: detect change.

Layout:

```text
Top: New Signals
  - newly detected candidates
  - meaningful state changes

Middle: Signal Ranking
  - active candidates
  - aging candidates
  - expired candidates removed

Bottom: Supporting Analytics
  - score breakdown
  - volume, funding, OI, liquidation context
```

Rules:

- Change before state.
- New and aging signals must be distinguishable.
- Refresh cycles must not erase useful context prematurely.
- Analytics explains the ranking after the change is visible.

## Trade Blueprint

Purpose: assess conviction.

Layout:

```text
Top: Trade Thesis
  - selected candidate
  - thesis
  - status

Middle: Drivers
  - why this candidate matters
  - supporting evidence

Middle: Risk
  - invalidation
  - chase risk
  - missing evidence

Bottom: Execution Details
  - entry
  - stop
  - target
  - sizing context when available
```

Rules:

- Thesis before execution.
- Selected candidate drives the entire page.
- Risk must be visible before precise execution detail.
- Execution details must not appear detached from evidence.

## Research Blueprint

Purpose: understand implications.

Layout:

```text
Observation
  - current state
  - active investigation context

Implication
  - what the observation may mean
  - historical or event context when available

Evidence
  - analogs
  - event impact
  - market memory
  - source health

Deep Research
  - detailed cases
  - outcome windows
  - provenance
```

Rules:

- Avoid article-style layouts.
- Research should feel like an investigation, not a blog or report.
- Historical systems remain manual-load or cache-backed.
- Evidence and provenance must stay close to every implication.

## Replay Blueprint

Purpose: understand what happened.

Layout:

```text
Context
  - symbol
  - exchange
  - date/hour
  - replay source health

Drivers
  - known pre-event or in-window drivers
  - available evidence quality

Timeline
  - price
  - liquidation
  - OI
  - funding
  - optional orderbook/trades

Outcome
  - what changed by the end of the window
  - available flow replay evidence

Analytics
  - detailed charts
  - raw tables
  - diagnostics
```

Rules:

- Outcome before analytics.
- Replay must never imply complete orderbook reconstruction when only flow
  evidence exists.
- Heavy evidence must remain optional, cached, or manual.
- Unavailable replay evidence must fail gracefully.

## Settings Blueprint

Purpose: control system behavior.

Layout:

```text
Profile
  - identity
  - workspace context

Preferences
  - display density
  - default symbol
  - notification behavior

Data Sources
  - configured providers
  - source status
  - credential health without revealing secrets

System Health
  - artifact health
  - scheduler status
  - production run status
```

Rules:

- Settings controls behavior; it does not become an analytics page.
- Secret values must not be exposed.
- Health should be operationally precise and user-readable.

## Evidence Priority Matrix

Evidence priority controls first-viewport placement and summary emphasis. It
does not imply predictive certainty.

| Tier | Evidence | Rationale |
| --- | --- | --- |
| Tier 1 | ETF, Reserve, Treasury | Highest capital-flow relevance; useful for investor-facing market explanation. |
| Tier 2 | OI, Liquidation, Exchange Flow | Strong structure and positioning evidence; often needs context to interpret. |
| Tier 3 | Funding, Sentiment, Misc | Useful supporting signals; more prone to noise or short-term distortion. |

Rules:

- Tier 1 evidence should be visible early when available.
- Tier 2 evidence explains market mechanics and positioning.
- Tier 3 evidence supports or qualifies the read.
- Missing higher-tier evidence should be explicit.
- Lower-tier evidence should not overpower strong higher-tier evidence in page
  placement.

## Success Metrics

| Page | Success metric |
| --- | --- |
| Dashboard | User understands market direction within 5 seconds. |
| Markets | User finds opportunities within 30 seconds. |
| Scanner | User detects meaningful changes within 30 seconds. |
| Trade | User reaches conviction or rejects the setup within 60 seconds. |
| Research | User understands implications within 2 minutes. |
| Replay | User understands event outcome within 2 minutes. |

These metrics evaluate comprehension and workflow quality. They are not
performance benchmarks alone.
