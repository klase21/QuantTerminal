# Product Architecture Gap Analysis

**Status:** Product Architecture Gate artifact  
**Sprint:** P1.5R Product Architecture Review and Blueprint Certification  
**Owner:** Product / Architecture  

## Purpose

This gap analysis identifies what is missing before implementation and what
can safely wait. It does not authorize new product capabilities.

## Gap Categories

| Gap | Category | Severity | Finding | Recommendation |
| --- | --- | --- | --- | --- |
| Design System component specs | Missing reusable components | Critical | Blueprints identify components, but component-level anatomy, variants, and states are not yet specified. | Address in P1.6 Design System. |
| Product Diagram Pack | Missing visual product architecture | Major | Architecture diagrams exist, but product-specific flow diagrams do not yet exist. | Create after blueprint certification. |
| Evidence Card state taxonomy | Missing evidence paths | Critical | Evidence Card blueprint names source, confidence, warnings, contradiction, and repository link, but state variants need design-system rules. | Define in P1.6. |
| Navigation state model | Missing interactions | Major | Navigation blueprint defines preservation rules, but not detailed state anatomy. | Define in Design System and Figma. |
| Workspace detailed behavior | Missing workflow detail | Future | Workspace blueprint is intentionally P2 because saved layouts should follow core screens. | Defer until core components stabilize. |
| Reasoning UI boundaries | Missing future workflow | Future | Reasoning is intentionally future and cannot be fully specified until reasoning architecture matures. | Keep as future dependency. |
| Alerts screen ownership | Missing screen | Future | MASTER_PRODUCT defines Alerts, but no P1.5 blueprint exists. | Add when automation and alert governance are ready. |
| Settings / Operations blueprint | Missing screen | Minor | IA includes Settings / Operations, but the requested pack did not include a dedicated blueprint. | Add before operational UI redesign. |
| Repository detail screen blueprint | Missing screen | Major | Repository is a consumer destination in many blueprints, but no dedicated product blueprint exists. | Add before building repository-facing UX. |
| Accessibility component standards | Missing reusable component rules | Major | Accessibility is a product principle and pattern requirement, but component-level rules are not yet specified. | Address in Design System. |
| Mobile companion rules | Missing workflow detail | Future | Mobile is documented as future. | Defer until desktop foundation stabilizes. |
| Enterprise workspace governance | Missing future workflow | Future | Enterprise workflows require permissions and collaboration architecture. | Defer to enterprise roadmap. |

## Conflict Review

| Area | Finding | Severity | Resolution |
| --- | --- | --- | --- |
| Dashboard and Historical Analog | Dashboard blueprint references Historical Analog, while AGENTS and IA prohibit heavy historical workflows on Dashboard. | Minor | Treat Dashboard Historical Analog as source-backed context or link only. Replay and Research retain ownership of historical workflows. |
| Reasoning references | Blueprints mention future reasoning before runtime exists. | Minor | Current wording keeps reasoning optional or future. No unsupported AI conclusion is authorized. |
| Workspace scope | Workspace appears across navigation, density, and components. | Minor | Workspace owns saved context only, not facts or evidence truth. |

## Missing Ownership Review

No critical ownership gaps were found for the required P1.5 blueprint set.

The main future ownership gaps are Repository detail UX, Settings / Operations,
Alerts, and Product Diagram Pack. These are outside the requested P1.5 scope.

## Certification Finding

The product architecture has no blocking gap for Design System work.

**Decision:** Proceed to P1.6 with known gaps documented.

