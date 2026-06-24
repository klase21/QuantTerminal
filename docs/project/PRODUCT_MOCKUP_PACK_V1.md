# Product Mockup Pack V1

Status: visual mockup pack  
Scope: Markets, Scanner, Trade, Research, Replay, Settings  
Source documents: `DESIGN.md`, `MAKE_ANALYSIS.md`, `DASHBOARD_MOCKUP_V2.md`, `DASHBOARD_VISUAL_MOCKUP_V1.md`  
Non-goals: React implementation, runtime changes, component code, data generation

This pack extends the Dashboard V2 design language across the remaining QuantTerminal product pages.

Shared product hierarchy:

```text
Conclusion
-> Drivers
-> Evidence
-> Analytics
```

Shared visual identity:

- Bloomberg Density below the first-read layer.
- Valley Clarity in the first viewport.
- GMGN Actionability through ranked rows, driver cards, and obvious next actions.
- Terminal identity through dark green surfaces, amber rails, near-sharp panels, compact spacing, and monospace typography.

Shared state language:

- `CURRENT`
- `PARTIAL`
- `STALE`
- `MISSING`
- `UNAVAILABLE`

No mockup in this pack should be interpreted as production data. Values and labels are layout placeholders only.

---

## 1. Mockups Generated

| Page | Image |
|---|---|
| Markets | `docs/project/markets-v1.png` |
| Scanner | `docs/project/scanner-v1.png` |
| Trade | `docs/project/trade-v1.png` |
| Research | `docs/project/research-v1.png` |
| Replay | `docs/project/replay-v1.png` |
| Settings | `docs/project/settings-v1.png` |

All mockups are desktop-first `1440 x 1024` PNGs.

---

## 2. Markets Page Summary

Purpose: discover opportunities.

Primary user question:

```text
Where should I look first?
```

Layout:

1. Market Summary
2. Ranked Opportunities
3. Evidence Preview
4. Deep Market Analytics

Design intent:

- Markets is allowed to be dense, but the opportunity list still leads.
- Filters sit in the top context bar.
- Ranked assets appear before deep symbol analytics.
- Evidence explains why an asset is ranked.

Mockup emphasis:

- Top hero: `OPPORTUNITIES ACTIVE`
- Middle: ranked opportunity rows with reason tags and health states.
- Evidence: compact cards for OI, funding, liquidation, and flow.
- Bottom: dense market detail panels.

---

## 3. Scanner Page Summary

Purpose: detect meaningful changes.

Primary user question:

```text
What changed that needs attention now?
```

Layout:

1. New Signals
2. Ranked Signal List
3. Evidence
4. Deep Analytics

Design intent:

- Change appears before state.
- New, active, aging, and unavailable states remain visible.
- The ranked list should be scannable in seconds.
- Analytics explains the signal after the change is visible.

Mockup emphasis:

- Top hero: `NEW SIGNALS`
- Drivers: top change categories.
- Evidence: volume, OI, liquidation, and funding checks.
- Bottom: scoring and diagnostics.

---

## 4. Trade Page Summary

Purpose: build conviction.

Primary user question:

```text
Should I continue evaluating this candidate?
```

Layout:

1. Trade Thesis
2. Drivers
3. Risk Assessment
4. Execution Details

Design intent:

- Thesis comes before execution.
- Selected candidate must drive the whole page.
- Risk is visible before precise execution details.
- Execution details are subordinate to evidence and invalidation.

Mockup emphasis:

- Top hero: selected trade thesis.
- Middle: ranked drivers and risk cards.
- Bottom: execution plan table and validation diagnostics.

---

## 5. Research Page Summary

Purpose: understand implications.

Primary user question:

```text
Why does this market state matter?
```

Layout:

1. Observation
2. Implication
3. Evidence
4. Deep Research

Design intent:

- Research should feel like an investigation, not an article.
- Historical context, event impact, and memory appear as evidence modules.
- No auto-heavy workflow is implied.
- Deep research sits below the conclusion and implication.

Mockup emphasis:

- Top hero: `INVESTIGATION ACTIVE`
- Drivers: narrative, historical analog, event impact.
- Evidence: analog, event, memory, and validity cards.
- Bottom: case table and provenance.

---

## 6. Replay Page Summary

Purpose: understand what happened.

Primary user question:

```text
What happened in this window?
```

Layout:

1. Context
2. Drivers
3. Timeline
4. Outcome
5. Analytics

Design intent:

- Replay explains the event before showing raw diagnostics.
- Timeline is central, but evidence availability remains explicit.
- Unavailable orderbook or heavy evidence must be labeled rather than hidden.
- Outcome appears before deep analytics.

Mockup emphasis:

- Top hero: replay window context.
- Middle: timeline plus driver/evidence quality.
- Outcome strip: what changed by the end of the window.
- Bottom: analytics and diagnostics.

---

## 7. Settings Page Summary

Purpose: configure the system.

Primary user question:

```text
What is configured and healthy?
```

Layout:

1. Profile
2. Preferences
3. Data Sources
4. System Health

Design intent:

- Settings is operational, not analytical.
- Health and source state are visible.
- Secrets are never exposed.
- Controls are compact and predictable.

Mockup emphasis:

- Top hero: system configuration state.
- Middle: profile and preferences.
- Evidence: data source health.
- Bottom: scheduler, artifact store, and production health.

---

## 8. Consistency Review

Visual language is consistent across the pack:

- dark green-black canvas
- dark raised panels
- amber section rails
- compact monospace typography
- uppercase section labels
- health badges in the same language
- ranked cards and rows
- dense analytics below the first-read layer

Information hierarchy is consistent:

- Markets: summary -> ranked opportunities -> evidence -> analytics
- Scanner: new signals -> ranked list -> evidence -> analytics
- Trade: thesis -> drivers/risk -> evidence -> execution
- Research: observation -> implication -> evidence -> deep research
- Replay: context -> drivers -> timeline/outcome -> analytics
- Settings: configuration state -> controls -> source health -> operations health

No page should feel like a separate product. Each page changes density based on purpose, but keeps the same terminal intelligence system.

---

## 9. Validation

The mockup pack passes if a reviewer can identify the following within five seconds on each page:

| Page | First-read answer |
|---|---|
| Markets | which opportunities deserve attention |
| Scanner | what changed |
| Trade | what thesis is being evaluated |
| Research | what investigation is active |
| Replay | what replay window is being inspected |
| Settings | whether the system is configured and healthy |

The pack should fail review if:

- analytics visually precede the conclusion;
- state language is inconsistent;
- evidence lacks health labels;
- any page appears to belong to a different product;
- dense panels obscure the primary user question.

