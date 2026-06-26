# Product Integration Audit

Project Omega - Sprint O1  
Status: Audit only  
Scope: Dashboard, Markets, Scanner, Research  
Decision: PASS WITH KNOWN LIMITATIONS

## 1. Information Architecture Review

| Page | Intended role | Review | Finding |
| --- | --- | --- | --- |
| Dashboard | Market conclusion | PASS | The frozen hierarchy begins with Market Direction, then drivers, evidence, historical context, prediction markets, tactical alerts, and supporting analytics. It answers "what is happening?" before analytics. |
| Markets | Market exploration | PASS WITH LIMITATIONS | Markets owns live exploration through market context, ranked opportunities, breadth, sector rotation, exchange overview, capital flow, movers, and supporting analytics. It overlaps Scanner vocabulary through "Ranked Opportunities." |
| Scanner | Opportunity triage | PASS WITH LIMITATIONS | Scanner answers "what deserves attention right now?" through summary, priority opportunities, signal feed, filters, watchlist candidates, context, and navigation actions. Known duplicate market-mover dependency remains accepted. |
| Research | Evidence evaluation | PASS WITH LIMITATIONS | Research owns thesis evaluation, supporting evidence, conflicting evidence, narratives, source intelligence, related markets, and handoffs. Several evidence sources remain manual-load or coverage-limited by design. |

Overall IA finding: the four pages form a coherent product model when interpreted as:

```text
Dashboard = conclusion
Markets = exploration
Scanner = triage
Research = evidence evaluation
```

## 2. Ownership Review

### Dashboard and Markets

Classification: acceptable overlap

Dashboard summarizes market direction and top drivers. Markets explores live market structure, ranked symbols, breadth, exchange context, and capital flow details. Shared concepts such as ETF, funding, open interest, and reserve evidence are acceptable because Dashboard presents them as first-read evidence while Markets presents them as exploration context.

Future review item: Dashboard must not expand compact evidence cards into dense market exploration. Markets must not introduce top-level market conclusions that compete with Dashboard.

### Markets and Scanner

Classification: future review item

This is the highest-overlap boundary. Markets includes Ranked Opportunities and Market Movers. Scanner includes Priority Opportunities and Signal Feed. The distinction is currently workable:

- Markets explores live opportunities and market structure.
- Scanner prioritizes attention and filters noise.

Future review item: normalize the difference between "ranked opportunities" and "priority opportunities" so both pages do not appear to answer the same primary question.

### Scanner and Research

Classification: acceptable overlap

Scanner identifies attention-worthy opportunities and provides navigation into deeper evidence. Research evaluates the thesis and evidence behind the opportunity. Shared use of signal/evidence language is acceptable as long as Scanner stays triage-oriented and Research stays evaluation-oriented.

Future review item: Scanner should not grow narrative evaluation panels. Research should not become an opportunity ranking surface.

### Research and Replay

Classification: acceptable overlap

Research can hand off selected historical cases and thesis context to Replay. Replay owns historical validation and event reconstruction. Research correctly frames Replay as a next-step validation path rather than embedding Replay as the core workflow.

Future review item: Research should keep replay access as a handoff. Replay validation and timeline reconstruction should remain owned by Replay.

### Research and Trade

Classification: acceptable overlap

Research can hand off evidence context to Trade. Trade owns execution planning. Research explicitly does not own entries, exits, sizing, stops, or take-profit logic.

Future review item: Trade handoff should preserve thesis and evidence context without turning Research into execution guidance.

## 3. Workflow Review

Intended flow:

```text
Dashboard -> Markets -> Scanner -> Research -> Replay -> Trade
```

Natural transitions:

- Dashboard -> Markets: after seeing the market conclusion, the user can inspect live market structure and ranked symbols.
- Markets -> Scanner: after exploring market context, the user can focus on what deserves immediate attention.
- Scanner -> Research: after identifying a priority opportunity, the user can evaluate supporting and conflicting evidence.
- Research -> Replay: after selecting a historical case or evidence thread, the user can validate what happened.
- Research -> Trade: after evidence review, the user can hand off context for execution planning.

