# QuantTerminal Execution Roadmap

Status: Canonical execution plan  
Baseline: v0.8 Intelligence Foundation  
Planning horizon: Next 10 implementation sprints and subsequent platform phases  
Last updated: 2026-06-20

## Purpose

This roadmap converts the existing QuantTerminal architecture and product strategy into an ordered implementation sequence.

It is subordinate to the architectural boundaries defined in:

- `intelligence-platform-master-plan.md`
- `research-renaissance-plan.md`
- `shared-investigation-context-plan.md`
- `event-impact-engine-plan.md`
- `market-memory-engine-plan.md`

The roadmap does not redefine those systems. It states what should be implemented next, which dependencies must be satisfied first, and which work must remain deferred.

The governing sequence is:

```text
Stabilize Existing Product
  -> Preserve Investigation Context
  -> Integrate Existing Intelligence into Research
  -> Establish Verified Event Evidence
  -> Build Event Impact
  -> Build Market Memory
  -> Adopt Intelligence Artifacts
  -> Automate Proven Builders
  -> Add Analytical Storage Only When Required
```

## 1. Current Baseline

QuantTerminal v0.8 has a meaningful intelligence foundation. The architecture is no longer blocked on missing abstractions. The present challenge is product cohesion, reliable data coverage, and operationalization.

### Cache Foundation

Completed capabilities:

- Generic cache identity using namespace, dataset id, and partitions.
- Immutable payload publication.
- Atomic manifest publication.
- Independent manifest and dataset schema versions.
- Generation states such as pending, generating, complete, partial, and failed.
- Read states for missing, corrupted, expired, version mismatch, partial, failed, and ready.
- Generic ingestion job contracts.

Current limitation:

- Generation is largely manual.
- File caches are local and not centrally indexed.
- Coverage and freshness are not yet operationally monitored.

### Canonical Market Data Cache

Completed capabilities:

- Canonical contracts for OHLCV, funding, open interest, liquidations, and orderbook summaries.
- Shared readers that hide provider-specific formats.
- Real Binance Vision-compatible OHLCV builder.
- Explicit source hierarchy:
  - Binance Vision and Binance historical APIs as primary long-coverage sources.
  - CryptoHFTData as enrichment.

Current limitation:

- OHLCV is the most mature canonical dataset.
- Funding, OI, liquidation, and orderbook-summary coverage remain uneven or manual.
- No authoritative coverage inventory currently drives product availability.

### Historical Analog V2

Completed capabilities:

- Versioned market-state model.
- Deterministic feature generation.
- Exact forward outcomes at 1h, 4h, 24h, and 7d.
- Deterministic similarity scoring and tie-breaking.
- Aggregate outcome statistics.
- Cache-only consumption routes.
- Explicit availability diagnostics.

Current limitation:

- Builds are manual.
- Coverage is usually one symbol and interval per build.
- Funding and OI enrichment depend on available aligned data.
- Consumer response shapes remain partly page-specific.

### Replay Orderbook Cache Pipeline

Completed capabilities:

- Verified CryptoHFTData download and decode path.
- Correct CommonOrderbookEvent snapshot/update semantics.
- Manual reconstruction outside request paths.
- Replay-ready cached orderbook summaries.
- Cache-only Replay consumption.
- Graceful cache-miss behavior.

Current limitation:

- Cache coverage is sparse and manually generated.
- Local generation is expensive.
- Replay must continue treating orderbook as optional evidence.

### Historical Intelligence Explorer

Completed capabilities:

- Current market-state view.
- Ranked analog case exploration.
- Similarity score and comparable-feature visibility.
- Multi-horizon outcome summary.
- Selected case detail.
- Transparent match reasons.
- Cache-only unavailable behavior.

Current limitation:

- It initializes independently from upstream product context.
- Its workflow overlaps with the simpler Research historical panels.
- Verified Replay coordinates are not consistently available.

### Dashboard Historical Evidence

Completed capabilities:

- Compact cache-only evidence strip.
- Similar case count.
- 24h average return.
- Win rate.
- Dominant outcome.
- Source and generated time.

