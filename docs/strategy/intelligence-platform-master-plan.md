# QuantTerminal Intelligence Platform Master Plan

Status: Canonical strategy  
Planning horizon: 6-12 months  
Last updated: 2026-06-20

## 1. Executive Summary

QuantTerminal is currently a real-time crypto market intelligence application with six primary product surfaces:

- Dashboard provides a fast market conclusion, reasons, evidence, and tactical alerts.
- Markets provides live symbol-level verification through price, order flow, orderbook, funding, open interest, liquidations, and market structure.
- Scanner discovers candidate opportunities.
- Trade turns a selected candidate into an execution-planning workflow.
- Research presents deeper narrative, prediction-market, information-flow, and manually loaded historical context.
- Replay reconstructs a selected historical market window from price and microstructure data.

The platform is becoming a cache-backed market intelligence system. Its long-term value will not come from displaying more feeds. It will come from producing reproducible intelligence about market state, historical similarity, event impact, regime memory, and confidence, then publishing that intelligence in forms that multiple product surfaces can consume.

The architecture evolved because early historical workflows performed too much work inside user request paths. That model failed under realistic data volume. The clearest example was Replay orderbook reconstruction: one BTCUSDT hour contained approximately 4.19 million ordered snapshot and update events. Download and decode worked, but correct reconstruction exceeded request memory and runtime budgets. Historical Analog and local historical stores exposed the same structural risk in smaller forms: large files, repeated parsing, request-coupled computation, slow responses, and misleading loading or no-data states.

QuantTerminal therefore adopted the following platform flow:

```text
External Sources
  -> Ingestion
  -> Canonical Normalization
  -> Deterministic Processing
  -> Versioned Cache
  -> Intelligence Artifact Publication
  -> Product Consumption
```

Request paths should read validated cache entries or intelligence artifacts. They should not download large historical files, reconstruct millions of events, search long histories, or calculate forward outcomes. A missing or invalid cache is an availability condition, not an instruction to compute.

Several foundations are complete:

- A generic historical cache with manifests, schema versions, atomic publication, and explicit failure states.
- Canonical market-data contracts for OHLCV, funding, open interest, liquidations, and orderbook summaries.
- A manual real-data OHLCV cache builder.
- A Replay orderbook builder and cache-only consumer.
- Historical Analog V2 with deterministic state generation, similarity search, forward outcomes, aggregation, and cache-only routes.
- A Historical Intelligence Explorer for cache-backed analog inspection.
- A compact Dashboard Historical Evidence strip that reads prepared evidence without running historical computation.
- A versioned Intelligence Artifact contract, registry interface, and reader abstraction.

These foundations are not yet a complete operating platform. Cache generation remains mostly manual. Canonical coverage is uneven across symbols, intervals, and derivative datasets. The artifact registry is an in-memory reference implementation, and existing consumers generally still read producer-specific caches. Research has useful live inputs but has not yet become the primary intelligence workspace. Scheduling, durable analytical storage, observability, and broad artifact publication remain future work.

The next 6-12 months should prioritize reliability and coverage before adding new intelligence engines. The sequence is:

1. Harden Dashboard and current intelligence consumers against regressions.
2. Expand canonical cache coverage and make generation repeatable.
3. Rebuild Research around existing intelligence artifacts and manual historical exploration.
4. Implement Event Impact and Market Memory only after their source data and cache contracts are dependable.
5. Automate ingestion and processing through schedulers and workers.
6. Introduce DuckDB when file-cache query and build workloads justify an analytical engine.

The governing objective is decision quality. QuantTerminal should answer what is happening, why it is happening, when similar conditions occurred, what followed, and how reliable the evidence is. It should do so without fabricating data, blocking the interface, or coupling product pages to heavy intelligence implementations.

## 2. Core Philosophy

### Intelligence Before Consumption

QuantTerminal does not compute historical intelligence during user requests.

Historical search, state generation, outcome calculation, orderbook reconstruction, and event aggregation belong in builders or workers. Product consumers receive prepared results with provenance, freshness, and compatibility metadata.

