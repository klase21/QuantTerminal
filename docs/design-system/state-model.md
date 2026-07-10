# Component State Model

**Owner:** Design System State Governance  
**Status:** Canonical

## Required States

Every reusable component defines the states below, even when a state resolves
to “not applicable” with justification.

| State | Meaning | Required behavior |
| --- | --- | --- |
| Loading | Initial bounded work is in progress | Preserve layout, identify activity, avoid false values |
| Empty | Valid query completed with no matching content | Explain scope and offer a safe next step |
| Ready | Required content is available and valid | Present primary content and normal interactions |
| Error | Operation failed unexpectedly | State failure, impact, and retry/recovery path |
| Partial | Some required or useful content is missing | Show available content and enumerate limitations |
| Offline | Required connection is unavailable | Preserve cached context when valid and explain limits |
| Refreshing | Existing valid content is updating | Keep current content visible and identify refresh state |

## Data Availability Substates

Reusable data components also support:

- `NO DATA`: a valid scope contains no observed records.
- `UNAVAILABLE`: required source or capability cannot provide the data.
- `STALE`: data exists but is outside its freshness contract.
- `EXPIRED`: data must no longer support the intended use.
- `EXPERIMENTAL`: evidence is usable only with non-canonical qualification.

These states are not interchangeable. Each includes a reason and source context
when available.

## Transition Rules

- Loading resolves to Ready, Empty, Partial, Offline, or Error.
- Refreshing retains the last valid content until replacement is validated.
- Error never silently becomes Ready without a successful operation.
- Partial never displays missing fields as zero, neutral, or inferred.
- Offline content is labeled with its last valid timestamp.
- Expired content cannot be styled as current.

## Layout Stability

State changes preserve stable component dimensions where practical. Skeletons
represent structure only and never imply values. Spinners do not replace whole
screens when local loading is sufficient.

## State Content Pattern

Each non-ready state communicates:

1. State name.
2. Plain-language reason.
3. User impact.
4. Safe action, if one exists.
5. Last valid timestamp or source context, when relevant.

## Accessibility

State changes use text and non-color cues, maintain focus, and announce only
material updates. Retry actions are keyboard accessible. Repeated real-time
updates do not overwhelm assistive technology.

