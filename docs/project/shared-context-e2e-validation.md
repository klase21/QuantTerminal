# Shared Product Context End-to-End Validation

**Sprint:** A25-9  
**Date:** 2026-06-27  
**Scope:** Dashboard -> Markets -> Scanner -> Research -> Replay -> Trade  
**Decision:** PASS WITH KNOWN LIMITATIONS

## 1. End-to-End Chain Review

The five canonical handoffs are implemented. Each source creates a new version 1 context on an explicit user action, persists it in `sessionStorage`, appends `contextId` to the existing destination URL, and falls back to the original direct navigation when construction or persistence fails.

### Dashboard -> Markets

- Source: Dashboard Tactical Alerts `Inspect Market` action.
- Destination: Markets Market Context.
- Passed: symbol; source-backed direction, confidence, and health; matching-symbol driver count and compact evidence preview; freshness.
- Intentionally not passed: opportunity, signal, thesis, market structure, validation, replay result, execution context.
- Fallback: original Markets URL is used without `contextId`; direct Markets remains available.
- Ownership: PASS. Dashboard provides conclusion context only. Markets does not use it for structure, movers, ranking, or opportunity generation.

Dashboard driver and evidence context is included only when the selected alert symbol matches the loaded Market Driver summary. A cross-symbol alert receives only its own source-backed direction and confidence with `UNKNOWN` freshness.

### Markets -> Scanner

- Source: Markets `Open Scanner` action.
- Destination: Scanner Supporting Context.
- Passed: symbol, exchange, timeframe, market structure display state, structure reason, breadth, sector, mapped/advancing/declining counts, freshness.
- Intentionally not passed: opportunity, signal, thesis, evidence, confidence, validation, replay result, execution context.
- Fallback: Scanner opens with stable symbol/query parameters and no `contextId`.
- Ownership: PASS. Markets provides exploration context. Scanner ranking remains independent.

### Scanner -> Research

- Source: Scanner `Research Evidence` action.
- Destination: Research Summary inherited-context strip.
- Passed: symbol, opportunity context, optional signal context, freshness.
- Intentionally not passed: thesis, evidence, confidence, validation, replay result, execution context.
- Fallback: original Research URL is used; Research remains usable without shared context.
- Ownership: PASS. Scanner passes triage output but does not generate Research evidence or a thesis.

### Research -> Replay

- Source: Research `Open Replay` action after explicit historical-case selection.
- Destination: Replay Summary inherited-context strip.
- Passed when available: symbol, exchange, timeframe, explicit thesis, decision-brief evidence summary, supporting evidence, conflicting evidence, freshness, required replay target.
- Intentionally not passed: validation result, replay result, execution context.
- Fallback: original Replay URL is used; Replay remains available without inherited context.
- Ownership: PASS. Research selects the validation target but does not create validation.

### Replay -> Trade

- Source: Replay `Open Trade` action.
- Destination: Trade Summary inherited-context strip.
- Passed: symbol, exchange, timeframe, inherited thesis, inherited evidence summary, inherited freshness, Replay-owned validation display state, Replay-owned replay result.
- Intentionally not passed: execution plan, entries, exits, sizing, risk model, synthetic readiness.
- Fallback: original Trade URL is used; Trade remains usable with validation shown as unavailable.
- Ownership: PASS. Replay passes validation context but does not create execution.

## 2. Context Integrity Review

| Integrity rule | Result | Evidence |
| --- | --- | --- |
| `contextId` propagation | PASS | Every source appends the created ID while preserving the existing destination query. |
| `schemaVersion` | PASS | Every helper emits schema version 1 and schema validation rejects absent or incompatible versions. |
| Revision handling | PASS WITH LIMITATION | New handoffs start at revision 1. Core lifecycle stale-write protection passes, but page transitions create new snapshots rather than update or merge prior IDs. |
| Timestamps and expiry | PASS | Helpers require `createdAt`/`expiresAt`, derive `updatedAt`, and use 30-minute page handoff TTLs. Lifecycle inspection rejects invalid TTL relationships. |
| Destination lifecycle validation | PASS | Markets, Scanner, Research, Replay, and Trade load and inspect active context before display. Replay lifecycle inspection was corrected in this sprint. |
| Session storage fallback | PASS | Storage APIs are SSR-safe and non-throwing. Source actions fall back to direct navigation when persistence fails. |
| Malformed context | PASS | Malformed JSON, invalid schema, malformed timestamps, and expired contexts return structured errors. |
| Explicit unavailable values | PASS | `null`, `MISSING`, `UNAVAILABLE`, `STALE`, and `UNKNOWN` remain explicit and are not converted into positive evidence. |

