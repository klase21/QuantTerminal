# Feature Discovery

**Status:** Canonical feature discovery architecture  
**Owner:** Product / Design  

## Purpose

Feature discovery defines how users find capabilities without overwhelming the
first-read experience.

## Discovery Philosophy

Users should discover features through context, not noise.

Advanced features should appear when:

- the user reaches the relevant evidence;
- the feature helps answer the current question;
- source-backed context is available;
- the feature does not hide the primary hierarchy.

## Discovery Channels

| Channel | Purpose | Rules |
| --- | --- | --- |
| Primary navigation | Show durable product destinations. | Do not add temporary or dataset-specific pages casually. |
| Contextual links | Route users to the next owning screen. | Preserve symbol, time, and evidence context. |
| Evidence Cards | Reveal related charts, replay, research, and source detail. | Do not overload cards with every possible action. |
| Search | Let users find symbols, evidence, replay, research, and datasets. | Results must show availability when relevant. |
| Filters | Reveal ways to narrow current evidence. | Filters must not hide warnings. |
| Saved views | Help repeat workflows. | Saved views do not freeze stale claims as current. |
| Empty / unavailable states | Explain what is missing and where to go next. | Never fake data to fill a state. |

## Beginner Discovery

Beginners discover:

- primary state;
- evidence cards;
- supporting charts;
- guided links to Replay or Research;
- explanations of unavailable evidence.

## Professional Discovery

Professionals discover:

- search shortcuts;
- dense panels;
- saved views;
- filters;
- replay windows;
- raw records;
- future automation entry points.

## Advanced Feature Rules

Advanced features must:

- have a clear owner screen;
- have visible entry and exit;
- preserve context;
- avoid hidden actions;
- preserve source transparency;
- remain optional until the user asks for depth.

## Product Principles Validation

| Principle | Discovery validation |
| --- | --- |
| Visual First | Features appear after visual/evidence context. |
| Evidence First | Feature entry should originate from source-backed evidence when possible. |
| Explain, Don't Predict | Feature labels describe capability, not guaranteed outcome. |
| Progressive Disclosure | Advanced features are available without overwhelming the first layer. |
| 5-Second Rule | Discovery does not compete with the primary message. |
| Human Decision Authority | Features help the user inspect, compare, and decide. |

## Final Decision

Feature discovery should make QuantTerminal feel deeper over time without
making the first experience feel complicated.