The desired boundary is:

```text
Producer work completes
  -> intelligence is published
  -> consumer reads intelligence
```

The consumer must never implicitly become the producer.

### Cache First

Historical computation belongs to builders, not consumers.

Every expensive historical system should define:

- its canonical inputs;
- its deterministic processing model;
- its cache identity and partition dimensions;
- its payload schema;
- its publication manifest;
- its expiration policy;
- its explicit unavailable behavior.

A cache miss returns an unavailable state. It does not trigger a hidden rebuild.

### Real Data Only

QuantTerminal must not fabricate market data, intelligence, outcomes, confidence, cases, or events.

If a required source is missing, the system reports:

```text
UNAVAILABLE
Reason: <specific cause>
```

Source substitution must be explicit and semantically valid. Another symbol, exchange, or benchmark must never be silently presented as if it were the requested market.

Mock-backed experimental modules may exist for isolated development, but production product paths must not consume them as real intelligence.

### Deterministic Intelligence

The same versioned inputs, configuration, and model should produce the same intelligence artifact.

Determinism requires:

- named and versioned feature definitions;
- stable normalization;
- fixed scoring weights and scales;
- deterministic tie-breaking;
- exact outcome windows;
- explicit missing-value behavior;
- versioned cache and artifact schemas;
- recorded producer and source provenance.

Randomized ranking, undocumented thresholds, and request-dependent output are unsuitable for historical intelligence.

### Conclusion -> Reasons -> Evidence

The primary user-experience hierarchy is:

```text
Conclusion
  -> Reasons
  -> Evidence
  -> Deeper investigation
```

Dashboard should lead with the market conclusion. Markets should verify the live structure behind a selected signal. Trade should convert a selected opportunity into an execution plan. Research and the Historical Intelligence Explorer should expose deeper evidence. Replay should reconstruct a historical case.

The interface should not force users to reverse-engineer a conclusion from raw metrics.

### Responsiveness Over Completeness

A responsive partial view with explicit unavailable states is better than a complete view that blocks navigation or remains in an indefinite loading state.

Heavy or optional datasets should load manually, progressively, or from cache. A failure in one section must not disable unrelated sections.

### Operational Cost Must Be Visible

Every intelligence system consumes source bandwidth, storage, processing time, build time, and maintenance attention. New systems must justify those costs through reusable decision value.

## 3. Current Architecture

### System Flow

```text
Binance Vision / Binance APIs / CryptoHFTData / Enrichment Sources
  -> source-specific ingestion
  -> canonical market-data records
  -> versioned file-cache publication
  -> deterministic intelligence builders
  -> intelligence caches
  -> artifact publication boundary
  -> Dashboard / Research / Explorer / Replay / future consumers
```

The current implementation is transitional:

- Canonical cache and intelligence cache contracts are implemented.
- Replay Orderbook and Historical Analog V2 prove cache-only consumption.
- Product consumers still frequently read producer-specific cache routes directly.
- Artifact contracts exist, but broad producer publication and consumer migration are not complete.
- Generation remains manual rather than scheduled.

### Canonical Market Data Layer

The canonical market-data namespace is `market-data`. It separates source parsing from intelligence consumers.

#### OHLCV

Canonical OHLCV records include:

- exchange;
- symbol;
- interval;
- open and close timestamps;
- open, high, low, close, and volume;
- source;
- download timestamp.

The current manual builder accepts real Binance Vision-compatible JSON, CSV, or ZIP/CSV input, validates candles, deduplicates by open time, sorts chronologically, and publishes through the generic cache foundation.

OHLCV is the primary long-coverage input for Historical Analog, future Market Memory, Event Impact, and historical research.

#### Funding

The canonical funding contract includes funding time, funding rate, mark price, exchange, symbol, and source.

The contract and publisher boundary exist. Broad automated historical funding ingestion is not yet complete.

#### Open Interest

The canonical open-interest contract includes timestamp, open interest, open-interest value, exchange, symbol, and source.

The contract and publisher boundary exist. Long-coverage generation and coverage monitoring remain incomplete.