Trade previously treated the presence of validation and replay wrappers as `CURRENT`, regardless of their contained states. It now derives the inherited-context badge from the actual `LOADING`, `PARTIAL`, `MISSING`, `UNAVAILABLE`, or current values.

## 3. Ownership and Leakage Review

| Page | Prohibited creation | Result |
| --- | --- | --- |
| Dashboard | Opportunities, signals, thesis, market structure, validation, execution | PASS |
| Markets | Signals, thesis, Research evidence, validation, execution | PASS |
| Scanner | Thesis, evidence, validation, execution | PASS |
| Research | Validation, replay result, execution | PASS |
| Replay | Execution context | PASS |
| Trade | Upstream conclusion, structure, signal, thesis, evidence, or validation generation | PASS |

The audit found no product-context imports in API routes, no fetch calls inside handoff functions, and no fake, mock, synthetic, generated-thesis, generated-evidence, or generated-validation terms inside handoff construction.

## 4. Failure Mode Review

| Failure | Expected behavior | Result |
| --- | --- | --- |
| Missing `contextId` | Destination shows `MISSING`/unavailable inherited context and preserves direct-page behavior. | PASS |
| Missing `sessionStorage` | Source uses direct navigation; storage adapter returns `storage_unavailable` without throwing. | PASS |
| Expired context | Load or lifecycle inspection rejects it; destination shows `UNAVAILABLE`. | PASS |
| Invalid schema/version | Deserialization rejects it; destination shows `UNAVAILABLE`. | PASS |
| Malformed JSON | Deserialization returns `malformed_json`; destination remains usable. | PASS |
| Invalid timestamp/TTL | Schema or lifecycle inspection rejects it. | PASS |
| Stale revision | Lifecycle returns a `stale_write` conflict and preserves the newer revision. | PASS |
| Unavailable fields | Destination displays unavailable/partial state; no page invents replacement context. | PASS |

All destination failures are non-blocking and leave the page's existing APIs, data flow, and direct-navigation behavior intact.

## 5. Validation Audit

Created `workers/intelligence-tests/auditSharedProductContext.ts` as a standalone audit. No package script was added.

The audit verifies:

- all canonical helper source/destination pairs;
- schema version, revision, timestamps, and context identity;
- malformed JSON, incompatible version, expiration, invalid TTL, unavailable storage, explicit null preservation, and stale-write protection;
- page-level `contextId`, helper, loader, and lifecycle-inspection integration;
- ownership exclusions in each handoff function;
- absence of fetch calls and synthetic-content terms inside handoff functions;
- absence of product-context use in API routes.

Audit result: **PASS**, 30 checks passed, 0 failed.

## 6. Known Limitations

1. Context is safe per hop but not fully cumulative. Each transition creates a new revision-1 context ID, and inherited upstream fields are not comprehensively forwarded through every later handoff.
2. Lifecycle update and merge behavior is validated in the core audit but is not used by page transitions.
3. Research persists its Replay handoff through the validated storage adapter directly rather than registering it in the lifecycle manager's memory mirror.
4. Browser sessionStorage click-through is not automated by this audit. Storage behavior is structurally validated in Node; an interactive browser remains the final transport check.
5. Context is tab-scoped and is not shareable across browsers, devices, or copied URLs without the corresponding session storage entry.

These limitations do not permit data invention or ownership leakage. They limit continuity and transport depth only.

## 7. Final Decision

**PASS WITH KNOWN LIMITATIONS**

The complete page chain is integrated, schema-valid, non-blocking, and ownership-safe. The two objective destination-state defects found during review were corrected. The remaining limitations concern cumulative forwarding, lifecycle adoption across page transitions, and browser-level automation; they do not require product expansion or API changes in this sprint.

## 8. Validation Results

- Shared Product Context audit: PASS (30/30).
- TypeScript: PASS.
- Dashboard integration audit: PASS.
- Intelligence smoke test: PASS (10/10).
- Runtime API changes: none.
- Package changes: none.
- Build: not run, per `AGENTS.md`.
