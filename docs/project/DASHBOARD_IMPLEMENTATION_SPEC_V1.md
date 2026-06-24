# Dashboard Implementation Spec V1

Status: implementation-ready specification  
Scope: Dashboard V2 only  
Inputs: `DESIGN.md`, `DASHBOARD_MOCKUP_V2.md`, `DASHBOARD_VISUAL_MOCKUP_V1.md`, `PRODUCT_DIFFERENTIATION_V1.md`, `PAGE_RESPONSIBILITY_MATRIX.md`  
Non-goals: React implementation, runtime code changes, API changes, historical recomputation

Dashboard V2 is the product's decision-summary surface.

Owned question:

```text
What is happening right now?
```

Secondary question:

```text
Why is it happening, and what evidence supports it?
```

Required information hierarchy:

```text
Conclusion
-> Drivers
-> Evidence
-> Analytics
```

Dashboard V2 must remain lightweight. It must never become Research, Replay, Trade, Markets, Scanner, or Settings.

---

## 1. Component Tree

The following tree describes page structure and component responsibility. Names are descriptive, not required implementation names.

```text
DashboardV2Page
  DashboardShell
    DashboardTopBar
      InvestigationContextSummary
      DataHealthBadge
      LastUpdatedLabel

    DashboardPrimaryStack
      MarketDirectionHero
        DirectionBlock
        ConfidenceBlock
        RegimeHealthBlock

      TopDriversSection
        DriverCard[0]
        DriverCard[1]
        DriverCard[2]
        CollapsedDriverRow

      EvidencePreviewSection
        PrimaryEvidenceGrid
          EvidenceCard ETF
          EvidenceCard Reserve
          EvidenceCard Treasury
        SecondaryEvidenceGrid
          EvidenceCard OpenInterest
          EvidenceCard Liquidation
          EvidenceCard ExchangeFlow
          EvidenceCard Funding

      HistoricalEvidenceStrip

    DashboardSecondaryStack
      PredictionMarketsPanel
      TacticalAlertsPanel
      NarrativeHeatmapPanel
      DataHealthPanel
      DeepAnalyticsPanel
```

### DashboardShell

Responsibilities:

- owns page-level layout and spacing;
- provides the dark terminal canvas;
- keeps the first-read stack above analytics;
- avoids blocking render on secondary data.

### DashboardTopBar

Responsibilities:

- display symbol, exchange, and timeframe if available;
- display global data health;
- display last updated time;
- never show source secrets or raw internal paths.

### MarketDirectionHero

Responsibilities:

- answer the Dashboard primary question;
- make direction the dominant visual element;
- show confidence as secondary;
- show regime and health as tertiary;
- include one short conclusion line.

Required display priority:

1. `direction`
2. `confidence`
3. `regime`
4. `health`
5. `oneLineConclusion`

### TopDriversSection

Responsibilities:

- show exactly three primary drivers;
- visually rank drivers;
- expose impact score and quality state;
- collapse all remaining drivers.

Rules:

- never render more than three full driver cards above the fold;
- hidden drivers appear only in `CollapsedDriverRow`;
- missing or stale drivers must be labeled.

### EvidencePreviewSection

Responsibilities:

- show evidence supporting or weakening the top drivers;
- keep evidence compact;
- prevent evidence from becoming a metric wall.

Primary evidence:

- ETF
- Reserve
- Treasury

Secondary evidence:

- Open Interest
- Liquidation
- Exchange Flow
- Funding

### HistoricalEvidenceStrip

Responsibilities:

- show cache-backed historical evidence summary only;
- remain visually lightweight;
- link or hand off to Research when deeper historical review is needed.

Rules:

- do not restore the old Historical Analog card;
- do not call request-time historical analog generation;
- do not show full case tables.

### DashboardSecondaryStack

Responsibilities:

- contain dense analytics below the first-read layer;
- preserve existing useful lower-priority Dashboard content;
- never visually compete with MarketDirectionHero or TopDriversSection.

---

## 2. Data Requirements

Dashboard V2 consumes prepared intelligence and lightweight summaries. It does not generate intelligence.

### Market Direction Summary

Required fields:

```ts
type DashboardMarketDirection = {
  direction: "bullish" | "bearish" | "neutral" | "unknown";
  oneLineConclusion: string | null;
  confidence: number | null;
  regime: string | null;
  health: DashboardHealthStatus;
  generatedAt: string | null;
  observedAt?: string | null;
  source: string | null;
  unavailableReason?: string | null;
};
```

Rules:

- `confidence` may be `null`.
- `direction: "unknown"` is valid when evidence is insufficient.
- do not fabricate direction from missing data.
- `generatedAt` is not the same as `observedAt` when both exist.

### Driver Summary

Required fields:

```ts
type DashboardDriver = {
  id: string;
  rank: number;
  category:
    | "etf"
    | "reserve"
    | "treasury"
    | "funding"
    | "open_interest"
    | "liquidation"
    | "exchange_flow"
    | "historical_analog"
    | "event_impact"
    | "other";
  title: string;
  impactScore: number | null;
  quality: DashboardHealthStatus;
  observation: string | null;
  source: string | null;
  generatedAt: string | null;
  observedAt?: string | null;
  unavailableReason?: string | null;
};
```

Rules:

- sort by `rank`, then `impactScore` when rank is absent.
- render only top three full cards.
- drivers with `quality: "unavailable"` may appear only if they explain missing critical evidence.

### Evidence Summary

Required fields:

```ts
type DashboardEvidence = {
  id: string;
  evidenceType:
    | "etf"
    | "reserve"
    | "treasury"
    | "open_interest"
    | "liquidation"
    | "exchange_flow"
    | "funding"
    | "prediction_market"
    | "historical_evidence";
  title: string;
  topObservation: string | null;
  values?: Array<{ label: string; value: string }>;
  freshness: DashboardFreshnessStatus;
  coverage: DashboardCoverageStatus;
  source: string | null;
  generatedAt: string | null;
  observedAt?: string | null;
  unavailableReason?: string | null;
};
```

Rules:

- card displays one top observation by default.
- card may show up to three values.
- source and health must be visible.
- evidence must not imply prediction.

### Historical Evidence Summary

Required fields:

```ts
type DashboardHistoricalEvidence = {
  status: DashboardHealthStatus;
  similarCaseCount: number | null;
  averageReturn24h: number | null;
  winRate: number | null;
  dominantOutcome: string | null;
  source: string | null;
  generatedAt: string | null;
  schemaVersion?: string | null;
  unavailableReason?: string | null;
};
```

Rules:

- cache-backed only.
- if unavailable, render compact unavailable strip.
- no request-time rebuild.

### Health Types

```ts
type DashboardHealthStatus =
  | "current"
  | "partial"
  | "stale"
  | "missing"
  | "unavailable"
  | "loading"
  | "error";

type DashboardFreshnessStatus =
  | "valid"
  | "stale"
  | "expired"
  | "unknown";

type DashboardCoverageStatus =
  | "full"
  | "partial"
  | "unavailable"
  | "unknown";
```

---

## 3. API Dependencies

Dashboard V2 should use existing lightweight or cache-backed APIs. Endpoint names below describe expected dependencies; engineers should map them to existing routes where the implementation already provides equivalent data.

### Required Primary Dependencies

| Data | Source expectation | Blocking? |
|---|---|---|
| Market Driver summary | existing Market Driver Engine summary or deployable snapshot | No |
| Data Health summary | existing Data Health / deployable snapshot health | No |
| ETF evidence | existing deployable ETF snapshot or driver evidence | No |
| Reserve evidence | existing reserve / reserve intelligence snapshot | No |
| Treasury evidence | existing treasury snapshot | No |
| OI/Funding evidence | existing dashboard-safe futures evidence or deployable snapshot | No |
| Liquidation evidence | existing liquidation evidence snapshot | No |
| Prediction markets | existing dashboard prediction markets summary | No |
| Tactical alerts | existing dashboard tactical alerts | No |

### Cache-Only Historical Dependency

| Data | Source expectation | Blocking? |
|---|---|---|
| Historical evidence strip | existing cache-only Historical Analog V2 summary | No |

Rules:

- do not call `/api/dashboard/historical-analog` for request-time generation.
- do not call `/api/historical-analog` from Dashboard.
- do not scan raw historical datasets from Dashboard.
- do not start replay/orderbook work from Dashboard.