Missing or weak handoffs:

- Markets and Scanner both use opportunity language, but the transition from broad exploration to triage is not yet formally differentiated in navigation language.
- Scanner handoffs are present but not yet complete as a cross-page contract for thesis, symbol, exchange, timeframe, and signal context.
- Research handoffs to Replay depend on loaded Historical Intelligence and selected cases.
- Research handoffs to Trade are intentionally shallow and should remain execution-neutral.

Confusing handoffs:

- The global navigation order places Trade before Intelligence, Research, and Replay, while the product workflow treats Trade as a later-stage destination.
- "Intelligence" and "Research" are adjacent but semantically close. Historical Intelligence must remain validation/source context rather than a competing Research surface.

Future handoff requirements:

- Define a shared handoff context for symbol, exchange, timeframe, thesis, source page, selected signal, selected evidence, and selected historical case.
- Preserve the no-volatile-timestamp rule for navigation links.
- Make handoff labels explicit: Explore Market, Triage Signals, Review Evidence, Validate Replay, Plan Trade.

## 4. Terminology Review

| Term | Current consistency | Finding |
| --- | --- | --- |
| Opportunity | Partially consistent | Markets and Scanner both use opportunity language. Acceptable today, but ownership should be clarified: Markets discovers/explores, Scanner prioritizes/triages. |
| Signal | Mostly Scanner-owned | Scanner uses Signal Feed; Dashboard has lower-priority signal evidence. Future normalization should keep signal as attention/change language, not conclusion language. |
| Evidence | Consistent with depth difference | Dashboard has Evidence Preview; Research has full evidence evaluation. This distinction is correct but should remain explicit. |
| Confidence | Consistent but sensitive | Dashboard uses confidence as market-driver metadata; Research uses confidence context. Do not invent new confidence scores during page work. |
| Narrative | Research-owned with dependencies | Research owns narratives. Narrative references elsewhere should remain preview/context only. |
| Structure | Markets-owned | Market structure belongs primarily to Markets and supporting analytics. |
| Health | Broadly consistent | Health appears as data/status metadata. Needs badge vocabulary normalization across pages. |
| Freshness | Broadly consistent | Freshness appears as evidence/data state. Needs canonical badge mapping. |
| Verified | Canonical but unevenly applied | Verified is part of the approved badge language; future pass should ensure identical meaning everywhere. |
| Current | Canonical but unevenly applied | Current should mean timely/current according to data-health policy, not merely loaded. |

## 5. Badge Vocabulary Review

Canonical badge vocabulary:

- CURRENT
- VERIFIED
- PARTIAL
- DEGRADED
- STALE
- MISSING
- LOADING
- UNAVAILABLE

Non-canonical but acceptable in current frozen pages:

- NO DATA
- UNKNOWN
- Manual Load Required
- Evidence Pending
- Contradiction Pending
- Active
- Developing
- High Attention

Requires future normalization:

- NO DATA vs MISSING vs UNAVAILABLE.
- LIVE vs CURRENT.
- ready/available language vs VERIFIED/CURRENT.
- Page-specific health labels that do not map directly to the canonical state set.

Badge decision: PASS WITH KNOWN LIMITATIONS. The canonical vocabulary exists, but the frozen pages still contain legacy or page-specific language that should be normalized in a dedicated badge vocabulary sprint.

## 6. Design Language Review

Shared strengths:

- All frozen pages use a terminal-oriented dark surface language.
- Dashboard is the strongest reference for typography, surfaces, badges, spacing, and color roles.
- Markets, Scanner, and Research reuse the broader dark terminal identity instead of drifting into generic SaaS.
- Density is preserved while first-read hierarchy is increasingly explicit.

Consistency issues:

