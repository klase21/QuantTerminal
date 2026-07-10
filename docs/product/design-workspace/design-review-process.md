# Design Review Process

**Status:** Canonical  
**Owner:** Product Design Governance

## Purpose

Design review validates product alignment, contract fidelity, usability,
accessibility, responsiveness, and implementation readiness. It is a decision
process, not a presentation ceremony.

## Review Stages

| Stage | Question | Required reviewers | Exit condition |
| --- | --- | --- | --- |
| 1. Intake | Is the problem defined and owned? | Product, Design | Blueprint, scope, user question, and risk confirmed |
| 2. Structure | Does hierarchy match IA and blueprint? | Product, Design | Screen hierarchy and navigation approved |
| 3. System | Does the design reuse canonical components and tokens? | Design System owner | Component mapping and states complete |
| 4. Experience | Can users complete primary and failure workflows? | Product, UX review | Prototype and usability findings resolved |
| 5. Accessibility | Is the experience perceivable and operable? | Accessibility reviewer | Keyboard, focus, reading order, contrast, motion, touch reviewed |
| 6. Engineering | Is the contract feasible and responsive? | Engineering | Dependencies, performance boundaries, and handoff accepted |
| 7. Approval | Is the artifact ready for implementation? | Independent approver | Acceptance criteria met and status set to Approved |

## Acceptance Criteria

- The primary user question is clear within five seconds.
- Information hierarchy matches the owning blueprint.
- Evidence precedes reasoning and actions.
- Source, timestamp, availability, and limitations are visible where required.
- All canonical component states are designed.
- Responsive and density behavior preserves hierarchy.
- Keyboard, focus, screen-reader, reduced-motion, contrast, and touch behavior
  are specified.
- Cross-navigation preserves valid context and provides return paths.
- Optional or heavy evidence degrades locally.
- Components and variants have unique owners.
- No fabricated value, source, confidence, timestamp, or fallback is present.

## Review Checklist

- [ ] MASTER_PRODUCT and MASTER_ENGINEERING alignment confirmed.
- [ ] Blueprint and Information Architecture references present.
- [ ] Product Pattern Library and anti-pattern rules reviewed.
- [ ] Design System components and semantic tokens reused.
- [ ] Ready, loading, empty, error, partial, offline, and refreshing states covered.
- [ ] `UNAVAILABLE`, `STALE`, `EXPIRED`, and `EXPERIMENTAL` covered where relevant.
- [ ] Desktop, laptop, tablet, mobile, and wide-workspace behavior reviewed.
- [ ] Accessibility review evidence attached.
- [ ] Primary, secondary, failure, and return flows reviewed.
- [ ] Performance and optional-data behavior reviewed.
- [ ] Component mapping and handoff fields complete.
- [ ] Open decisions have owners and do not hide blockers.

## Approval Workflow

```text
Draft
  -> Design Review
  -> Product Review
  -> Accessibility Review
  -> Engineering Review
  -> Independent Approval
  -> Approved for Handoff
```

Possible decisions are `APPROVED`, `APPROVED WITH NON-BLOCKING ACTIONS`, or
`CHANGES REQUIRED`. Only `APPROVED` artifacts enter canonical libraries.

## Change Severity

- Low: editorial or visual refinement without semantic change.
- Medium: new variant, responsive behavior, or interaction detail.
- High: component contract, navigation, state, or blueprint hierarchy change.
- Critical: evidence integrity, human authority, accessibility, Repository
  lineage, or protected workflow impact.

High and Critical changes follow MASTER_ENGINEERING architecture and review
requirements. AI-generated work receives the same review and cannot self-approve.

