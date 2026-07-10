# Implementation Handoff

**Status:** Canonical  
**Owner:** Product Design and Frontend Engineering  
**Flow:** Figma -> Frontend -> QA -> Release

## Purpose

Handoff transfers an approved design contract without transferring product
ownership or asking engineering to infer missing states, data behavior, or
accessibility requirements.

## Handoff Flow

```text
Approved design artifact
  -> Frontend contract review
  -> Implementation
  -> Design and accessibility verification
  -> QA acceptance
  -> Release review
```

## Figma to Frontend

The handoff package contains:

- owning blueprint and screen hierarchy;
- approved frame and prototype links;
- component mapping and versions;
- semantic token roles;
- information-object definitions;
- all canonical states;
- responsive and density rules;
- interaction events and context-preservation behavior;
- accessibility annotations;
- content, source, and unavailable-state rules;
- performance boundaries and optional-data behavior;
- acceptance criteria and known limitations.

Screens are not handed off while required states or ownership decisions remain
implicit.

## Frontend Responsibilities

- Implement the approved contract with canonical components and tokens.
- Preserve facts, evidence, reasoning, and preference boundaries.
- Keep optional or heavy content bounded and locally degradable.
- Expose explicit inputs and events without hidden side effects.
- Document necessary deviations before implementation proceeds.
- Preserve existing product behavior unless the approved change explicitly
  authorizes a change.

Frontend implementation does not fill missing design or data contracts with
fabricated defaults.

## QA Responsibilities

QA verifies:

- blueprint hierarchy and primary task;
- component and variant mapping;
- every required state;
- evidence, source, freshness, confidence, and limitation semantics;
- keyboard, focus, screen-reader, contrast, motion, touch, and responsive behavior;
- cross-navigation and context return;
- performance and graceful degradation;
- visual consistency with the approved artifact;
- absence of invented values or hidden workflows.

QA records evidence against contract identifiers and viewport/state combinations.

## Release Gate

Release requires:

- Product acceptance of purpose and hierarchy.
- Design acceptance of system fidelity.
- Engineering validation and regression review.
- Accessibility acceptance.
- QA acceptance for required states and viewports.
- Documentation and component mapping updates.
- No unresolved Critical or High issue.

## Deviations

Implementation constraints are returned to Design with impact and alternatives.
Approved deviations update the design artifact, component mapping, and QA cases
before release. Silent divergence is prohibited.

## Version and Change Traceability

Handoff records design version, component contract version, implementation
version, QA result, release target, owner, and unresolved non-blocking actions.
Breaking component changes include a migration path for existing consumers.

## Completion

Handoff completes only when the released behavior matches the approved contract
or every approved deviation is documented. Delivery of frames alone is not
handoff completion.