- Dashboard is more tokenized and visually governed than the other frozen pages.
- Markets remains denser than Dashboard and can feel more like an analytics terminal in supporting sections.
- Scanner has accepted responsive and duplicate-fetch limitations.
- Research has design-token normalization gaps and manual evidence loading states that read differently from Dashboard/Markets states.
- Some badge and empty-state labels differ across pages.

Design decision: PASS WITH KNOWN LIMITATIONS. The product feels like one terminal family, but Dashboard remains the strongest visual reference and the other pages need post-freeze token convergence.

## 7. Data Ownership Review

| Data concept | Summary owner | Exploration owner | Triage owner | Evidence owner | Validation owner | Execution owner |
| --- | --- | --- | --- | --- | --- | --- |
| Market movers | Dashboard for conclusion impact only | Markets | Scanner | Research when thesis-relevant | Replay only when historical context exists | Trade consumes context |
| Sector rotation | Dashboard only if driver-level | Markets | Scanner as supporting context | Research when thesis-relevant | Not primary Replay data | Trade consumes context |
| Funding | Dashboard evidence/driver | Markets | Scanner signal | Research evidence | Replay historical flow if available | Trade consumes context |
| Open interest | Dashboard evidence/driver | Markets | Scanner signal | Research evidence | Replay historical flow if available | Trade consumes context |
| ETF / capital flow | Dashboard evidence/driver | Markets | Scanner future signal | Research evidence | Historical/event validation where applicable | Trade consumes context |
| Prediction markets | Dashboard secondary support | Limited Markets relevance | Scanner future signal | Research evidence/narrative context | Not primary Replay data | Trade consumes context |
| Narratives | Dashboard lightweight context only | Not primary Markets owner | Scanner signal only if surfaced | Research | Not Replay owner | Trade consumes context |
| Historical analog | Dashboard compact strip only | Not Markets owner | Not Scanner owner | Research evidence | Replay / Historical Intelligence | Trade consumes context |
| Market memory | Dashboard future summary only | Not Markets owner | Not Scanner owner | Research | Not Replay owner | Trade consumes context |

Data ownership finding: PASS WITH KNOWN LIMITATIONS. Ownership is coherent, but repeated data concepts require strict presentation boundaries so shared evidence does not become shared page responsibility.

## 8. Freeze Consistency Review

| Page | State document | Constitution/equivalent | Certification/acceptance | Known limitations | Freeze rule |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Yes | Yes | Yes | Yes | Yes |
| Markets | Yes | Yes | Yes | Yes | Yes |
| Scanner | Yes | Yes | Yes | Yes | Yes |
| Research | Yes | Yes | Yes | Yes | Yes |

Freeze consistency finding: PASS. The frozen-page documentation stack is complete enough to govern future work.

## 9. Product Decision

Decision: PASS WITH KNOWN LIMITATIONS

Justification:

- The frozen pages now have distinct primary responsibilities.
- The product follows the constitution: conclusion, reasons, evidence, analytics.
- Dashboard, Markets, Scanner, and Research can be understood as a coherent operating system rather than isolated pages.
- The main remaining risks are terminology drift, badge vocabulary drift, and incomplete cross-page handoff contracts.

The product does not require a major product review before continuing. It does require targeted integration sprints before deeper Replay or Trade work depends on these handoffs.

## 10. Recommended O2

Recommended next Omega sprint: Navigation / handoff audit

Reason:

The largest integration risk is not page layout. It is whether context survives cleanly as the user moves across:

```text
Dashboard -> Markets -> Scanner -> Research -> Replay -> Trade
```

O2 should audit navigation labels, URL/search-param stability, handoff payloads, thesis preservation, selected signal preservation, and destination expectations.

Recommended follow-up after O2:

1. Badge vocabulary normalization plan.
2. Terminology normalization plan.
3. Replay readiness audit.
4. Trade readiness audit.

## Validation

- Runtime code changes: none.
- Dashboard runtime changes: none.
- Markets runtime changes: none.
- Scanner runtime changes: none.
- Research runtime changes: none.
- Package changes: none.
- Build required: no.