Current limitation:

- Dashboard source loading has experienced regressions where pending data appeared as false no-data.
- Historical evidence terminology must remain clearly distinct from the removed heavy Historical Analog workflow.
- Dashboard should never become the deep historical workspace.

### Intelligence Artifact Registry

Completed capabilities:

- Versioned artifact contract.
- Artifact types for Historical Analog, Replay Intelligence, Dashboard Evidence, Event Impact, and Market Memory.
- Confidence, freshness, provenance, supporting evidence, tags, and subjects.
- Registry and unified reader interfaces.
- Deterministic search behavior.

Current limitation:

- The registry is an in-memory reference implementation.
- Existing producers do not broadly publish durable artifacts.
- Product consumers still read producer-specific APIs and caches.

### Product Baseline

Dashboard, Markets, Scanner, Trade, Research, Replay, and Historical Intelligence are available as distinct surfaces.

The largest product gap is continuity:

- Dashboard can focus on one symbol.
- Research can default to another.
- Historical Intelligence can load a third independent context.
- Replay can open a default window unrelated to the selected case.

The largest intelligence gap is not another foundation. It is converting existing intelligence into one reliable investigation workflow.

## 2. Guiding Principle

### Primary Rule

Do not build new foundations unless a product workflow requires them.

QuantTerminal already has:

- cache contracts;
- canonical data contracts;
- historical state and outcome models;
- Replay cache patterns;
- artifact contracts;
- investigation and Research strategy.

The next work should prove product value using these foundations.

### Execution Priorities

1. Reliability before breadth.
2. Product cohesion before new intelligence engines.
3. Verified evidence before synthesis.
4. Manual, deterministic workflows before automation.
5. Coverage before storage optimization.
6. Existing contracts before new abstractions.

### Product Rule

Every implementation sprint should improve one of:

- data correctness;
- investigation continuity;
- evidence transparency;
- decision quality;
- responsiveness;
- operational reliability.

A sprint that only adds panels, metrics, or architectural layers should not proceed.

### Historical Rule

Historical computation remains:

```text
Ingest
  -> Process
  -> Cache
  -> Render
```

Never:

```text
Request
  -> Download
  -> Compute
  -> Render
```

## 3. Phase 1 - Product Stabilization

### Goal

Make existing intelligence reliable before expanding its scope.

### Scope

#### Dashboard Regression Hardening

- Verify independent state ownership for narratives, prediction markets, futures intelligence, evidence, ETF flow, macro data, and other optional sources.
- Prevent one request from resetting or overwriting another source.
- Abort requests on unmount.
- Bound client timeouts.
- Preserve last valid data where the existing product contract permits it.
- Verify that optional failures do not block first content.

#### Loading, Empty, and Unavailable Separation

Every affected panel must distinguish:

- not requested;
- loading;
- ready;
- successful but empty;
- unavailable;
- timed out;
- stale cached data where supported.

`NO DATA` must never mean "the request has not completed."

#### Vercel Environment Verification

Verify production behavior for:

- file-cache availability;
- environment variables;
- runtime selection;
- route timeouts;
- local filesystem assumptions;
- external provider access;
- cache paths and deployment persistence;
- client/server differences.

The objective is not to add infrastructure. It is to identify which existing local assumptions do not hold in Vercel.

#### Top Liquidations Diagnostics

Verify:

- selected symbol;
- exchange;
- requested date/hour;
- response status;
- decoded liquidation count;
- notional calculation;
- side normalization;
- empty versus unavailable behavior;
- timeout and abort behavior.

Diagnostics should explain real failure conditions without exposing secrets or overwhelming the default UI.

#### Narrative Heatmap Stability

- Fetch independently from unrelated Dashboard requests.
- Parse the current narrative response contract.
- Prevent pending states from rendering false no-data.
- Preserve Research behavior.
- Verify initial mount and navigation-return behavior.

#### Cache Miss Clarity

Cache-backed consumers must expose meaningful distinctions:

- cache not generated;
- cache expired;
- cache corrupted;
- schema incompatible;
- generation incomplete;
- generation failed;
- valid cache with no matching cases.

### Success Criteria

- Dashboard never shows false `NO DATA` when valid data exists.
- Dashboard reaches useful content without waiting for optional historical or enrichment sources.
- Returning to Dashboard does not create permanent loading states.
- Vercel-specific limitations are documented and reproducible.
- Top Liquidations either renders real rows or a precise unavailable reason.
- Cache misses do not trigger hidden computation.
- No mock intelligence enters production product paths.

### Exit Gate

Do not begin cross-page workflow changes until the current product has stable data states and production assumptions are understood.

## 4. Phase 2 - Shared Investigation Context

### Goal

Prevent Dashboard, Research, Historical Intelligence, and Replay from operating on different symbols, exchanges, timeframes, and timestamps.

### Scope

#### Public Context Vocabulary

Standardize:

- `symbol`
- `exchange`
- `timeframe`
- `investigation`
- `timestamp`
- `case`
- `caseTimestamp`
- `event`
- `eventTimestamp`
- `source`

Replay retains exact:

- `date`
- `hour`

#### Identity Conventions

- Symbols are normalized and explicit.
- Exchange plus symbol defines venue-specific market identity.
- Timeframe describes analytical state, not Replay chart resolution.
- Timestamps remain UTC.
- Defaults apply only when an explicit value is absent.
- `interval` is accepted during migration, while new links use canonical `timeframe`.

#### Dashboard to Research Handoff

Dashboard passes:

- active symbol;
- exchange when known;
- timeframe;
- state timestamp;
- source;
- relevant setup context.

Dashboard does not load historical systems to construct the handoff.

#### Historical Case Selection Context

Historical Intelligence preserves:

- original current-state context;
- selected case reference;
- case symbol;
- case timestamp;
- analytical timeframe;
- producer/source;
- verified Replay coordinates when available.

#### Replay Exact-Window Inheritance

Replay:

- accepts explicit exchange, symbol, date, and hour;
- never replaces explicit case coordinates with defaults;
- preserves analytical timeframe as provenance;
- retains manual loading behavior;
- provides a context-preserving return path.

### Success Criteria

- A user can move from Dashboard to Research to Historical Intelligence to Replay without manually re-entering symbol or timeframe.
- Explicit context always outranks page defaults.
- Selecting a historical case opens the exact case window when verified coordinates exist.
- Incomplete case coordinates disable Replay rather than opening an unrelated window.
- No global context store or new backend context service is introduced.

### Exit Gate

Research integration should not proceed until one investigation identity can survive the complete navigation path.

## 5. Phase 3 - Research Integration

### Goal

Turn Research into a continuous investigation workflow using existing intelligence.

### Scope

#### Integrate Historical Intelligence Explorer

Reuse the Explorer's established product model:

- current market state;
- ranked analogs;
- similarity;
- comparable features;
- selected case;
- multi-horizon outcomes;
- match reasons.

Avoid creating a third Historical Analog presentation.

#### Investigation Flow

Research should follow:

```text
Current State
  -> Narrative and Information Context
  -> Historical Analogs
  -> Selected Case
  -> Outcome Analysis
  -> Supporting and Contradicting Evidence
  -> Confidence and Limitations
```

#### Evidence and Confidence

- Group evidence by role and source.
- Expose contradictions and missing evidence.
- Show sample size and outcome coverage.
- Explain confidence using existing facts.
- Do not invent a composite confidence score before calibration exists.

#### Provenance and Freshness

For historical conclusions, show:

- source;
- generated time;
- schema or producer version where relevant;
- current-state timestamp;
- evidence coverage;
- cache status.

#### Manual Historical Loading

- Historical Analog remains manual-load or cache-read only.
- Market Memory remains disabled or explicitly prototype-only until V1 exists.
- Live narratives, prediction markets, and information flow remain independently useful.

### Success Criteria

