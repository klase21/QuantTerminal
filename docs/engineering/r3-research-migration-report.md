# R3 V2.1 Research React Migration Report

## Decision

`READY WITH EXPLICIT LIMITATIONS`

Research V2 is implemented as an in-place presentation migration. `ResearchPage.tsx` remains the sole runtime controller. Browser-based responsive, keyboard, focus, and console validation could not execute because the local Next development server did not progress beyond startup on two clean ports; these checks are not represented as passing.

## Exact Files Changed

### New

- `lib/research-presentation/contracts.ts`
- `lib/research-presentation/adapters.ts`
- `components/research-v2/ResearchV2View.tsx`
- `components/research-v2/ResearchShell.tsx`
- `components/research-v2/ResearchSummarySection.tsx`
- `components/research-v2/EvidenceOverviewSection.tsx`
- `components/research-v2/PrimarySourcesSection.tsx`
- `components/research-v2/ReasoningCounterEvidenceSection.tsx`
- `components/research-v2/PredictionMarketContextSection.tsx`
- `components/research-v2/ResearchGraphSection.tsx`
- `components/research-v2/RelatedResearchSection.tsx`
- `components/research-v2/ResearchHandoffs.tsx`
- `components/research-v2/index.ts`
- `workers/component-tests/researchAdapterTypeChecks.ts`
- `workers/component-tests/runResearchV2SmokeTest.tsx`
- `docs/engineering/r3-research-migration-report.md`

### Modified

- `components/research/ResearchPage.tsx`
- `components/foundation-preview/ReactFoundationPreview.tsx`

No package, lockfile, global CSS, API, Repository, Evidence Packet, polling hook, Dashboard, Replay, Markets, Scanner, Trade, provider, scheduler, worker-runtime, or historical-backfill file changed.

## View Models and Adapters

The presentation boundary introduces responsibility-specific models for Research question and summary, structured evidence, primary sources, reasoning availability, counter evidence, prediction context, graph availability, related research, Repository projection, historical selection, interaction capability, and contextual handoffs.

The pure adapter:

- preserves supplied evidence and artifact identities;
- never treats array position as evidence identity;
- maps retained polling payload after failure to `PARTIAL` with `UNKNOWN` freshness unless governed metadata exists;
- keeps lifecycle, availability, freshness, coverage, confidence, source quality, and source status independent;
- gates Primary Source presentation on attributable source metadata;
- keeps Decision Brief orientation separate from reasoning and confidence;
- treats prediction probability as context and attention labels as heuristics;
- separates Repository projection availability from record-level traceability;
- fails closed for cited reasoning, Evidence Packet consumption, and Research Graph relationships.

## Sections Migrated

The active presentation order is:

1. Research Summary
2. Evidence Overview
3. Primary Sources
4. Reasoning and Counter Evidence
5. Prediction Market Context
6. Research Graph
7. Related Research
8. Repository and contextual handoffs

The legacy local presentation remains present but unreachable during the parity window. Runtime ownership was not extracted or duplicated.

## Runtime and Interaction Parity

- The three automatic polling flows retain their original URLs, immediate behavior, 60-second cadence, 12-second timeout, and one retry.
- Historical Analog, Event Impact, Market Memory, and Repository projection remain manual-load actions.
- Existing AbortControllers, reset effects, retained-last-success behavior, Scanner context intake, URL investigation context, historical-case selection, Research-to-Replay context write, and navigation builders remain in `ResearchPage.tsx`.
- No search, filter, sort, tab, polling, storage, or background-load behavior was added.

## Evidence Boundaries

- Structured Historical Analog, Event Impact, and Market Memory contradiction objects are adapted directly from supplied objects.
- Flattened Decision Brief factor strings are not promoted to evidence.
- Narrative counts are labeled secondary aggregate context.
- Primary Sources require a supplied source identifier and source name; insufficient metadata renders unavailable.
- Reasoning renders `UNAVAILABLE` because no approved cited reasoning contract exists.
- Counter evidence renders only supplied structured conflicting evidence; no absence or affected claim is inferred.
- Prediction-market freshness remains `UNKNOWN` without governed source metadata. Probability is never mapped to confidence.
- Research Graph renders `UNAVAILABLE` because no relationship contract exists.
- Evidence Packet remains unintegrated and explicitly unavailable.
- Repository coverage remains availability evidence. Record links remain unavailable without a supplied record identity and destination.

## Preview Strategy

The development-only foundation preview now includes clearly labeled deterministic synthetic Research fixtures. It performs no external requests or Repository writes. Fixtures cover structured evidence, secondary aggregate context, attributable and insufficient primary-source metadata, counter evidence, unavailable reasoning and graph, unknown prediction freshness, retained payload after failure, stale projection, missing Repository identity, selected case, long text, and narrow composition.

