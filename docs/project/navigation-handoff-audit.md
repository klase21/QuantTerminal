# Navigation & Handoff Audit

Project Omega - Sprint O2  
Status: Audit only  
Scope: Dashboard, Markets, Scanner, Research, plus Replay and Trade as downstream destinations  
Decision: PASS WITH KNOWN LIMITATIONS

## 1. Primary User Flow

Intended product journey:

```text
Dashboard
  -> Markets
  -> Scanner
  -> Research
  -> Replay
  -> Trade
```

### Dashboard -> Markets

- User intent: move from market conclusion to live market exploration.
- Expected destination: Markets.
- Destination ownership: Markets owns live opportunity discovery, market breadth, sector rotation, exchange overview, market movers, and selected-symbol verification.
- Transition rationale: Dashboard should answer what is happening; Markets should answer which live markets deserve attention and why the structure matters.

### Markets -> Scanner

- User intent: move from broad exploration to attention triage.
- Expected destination: Scanner.
- Destination ownership: Scanner owns prioritization, ranking, filtering, and signal visibility.
- Transition rationale: Markets exposes the live opportunity landscape; Scanner decides what deserves immediate attention.

### Scanner -> Research

- User intent: move from a priority signal to evidence evaluation.
- Expected destination: Research.
- Destination ownership: Research owns thesis context, supporting evidence, conflicting evidence, narratives, source attribution, and confidence context.
- Transition rationale: Scanner should not prove the thesis. It routes the user to Research when the user needs to understand why the signal is credible.

### Research -> Replay

- User intent: validate a thesis or selected historical case through replay.
- Expected destination: Replay.
- Destination ownership: Replay owns historical validation, timeline reconstruction, and replay-specific evidence.
- Transition rationale: Research can identify the evidence question; Replay validates what happened.

### Replay -> Trade

- User intent: move from validation to execution planning.
- Expected destination: Trade.
- Destination ownership: Trade owns execution planning, candidate stability, entries, exits, sizing, and risk workflow.
- Transition rationale: Replay may strengthen or weaken conviction, but execution belongs to Trade.

## 2. Entry Points

### Dashboard

Intended entry points:

- Home.
- Direct navigation.
- Notifications or alerts that need a market-state summary.

Dashboard should be the default orientation surface. It should not require a selected signal or thesis to render a useful first read.

### Markets

Intended entry points:

- Dashboard, when the user wants live market context after seeing the conclusion.
- Scanner, when a priority opportunity needs structure validation.
- Research, when a thesis needs live market context.
- Direct navigation, when the user wants market exploration first.

### Scanner

Intended entry points:

- Dashboard, when the user sees a market state and wants attention-worthy candidates.
- Markets, when the user wants to narrow broad market exploration into priority signals.
- Direct navigation, when the user starts with opportunity triage.

### Research

Intended entry points:

- Markets, when a live market or ranked opportunity needs evidence evaluation.
- Scanner, when a priority signal needs thesis review.
- Dashboard, when a top driver or evidence preview deserves deeper inspection.
- Direct navigation, when the user already has a thesis.

### Replay

Intended entry points:

- Research, after loading or selecting a historical case.
- Scanner, only as a future/limited direct handoff for historical context.
- Direct navigation, when the user already knows the replay window.

### Trade

Intended entry points:

- Replay, after historical validation.
- Research, after evidence review.
- Scanner, when a signal is already actionable enough for planning.
- Markets, as a future row-level handoff from live market exploration.

## 3. Exit Paths

### Dashboard

Expected exits:

- Markets: inspect live structure and ranked market context.
- Scanner: triage what deserves attention.
- Research: deeper evidence review for a top driver or evidence item.

Current observation: Dashboard has explicit Tactical Alert links to Markets. Other exits are mostly global navigation rather than section-level handoffs.

### Markets

Expected exits:

- Scanner: triage the explored market set into priority signals.
- Research: review evidence for a selected symbol or market thesis.
- Trade: plan execution after live structure is sufficiently inspected.

Current observation: Markets primarily supports in-page selected-symbol exploration. Row-level handoffs to Research or Trade are documented as future roadmap items.

### Scanner

Expected exits:

- Markets: validate live structure.
- Research: review evidence.
- Replay: check historical context.
- Trade: continue planning.

Current observation: Scanner has explicit navigation actions and row/card links. This is currently the strongest page-level handoff implementation among the frozen pages.

### Research

Expected exits:

- Markets: inspect live market context.
- Replay or Historical Explorer: validate historical cases.
- Trade: hand off evidence context into execution planning.

Current observation: Research has explicit Navigation Actions. Replay is intentionally gated by historical intelligence and selected cached case availability.

### Replay

Expected exits:

- Trade: continue to execution planning when validation is complete.
- Research: return to evidence evaluation when replay weakens or complicates the thesis.

Current observation: Replay was not deeply inspected for this sprint; it is treated as a downstream destination.

### Trade

Expected exits:

- Research: revisit evidence if conviction is insufficient.
- Replay: revisit historical validation if the setup depends on prior analog behavior.

Current observation: Trade was not deeply inspected for this sprint; it is treated as a downstream destination.

## 4. Navigation Ownership