- Research becomes the primary place to understand why a market state matters.
- One shared investigation context drives all sections.
- A user can inspect current state, similar cases, outcomes, reasons, and limitations without manually joining unrelated panels.
- Research remains useful when historical cache is unavailable.
- No historical computation or automatic heavy polling occurs.

### Exit Gate

Do not build Event Impact until Research can already present state evidence coherently.

## 6. Phase 4 - Verified Event Catalog

### Goal

Create the minimum real event dataset required for Event Impact.

### Scope

#### Event Taxonomy

Begin with a narrow accepted set:

- Macro
- ETF
- Regulation
- Exchange
- Stablecoin
- Liquidation Cascade
- Funding Extreme
- OI Expansion
- Narrative Shift

Not every category must ship in V1. Select only those with reliable sources and sufficient coverage.

#### Event Identity

Each event requires:

- stable public event id;
- primary category;
- subtype;
- verified timestamp;
- source;
- source reference;
- affected symbol or market scope;
- exchange when relevant;
- structured attributes;
- verification state.

#### Manual Seed Catalog

The first catalog should be small, manually reviewed, and real.

Recommended starting scope:

- one externally verified category such as a scheduled macro or ETF event;
- one deterministic market-derived category such as Liquidation Cascade or Funding Extreme.

#### Evidence and Provenance

- Preserve authoritative source.
- Distinguish scheduled time, publication time, and detection time.
- Define duplicate rules.
- Record missing attributes explicitly.
- Keep current mock event repositories separate from production data.

### Success Criteria

- Event Impact consumes verified events rather than inferred narratives or mock records.
- Every production event has a real source and UTC timestamp.
- Duplicate handling is reproducible.
- Symbol and market scope are explicit.
- No impact or causal claim is made merely because an event was cataloged.

### Exit Gate

Event Impact V1 cannot begin until at least one event category has enough verified cases and canonical outcome coverage.

## 7. Phase 5 - Event Impact V1

### Goal

Answer what typically happened after verified events.

### Scope

#### Event Outcome Windows

Required:

- 1h;
- 4h;
- 24h;
- 7d.

Optional future 15m support may be included only when canonical data resolution and coverage are sufficient.

#### Outcome Metrics

Required:

- price return;
- usable case count;
- positive/negative rate;
- average;
- median;
- best and worst case.

When available:

- volume reaction;
- OI reaction;
- funding reaction;
- liquidation activity;
- maximum favorable and adverse movement.

#### Comparable Events

Compare using:

- event category and subtype;
- structured event attributes;
- affected market scope;
- pre-event market state;
- compatible outcome coverage;
- confounders.

Historical Analog may supply state compatibility. Event Impact owns event compatibility.

#### Evidence and Attribution

Use graded language:

- observed after;
- associated with;
- likely contributed;
- causal only under exceptional evidence.

Expose:

- supporting evidence;
- contradicting evidence;
- confounders;
- missing coverage;
- source quality;
- confidence reasons and limitations.

#### Research Integration

Research should present:

- selected verified event;
- pre-event state;
- observed reaction;
- comparable events;
- outcome statistics;
- Replay validation action;
- confidence.

### Success Criteria

- Research can explain both similar states and similar verified events.
- Event outcomes are deterministic and prepared outside requests.
- Incomplete windows remain unavailable rather than zero.
- Low sample counts are visible.
- Replay can inspect exact event windows.
- No LLM-generated causal explanation is presented as evidence.

### Exit Gate

Do not start Event Memory or broad Market Memory synthesis until Event Impact evidence is stable and inspectable.

## 8. Phase 6 - Market Memory V1

### Goal

Synthesize recurring lessons from states, events, and outcomes.

### Scope

#### Narrow Memory Catalog

Start with:

- one Regime Memory using Historical Analog V2 states and outcomes;
- one Structural Memory using real funding/OI/liquidation evidence;
- one Event Memory only after Event Impact V1 is production-ready.

#### Deterministic Retrieval

Use Shared Investigation Context:

- symbol;
- exchange;
- timeframe;
- current state;
- selected event;
- selected case.

Explain why a memory was retrieved.

#### Supporting and Contradicting Evidence

Each memory requires:

- supporting cases;
- contradicting cases;
- representative case;
- failure conditions;
- sample size;
- outcome distribution;
- scope;
- freshness;
- provenance.

#### Failure Memory

Failure conditions should be part of each mature memory.

Examples:

- pattern failed under extreme funding;
- event effect weakened in liquid uptrends;
- narrative continuation failed after price exhaustion.

#### Research Integration

Research presents memory after direct state and event evidence.

It must show:

- lesson;
- applicability;
- differences from current context;
- confidence;
- last validation time;
- evidence links.

### Success Criteria

- QuantTerminal retrieves durable market lessons instead of isolated analogs.
- Memory adds synthesis beyond Historical Analog.
- Memory does not duplicate Event Impact.
- Every lesson is traceable to evidence.
- Contradictions and failure conditions are visible.
- Current mock-backed Market Memory is not used as production intelligence.

### Exit Gate

Artifact adoption should begin only when at least Historical Analog and one new producer have stable production outputs.

## 9. Phase 7 - Artifact Adoption

### Goal

Make the Intelligence Artifact Registry useful in production.

### Scope

#### Historical Analog Artifact Publication

Publish:

- conclusion;
- confidence or evidence strength when defined;
- source;
- generated time;
- current-state identity;
- supporting analog cases;
- outcome statistics;
- cache provenance.

#### Event Impact Artifact Publication

Publish:

- verified event;
- observed reaction;
- comparable events;
- outcome statistics;
- confounders;
- confidence and limitations.

#### Market Memory Artifact Publication

Publish:

- memory identity and type;
- defining conditions;
- lesson;
- supporting and contradicting evidence;
- outcomes;
- confidence;
- freshness;
- lifecycle state.

#### Consumer Adoption

Research should consume artifacts where the generic contract is sufficient.

Specialized case-detail or Replay workflows may continue using typed producer metadata behind versioned artifact metadata contracts.

#### Registry Operationalization

Use the existing artifact model and reader boundaries.

Do not create a second artifact contract.

Durable publication is required before production consumers depend on the registry.

### Success Criteria

- Consumers depend on artifacts rather than implementation-specific services where appropriate.
- Replacing a producer does not require redesigning Research.
- Artifacts expose confidence, freshness, provenance, and supporting evidence consistently.
- Expired, archived, invalid, and incompatible artifacts are explicit.

### Exit Gate

Automation should schedule proven producers and publishers, not unstable prototypes.

## 10. Phase 8 - Automation

### Goal

Move from manual cache generation to scheduled refresh.

### Scope

#### Polling and Scheduling

- Define freshness objectives by dataset and intelligence product.
- Schedule only proven builders.
- Keep user requests separate from job execution.

#### Builder Execution

- Invoke existing canonical market-data builders.
- Invoke Historical Analog generation.
- Invoke Replay cache generation for selected coverage.
- Invoke Event Impact and Market Memory producers after they exist.

#### Ingestion Job Status

Use the existing ingestion job model:

- queued;
- running;
- succeeded;
- partial;
- failed;
- cancelled;
- progress;
- attempts;
- retryability.

#### Failure Reporting

- Preserve last-known-good complete cache.
- Do not publish partial output as complete.
- Record provider failures separately from invalid source data.
- Expose actionable operational diagnostics.

#### Cache Freshness Monitoring

Monitor:

- last successful generation;
- expected next refresh;
- coverage gaps;
- expired cache;
- failed jobs;
- schema incompatibility;
- record counts.

### Success Criteria

- Key intelligence caches refresh without manual intervention.
- Job failure never triggers request-time recomputation.
- Last-known-good data remains available under defined stale policy.
- Coverage and freshness are observable.
- Retries are bounded and classified.

### Exit Gate

Do not introduce DuckDB or SQLite merely because automation exists. Require measured file-cache limitations.

## 11. Phase 9 - Analytical Storage

### Goal

Introduce DuckDB or SQLite only when file cache becomes limiting.

### DuckDB Scope

Use DuckDB for builder-side analytical workloads such as:

- scanning large OHLCV histories;
- joining market states with events;
- feature generation;
- outcome aggregation;
- cross-partition historical queries;
- coverage analysis.

DuckDB should not become a reason for product request paths to run heavy queries.

### SQLite Scope

Use SQLite for small durable application metadata when justified:

- cache index;
- job metadata;
- durable artifact registry metadata;
- lifecycle and publication state;
- coverage inventory.

SQLite should not store massive raw market datasets by default.

### Migration Criteria

Introduce analytical storage only when at least one is measured:

- repeated full-file scans dominate builder runtime;
- JSON cache indexes are operationally difficult;
- cross-partition queries are required;
- artifact or job metadata requires durable transactional state;
- deployment file-cache constraints prevent reliable operation;
- benchmarks show material improvement.

### Success Criteria

- Storage complexity is introduced only when justified.
- Existing canonical contracts and consumer readers remain stable.
- Migration and rollback are documented.
- Request paths remain cache- or artifact-backed.

## 12. Anti-Goals

Do not:

- Build another foundation before a product workflow requires it.
- Implement Market Memory before a verified Event Catalog and sufficient state evidence exist.
- Compute historical intelligence during user requests.
- Introduce mock intelligence into production.
- Treat current mock Event or Market Memory repositories as production data.
- Optimize storage before cache coverage and builder workloads are proven.
- Add DuckDB because it is architecturally attractive.
- Add SQLite before durable metadata has a real operational requirement.
- Automate unstable builders.
- Create UI panels that do not improve decision quality.
- Duplicate Historical Analog inside Research.
- Duplicate Event Impact inside Market Memory.
- Create a global investigation-context store.
- Expose cache ids or storage paths in product navigation.
- Enable Replay links without exact verified coordinates.
- Present pending data as `NO DATA`.
- Hide sample size, contradictions, missing outcomes, or source freshness.
- Invent confidence scores without a versioned definition.
- Use LLM-generated prose as evidence.
- Add broad event categories without reliable source coverage.
- Allow artifact adoption to block specialized workflows prematurely.
- Schedule work before manual execution is deterministic and repeatable.

## 13. Sprint Order

The following ten sprints are the recommended implementation sequence after v0.8.

### Sprint 1 - Product State Integrity

#### Goal

Eliminate false no-data, indefinite loading, and cross-request state regressions in existing product surfaces.

#### Deliverable

- Dashboard source-state audit.
- Loading/empty/unavailable state contract.
- Narrative Heatmap initial-load verification.
- Historical Evidence cache-state verification.
- Top Liquidations diagnostics.
- Regression checks for route navigation and request aborts.

#### Success Criteria

- Valid responses render on first mount.
- Pending requests never show false `NO DATA`.
- Optional source failure does not clear unrelated valid data.
- No indefinite loading states.
- No production path consumes mock intelligence.

#### Explicit Non-Goals

- No Shared Investigation Context implementation.
- No Research redesign.
- No new event system.
- No new cache or storage layer.

### Sprint 2 - Deployment and Cache Reality Audit

#### Goal

Verify which v0.8 cache and provider assumptions hold in Vercel.

#### Deliverable

- Vercel runtime and filesystem audit.
- Environment-variable inventory.
- External provider timeout audit.
- Cache availability matrix by route.
- Documented local-versus-production differences.
- Minimal reliability fixes only where reproduced.

#### Success Criteria

- Production cache misses are explainable.
- Routes do not assume persistent local files when unavailable.
- Required environment variables and runtimes are documented.
- No route silently performs heavy fallback computation.

#### Explicit Non-Goals

- No distributed cache.
- No scheduler.
- No database migration.
- No broad API redesign.

### Sprint 3 - Investigation Context Contract

#### Goal

Implement the public vocabulary and parsing rules for portable investigation identity.

#### Deliverable

- Shared public field conventions.
- Validation and normalization behavior.
- Legacy `interval` compatibility.
- Context-preserving link construction patterns.
- Unit-level contract tests where appropriate.

#### Success Criteria

