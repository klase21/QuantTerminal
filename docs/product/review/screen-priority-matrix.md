# Screen Priority Matrix

**Status:** Product Architecture Gate artifact  
**Sprint:** P1.5R Product Architecture Review and Blueprint Certification  
**Owner:** Product / Design  
**Inputs:** MASTER_PRODUCT, Information Architecture, Pattern Library, Product Blueprint Pack  

## Purpose

This matrix ranks the product surfaces for Design System and frontend planning.
It does not authorize implementation by itself. It identifies which surfaces
should lead because they carry the most reusable product structure.

## Priority Matrix

| Screen | Business Value | User Value | Engineering Complexity | Dependency Count | Implementation Phase | Priority | Suggested Release |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| Evidence Cards | Very High | Very High | Medium | 8 | Design System foundation | P0 | First product construction wave |
| Navigation | Very High | Very High | Medium | 7 | Design System foundation | P0 | First product construction wave |
| Dashboard | Very High | Very High | Medium | 8 | First screen redesign | P0 | First product construction wave |
| Information Density | High | Very High | Medium | 6 | Design System foundation | P0 | First product construction wave |
| Replay | High | High | High | 8 | Bounded repository UX | P1 | First product construction wave |
| Research | High | High | High | 8 | Deep investigation UX | P1 | First product construction wave |
| Markets | High | High | Medium | 7 | Live monitoring UX | P1 | First product construction wave |
| Scanner | Medium | High | Medium | 6 | Opportunity triage UX | P1 | First product construction wave |
| Trade | Medium | High | Medium | 7 | Candidate planning UX | P1 | First product construction wave |
| Workspace | Medium | High | High | 7 | Productivity layer | P2 | Second product construction wave |
| Decision Flow | High | High | Medium | 8 | Cross-screen workflow | P1 | First product construction wave |
| Design DNA | Very High | High | Low | 5 | Governance foundation | P0 | Before Design System |

## Phase Rationale

P0 work should begin with shared primitives: Evidence Cards, Navigation,
Information Density, and Design DNA. Dashboard should follow because it is the
primary product orientation surface and validates the shared primitives.

P1 work should validate the core workflow chain:

```text
Dashboard
  -> Evidence
  -> Replay
  -> Research
  -> Trade / Scanner / Markets
```

P2 Workspace should wait until core screen ownership and component contracts
are stable.

## Certification Finding

The screen priority order is internally consistent with MASTER_PRODUCT,
Information Architecture, Pattern Priority, and the Product Blueprint Pack.

**Recommendation:** Design System P1.6 is safe to start with Evidence Cards,
Navigation, State Indicators, Density controls, and Dashboard primitives.