| Page | Ownership | Review |
| --- | --- | --- |
| Dashboard | Conclusions | PASS. Dashboard owns the first read and should not become exploration, triage, or evidence review. |
| Markets | Exploration | PASS WITH LIMITATIONS. Markets owns live exploration but shares opportunity vocabulary with Scanner. |
| Scanner | Prioritization | PASS WITH LIMITATIONS. Scanner owns attention triage and has explicit handoff actions, but direct Replay/Trade links may need stronger readiness language later. |
| Research | Evidence | PASS. Research owns evidence evaluation and explicitly explains Markets, Replay, and Trade ownership in its navigation actions. |
| Replay | Validation | PASS BY CONTRACT. Replay owns validation; Research should only hand off selected context. |
| Trade | Execution | PASS BY CONTRACT. Trade owns execution; upstream pages should not expose execution details. |

Ambiguous ownership:

- Markets and Scanner both use opportunity language.
- Scanner direct Replay and Trade exits are useful, but can blur the normal Research/Replay/Trade order if readiness is not explicit.
- Dashboard Tactical Alerts link to Markets, but Dashboard does not yet define explicit first-read exits for all major evidence cards.

## 5. Cross-page Handoff Matrix

| Handoff | Classification | Finding |
| --- | --- | --- |
| Dashboard -> Markets | Natural | A market conclusion naturally leads to live structure and opportunity exploration. Dashboard Tactical Alerts already use Markets as the inspection destination. |
| Dashboard -> Scanner | Acceptable | Useful when the user wants attention triage after seeing the market state. It is mostly global-nav driven today. |
| Markets -> Research | Future implementation | Markets should eventually hand selected symbols/opportunities to Research, but current implementation is more in-page exploration than explicit evidence handoff. |
| Markets -> Scanner | Needs clarification | Product logic is sound, but the distinction between Markets ranked opportunities and Scanner priority opportunities needs clearer handoff language. |
| Scanner -> Research | Natural | Priority Opportunities include Research Evidence links. This is the clearest triage-to-evidence transition. |
| Scanner -> Replay | Acceptable | Scanner can route to historical context, but Replay readiness may be weak without a selected historical case/window. |
| Research -> Replay | Natural | Research builds Replay handoff only when a selected historical case exists. This correctly protects Replay ownership. |
| Research -> Trade | Natural | Research explicitly says Trade owns execution planning and only hands off evidence context. |
| Replay -> Trade | Future implementation | This is the intended validation-to-execution transition, but it was not verified in runtime implementation during this sprint. |

## 6. Navigation Consistency

Observed CTA language:

- Dashboard: `Inspect Market`.
- Scanner: `Inspect Market`, `Research Evidence`, `Validate live structure`, `Review evidence`, `Check historical context`, `Continue planning`, `Open Trade`.
- Research: `Open Markets`, `Open Explorer`, `Open Replay`, `Open Trade`.
- Markets: mostly in-page symbol selection and advanced chart behavior; explicit cross-page CTA language is limited.

Consistency findings:

- `Inspect Market` is used by Dashboard and Scanner and consistently points to Markets.
- `Research Evidence` clearly communicates Scanner -> Research.
- `Open Markets`, `Open Replay`, and `Open Trade` are clear but less intent-rich than Scanner's action phrases.
- `Open Explorer` is clear to existing users but may be ambiguous for first-time users because it means Historical Intelligence rather than general product exploration.
- Markets lacks consistent outward CTA wording to Research, Scanner, and Trade.
- Global navigation order is Dashboard, Markets, Scanner, Trade, Intelligence, Research, Replay, Settings; this does not match the intended product journey, where Trade follows Research/Replay.

No labels were renamed in this sprint.

## 7. Dead-end Review

Potential dead ends:

- Markets: a user can inspect ranked opportunities and supporting analytics but may not have a clear next action into Research, Scanner, or Trade from the ranked rows.
- Dashboard: evidence cards orient the user, but most evidence cards do not expose explicit deeper handoffs. Tactical Alerts are the clearest Dashboard exit.
- Research: Replay can be unavailable until Historical Intelligence is loaded and a cached case is selected. This is correct behavior, but it can feel like a blocked path.
- Scanner: when no selected opportunity exists, Navigation Actions correctly show unavailable, but the page then depends on the user waiting for data or using global navigation.
- Historical Explorer/Intelligence: appears in global nav between Trade and Research conceptually, but its role as validation/source context can be unclear.

Dead-end decision: PASS WITH KNOWN LIMITATIONS. No page is a true terminal dead end because global navigation exists, but several sections need clearer future handoff contracts.

## 8. Recommendation

Decision: PASS WITH KNOWN LIMITATIONS

Justification:

- The primary ownership contract is coherent.
- Scanner and Research already include explicit handoff language.
- Dashboard and Markets can function within the system using global navigation and existing tactical/selection flows.
- The largest gaps are not blockers; they are contract clarity issues around Markets exits, Scanner direct Replay/Trade readiness, and global navigation order.

Recommended next sprint:

```text
Terminology normalization plan
```

Reason:

The O2 audit shows that the biggest navigation risk is wording, not route mechanics. Markets and Scanner both use opportunity language, and badge/CTA wording varies across pages. A terminology normalization plan should define canonical action verbs and route meanings before implementation work changes any links.

Secondary backlog:

1. Badge vocabulary normalization plan.
2. Replay readiness audit.
3. Trade readiness audit.

## Validation

- `docs/project/navigation-handoff-audit.md` exists.
- Runtime code changes: none.
- Dashboard runtime changes: none.
- Markets runtime changes: none.
- Scanner runtime changes: none.
- Research runtime changes: none.
- Package changes: none.
- Build required: no.