- Symbol, exchange, timeframe, investigation timestamp, and origin have one meaning across routes.
- Explicit URL values outrank defaults.
- No global state platform is introduced.

#### Explicit Non-Goals

- No Research workflow integration yet.
- No Historical Analog changes.
- No Replay data-loading changes.
- No context persistence database.

### Sprint 4 - Dashboard to Research Continuity

#### Goal

Make Dashboard establish a portable investigation without adding historical workload.

#### Deliverable

- Dashboard-to-Research handoff.
- Symbol, exchange, timeframe, timestamp, source, and signal context propagation.
- Research reads the incoming context.
- Existing Dashboard and Markets links remain intact.

#### Success Criteria

- ETHUSDT on Dashboard opens ETHUSDT Research.
- Research no longer silently defaults historical investigation to BTCUSDT when context exists.
- Dashboard performance remains unchanged.

#### Explicit Non-Goals

- No Historical Intelligence integration.
- No automatic historical loading.
- No Dashboard Historical Analog restoration.
- No Research layout redesign beyond context visibility.

### Sprint 5 - Historical Intelligence Continuity

#### Goal

Preserve investigation identity through Historical Analog exploration and case selection.

#### Deliverable

- Historical Intelligence accepts symbol and timeframe context.
- Direct-navigation defaults remain only for absent fields.
- Current-state timestamp used by the cache is visible.
- Selected historical case becomes portable context.
- Incompatible case invalidation rules.

#### Success Criteria

- Research to Historical Intelligence preserves symbol/timeframe.
- Selected case identity survives navigation.
- No benchmark substitution occurs.
- Historical loading remains cache-only.

#### Explicit Non-Goals

- No Event Impact.
- No Market Memory.
- No new Historical Analog builder.
- No Replay auto-load.

### Sprint 6 - Exact Replay Case Handoff

#### Goal

Open the exact selected historical case in Replay without manual re-entry or date fallback.

#### Deliverable

- Verified exchange/symbol/date/hour handoff.
- Replay case provenance.
- Disabled action for incomplete coordinates.
- Context-preserving return path.
- Manual Replay loading retained.

#### Success Criteria

- Displayed case date/hour exactly matches Replay.
- No latest-safe date override when explicit context exists.
- Incomplete coordinates never open an unrelated Replay window.
- Replay remains responsive and section failures remain isolated.

#### Explicit Non-Goals

- No Replay architecture redesign.
- No new Replay provider.
- No heavy automatic loading.
- No Event Impact calculation.

### Sprint 7 - Research Historical Workflow Integration

#### Goal

Turn Research from parallel panels into a coherent state-to-outcome investigation.

#### Deliverable

- Current-state section.
- Manual Historical Analog load for active context.
- Ranked cases and selected-case detail.
- Multi-horizon outcome summary.
- Similarity reasons.
- Provenance, freshness, and cache status.

#### Success Criteria

- Research answers what the current state is, what looked similar, and what happened next.
- One selected case drives detail.
- Not-requested is distinct from unavailable.
- Historical Intelligence Explorer logic is reused or consolidated, not duplicated.

#### Explicit Non-Goals

- No Event Catalog.
- No Event Impact.
- No production Market Memory.
- No artifact registry dependency.

### Sprint 8 - Research Evidence and Confidence

#### Goal

Make Research conclusions traceable and uncertainty explicit.

#### Deliverable

- Supporting evidence.
- Contradicting evidence.
- Missing evidence.
- Source and freshness presentation.
- Confidence reasons and limitations using existing data.
- Deterministic Research summary.

#### Success Criteria

- Every historical conclusion links to evidence.
- Contradictions are visible.
- No unexplained confidence score appears.
- Live narratives and prediction markets remain useful without history.

#### Explicit Non-Goals

- No new confidence engine.
- No LLM-generated analysis.
- No Event Impact.
- No artifact migration.

### Sprint 9 - Verified Event Catalog V1

#### Goal

Create the first narrow production event catalog for future Event Impact.

#### Deliverable

