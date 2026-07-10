# AI Component Contract

**Owner:** Design System Governance  
**Status:** Canonical implementation specification format

## Purpose

This contract gives human and AI implementers the same bounded specification.
It prevents visual generation from inventing product ownership, data, states,
interactions, or accessibility behavior.

## Required Contract

Every reusable component specification includes all fields below.

### Identity

- Component name.
- Atomic level: atom, molecule, organism, or template.
- Canonical owner.
- Version and status.

### Purpose

State the user problem the component solves and why a reusable component is
appropriate. Describe what the component does not own.

### Inputs

Define every input by semantic name, meaning, requirement, availability, and
source expectation. Distinguish facts, evidence, reasoning, configuration, and
user preferences. Optional input absence must have defined behavior.

### Outputs

Define what the user can understand or do and what structured events the
component emits. Presentation output must not be confused with persisted facts.

### Dependencies

List token roles, child components, information objects, owning blueprint,
MASTER constraints, and external product contracts. Hidden dependencies are
prohibited.

### Required States

Define Loading, Empty, Ready, Error, Partial, Offline, and Refreshing. Data
components also define `NO DATA`, `UNAVAILABLE`, `STALE`, `EXPIRED`, and
`EXPERIMENTAL` where applicable.

### Accessibility

Define accessible name, description, reading order, keyboard behavior, focus
behavior, non-color state cues, live update policy, touch behavior, and any
structured alternative to visualization.

### Behavior

Define default presentation, responsive adaptation, density behavior,
progressive disclosure, context preservation, and failure behavior.

### Events

Events use semantic names and explicit payloads. Define trigger, payload,
consumer, reversibility, and whether the event changes only presentation,
user preference, or external state.

### Constraints

Document prohibited behavior, performance boundaries, source-integrity rules,
privacy or safety boundaries, composition rules, and ownership limits.

### Acceptance Criteria

Criteria are observable and cover hierarchy, all states, accessibility,
responsive behavior, token use, source transparency, event behavior, and
blueprint alignment.

## Contract Template

```text
Component:
Atomic level:
Owner:
Version / status:

Purpose:
Non-ownership:

Inputs:
Outputs:
Dependencies:

Required states:
Accessibility:
Behavior:
Events:
Constraints:

Acceptance criteria:
Related blueprint:
Related MASTER documents:
```

## AI Generation Rules

- Read the owning blueprint and information-object definition before generation.
- Reuse canonical components and semantic tokens.
- Never invent data, confidence, sources, timestamps, reasoning, or unsupported
  interaction.
- Never omit unavailable, partial, stale, error, or accessibility behavior.
- Do not broaden component ownership to solve a local layout problem.
- Flag missing contract information instead of guessing.
- Generation does not certify its own output; independent review is required.

## Acceptance Gate

A component is implementation-ready only when its contract is complete, its
owner is unambiguous, all required states are specified, accessibility is
testable, and its composition does not violate Information Architecture.