## Validation Results

| Check | Status | Result |
|---|---|---|
| Git inspection | PASS | Final tracked and untracked changes are inside the approved scope. |
| TypeScript | PASS | `npx tsc --noEmit` completed successfully. Generated incremental cache was restored. |
| Research adapter type checks | PASS | Compiled with closed-vocabulary negative assertions. |
| Research V2 smoke tests | PASS | All Research adapter, rendering, identity, boundary, and parity assertions passed. |
| Existing R0 smoke tests | PASS | Existing React foundation smoke suite passed. |
| Existing R1 Dashboard smoke tests | PASS | Existing Dashboard V2 smoke suite passed. |
| Existing R2 Replay smoke tests | PASS | Existing Replay V2 smoke suite passed. |
| Polling URL parity | PASS | Static source assertions verify all three original URLs. |
| Polling cadence parity | PASS | Static source assertions verify `60000` for all three polls. |
| Timeout and retry parity | PASS | Polls remain `12000`/`1`; manual loaders retain `8000` or `5000` and `0`. |
| Retained-last-success behavior parity | PASS | Protected polling hook unchanged; adapter test verifies retained payload plus error maps to `PARTIAL`. |
| Manual Historical Analog load parity | PASS | Existing loader remains manual and connected to the new presentation. |
| Manual Event Impact load parity | PASS | Existing loader remains manual and connected to the new presentation. |
| Manual Market Memory load parity | PASS | Existing loader remains manual and connected to the new presentation. |
| Repository manual-load parity | PASS | Existing projection-only loader remains manual and unchanged. |
| Historical-case selection parity | PASS | Existing state setter remains the owner; selected button exposes `aria-pressed`. |
| Scanner context parity | PASS | Existing load, validation, and lifecycle path remains unchanged. |
| Research-to-Replay handoff parity | PASS | Existing context creation, storage owner, and navigation fallback remain unchanged. |
| No new search/filter/sort/tabs | PASS | View model closes all four capabilities as unsupported. |
| Evidence identity preservation | PASS | Smoke test verifies supplied evidence and artifact identities. |
| Primary-source gate | PASS | Missing attributable metadata fails closed. |
| Unavailable Reasoning boundary | PASS | No `ReasoningCard` is used for ineligible content. |
| Counter-evidence rendering | PASS | Only structured supplied conflicts render. |
| Probability-not-confidence rule | PASS | Prediction model has no confidence field. |
| Prediction freshness mapping | PASS | Missing governed source metadata maps to `UNKNOWN`. |
| Research Graph unavailable boundary | PASS | No nodes or edges are inferred. |
| Evidence Packet remains unintegrated | PASS | No Evidence Packet builder or protected engine import was added. |
| Repository projection versus record identity separation | PASS | Projection can be stale/available while record handoff remains unavailable. |
| Desktop responsive smoke | NOT RUN | Browser page did not become reachable because the local dev server remained in startup. |
| Tablet responsive smoke | NOT RUN | Browser page did not become reachable because the local dev server remained in startup. |
| 393px mobile smoke | NOT RUN | Browser page did not become reachable because the local dev server remained in startup. |
| Keyboard and focus smoke | NOT RUN | Browser page did not become reachable. Static semantics alone are not claimed as keyboard validation. |
| Selected-case accessibility state | PASS | Static render verifies `aria-pressed="true"` for the selected case. |
| Browser console | NOT RUN | Browser page did not become reachable. |
| Formal WCAG audit | NOT RUN | Not performed. |
| Cross-browser audit | NOT RUN | Not performed. |
| Prohibited-behavior scan | PASS | No fetch, polling, storage, Evidence Packet builder, unsupported `LIVE`, or generated reasoning was added to shared Research presentation. |
| Protected-system diff inspection | PASS | Protected paths have no diff. |
| Package and lockfile inspection | PASS | `package.json` and `package-lock.json` are unchanged. |
| Production build | NOT APPLICABLE | Prohibited by `AGENTS.md`; TypeScript validation was used. |

## Explicit Limitations

- Browser responsive, keyboard, focus, and console checks remain unexecuted.
- Cited Research reasoning is unavailable.
- Research Graph relationships are unavailable.
- Evidence Packet remains outside Research.
- Repository projection does not provide record-level links.
- Prediction-market context is not Research confidence.
- Search, filter, sort, and tab workflows do not exist in the active runtime.
- Legacy local presentation is retained but unreachable for the parity window.

## R4 Readiness

`READY WITH EXPLICIT LIMITATIONS`

The Research runtime boundary and protected systems are preserved, and the canonical presentation fails closed where contracts are absent. R4 may begin after accepting the unexecuted browser-validation limitation or completing those checks in an environment where the local development server reaches a ready state.