### Optional Secondary Dependencies

| Data | Behavior |
|---|---|
| Narrative Heatmap | deferred, independent request, never resets Market Direction |
| Macro / sector / ETF flow detail | deferred or below-fold only |
| Operations/run status | only summary health, no raw operations console |

### Fetch Rules

- Page shell renders immediately.
- Primary summary requests should have short client-side timeouts.
- Slow or optional requests should be independent from Market Direction state.
- Abort active requests on Dashboard unmount.
- Ignore abort errors silently.
- Never show `NO DATA` while a request is still pending.

---

## 4. State Model

Dashboard V2 should keep independent state slices so slow secondary requests cannot overwrite primary intelligence.

```ts
type DashboardV2State = {
  context: DashboardContextState;
  marketDirection: AsyncState<DashboardMarketDirection>;
  drivers: AsyncState<DashboardDriver[]>;
  evidence: AsyncState<DashboardEvidence[]>;
  historicalEvidence: AsyncState<DashboardHistoricalEvidence>;
  predictionMarkets: AsyncState<unknown>;
  tacticalAlerts: AsyncState<unknown>;
  narrativeHeatmap: AsyncState<unknown>;
  dataHealth: AsyncState<unknown>;
};

type AsyncState<T> = {
  status: "idle" | "loading" | "ready" | "empty" | "unavailable" | "error";
  data: T | null;
  reason?: string | null;
  updatedAt?: string | null;
};
```

### Context State

```ts
type DashboardContextState = {
  symbol: string;
  exchange: string;
  timeframe: string;
  investigationTimestamp?: string | null;
};
```

Rules:

- Dashboard can update shared investigation context when symbol/timeframe changes.
- Dashboard must not override explicit Research or Replay case context.
- Use public term `timeframe`, not mixed `interval` naming in UI-facing state.

### Derived View Model

Implementation should derive a render-ready model:

```ts
type DashboardV2ViewModel = {
  directionHero: DashboardMarketDirection;
  visibleDrivers: DashboardDriver[];
  collapsedDrivers: DashboardDriver[];
  primaryEvidence: DashboardEvidence[];
  secondaryEvidence: DashboardEvidence[];
  historicalStrip: DashboardHistoricalEvidence;
};
```

Rules:

- `visibleDrivers.length <= 3`.
- `primaryEvidence` prioritizes ETF, Reserve, Treasury.
- `secondaryEvidence` prioritizes OI, Liquidation, Exchange Flow, Funding.
- evidence sorting must not make lower-tier evidence overpower higher-tier evidence in placement.

---

## 5. Loading States

Loading states must preserve responsiveness and avoid false missing-data impressions.

### Page Shell Loading

Render immediately:

- top bar skeleton;
- empty hero frame;
- driver skeleton row;
- evidence skeleton cards;
- below-fold analytics placeholders.

Do not block page shell on any API.

### Market Direction Loading

Show:

```text
LOADING
Market direction loading
```

Rules:

- do not show `NO DATA`;
- do not show previous symbol's direction unless explicitly marked stale/cached;
- if stale cached data is used, label `STALE`.

### Drivers Loading

Show three compact driver skeleton cards.

Rules:

- preserve layout height;
- do not reorder page when drivers arrive;
- do not show more than three skeleton driver cards.

### Evidence Loading

Show evidence cards with:

```text
LOADING
Evidence loading
```

Rules:

- each evidence card may load independently;
- missing ETF should not hide Reserve or Treasury if available;
- secondary evidence loading must not block primary evidence.

### Historical Evidence Loading

Prefer no heavy loading animation.

If cache summary request is pending:

```text
Historical Context
Loading cached summary
```

If this would cause visual noise, render a compact placeholder strip.

---

## 6. Missing States

Missing states are expected product states, not visual failures.

Use these labels exactly in user-facing UI:

- `CURRENT`
- `PARTIAL`
- `STALE`
- `MISSING`
- `UNAVAILABLE`

### Market Direction Missing

When direction cannot be derived:

```text
UNKNOWN
Reason: Market direction evidence unavailable.
```

Rules:

- do not default to neutral unless data explicitly supports neutral.
- do not fabricate confidence.

