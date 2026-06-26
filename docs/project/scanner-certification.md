# Scanner Certification

Status: Sprint S5 certification  
Scope: Scanner V2 after Sprint S4 hierarchy restructure  
Runtime impact: none

## 1. Certification Inputs

Reviewed documents:

- `docs/project/scanner-constitution.md`
- `docs/project/scanner-information-architecture.md`
- `docs/project/scanner-gap-analysis.md`
- `docs/project/dashboard-v2-state.md`
- `docs/project/markets-v2-state.md`
- `docs/project/dashboard-design-system.md`
- `docs/project/design-token-registry.md`

Inspected implementation:

- `components/scanner/ScannerPage.tsx`

Validation commands:

- `npx.cmd tsc --noEmit --pretty false --incremental false`
- `npm run audit:dashboard-integration`
- `npm run test:intelligence`

## 2. Hierarchy Certification

Decision: PASS

Approved order:

```text
Scanner Summary
  -> Priority Opportunities
  -> Signal Feed
  -> Opportunity Filters
  -> Watchlist Candidates
  -> Supporting Context
  -> Navigation Actions
```

Implementation evidence:

| Section | Status | Evidence |
| --- | --- | --- |
| Scanner Summary | Present | `Scanner Summary` is the first rendered card and exposes scan scope, source, freshness, and health. |
| Priority Opportunities | Present | `Priority Opportunities` follows Scanner Summary and shows the top three existing candidates. |
| Signal Feed | Present | `Signal Feed` follows Priority Opportunities and displays additional ranked candidates. |
| Opportunity Filters | Present with limitation | `Opportunity Filters` displays category readiness using existing signal groups, but filters are non-interactive. |
| Watchlist Candidates | Present | `Watchlist Candidates` reframes existing active setup memory as monitor-next candidates. |
| Supporting Context | Present | `Supporting Context` contains Market Breadth and highest-confidence context below signal-priority sections. |
| Navigation Actions | Present | `Navigation Actions` offers handoffs from the highest-priority available signal. |

Certification notes:

- Priority Opportunities appears before Supporting Context.
- Ranking appears before dense context.
- The page now follows the Scanner V2 attention-triage sequence.

## 3. Design System Certification

Decision: PASS

Reviewed areas:

- typography;
- spacing;
- colors;
- surfaces;
- badges and status;
- visual hierarchy;
- consistency with Dashboard and Markets.

Findings:

- Typography uses compact uppercase terminal styling consistent with the Dashboard and Markets design language.
- The page uses dark green-black surfaces, amber hierarchy accents, cyan metadata, and muted terminal text colors.
- Surface levels are now more differentiated:
  - Scanner Summary uses a header-level surface.
  - Priority Opportunities uses the strongest Scanner-specific surface.
  - Signal Feed uses a primary surface.
  - Opportunity Filters and Watchlist Candidates use secondary surfaces.
  - Supporting Context and Navigation Actions use lower-priority support surfaces.
- Badges use text plus color and cover current, loading, unavailable, missing, stale-like, and intermediate states.
- Visual hierarchy is aligned with Scanner's purpose and does not copy the Dashboard hero or Markets dense layout.

Limitations:

- Token usage is implemented locally in `ScannerPage.tsx` rather than through a shared token module.
- Some statuses still originate from existing market mover vocabulary such as `FRESH`, `DEVELOPING`, `MATURE`, `LATE`, `AGING`, and lifecycle labels. These are mapped visually, but not fully normalized into canonical badge labels.
- Responsive behavior has not yet received a dedicated Scanner certification sprint.

## 4. Boundary Certification

Decision: PASS

Scanner owns:

- opportunity prioritization;
- signal visibility;
- ranking;
- filtering.

Boundary review:

| Boundary | Status | Notes |
| --- | --- | --- |
| Dashboard | PASS | Scanner does not present market-wide conclusion, market direction hero, or Dashboard-style first-read conclusion. |
| Markets | PASS | Scanner surfaces candidates and routes to Markets for live structure validation. Supporting Context remains secondary. |
| Research | PASS | Scanner adds handoff affordance but does not embed narratives or research workflow. |
| Replay | PASS | Scanner adds handoff affordance but does not perform replay validation or load replay data. |
| Trade | PASS with limitation | Scanner routes to Trade and still displays existing RR text in rows. It does not expose entries, stops, take profits, sizing, or execution logic. |

