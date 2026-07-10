# Component Library

**Owner:** Product Design and Frontend Component Governance  
**Status:** Canonical component taxonomy  
**Model:** Atomic Design adapted for an evidence-driven terminal

## Ownership Rules

Each component has one canonical contract and may have variants. Screen teams
compose components but do not fork their semantics. A new component is justified
only by a distinct product object, interaction, state model, or accessibility
requirement.

## Atoms

| Component | Purpose | Canonical owner |
| --- | --- | --- |
| Button | Invoke a clear command | Action System |
| Icon | Represent a familiar concept or tool | Iconography |
| Badge | Display compact semantic status | State System |
| Chip | Represent a selectable filter or compact choice | Filter System |
| Label | Name a field, value, control, or status | Typography System |
| Tag | Classify content without implying interaction | Metadata System |
| Divider | Separate related regions when spacing is insufficient | Layout System |
| Tooltip | Name or clarify a compact control | Disclosure System |
| Progress | Show measurable completion | State System |
| Spinner | Show brief indeterminate activity | State System |
| Confidence Meter | Display source-backed confidence with an explicit basis | Evidence System |

### Atom Contracts

- Buttons use icon-only form only for familiar actions and retain an accessible
  name and tooltip where needed.
- Badges express defined states; tags express classification.
- Chips are interactive and announce selection.
- Progress is used only when completion can be measured; Spinner is used only
  for bounded indeterminate work.
- Confidence Meter never invents, infers, or decorates confidence. If confidence
  is unavailable, it displays `UNAVAILABLE` with a reason.

## Molecules

| Component | Purpose | Canonical owner | Required content |
| --- | --- | --- | --- |
| Evidence Card | Present one source-backed observation or evidence group | Evidence System | fact, source, timestamp, availability, limitations, drilldown |
| Metric Card | Present one factual metric in context | Data Display | label, value/state, unit, timestamp/context |
| Search Box | Find supported product entities | Navigation/Search | query, scope, clear action, result state |
| Filter Bar | Refine visible information without hiding warnings | Filter System | active filters, reset, result impact |
| Status Panel | Explain operational or data availability state | State System | state, reason, impact, safe next action |
| Navigation Item | Route to a stable product destination | Navigation | destination, active state, accessible name |
| Counter Evidence Card | Present evidence that limits or contradicts a claim | Evidence System | contradiction, source, timestamp, relation, limitations |
| Reasoning Card | Present interpretation linked to evidence | Reasoning Presentation | interpretation, evidence references, limitations, review state |

### Evidence Card Contract

Evidence Card owns presentation, not evidence creation. It answers:

1. What was observed?
2. Where and when was it observed?
3. What is its availability and provider quality?
4. What limits or contradicts it?
5. Where can the user inspect it further?

Experimental evidence remains visibly non-canonical. Missing evidence is never
replaced with a neutral value or synthetic confidence.

### Metric Card Contract

Metric Card is for a single comparable fact, not an all-purpose content box. It
must not duplicate an Evidence Card or imply reasoning. Change indicators state
their comparison basis.

### Reasoning Boundary

Reasoning Card is visually distinct from Evidence Card and always cites the
evidence it interprets. Reasoning status cannot alter or overwrite evidence
status.

## Organisms

| Component | Purpose | Canonical owner | Composes |
| --- | --- | --- | --- |
| Dashboard Panel | Fast market orientation | Dashboard | direction, evidence, prediction context, alerts |
| Replay Timeline | Historical event sequence and inspection | Replay | chart context, events, OI, funding, liquidation, optional heavy evidence |
| Research Section | Deep thesis investigation | Research | summary, evidence, reasoning, counter-evidence, sources |
| Markets Grid | Live monitoring and comparison | Markets | market metrics, flows, derivatives, structure |
| Scanner Panel | Opportunity discovery and triage | Scanner | ranking, filters, evidence, status, handoffs |
| Trade Workspace | Candidate-specific decision support | Trade | thesis, evidence, risk, scenarios, notes |
| Repository Viewer | Raw record and lineage inspection | Repository Presentation | records, metadata, provider, timestamps, availability |

Organisms retain screen ownership. For example, Dashboard Panel may link to
historical context but does not own historical workflows; Replay Timeline owns
historical reconstruction and must degrade gracefully when heavy evidence is
unavailable.

## Templates

| Template | Primary question | Default density |
| --- | --- | --- |
| Dashboard | What is happening and why should I care? | Beginner to Intermediate |
| Replay | What happened in this window? | Intermediate to Research |
| Research | Why should I believe this thesis? | Professional to Repository |
| Markets | Which markets deserve attention? | Intermediate to Professional |
| Scanner | What changed and needs attention? | Intermediate |
| Trade | How should I evaluate this candidate? | Intermediate to Professional |
| Workspace | How do I preserve and compare context? | User-selected |

Templates define hierarchy and regions, not page-specific implementations.
They follow the corresponding product blueprint.

## Composition Rules

- Atoms do not fetch data or own product facts.
- Molecules receive explicit inputs and expose explicit events.
- Organisms orchestrate presentation but do not acquire Repository, Evidence,
  or Reasoning business ownership.
- Templates place organisms according to Information Architecture.
- Cards are not nested in cards.
- Repeated information requires a distinct user purpose.
- State, source, freshness, and accessibility survive composition.

## Component Admission Test

A proposed component must identify its product problem, owner, users,
information object, states, accessibility behavior, responsive behavior,
dependencies, and why composition of existing components is insufficient.