### Driver Missing

If no drivers exist:

```text
DRIVERS UNAVAILABLE
Reason: No driver evidence available for selected market.
```

If fewer than three drivers exist:

- render available drivers;
- render compact missing driver placeholder only if needed to preserve layout;
- never fabricate additional drivers.

### Evidence Missing

Card-level examples:

```text
ETF
UNAVAILABLE
Reason: ETF evidence unavailable.
```

```text
Treasury
PARTIAL
Reason: Some treasury records lack freshness timestamp.
```

Rules:

- missing high-priority evidence should remain visible;
- missing low-priority evidence may be collapsed below fold;
- reason should be user-meaningful, not implementation-language.

### Historical Evidence Missing

Use:

```text
Historical Evidence Unavailable
Reason: cache not generated
```

Do not use:

```text
NO VERIFIED MEMORY
NO VERIFIED REPLAY CASE
VERIFYING HISTORY
```

---

## 7. Error States

Errors should be scoped to the failed section.

### Request Failure

Display:

```text
UNAVAILABLE
Reason: <human-readable source failure>
```

Examples:

- `Market driver summary unavailable.`
- `ETF evidence unavailable.`
- `Narrative heatmap unavailable.`

Rules:

- no global crash for one failed section;
- no toast for abort errors;
- no infinite loading;
- no stack traces in UI.

### Timeout

Display:

```text
STALE
Reason: Request timed out; showing last available evidence.
```

or:

```text
UNAVAILABLE
Reason: Request timed out.
```

Rules:

- if showing stale data, stale label must be visible;
- timeout in below-fold analytics must not alter Market Direction.

### Invalid Payload

Display:

```text
UNAVAILABLE
Reason: Evidence payload invalid.
```

Log diagnostics only where existing logging patterns allow.

---

## 8. Mobile Behavior

Target viewport: `360px` to `430px`.

First viewport order:

```text
Top Context Bar
Market Direction Hero
Top 3 Drivers
```

Continuation order:

```text
Evidence Preview
Historical Evidence
Analytics collapsed
```

### Mobile Hero

Rules:

- direction appears before confidence;
- no chart above direction;
- conclusion line may wrap to two lines;
- health badge remains visible.

Recommended type:

- direction: `32-40px`;
- confidence: `22-26px`;
- driver title: `14-15px`;
- metadata: `10px`.

### Mobile Drivers

Rules:

- render three ranked row cards;
- no side-by-side driver cards;
- collapsed drivers appear as one compact row;
- rank remains visible.

### Mobile Evidence

Rules:

- show top three evidence rows first;
- default rows: ETF, Reserve, Treasury when available;
- secondary evidence behind `Show all evidence`;
- analytics collapsed by default.

### Mobile Accessibility

Rules:

- touch targets at least `36px` high for interactive rows;
- health state visible as text;
- no hover-only meaning.

---

## 9. Tablet Behavior

Target viewport: `768px` to `1024px`.

Order:

```text
Top Context Bar
Market Direction Hero
Top Drivers
Evidence Preview
Historical Evidence
Analytics Stack
```

### Tablet Layout

Rules:

- hero remains full width;
- drivers use two columns plus one spanning or stacked card;
- evidence uses two columns;
- analytics stack below evidence;
- historical strip remains compact.

Recommended type:

- direction: `44-56px`;
- confidence: `24-30px`;
- driver title: `14-16px`;
- metadata: `10px`.

---

## 10. Accessibility

Dashboard V2 must be usable without relying on color alone.

### Semantic Structure

Requirements:

- page has one `h1` representing Market Direction or Dashboard title;
- major sections use ordered headings:
  - Market Direction
  - Why Market Is Moving
  - Supporting Evidence
  - Historical Context
  - Analytics
- driver cards expose rank in text;
- evidence cards expose health in text.

### Color And Contrast

Rules:

- green/red direction must include text labels;
- health states must include words such as `CURRENT`, `PARTIAL`, `STALE`;
- muted metadata must remain readable on dark green backgrounds.

### Keyboard And Screen Reader

Rules:

- collapsed driver row is keyboard-focusable if interactive;
- evidence reveal controls are keyboard-focusable;
- section-level unavailable states are announced as status text;
- no critical content exists only in tooltip or hover.