#### Liquidations

The canonical liquidation contract includes timestamp, side, price, quantity, notional, exchange, symbol, and source.

Liquidation data is event-oriented and should remain an enrichment input unless coverage and continuity are proven for the target workflow.

#### Orderbook Snapshots

The canonical orderbook-summary contract includes:

- best bid and ask;
- spread;
- imbalance;
- bid and ask liquidity;
- top bid and ask levels;
- timestamp and source.

Raw orderbook event streams are not a consumer contract. They must be reconstructed outside request paths and published as replay-ready summaries.

### Historical Intelligence Layer

#### Historical Analog V2

Historical Analog V2 answers:

> What happened when this market previously looked similar?

Its flow is:

```text
Canonical or long-coverage OHLCV
  -> market-state generation
  -> exact forward outcomes
  -> deterministic similarity search
  -> aggregate statistics
  -> versioned analog cache
```

Version 1 market-state features include:

- 1h, 4h, and 24h returns;
- volume z-score;
- realized volatility;
- distance from SMA20 and SMA50;
- trend regime;
- funding when supplied;
- 24h open-interest change when supplied.

Outcomes are calculated at 1h, 4h, 24h, and 7d from actual future closes. Missing future coverage remains null. Similarity uses a deterministic weighted normalized distance and stable tie-breaking.

#### Market States

The reusable market-state dataset is a platform asset, not merely an Analog implementation detail. It can support:

- Historical Analog;
- Market Memory;
- Event Impact controls and comparisons;
- historical research;
- future confidence calibration.

Market-state schema evolution must remain explicit and versioned.

#### Outcomes

Outcome records attach exact forward returns to historical state identities. Aggregations include case count, average return, win rate, best case, worst case, and dominant outcome.

Outcome windows must remain exact. Missing horizons must not be interpolated or estimated.

### Replay Layer

Replay is a historical event viewer. It should remain responsive and user-driven.

Price, liquidations, funding, open interest, trades, and orderbook summaries have different source and cost profiles. They should fail independently.

#### Replay Cache Architecture

Replay consumers should prefer prepared data:

```text
Historical source
  -> manual or scheduled builder
  -> replay-ready cache payload
  -> cache-only API
  -> Replay section
```

Cache diagnostics expose cache status, generation time, source, and schema version.

#### Orderbook Cache Pipeline

CryptoHFTData CommonOrderbookEvent files contain ordered snapshot and update rows. Correct reconstruction requires complete ordered replay. A representative BTCUSDT hour contained approximately 4.19 million rows.

The manual builder:

1. validates source columns;
2. processes row groups in order;
3. applies snapshot and update semantics;
4. removes zero-quantity levels;
5. computes the final top-level book;
6. publishes a compact replay-ready snapshot.

The Replay request path reads the cache only. Missing, corrupt, expired, partial, failed, or incompatible cache states are returned as unavailable. It does not download or reconstruct the source file.

### Intelligence Artifact Layer

The artifact layer is the intended canonical boundary between intelligence producers and consumers.

#### Producers

Current and future producers include:

- Historical Analog;
- Replay Intelligence;
- Dashboard Evidence;
- Event Impact;
- Market Memory.

Producers own their computation and specialized metadata. They publish a common envelope.

#### Registry

The registry contract supports publication, read by id, deterministic search, archive, and archived-state lookup.

The current implementation is an in-memory reference registry. It establishes behavior but is not yet a durable production publication system.

#### Readers

The unified reader validates:

- existence;
- artifact schema version;
- archived state;
- expiration.

It returns explicit states such as ready, not found, expired, archived, version mismatch, or invalid.

#### Consumers

Target consumers include:

- Dashboard;
- Historical Intelligence Explorer;
- Research;
- Replay;
- future agents and automated workflows.

Most current consumers still read cache-specific APIs. Migration to artifact readers should be deliberate and should not remove source-specific metadata required by specialist workflows.

### Dashboard Layer

Dashboard remains the lightest decision surface.

Its product hierarchy is:

1. Market Direction.
2. Why.
3. Historical Evidence.
4. Prediction Markets.
5. Tactical Alerts and supporting live context.

The former large, request-time Historical Analog workflow was removed. The current Historical Evidence integration is a compact cache-only strip. This distinction is essential: Dashboard may display prepared evidence, but it must not run historical matching, source downloads, or outcome computation.

Dashboard data sources should load independently. Slow optional evidence must not overwrite valid live state or create false no-data messages while requests are pending.

## 4. Completed Foundations

### Historical Intelligence Cache Foundation

The generic cache foundation provides:

- identity by namespace, dataset id, and arbitrary partitions;
- immutable payloads;
- atomically published manifests;
- source classification;
- generation and expiration timestamps;
- separate manifest and dataset schema versions;
- explicit generation status;
- deterministic read states.

Why it matters: it establishes the publication boundary required to remove heavy computation from request paths without committing prematurely to a database.

### Historical Analog V2

Historical Analog V2 provides:

- a reusable versioned market-state model;
- exact forward-outcome generation;
- deterministic similarity search;
- aggregate statistics;
- manual builders;
- cache-only API consumption;
- explicit cache diagnostics.

Why it matters: it converts historical similarity from a slow request-time feature into reproducible intelligence that can be reused by multiple products.

### Canonical Market Data Cache

The canonical layer provides shared contracts and readers for:

- OHLCV;
- funding;
- open interest;
- liquidations;
- orderbook summaries.

A real Binance Vision-compatible OHLCV builder is implemented.

Why it matters: feature systems no longer need to interpret the same provider formats independently, and source migration can occur behind stable consumer contracts.

### Replay Orderbook Cache Pipeline

The pipeline reconstructs CommonOrderbookEvent data outside HTTP requests and publishes only the final replay-ready book state.

Why it matters: it proves the full `ingest -> process -> cache -> render` architecture against a workload that definitively failed in request paths.

### Historical Intelligence Explorer

The Explorer exposes:

- current market state;
- similar historical cases;
- similarity scores;
- forward outcomes;
- aggregate statistics;
- feature-level similarity reasons.

It consumes Historical Analog cache output and degrades explicitly when cache is unavailable.

Why it matters: it turns historical intelligence into an inspectable product workflow rather than a hidden backend metric.

### Dashboard Historical Evidence

Dashboard can display a compact summary of cached Historical Analog evidence, including case count, return, win rate, dominant outcome, source, and generation time.

Why it matters: it provides historical context without restoring the heavy historical workflow that previously degraded Dashboard responsiveness.

### Intelligence Artifact Registry

The artifact foundation defines:

- versioned artifact envelopes;
- confidence and freshness;
- source provenance;
- supporting evidence;
- discovery subjects and tags;
- deterministic search;
- read and lifecycle states.

Why it matters: it creates a future producer-consumer boundary that can survive replacement of Historical Analog, addition of Event Impact, or introduction of Market Memory without redesigning every product consumer.

## 5. Lessons Learned

### Historical Computation in Request Paths Does Not Scale

Large downloads, JSON parsing, state generation, similarity search, and outcome aggregation create latency and memory pressure. They also couple product availability to compute-heavy work.

Request paths should validate and return prepared results.

### Replay Orderbook Reconstruction Must Be Precomputed

Correct orderbook state requires ordered replay from snapshots through updates. Tail-only or sampled reconstruction can be incorrect. Millions of rows cannot be safely reconstructed inside a normal page request.

Correct unavailable output is preferable to an approximate but misleading book.

### Generation and Consumption Must Be Separate

A builder may be slow, memory-intensive, and operationally complex. A consumer must be fast, bounded, and predictable.

Combining the two obscures failure ownership and makes product behavior depend on workload size.

### Deferred Fetches Can Produce False No-Data States

A component that renders an empty state before an independent deferred request begins can claim that data is absent when it is merely pending. Shared request effects can also allow one slow source to reset or overwrite another source's state.

Loading, empty, unavailable, and ready are distinct states. Independent data sources require independent state lifecycles.