- Accepted taxonomy subset.
- Stable public event identity.
- Verified UTC timestamps.
- Source provenance.
- Symbol and market scope.
- Duplicate policy.
- Small manually reviewed real catalog.
- Clear separation from mock event repositories.

#### Success Criteria

- At least one external event category and one deterministic market-derived category have verified real records.
- Every event is source-linked.
- Event records make no unsupported impact claim.
- Coverage is sufficient to assess Event Impact V1 feasibility.

#### Explicit Non-Goals

- No broad news classification.
- No automatic ingestion.
- No Event Impact statistics yet.
- No Market Memory.

### Sprint 10 - Event Impact Vertical Slice

#### Goal

Prove one end-to-end Event Impact workflow with real events and prepared outcomes.

#### Deliverable

- One supported event category.
- Pre-event market-state attachment.
- 1h, 4h, 24h, and 7d returns.
- Comparable-event selection.
- Aggregate outcome statistics.
- Supporting, contradicting, and missing evidence.
- Research presentation.
- Verified Replay link where coverage exists.

#### Success Criteria

- Research answers what happened after the selected event type.
- All outcomes use real data.
- Sample size and confounders are visible.
- No event computation runs in the user request path.
- The vertical slice establishes whether broader Event Impact investment is justified.

#### Explicit Non-Goals

- No full event taxonomy coverage.
- No Market Memory V1.
- No artifact adoption mandate.
- No scheduler.
- No DuckDB or SQLite.

### Work Following the First 10 Sprints

If Sprint 10 succeeds, proceed in this order:

1. Expand Event Impact only to verified categories with sufficient evidence.
2. Implement narrow Market Memory V1.
3. Publish Historical Analog, Event Impact, and Market Memory artifacts.
4. Migrate Research consumers selectively to artifact readers.
5. Automate proven builders.
6. Add analytical storage only after measured limits.

## Conflicts and Resolutions

### Dashboard Historical Analog Removal vs Historical Evidence

Potential conflict:

- ADR-001 says Dashboard Historical Analog is removed.
- The current Dashboard includes a compact Historical Evidence strip.

Resolution:

- The removed system is the heavy historical workflow and request-time computation.
- A compact cache-only evidence summary is compatible with the strategy.
- Dashboard must remain summary-only.

### Research Integration vs Separate Historical Intelligence Explorer

Potential conflict:

- Research Renaissance recommends a continuous workflow.
- Historical Intelligence already exists as a separate product page.

Resolution:

- Use one canonical interaction model.
- Near term: preserve the Explorer and pass context.
- Medium term: reuse or embed its workflow in Research.
- Do not maintain a third independent analog implementation.

### Market Memory Timing

Potential conflict:

- Regime and Structural Memory can use Historical Analog evidence before Event Impact exists.
- The roadmap says not to implement Market Memory before Event Catalog exists.

Resolution:

- Memory definitions and catalog design may begin conceptually.
- Production Market Memory V1 should follow Event Catalog and Event Impact evidence so the initial memory layer does not harden around state-only or mock-backed assumptions.
- A narrow regime-memory prototype may be evaluated internally, but it should not be presented as production intelligence before the dependency gate.

### Artifact Registry Availability

Potential conflict:

- The artifact model exists.
- The registry is only an in-memory reference.

Resolution:

- Do not force current product consumers onto the reference registry.
- Adopt artifacts after multiple production producers exist and durable publication is available.
- Reuse the existing artifact contract; do not design another registry.

### Automation vs Manual Historical Loading

Potential conflict:

- Research historical interaction should remain manual-load.
- Future builders should refresh automatically.

Resolution:

- Automation refreshes prepared caches in the background.
- User interaction remains a cache read.
- Automatic builder execution never means automatic heavy client polling.

### 15-Minute Event Outcomes

Potential conflict:

- ADR-004 and the Event Impact plan include 15m.
- The required Event Impact V1 roadmap scope lists 1h, 4h, 24h, and 7d.

Resolution:

- V1 requires the four requested horizons.
- Add 15m only when canonical data resolution and coverage are verified.
- Do not delay the first real vertical slice for incomplete 15m data.