Certification notes:

- Scanner remains an attention-triage page.
- It does not absorb Dashboard, Markets, Research, Replay, or Trade responsibilities.
- Navigation handoffs are present and allowed by the Scanner constitution.

## 5. Implementation Certification

Decision: PASS

Verification:

| Requirement | Status | Evidence |
| --- | --- | --- |
| Existing APIs reused | PASS | Scanner still uses `useMarketMovers(true)` and `useSafePolling("/api/scanner/opportunities", 45000, ...)`. |
| No synthetic intelligence | PASS | No mock data or fabricated values were introduced. Empty and unavailable states remain explicit. |
| No scoring changes | PASS | Scoring remains in existing data paths; `ScannerPage.tsx` only derives display slices from existing candidates. |
| No polling changes | PASS | Existing market mover polling and scanner opportunity polling intervals remain unchanged. |
| No websocket changes | PASS | `ScannerPage.tsx` does not modify websocket behavior; websocket fallback remains in `useMarketMovers`. |
| No new data request paths | PASS | No new fetch hooks or API calls were added in `ScannerPage.tsx`. |
| Dashboard untouched | PASS | Certification found no Dashboard runtime change requirement. |
| Markets untouched | PASS | Certification found no Markets runtime change requirement. |
| Package untouched | PASS | No package changes are required. |

Implementation notes:

- S4 added presentation helpers and navigation href builders inside `ScannerPage.tsx`.
- These are presentation and handoff changes, not new data APIs.
- The known duplicate market-mover fetch path remains intentionally unresolved.

## 6. Known Limitations

Do not fix these in unrelated work.

### Duplicate Market-Mover Fetch

Current behavior:

- `ScannerPage.tsx` fetches market movers through `useMarketMovers`.
- `/api/scanner/opportunities` also fetches `/api/market/movers`.

Disposition:

- accepted limitation for certification;
- future optimization should consolidate data flow without changing ranking behavior.

### Non-Interactive Filters

Current behavior:

- `Opportunity Filters` displays category readiness from existing signal groups.
- It does not yet filter the signal feed interactively.

Disposition:

- accepted limitation for certification;
- future Scanner filter sprint may add interaction if it avoids URL churn and synthetic data.

### Existing Dependency Limitations

Current dependencies:

- `/api/market/movers`;
- `/api/scanner/opportunities`;
- Binance ticker availability and websocket fallback;
- local active setup memory;
- internal narrative, sector rotation, and futures intelligence calls inside the Scanner opportunities API.

Disposition:

- accepted limitation for certification;
- failure must continue to degrade gracefully.

### Badge Vocabulary Normalization

Current behavior:

- Scanner visual badges support approved state styles.
- Some source labels remain from existing market mover and setup lifecycle vocabulary.

Disposition:

- accepted limitation for certification;
- future badge normalization should be scoped and must not change data semantics.

### Trade Handoff Sensitivity

Current behavior:

- Scanner includes Trade handoffs and displays existing RR text.
- It does not expose entries, stops, take-profit levels, sizing, or execution plans.

Disposition:

- accepted limitation for certification;
- future work should keep Trade execution details inside Trade.

### Responsive Certification Pending

Current behavior:

- Responsive classes exist and sections stack naturally.
- Scanner has not yet received a dedicated desktop, tablet, and mobile certification sprint.

Disposition:

- accepted limitation for certification;
- recommend a future Scanner responsive certification sprint before freeze.

## 7. Certification Decision

Decision:

```text
CERTIFIED WITH LIMITATIONS
```

Justification:

Scanner V2 now satisfies the approved constitutional purpose and information architecture. It presents attention-first priority opportunities, preserves existing intelligence and request behavior, uses the shared QuantTerminal visual language, and maintains page boundaries.

Certification is limited because filters remain non-interactive, duplicate market-mover fetches remain unresolved by design, badge vocabulary is visually mapped but not fully canonicalized, and responsive certification has not yet been completed.

## 8. Recommended Next Step

Proceed to Scanner acceptance review or responsive certification before freeze.

Do not add new intelligence, new APIs, scoring changes, URL state, or execution details in the next sprint.