### Cache Availability Is Product State

Missing, expired, corrupted, partial, failed, and incompatible caches have different operational meanings. Treating all of them as generic no-data hides the required remediation.

Product messages can remain concise while diagnostics preserve the exact cache state.

### Long Coverage and Microstructure Precision Serve Different Purposes

Binance Vision and historical APIs are appropriate primary sources for long-horizon state and outcome analysis. CryptoHFTData is valuable for replay microstructure and enrichment, but its coverage should not define the entire historical intelligence horizon.

### File Cache Is a Foundation, Not the End State

File cache was the correct Phase 1 choice because it made contracts and publication semantics concrete. It is not distributed, query-efficient, or automatically refreshed.

Storage migration should preserve cache identities, canonical schemas, and reader boundaries.

### UI Density Is Not Intelligence Quality

More cards and metrics do not create a better decision. Each surface needs a clear question and a hierarchy from conclusion to evidence.

### Prototype and Production Boundaries Must Be Explicit

The repository contains mock-backed and experimental historical or information modules. They may support isolated development, but they must not be mistaken for production intelligence or connected to user-facing paths without real-data validation.

## 6. Current State Assessment

### Dashboard

Strengths:

- Clear responsibility as the fast market-summary surface.
- Market direction, reasons, prediction markets, evidence, and tactical alerts are visible without requiring historical exploration.
- Historical evidence can be served from cache rather than computed.
- Live sources can load independently.

Weaknesses:

- Multiple independent external sources still create regression risk around initial loading, timeouts, and stale state.
- Compact historical evidence creates a documentation tension with ADR-001 unless the distinction between "historical workflow" and "prepared evidence strip" is made explicit.
- Source freshness and artifact provenance are not yet presented through a unified artifact reader.

Assessment: Product-useful and strategically correct, but it needs regression hardening more than new panels.

### Research

Strengths:

- Natural home for narratives, prediction markets, information flow, and manually loaded historical systems.
- Heavy historical polling is intentionally disabled.
- Existing intelligence can be composed into deeper context.

Weaknesses:

- Historical systems and live research sources are not yet unified around artifacts.
- Manual historical workflows can feel fragmented or unavailable when caches have not been generated.
- Research lacks a durable workflow for browsing, comparing, saving, and citing intelligence artifacts across producers.

Assessment: Under-realized. Research should become the main composition and investigation workspace after cache coverage improves.

### Replay

Strengths:

- User-driven historical window selection.
- Price and microstructure datasets can load independently.
- OI and funding support real fallback paths.
- Orderbook architecture now has a correct cache-first answer.

Weaknesses:

- Orderbook cache coverage is manual and sparse.
- Replay source availability differs by dataset and time window.
- Cache locality and manual generation limit deployment reliability.
- Replay-specific intelligence is not yet published consistently as artifacts.

Assessment: A viable historical viewer with a proven cache architecture, but not yet a broadly covered replay platform.

### Historical Intelligence

Strengths:

- Historical Analog V2 is deterministic and cache-backed.
- Market states and outcomes are reusable platform assets.
- Explorer makes analog reasoning inspectable.
- Failure states are explicit.

Weaknesses:

- Cache builds are manual and generally single-symbol/single-interval.
- Funding and OI enrichment coverage is limited.
- No automated freshness or coverage service exists.
- Event Impact and production Market Memory are not implemented on the canonical foundation.

Assessment: Strong architectural core, limited operational breadth.

### Market Data

Strengths:

- Canonical contracts separate source formats from consumers.
- OHLCV has a real builder and validation path.
- Source priority is defined.
- Silent cross-symbol substitution is prohibited.

Weaknesses:

- Only OHLCV has a mature general builder.
- Funding, OI, liquidation, and orderbook-summary generation remain uneven or manual.
- Coverage inventory, completeness metrics, and source health are not centralized.
- Source lineage is stored in manifests but not yet operationally monitored.

Assessment: Correct contracts with incomplete coverage operations.

### Platform Architecture

Strengths:

- Clear separation of ingestion, processing, cache, and consumption.
- Versioned cache and artifact contracts.
- Explicit failure handling.
- Storage adapters can evolve behind stable boundaries.

Weaknesses:

- Artifact registry is not durable and producers are not broadly migrated.
- File cache is local and manual.
- Scheduler, worker execution, retries, and observability are absent by design.
- Several older implementation-specific and mock-backed systems coexist with the newer canonical architecture.

Assessment: Good direction and boundaries; the next challenge is consolidation and operation, not another foundation.

## 7. Strategic Priorities

### P0 - Dashboard and Intelligence Regression Hardening

Purpose:

Protect the core product while intelligence infrastructure evolves.

Scope:

- Independent loading state for each Dashboard source.
- Strict separation of loading, empty, unavailable, stale, and ready.
- Bounded timeouts and abort behavior.
- Contract tests for cache-only historical routes.
- Regression tests for cache missing, expired, partial, corrupt, and version mismatch states.
- Verification that no user-facing request triggers historical builders.

Exit criteria:

- Dashboard reaches useful first content without waiting for historical systems.
- Optional source failures do not overwrite valid state.
- No indefinite loading states.
- Historical evidence is read-only and cache-backed.
- Production paths do not consume mock intelligence.

Why now:

Trust is lost faster through inconsistent data states than it is gained through new intelligence features.

### P1 - Cache Coverage Expansion

Purpose:

Turn correct cache contracts into dependable data coverage.

Scope:

- Expand OHLCV coverage by symbol, interval, and date.
- Implement repeatable funding and open-interest builders.
- Define liquidation coverage and retention policy.
- Generate Replay orderbook summaries for selected high-value windows.
- Add coverage manifests and inventory reporting.
- Establish deterministic rebuild and validation commands.

Exit criteria:

- Coverage can be enumerated without scanning arbitrary files.
- Builders are repeatable and idempotent.
- Each canonical dataset reports source, range, record count, schema, and freshness.
- Missing coverage is distinguishable from generation failure.

Why now:

Historical Analog, Replay, Market Memory, and Event Impact cannot be reliable if canonical inputs are sparse or manually unknowable.

### P1 - Research Renaissance

Purpose:

Make Research the primary workspace for composing and inspecting intelligence without moving heavy work back into requests.

Scope:

- Preserve active narrative, prediction-market, and information-flow inputs.
- Integrate Historical Intelligence Explorer workflows.
- Add artifact discovery and evidence inspection after durable artifact publication exists.
- Keep historical systems manual-load or cache-read only.
- Allow comparison of artifacts across symbols, periods, sources, and producers.

Exit criteria:

- Research remains useful when historical caches are absent.
- Historical workflows never auto-build.
- A user can trace every conclusion to source and evidence.
- Research consumes artifacts or stable readers rather than implementation modules.

Why now:

The platform can generate intelligence, but users need a coherent place to investigate and compare it.

### P2 - Event Impact Engine

Purpose:

Answer:

> What usually happens after this type of event?

Prerequisites:

- Stable canonical OHLCV coverage.
- Versioned event taxonomy.
- Reliable event timestamps and source provenance.
- Exact outcome-window generation.
- Cache and artifact publication.

Scope:

- Align verified events with canonical market data.
- Compute deterministic post-event outcomes.
- Separate event category, market context, and asset response.
- Publish event-impact artifacts with case counts, distributions, and evidence.

Exit criteria:

- No request-time backfill or outcome computation.
- Events are real, reviewed, and source-linked.
- Outcomes are exact and reproducible.
- Low-sample results are explicitly qualified.

Why later:

Event Impact without reliable event identity and market-data coverage would create confident-looking but weak intelligence.

### P2 - Market Memory

Purpose:

Answer:

> Which prior market regime most closely matches the current environment?

Prerequisites:

- Stable reusable market-state datasets.
- Broader symbol and interval coverage.
- Historical Analog output stability.
- Clear distinction between regime memory and individual analog cases.

Scope:

- Aggregate recurring state clusters or regime families.
- Track transitions and outcomes across regimes.
- Consume Historical Analog states and outcomes rather than rebuilding them.
- Publish market-memory artifacts.

Exit criteria:

- Market Memory adds information beyond a list of analog cases.
- Regime definitions are deterministic and versioned.
- Consumers remain decoupled through artifacts.

Why later:

Market Memory should be a synthesis layer over proven historical states, not a parallel engine with duplicated inputs.

### P3 - Automated Scheduling and Polling

Purpose:

Move from manual cache generation to dependable operations.

Scope:

- Scheduler consumes the existing ingestion job model.
- Workers execute source ingestion, normalization, state generation, outcome generation, and cache publication.
- Retry policy distinguishes retryable provider failures from invalid source data.
- Jobs expose progress, attempts, duration, and failure reason.
- Publication remains atomic.

Exit criteria:

- Cache freshness targets are defined by dataset.
- Failed jobs do not invalidate last-known-good complete caches.
- Rebuilds are observable and idempotent.
- User requests never start jobs.

Why after coverage:

Automation should operationalize proven builders, not automate unstable contracts.

### P4 - DuckDB and Analytical Infrastructure

Purpose:

Support larger historical datasets and efficient builder-side analytical queries.

Trigger conditions:

- File-cache builders spend significant time scanning repeated JSON/CSV input.
- State and outcome generation requires cross-partition analytical queries.
- Coverage scale makes full-file reads operationally expensive.
- Repeatable benchmarks show DuckDB materially improves build workflows.

Scope:

- Use DuckDB as builder-side analytical storage.
- Preserve canonical record contracts and cache publication.
- Keep consumer request paths cache- or artifact-backed.
- Evaluate SQLite separately for small application metadata and durable artifact registry needs.

Exit criteria:

- Measured performance or operational need justifies added infrastructure.
- Existing consumers do not change.
- Migration and rollback paths are documented.

Why last:

DuckDB is a tool for proven data workloads, not a substitute for clear contracts or disciplined processing boundaries.

## 8. Anti Goals

QuantTerminal should explicitly avoid:

- Recomputing historical intelligence during user requests.
- Downloading large historical sources from product routes.
- Reconstructing raw orderbook event streams in HTTP handlers.
- Treating cache misses as instructions to rebuild.
- Silently substituting another symbol, exchange, or benchmark.
- Fabricating intelligence, outcomes, confidence, or event histories.
- Promoting mock-backed prototypes into production paths.
- Building multiple source-specific schemas for the same canonical dataset.
- Coupling product consumers directly to producer implementations.
- Adding a database, queue, scheduler, or distributed cache before the workload requires it.
- Premature optimization without measurements.
- Feature proliferation that does not improve a defined user decision.
- Large Dashboard panels for workflows that belong in Research, Replay, or the Explorer.
- Infinite polling of historical systems.
- Indefinite loading states.
- Hiding corrupted, expired, partial, or incompatible data behind generic no-data messages.
- Allowing stale intelligence to appear current without freshness metadata.
- Treating confidence as a decorative score without calibration or provenance.
- Maintaining parallel historical engines that duplicate state and outcome generation.

## 9. Future Vision

QuantTerminal should become a Market Intelligence Platform capable of answering five connected questions.

### What Is Happening?

Live market data, market direction, order flow, participation, liquidity, funding, open interest, narratives, prediction markets, and tactical signals describe the current state.

Primary surfaces:

- Dashboard;
- Markets;
- Scanner.

### Why Is It Happening?

Drivers, evidence, narratives, information flow, positioning, liquidity, and event context explain the state.

Primary surfaces:

- Dashboard;
- Markets;
- Research.

### What Happened in Similar Situations?

Historical Analog and the Historical Intelligence Explorer identify comparable market states and expose why they matched.

Primary surfaces:

- Historical Intelligence Explorer;
- Research.

### What Usually Happened Next?

Exact forward outcomes, Event Impact, and Market Memory summarize distributions rather than presenting isolated examples.

Primary surfaces:

- Research;
- Historical Intelligence Explorer;
- future artifact-driven workflows.

### How Confident Should We Be?

Confidence should be grounded in:

- comparable-feature coverage;
- case count;
- outcome dispersion;
- source quality;
- recency;
- model version;
- evidence consistency;
- historical calibration.

Confidence is not a substitute for evidence. It is a compact statement about the strength and limits of the evidence.

### End-State Product Flow

```text
Scanner discovers
  -> Dashboard prioritizes
  -> Markets verifies
  -> Trade plans
  -> Research explains
  -> Historical Intelligence compares
  -> Replay reconstructs
  -> Artifacts preserve reusable conclusions and evidence
```

The goal is not to provide more data.

The goal is to improve decisions by making conclusions understandable, evidence inspectable, historical context reproducible, and uncertainty explicit.

## 10. Architectural Constitution

The following principles are binding unless superseded by an explicit architecture decision.

1. Historical computation never runs in user request paths.
2. Intelligence artifacts are generated before consumption.
3. Cache readers never trigger hidden downloads, rebuilds, or backfills.
4. Real data is preferred over synthetic approximation.
5. Missing data remains missing; it is never silently estimated.
6. Symbols, exchanges, intervals, and time windows are part of data identity.
7. The same versioned inputs must produce the same intelligence result.
8. Manifest version and dataset schema version remain separate compatibility boundaries.
9. Immutable payload plus atomic manifest publication is the file-cache publication model.
10. Missing, corrupted, expired, partial, failed, and incompatible are distinct states.
11. A failure in one optional dataset must not block unrelated product functionality.
12. Responsiveness is preferred over completeness in interactive surfaces.
13. Dashboard remains lightweight and conclusion-first.
14. Historical exploration belongs in Research, Replay, and the Historical Intelligence Explorer.
15. Dashboard may display prepared historical evidence but may not compute it.
16. Replay is a viewer of selected windows, not a request-time reconstruction engine.
17. Raw orderbook events are builder inputs, not product response payloads.
18. Canonical market-data contracts isolate consumers from provider formats.
19. Producers publish intelligence; consumers read artifacts.
20. Consumers should not depend directly on intelligence implementation modules.
21. Every intelligence result must expose source, freshness, version, and evidence.
22. Confidence must describe evidence quality, not decorate the interface.
23. No production path may present mock intelligence as real.
24. New infrastructure requires a measured operational need.
25. Every intelligence system must justify its processing, storage, maintenance, and user-attention cost.
26. User understanding is more important than data density.
27. Conclusion -> Reasons -> Evidence is the default product hierarchy.
28. Architectural exceptions require an ADR and an explicit migration or rollback plan.

## Current Architecture Inconsistencies to Resolve

The following are known transition gaps. They are not reasons to redesign the platform immediately, but they should remain visible in planning and reviews.

1. ADR-001 says Dashboard Historical Analog is removed, while Dashboard now contains a compact cache-only Historical Evidence strip. The intended distinction is valid, but the ADR should eventually clarify that the prohibited behavior is the heavy historical workflow and request-time matching, not prepared evidence display.
2. The Intelligence Artifact Registry is currently an in-memory reference implementation. Historical Analog, Dashboard Evidence, Replay, and the Explorer generally still consume cache-specific APIs rather than durable artifacts.
3. Canonical funding, open-interest, liquidation, and orderbook-summary contracts exist, but source ingestion and coverage are not as mature as OHLCV.
4. File caches and manual builders are local. They do not yet provide distributed deployment availability, automated freshness, or centralized coverage visibility.
5. The Historical Intelligence Explorer is a real cache-backed product, but it is not yet an artifact-driven consumer.
6. The repository contains older mock-backed or implementation-specific historical and information-intelligence modules. Their production status is not uniformly obvious from location or naming. Product paths must continue to exclude mock data, and future consolidation should clearly separate experimental modules from canonical systems.
7. Multiple historical route shapes adapt the same Historical Analog cache for different consumers. This is acceptable during migration, but artifact publication should eventually reduce consumer-specific coupling.

