# Information Ownership Audit

**Status:** Canonical F5.5 ownership audit  
**Owner:** Product Architecture

## Ownership Matrix

| Information object | Single canonical owner | Other screens may | Other screens may not |
| --- | --- | --- | --- |
| Market Direction | Dashboard | Preview evidence; link to Markets | Recompute live structure or imply certainty from missing data |
| Sector Rotation | Markets | Dashboard may surface one driver; Scanner may inherit sector context | Duplicate the rotation model or infer opportunity priority |
| Replay Summary | Replay | Dashboard/Research may link to it | Restate reconstruction as a new fact |
| Evidence | Evidence layer backed by Repository | Every screen may present scoped Evidence Cards | Alter source, availability, freshness, or provider tier |
| Historical Context | Replay for sequence; Research for interpretation | Dashboard/Scanner may hand off to it | Run heavy historical work or fabricate analogs |
| Research | Research | Other screens may preview or link to a thesis | Embed deep investigation as a secondary panel |
| Repository | Repository | Every evidence-bearing screen may link to records | Write, mutate, or reinterpret raw facts in presentation |
| Scanner Priority | Scanner | Markets/Dashboard may provide source context | Rank candidates without method and evidence basis |
| Risk | Domain-scoped, with Trade owning candidate decision risk | Markets shows market risk; Scanner uncertainty; Research conflict | Collapse all risk into one unsupported score |
| Decision | User | Trade may structure the decision workspace | Recommend or execute a trade on the user's behalf |

## Screen Responsibility Test

| Screen | Owns | Does not own | Result |
| --- | --- | --- | --- |
| Markets | Global/live market context, sectors, flows, derivatives, macro/prediction evidence | Historical reconstruction, candidate priority, thesis, decision | PASS |
| Dashboard | Five-second orientation and primary market read | Heavy history, deep research, candidate ranking | PASS |
| Replay | Bounded historical sequence and validation | Cause generation, deep thesis ownership, decision | PASS |
| Research | Evidence investigation, assumptions, contradictions, source review | Live monitoring, candidate ranking, execution planning | PASS |
| Scanner | Investigation discovery, triage, priority basis | Signal selling, research conclusions, trade recommendation | PASS |
| Future Trade | Candidate-specific thesis, risk, scenarios, notes, decision structure | Order entry, brokerage, signal generation, decision authority | READY |

## Resolved Ambiguities

### Market Direction vs Global Market Summary

Markets owns the real-time inputs and cross-market verification. Dashboard owns the concise product-level orientation. Markets does not lose ownership of live structure when Dashboard displays a summarized direction.

### Historical Context vs Historical Analog

Replay owns factual sequence. Research owns comparison and interpretation. Dashboard Historical Analog remains intentionally removed; a Dashboard link is not ownership.

### Risk

`Risk` is not a transferable scalar. Each screen owns a bounded risk object:

- Markets: market-wide conditions and data-quality limitations;
- Scanner: uncertainty in whether an investigation deserves attention;
- Research: conflicting evidence and assumptions;
- Trade: candidate-specific downside, invalidation, and scenarios.

### Decision

No product screen owns the final decision. Trade owns decision organization. The human owns acceptance, rejection, monitoring, and any external execution.

## Duplication Controls

- One information object has one semantic owner even when it has several views.
- Previews use links and shared identities rather than copied business logic.
- Shared components do not acquire the ownership of the data they display.
- A screen may summarize another owner's result only with provenance and a handoff.
- Missing information stays missing across all views.

## Decision

**PASS.** No duplicated primary responsibility or orphan information object was found. The Trade boundary is sufficiently clear to begin design.