### Motion

Rules:

- avoid animated loading loops that imply indefinite loading;
- respect reduced motion preferences if animation is introduced.

---

## 11. Dashboard V1 To V2 Migration Plan

Migration should be incremental and reversible.

### Phase 1: Inventory Existing Dashboard Data

Tasks:

- identify existing Dashboard API calls;
- classify each as primary, secondary, deferred, or removed;
- verify no Dashboard historical analog runtime calls remain;
- identify existing components that can be reused as panels.

Output:

- dependency map;
- list of removable duplicate widgets;
- loading/error state inventory.

### Phase 2: Create View Model Adapter

Tasks:

- map existing Market Driver output into `DashboardMarketDirection`;
- map driver outputs into `DashboardDriver[]`;
- map ETF/reserve/treasury/OI/liquidation/funding evidence into `DashboardEvidence[]`;
- map cache-only historical summary into `DashboardHistoricalEvidence`.

Rules:

- adapter should not fetch data;
- adapter should not compute historical outcomes;
- adapter should not fabricate missing fields.

### Phase 3: Build V2 Layout Behind Existing Route

Tasks:

- preserve current route path;
- replace first viewport ordering;
- put analytics below first-read stack;
- preserve existing working lower-priority panels when safe.

Rules:

- keep Dashboard lightweight;
- no Research workflow in Dashboard;
- no Replay controls.

### Phase 4: Migrate States

Tasks:

- implement section-scoped loading states;
- implement missing states;
- implement unavailable reasons;
- ensure slow secondary panels do not overwrite hero/driver/evidence state.

### Phase 5: Responsive Pass

Tasks:

- implement mobile stack order;
- implement tablet driver/evidence grid;
- verify no overlapping text;
- verify first viewport answers the primary question.

### Phase 6: Acceptance Review

Tasks:

- run TypeScript validation;
- run relevant Dashboard audit if available;
- manually verify first-read hierarchy;
- verify historical runtime calls are not reintroduced.

Do not run `npm run build` unless explicitly requested outside normal AGENTS rules.

---

## 12. Acceptance Criteria

Dashboard V2 is accepted when all criteria below pass.

### Product Ownership

- Dashboard answers: `What is happening right now?`
- Dashboard does not become Research, Replay, Trade, Markets, Scanner, or Settings.
- Deep historical workflows are not restored.

### Visual Hierarchy

- Market Direction appears before analytics.
- Top Drivers appear before Evidence.
- Evidence appears before raw data.
- Analytics are below the first-read layer.
- Direction is the dominant visual element.

### Driver Behavior

- exactly three full driver cards are visible by default;
- remaining drivers collapse into one compact row;
- drivers are ranked;
- driver health state is visible.

### Evidence Behavior

- ETF, Reserve, and Treasury are prioritized when available;
- OI, Liquidation, Exchange Flow, and Funding are secondary;
- each evidence card shows source or health;
- missing high-priority evidence shows a reason;
- evidence never becomes a wall above the fold.

### Historical Evidence

- Historical Evidence is a strip, not a large card;
- it reads cache-only summary data;
- it does not call request-time historical analog routes;
- cache miss shows concise unavailable state.

### State Handling

- no `NO DATA` while loading;
- stale evidence is labeled `STALE`;
- partial evidence is labeled `PARTIAL`;
- unavailable evidence includes a user-meaningful reason;
- section errors do not crash the page.

### Responsiveness

- page shell renders immediately;
- slow secondary requests do not block the hero;
- aborts on unmount are ignored silently;
- mobile and tablet maintain the same information hierarchy.

### Accessibility

- rank, state, and direction are conveyed by text;
- interactive disclosure controls are keyboard-accessible;
- no critical information is hover-only;
- headings follow logical section order.

### Validation

Required validation:

```bash
npx.cmd tsc --noEmit --pretty false --incremental false
```

Manual validation:

1. A new user can answer within five seconds: what is happening?
2. A new user can identify the top three drivers.
3. A new user can identify the primary evidence sources.
4. Dashboard remains responsive during slow secondary requests.
5. Dashboard makes zero runtime calls to historical analog generation APIs.

