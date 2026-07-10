# Prototype Strategy

**Status:** Canonical  
**Owner:** Product Design and UX Research

## Purpose

Prototypes validate hierarchy, interaction, context preservation, and failure
behavior before implementation. They are temporary validation instruments, not
canonical component contracts or sources of product truth.

## Prototype Levels

| Level | Purpose | Fidelity |
| --- | --- | --- |
| Flow | Validate sequence, ownership, and return paths | Structural |
| Interaction | Validate controls, disclosure, filters, and feedback | Behavioral |
| Responsive | Validate priority and adaptation across contexts | Layout-complete |
| Accessibility | Validate keyboard order, focus, reading sequence, motion, and alternatives | Annotated |
| Handoff | Demonstrate approved primary and failure workflows | Contract-aligned |

## Interactive Prototypes

Each prototype defines a starting context, task, expected outcome, branches,
failure path, return path, viewport, and test status. Interactions use canonical
component events and do not imply unapproved product behavior.

## Usability Review

Review tasks test whether users can:

- identify the primary state within five seconds;
- distinguish evidence from reasoning;
- find source and availability information;
- navigate to deeper context and return;
- understand partial, stale, unavailable, experimental, and error states;
- complete the screen's primary workflow without hidden actions.

Findings are recorded against blueprint success criteria, not subjective taste.

## Desktop First

Professional workflows begin with desktop because comparison, charts, Replay,
Research, and dense evidence require sufficient working space. Desktop-first
does not postpone responsive design; the same review cycle defines every
required adaptation.

## Responsive Validation

Validate mobile, tablet, laptop, desktop, and wide workspace. Confirm that
primary state, evidence quality, warnings, actions, and return paths survive.
Multi-panel flows become ordered sequences on constrained screens rather than
losing context.

## Accessibility Validation

Prototype review covers logical focus order, visible focus annotations,
accessible names, reading order, chart alternatives, non-color state cues,
reduced motion, zoom/reflow, touch targets, and error recovery.

## Data Integrity

Prototype content uses approved source-backed examples or explicit unavailable
states. It does not invent market values, confidence, timestamps, sources, or
outcomes. Placeholder structure is labeled as structure and never presented as
real evidence.

## Coverage Strategy

Every handoff prototype includes:

1. Primary success flow.
2. Partial or unavailable data flow.
3. Error and recovery flow.
4. Responsive transition.
5. Keyboard and focus path.
6. Cross-navigation and return path.

## Exit Criteria

A prototype is validated when critical tasks are understandable, blockers are
resolved, accessibility annotations are complete, responsive behavior is
coherent, and the approved design remains consistent with its component map.

