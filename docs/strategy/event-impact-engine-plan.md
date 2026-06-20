# QuantTerminal Event Impact Engine Plan

Status: Research architecture  
Scope: Future event intelligence using existing platform foundations  
Last updated: 2026-06-20

## Purpose

QuantTerminal can describe the current market and compare it with similar historical market states. The next research capability is to connect verified events with observed market changes and historical outcome distributions.

The Event Impact Engine should answer:

- What event occurred?
- Which market state existed before the event?
- What changed after the event?
- Which prior events are genuinely comparable?
- What typically happened after comparable events?
- Which evidence supports or weakens the attribution?
- How confident should the user be?

The target reasoning chain is:

```text
Verified Event
  -> Pre-Event Market State
  -> Observed Market State Change
  -> Comparable Historical Events
  -> Outcome Statistics
  -> Supporting and Contradicting Evidence
  -> Confidence and Limitations
```

This plan defines the research model and product workflow. It does not add infrastructure, caches, registries, APIs, builders, or user interfaces. A future implementation should use the existing canonical market-data, historical state, cache, artifact, Replay, and shared investigation context foundations.

## 1. Event Impact Vision

### The Problem

Market intelligence products often place an event beside a price movement and imply causality.

Examples:

- a regulatory headline appears before a decline;
- ETF flow data appears before a rally;
- open interest expands before volatility;
- a liquidation cascade accompanies a sharp move;
- a narrative becomes dominant while related assets outperform.

Temporal proximity is evidence, but it is not proof.

The Event Impact Engine should replace unsupported storytelling with structured measurement. It should preserve the distinction between:

- an event being detected;
- an event being classified;
- a market reaction being observed;
- a relationship being plausible;
- a historical pattern being repeatable;
- a causal conclusion being justified.

### Product Question

The primary question is:

> What typically happened after this type of verified event under comparable market conditions?

The secondary question is:

> How closely does the current reaction resemble those historical outcomes?

The engine should not answer:

> What trade should the user place?

### Why Event Impact Matters

Current QuantTerminal systems cover different dimensions:

- Dashboard summarizes what matters now.
- Markets verifies live market structure.
- Historical Analog compares market states.
- Replay reconstructs a selected historical window.
- Research composes evidence.

None of these systems, by itself, measures event-conditioned outcomes.

Event Impact adds a missing analytical dimension:

```text
Event identity
  + market context
  + measured reaction
  + historical event sample
```

It converts event feeds from attention signals into testable research objects.

### Difference from Historical Analog

Historical Analog begins with a market state:

> What historical market states looked like this one?

Event Impact begins with a verified event:

> What happened after prior events of this type, especially under similar market conditions?

Historical Analog can operate without knowing why a state occurred. Event Impact cannot operate without a defined event, timestamp, classification, and source.

Historical Analog similarity is primarily state-to-state.

Event Impact comparability is event-plus-context to event-plus-context:

- same event category;
- same event attributes;
- similar affected assets;
- similar pre-event market state;
- similar expectation or surprise;
- similar liquidity and positioning conditions;
- comparable observation windows.

The two systems should cooperate without duplicating one another.

### Causality Standard

Event Impact should use graded attribution language.

Recommended levels:

1. **Observed after**  
   The market change occurred after the event. No causal claim.

2. **Associated with**  
   The event and market change are consistently linked in the measured sample, but confounders remain.

3. **Likely contributed**  
   Timing, scope, historical consistency, and contradictory evidence support a meaningful relationship.

4. **Causal**  
   Reserved for rare cases with strong external identification. This level should not be a normal product output.

Most Event Impact intelligence should remain at the first two levels.

### Operating Principles

- Real, verified events only.
- UTC event timestamps.
- Exact market identity.
- Prepared intelligence before consumption.
- Deterministic classification and outcome calculation.
- Explicit sample size.
- Explicit source and freshness.
- Explicit missing evidence.
- Explicit confounders.
- No hidden benchmark substitution.
- No automatic causal language.

## 2. Event Taxonomy

The taxonomy should be stable enough for aggregation and specific enough to preserve meaningful differences.

The initial taxonomy should use broad top-level categories with structured subtypes and attributes. It should not create a unique category for every headline.

### Macro

Definition:

Scheduled or unscheduled macroeconomic and monetary-policy events that can affect broad risk assets.

Representative subtypes:

- CPI or inflation release;
- employment report;
- central-bank rate decision;
- central-bank guidance;
- liquidity operation;
- sovereign or geopolitical shock;
- major fiscal-policy announcement.

Important attributes:

- jurisdiction;
- scheduled versus unscheduled;
- expected value;
- actual value;
- surprise magnitude;
- release timestamp;
- broad risk-on or risk-off scope.

### ETF

Definition:

Events related to exchange-traded product approval, filing, flow, creation/redemption, or market access.

Representative subtypes:

- approval or rejection;
- filing or amendment;
- daily net flow;
- exceptional inflow or outflow;
- issuer action;
- launch or closure.

Important attributes:

- underlying asset;
- jurisdiction;
- issuer;
- flow amount;
- expected versus observed flow;
- one-time decision versus recurring measurement.

### Regulation

Definition:

Legislative, regulatory, enforcement, licensing, or court events that change perceived legal or operating conditions.

Representative subtypes:

- legislation;
- rulemaking;
- enforcement action;
- court decision;
- license approval or revocation;
- jurisdictional restriction;
- tax or reporting policy.

Important attributes:

- jurisdiction;
- affected entities or assets;
- final versus proposed action;
- immediate versus future effective date;
- source authority.

### Exchange

Definition:

Events originating from or directly affecting a centralized or decentralized trading venue.

Representative subtypes:

- listing or delisting;
- outage;
- withdrawal suspension;
- insolvency or solvency concern;
- reserve disclosure;
- fee or margin change;
- product launch;
- security breach.

Important attributes:

- venue;
- affected symbol or market;
- spot versus derivatives;
- operational duration;
- confirmed versus reported status.

### Stablecoin

Definition:

Events affecting a stablecoin's price stability, reserves, redemption, issuance, or systemic use.

Representative subtypes:

- depeg;
- repeg;
- reserve disclosure;
- redemption pressure;
- issuance expansion or contraction;
- banking or custody disruption;
- regulatory action.

Important attributes:

- stablecoin;
- deviation from peg;
- duration;
- circulating supply change;
- reserve or redemption evidence;
- affected venues and pairs.

### Liquidation Cascade

Definition:

A concentrated sequence of forced position closures with measurable price and liquidity effects.

Representative subtypes:

- long liquidation cascade;
- short liquidation cascade;
- bid-side liquidity failure;
- ask-side liquidity failure;
- cross-venue cascade.

Important attributes:

- direction;
- total notional;
- largest liquidation;
- event duration;
- number of liquidations;
- affected symbols and exchanges;
- price displacement;
- pre-event leverage conditions.

This category is market-derived rather than news-derived. Detection must rely on real liquidation and market data.

### Funding Extreme

Definition:

Funding reaches an unusually positive or negative level relative to a defined historical baseline.

Representative subtypes:

- extreme positive funding;
- extreme negative funding;
- rapid funding normalization;
- funding sign reversal;
- cross-venue funding divergence.

Important attributes:

- funding rate;
- percentile or threshold definition;
- duration;
- exchange;
- symbol;
- concurrent price and OI state.

An extreme must be defined by a versioned rule. It must not be a subjective label.

### Open Interest Expansion

Definition:

Open interest increases materially over a defined interval, indicating growing derivatives participation.

Representative subtypes:

- OI expansion with price increase;
- OI expansion with price decrease;
- OI expansion without directional price confirmation;
- OI contraction after expansion;
- cross-venue OI divergence.

Important attributes:

- absolute and percentage OI change;
- OI value;
- observation window;
- price direction;
- funding state;
- volume and liquidation context.

Open Interest Expansion is an event only when a deterministic threshold is crossed. Ordinary OI fluctuation remains a market feature.

### Narrative Shift

Definition:

A measured change in information attention, regional heat, or dominant narrative state.

Representative subtypes:

- emerging narrative;
- rapid narrative acceleration;
- narrative becomes dominant;
- regional divergence;
- narrative reversal;
- narrative decay.

Important attributes:

- narrative label;
- prior and current heat;
- article or source count;
- regional distribution;
- divergence;
- observation window;
- source coverage.

Narrative Shift measures attention. It does not prove that the narrative caused the market move.

### Additional Compatible Categories

The taxonomy should remain compatible with future verified categories such as:

- protocol exploit or hack;
- token unlock;
- protocol upgrade;
- treasury or reserve action;
- prediction-market repricing;
- major custody event;
- network outage;
- index inclusion or exclusion.

These should be added only when:

- the event can be identified reliably;
- timestamp and source provenance are available;
- sufficient historical cases exist to justify aggregation;
- the category adds analytical value beyond an existing subtype.

### Taxonomy Rules

1. Each event has one primary category.
2. Subtypes and tags capture additional detail.
3. Market-derived events use deterministic detection definitions.
4. News-derived events require source and timestamp verification.
5. Scheduled events preserve expected and actual values when available.
6. Multi-asset scope is explicit.
7. Category versions must be recorded by the future producer.
8. Category changes must not rewrite prior event identity silently.
9. A headline is not automatically an event.
10. Narrative labels are not automatically causal event classes.

## 3. Event Lifecycle

The Event Impact lifecycle is:

```text
Event Detected
  -> Event Verified
  -> Event Classified
  -> Pre-Event Market State Attached
  -> Market Impact Observed
  -> Historical Comparables Selected
  -> Outcome Statistics Calculated
  -> Evidence and Confidence Published
```

The required user-facing lifecycle in the prompt is preserved, with verification and pre-event context made explicit because they are necessary for trustworthy results.

### Stage 1: Event Detected

An event candidate is identified from an existing real source:

- macro calendar or authority release;
- ETF flow source;
- regulatory authority;
- exchange announcement;
- stablecoin market data;
- canonical liquidation data;
- canonical funding data;
- canonical open-interest data;
- narrative intelligence;
- prediction-market data.

Detection records:

- candidate title;
- candidate category;
- source;
- source reference;
- observed timestamp;
- affected market scope;
- raw attributes.

Detection does not imply acceptance or impact.

### Stage 2: Event Verified

Verification confirms:

- the source is authentic or approved;
- the timestamp is usable;
- the event is not a duplicate;
- the event category is supported;
- affected symbols or market scope are known where possible;
- required event attributes are present;
- scheduled versus observed timing is distinguished.

If verification fails, the candidate does not enter production Event Impact analysis.

The repository already contains review-queue and accepted-link concepts. Those concepts may inform future implementation, but current mock-backed ingestion and repositories must not be treated as production event verification.

### Stage 3: Event Classified

Classification assigns:

- primary category;
- subtype;
- structured attributes;
- affected assets;
- market-wide or symbol-specific scope;
- scheduled or unscheduled status;
- expected and actual values when applicable;
- severity as an observed event attribute, not an impact conclusion.

Classification should be deterministic where possible.

LLMs may eventually assist candidate normalization or tagging, but final production classifications must remain evidence-backed, reviewable, and reproducible.

### Stage 4: Pre-Event Market State Attached

The engine associates the event with the most recent valid prepared market state before the event.

Relevant context may include:

- trend regime;
- recent returns;
- realized volatility;
- volume state;
- distance from moving averages;
- funding;
- open-interest change;
- liquidity or liquidation context when available.

Rules:

- The state timestamp must precede or equal the event timestamp.
- The allowed state-age tolerance must be explicit.
- Missing features remain null.
- The state must use the exact symbol and timeframe under analysis.
- A market-wide event may attach separate states for each evaluated asset.

### Stage 5: Market Impact Observed

The engine measures actual post-event behavior at fixed windows.

Recommended initial windows, consistent with ADR-004:

- 15m;
- 1h;
- 4h;
- 24h;
- 7d.

Potential observed outcomes:

- price return;
- maximum favorable move;
- maximum adverse move or drawdown;
- realized volatility change;
- volume change;
- open-interest change;
- funding change;
- liquidation count and notional;
- liquidity or spread change when prepared data exists.

Rules:

- Outcomes come from real canonical records.
- Each metric records its usable window and source.
- Missing future coverage remains unavailable.
- Returns are not annualized or interpolated.
- The event timestamp is the anchor.
- Pre-event baselines must be defined consistently.

### Stage 6: Historical Comparables

Comparable historical events should be selected using:

1. Event compatibility:
   - same primary category;
   - compatible subtype;
   - comparable structured attributes;
   - compatible affected market scope.

2. Pre-event market-state compatibility:
   - trend regime;
   - volatility;
   - recent return profile;
   - participation;
   - funding and OI when available.

3. Observation compatibility:
   - comparable outcome windows;
   - consistent source quality;
   - equivalent timestamp precision.

4. Exclusion rules:
   - no duplicate event instances;
   - no overlapping windows that represent the same shock unless explicitly grouped;
   - no current event in its own historical sample;
   - no unsupported cross-symbol substitution.

Historical Analog may provide state similarity for the pre-event context. Event Impact remains responsible for event-type comparability.

### Stage 7: Outcome Statistics

For each metric and horizon, calculate only from usable cases:

- case count;
- average;
- median;
- positive/negative rate where meaningful;
- best case;
- worst case;
- percentile range or dispersion;
- missing-case count.

For event categories with a directional expectation, record expectation accuracy only when the expectation was captured before the outcome.

The engine must not convert low sample counts into strong confidence.

### Stage 8: Evidence

The final intelligence output should contain:

- event identity and verification;
- pre-event market state;
- observed current-event outcomes;
- historical comparables;
- aggregate statistics;
- supporting evidence;
- contradictory evidence;
- missing evidence;
- provenance;
- freshness;
- confidence with reasons and limitations.

This output can later use the existing `event_impact` artifact type and supporting-evidence model. No new registry is required.

### Lifecycle States

Recommended conceptual states:

- `detected`
- `pending_verification`
- `verified`
- `classified`
- `observing`
- `partially_observed`
- `outcomes_complete`
- `intelligence_available`
- `rejected`
- `insufficient_evidence`

These are research lifecycle concepts, not a request to implement a new state service.

## 4. Relationship to Historical Analog

### Different Starting Questions

Historical Analog:

> What historical market states looked like this?

Event Impact:

> What happened after this type of verified event?

Historical Analog begins with a feature vector.

Event Impact begins with an event record and timestamp.

### Shared Foundations

Both systems can use:

- canonical OHLCV;
- funding and OI when available;
- deterministic market states;
- exact forward outcomes;
- versioned producer logic;
- existing cache and artifact foundations;
- explicit unavailable behavior.

The overlap should be reused, not reimplemented.

### Distinct Responsibilities

Historical Analog owns:

- market-state representation;
- state-to-state similarity;
- comparable feature counts;
- state-conditioned outcome statistics.

Event Impact owns:

- event taxonomy;
- event verification;
- event attributes;
- event-to-event comparability;
- event-timestamp anchoring;
- event-conditioned outcome statistics;
- attribution evidence and confounders.

### Composition Model

Event Impact can use Historical Analog as a context filter.

Example:

```text
Current Event:
  ETF outflow

Event Comparables:
  prior ETF outflows

State Filter:
  downtrend
  high volatility
  elevated funding

Outcome:
  24h return distribution after comparable ETF outflows
```

Historical Analog should not be modified to classify events.

Event Impact should not reproduce generic market-state search.

### When Results Disagree

The systems may produce different evidence:

- Historical Analog may show positive outcomes for similar states.
- Event Impact may show negative outcomes after the selected event type.

Research should display the disagreement.

It should not average unrelated confidence values or choose a winner silently.

The disagreement is itself useful evidence:

```text
State history is constructive.
Event-conditioned history is adverse.
Confidence is reduced by conflicting evidence.
```

### No Historical Analog Dependency for Basic Event Impact

Event Impact must still function when Historical Analog cache is unavailable.

It can provide:

- verified event;
- observed current reaction;
- same-category historical outcomes;
- source and confidence limitations.

Historical Analog enriches context. It is not the sole source of Event Impact validity.

## 5. Relationship to Replay

### Replay as Event Validation

Replay supports Event Impact by reconstructing what happened around a verified event.

It can validate:

- price path;
- timing of the initial move;
- liquidation concentration;
- open-interest change;
- funding change;
- orderbook conditions when a prepared snapshot exists;
- whether the market moved before or after the event timestamp.

Replay does not determine event causality. It provides temporal and microstructure evidence.

### Required Replay Context

Opening Replay from Event Impact requires:

- exchange;
- symbol;
- verified event timestamp;
- exact date;
- exact hour or selected window;
- event id as provenance.

Replay must not:

- default to an unrelated safe window;
- substitute another symbol;
- infer an exchange silently;
- search for a different event;
- calculate Event Impact statistics.

### Event Window Design

The Event Impact result may define an observation window broader than one Replay hour.

Research should treat:

- the event timestamp as the anchor;
- Replay windows as evidence slices;
- outcome horizons as statistics.

Replay should not be expected to display a full 7d outcome in one microstructure request. It can inspect the event onset and selected follow-up windows.

### Validation Questions

Replay helps answer:

- Did price move before the event became public?
- Was the initial reaction immediate or delayed?
- Did OI expand or contract?
- Did funding reinforce or oppose the move?
- Were liquidations a cause, an amplifier, or a consequence?
- Was the move sustained or quickly reversed?

These answers should be derived from real decoded or cached data.

### Replay Evidence in the Impact Result

Future Event Impact artifacts may reference Replay evidence:

- case id;
- event timestamp;
- verified window;
- observed microstructure summary;
- source references.

They should not embed large Replay datasets.

### Replay Coverage Failure

If Replay data is unavailable:

- Event Impact can still use canonical historical outcomes;
- Replay validation is marked missing;
- confidence may be reduced when microstructure evidence is important;
- no synthetic Replay narrative is generated.

## 6. Relationship to Market Memory

### Different Levels of Abstraction

Event Impact:

> What happened after a defined event type?

Market Memory:

> Which recurring market regime or remembered pattern resembles this environment?

Historical Analog:

> Which individual historical states looked similar?

These are complementary layers.

### Event Impact as Memory Input

Future Market Memory can consume prepared Event Impact outputs such as:

- repeated event categories;
- pre-event market-state clusters;
- typical outcome distributions;
- reversal or continuation patterns;
- conditions under which event effects strengthened or failed.

Example memory:

```text
Negative regulatory events during high-volatility downtrends
often produced immediate downside followed by partial 24h recovery.
```

That memory must be grounded in Event Impact cases and outcomes. It must not be generated as unsupported prose.

### Market Memory as Context

Market Memory may help explain why the same event type produced different outcomes:

- risk-on versus risk-off regime;
- high versus low liquidity;
- crowded versus neutral positioning;
- accelerating versus fading narrative;
- pre-event trend direction.

Event Impact should preserve these state conditions so Market Memory can use them later.

### No Circular Scoring

Avoid:

```text
Event Impact confidence
  -> Market Memory confidence
  -> Event Impact confidence
```

Each producer should record its evidence and version independently.

Market Memory may cite Event Impact evidence. It should not feed its own conclusion back as an unqualified input to the same Event Impact result.

### Selection in Shared Investigation Context

Research may eventually retain:

- selected event;
- selected Event Impact artifact;
- selected market memory;
- selected historical case.

These remain separate references with explicit roles:

- event: subject;
- impact: measured event-conditioned outcomes;
- memory: recurring synthesis;
- case: inspectable historical evidence.

## 7. Evidence Model

Event Impact must publish an evidence chain that is understandable without exposing raw implementation details.

### Event Evidence

Required:

- stable event reference;
- title;
- primary category;
- subtype;
- event timestamp;
- source;
- source reference where available;
- verification state;
- affected assets or market scope;
- structured event attributes;
- scheduled versus unscheduled status.

Quality questions:

- Is the timestamp precise?
- Is the source authoritative?
- Is the event duplicated?
- Is the affected asset explicit?
- Was the event public at the recorded time?

### Market State Evidence

Required when available:

- symbol;
- exchange;
- timeframe;
- state timestamp;
- trend regime;
- recent returns;
- volatility;
- volume state;
- funding;
- OI change;
- feature availability.

Quality questions:

- How old was the state at event time?
- Which features were missing?
- Was the state generated from the exact symbol?
- Was the state schema compatible?

### Outcome Evidence

Required:

- anchored event timestamp;
- observation window;
- source records;
- price return;
- case count for aggregates;
- missing coverage.

Optional when real data exists:

- max favorable move;
- max adverse move;
- volatility change;
- volume change;
- OI change;
- funding change;
- liquidation activity;
- liquidity change.

Quality questions:

- Is the full outcome window available?
- Are metrics based on comparable intervals?
- Are extreme cases dominating the average?
- Are missing cases excluded rather than treated as zero?

### Historical Comparable Evidence

Required:

- comparable event ids;
- category and subtype match;
- pre-event state compatibility;
- affected assets;
- event timestamps;
- outcome availability;
- reasons for inclusion;
- key differences.

Quality questions:

- Are these genuinely the same event type?
- Is the sample independent?
- Are overlapping events double counted?
- Does the market regime differ materially?

### Confidence Evidence

Confidence should be accompanied by:

- confidence value or level;
- contributing reasons;
- limiting factors;
- sample size;
- source quality;
- timestamp precision;
- comparable-state coverage;
- outcome consistency;
- missing evidence;
- contradictory evidence.

Confidence must not be inferred from a single input.

### Provenance

Required:

- source system;
- producer version;
- canonical data source;
- generated timestamp;
- event source references;
- market-data coverage;
- classification version;
- outcome model version.

Provenance should be concise in the product and complete in the prepared intelligence artifact metadata.

### Freshness

Freshness has two meanings:

1. Event freshness:
   - when the event occurred;
   - when it was detected;
   - when it was verified.

2. Intelligence freshness:
   - when outcomes were last updated;
   - which horizons are complete;
   - when the impact result was generated.

An event can be recent while its 24h and 7d outcomes remain incomplete.

### Evidence Roles

Use explicit roles:

- supporting;
- contradicting;
- contextual;
- missing;
- source reference.

The existing Intelligence Artifact supporting-evidence model can represent these concepts through evidence kind and metadata. No new registry is required.

### Confidence Framework

The initial confidence architecture should be transparent rather than mathematically ambitious.

Conceptual inputs:

- event verification quality;
- timestamp precision;
- affected-asset specificity;
- number of usable historical events;
- event attribute similarity;
- market-state comparability;
- outcome consistency;
- source completeness;
- confounder burden;
- Replay validation availability.

Possible output:

```text
Confidence: Moderate

Reasons:
- 22 verified comparable events.
- Pre-event volatility and trend were similar.
- 24h outcome direction was consistent in 64% of cases.

Limitations:
- Funding history was available for only 9 cases.
- Two macro events overlapped the sample.
```

Do not publish a numeric confidence score until the scoring definition is versioned and calibrated.

### Confounders

Event Impact should record major confounders:

- overlapping macro release;
- simultaneous exchange outage;
- broad market liquidation cascade;
- multiple related announcements;
- pre-event price move;
- low liquidity;
- source timestamp uncertainty;
- market-wide risk shock.

Confounders reduce attribution confidence. They do not necessarily invalidate the observed outcome.

## 8. Research Workflow

Event Impact belongs in Research, not as a heavy Dashboard workflow.

### Entry Points

Potential future entry points:

- an Information Flow item;
- a Narrative Shift;
- a Prediction Market change;
- a verified macro event;
- a Market-derived event such as Liquidation Cascade;
- direct Event Impact search;
- selected event from Replay.

Each entry should create or update the Shared Investigation Context with:

- symbol;
- exchange when relevant;
- timeframe;
- selected event;
- event timestamp;
- investigation type `event_impact`;
- origin.

### Research Sequence

```text
Selected Event
  -> Event Verification
  -> Current / Pre-Event Market State
  -> Observed Reaction
  -> Comparable Events
  -> Outcome Distribution
  -> Supporting and Contradicting Evidence
  -> Confidence and Limitations
  -> Replay Validation
```

### Event Summary

Research should show:

- what happened;
- category and subtype;
- timestamp;
- source;
- affected market;
- verification;
- whether outcome windows are complete.

This section should avoid interpretation beyond the verified event facts.

### Observed Reaction

Research should show actual market changes after the event:

- immediate price reaction;
- sustained or reversed move;
- volume;
- OI;
- funding;
- liquidations;
- volatility.

Each metric should identify its horizon.

### Historical Event Comparables

Research should show:

- comparable event count;
- selection reasons;
- key differences;
- pre-event state similarity;
- event attributes;
- selected comparable case.

The user should be able to inspect individual cases and then view the distribution.

### Outcome Analysis

Research should show:

- outcomes by 15m, 1h, 4h, 24h, and 7d;
- case count by horizon;
- average and median;
- positive/negative rate;
- best and worst case;
- dispersion;
- incomplete horizons.

No outcome should be shown before its real observation window completes.

### Why We Believe It

Research should present:

- strongest supporting evidence;
- strongest contradiction;
- major confounders;
- source quality;
- missing data;
- Replay validation status.

This follows:

```text
Conclusion
  -> Reasons
  -> Evidence
  -> Limitations
```

### Confidence

Research should explain confidence using existing evidence.

It should not show:

- unexplained numeric confidence;
- confidence inherited from a news classifier;
- confidence based only on narrative heat;
- confidence based only on event count.

### Replay Action

Enable Replay only when:

- event timestamp is verified;
- exchange is known;
- symbol is known;
- a valid historical window can be opened.

Replay inherits exact context. It does not find another event.

### Dashboard Relationship

Dashboard may eventually display a compact prepared Event Impact evidence line:

- verified event;
- observed direction;
- historical case count;
- confidence level;
- generated time.

Dashboard must not:

- classify events;
- compute outcomes;
- load historical event samples;
- block on Event Impact.

The deep workflow remains in Research.

### Unavailable States

Research should distinguish:

- event not verified;
- insufficient historical events;
- current outcome window incomplete;
- canonical market data unavailable;
- Replay coverage unavailable;
- intelligence not generated;
- version mismatch;
- request failure.

No unavailable condition should trigger computation inside the request.

## 9. Anti Goals

The Event Impact Engine must not:

- Classify every news article as a market event.
- Treat headlines as verified events automatically.
- Use LLM-generated explanations without source evidence.
- Use an LLM as the source of event timestamps, outcomes, or confidence.
- Present temporal proximity as proven causality.
- Expose unsupported confidence values.
- Duplicate Historical Analog state generation or similarity logic.
- Duplicate Replay reconstruction.
- Duplicate Market Memory synthesis.
- Create another cache, registry, storage layer, or ingestion platform.
- Trigger historical backfills from Research or Dashboard.
- Calculate event outcomes in user request paths.
- Silently substitute symbols, exchanges, or benchmarks.
- Combine market-wide and symbol-specific cases without labels.
- Mix scheduled event time, publication time, and detection time.
- Treat incomplete outcome windows as zero return.
- Hide low sample size.
- Hide contradictory events or confounders.
- Average across incompatible event subtypes.
- Use narrative heat as a proxy for measured impact.
- Use prediction-market probability as proof of market direction.
- Promote existing mock-backed event repositories to production.
- Generate trade recommendations.
- Optimize for the number of event cards or charts.

The system should prefer:

```text
Insufficient verified historical events
```

over an attractive but unsupported conclusion.

## 10. Future Roadmap

### Phase 1: Structured Event Catalog

Goal:

Establish a trustworthy collection of verified event records using existing review, source, and historical foundations.

Required work:

- finalize initial taxonomy and subtype definitions;
- define event identity and duplicate rules;
- define timestamp semantics;
- define source-quality requirements;
- define affected-asset and market-scope rules;
- define deterministic market-derived event thresholds;
- separate production records from mock-backed prototypes;
- connect events to the Shared Investigation Context.

Initial categories:

- Macro;
- ETF;
- Regulation;
- Exchange;
- Stablecoin;
- Liquidation Cascade;
- Funding Extreme;
- OI Expansion;
- Narrative Shift.

Exit criteria:

- Events are real and verified.
- Category and timestamp are reproducible.
- Source provenance is present.
- Duplicate handling is defined.
- No event impact claims are made yet.

### Phase 2: Event Outcome Statistics

Goal:

Measure what happened after each verified event.

Use existing:

- canonical OHLCV;
- canonical funding and OI when available;
- canonical liquidation data;
- historical outcome conventions;
- existing cache-first processing architecture.

Required work:

- attach pre-event market state;
- calculate exact 15m, 1h, 4h, 24h, and 7d outcomes;
- calculate favorable and adverse movement when supported;
- calculate derivatives and liquidation changes when covered;
- record incomplete windows;
- aggregate by category and compatible subtype.

Exit criteria:

- Outcome calculations are deterministic.
- Missing data remains explicit.
- No request-time computation occurs.
- Statistics show sample size and dispersion.

### Phase 3: Historical Event Intelligence

Goal:

Produce event-conditioned historical intelligence.

Required work:

- select comparable events;
- include pre-event state compatibility;
- expose reasons and key differences;
- identify supporting and contradictory evidence;
- record confounders;
- define and calibrate confidence;
- publish through the existing `event_impact` artifact contract or established cache consumer pattern.

Exit criteria:

- Research can answer what typically followed an event type.
- Confidence has reasons and limitations.
- Historical Analog remains a separate state-comparison system.
- Replay can validate selected event windows.

### Phase 4: Market Memory Integration

Goal:

Allow repeated event-conditioned patterns to inform Market Memory.

Required work:

- pass prepared Event Impact conclusions and evidence to Market Memory;
- preserve event category, pre-event state, and outcome distribution;
- identify recurring regimes where event effects strengthened, weakened, reversed, or failed;
- avoid circular scoring;
- keep event cases inspectable.

Exit criteria:

- Market Memory can describe recurring event-regime patterns.
- Event Impact remains the source of event-conditioned outcomes.
- Historical Analog remains the source of state similarity.
- Research can distinguish event, case, and memory evidence.

### Recommended Future Sequence

1. Finalize event taxonomy and verification policy.
2. Establish a real structured event catalog.
3. Attach existing prepared market states.
4. Measure exact outcomes from canonical data.
5. Validate selected events through Replay.
6. Build comparable-event selection with state context.
7. Add evidence, confounders, and transparent confidence.
8. Integrate the prepared result into Research.
9. Publish through the existing artifact model when durable publication is available.
10. Feed mature Event Impact outputs into future Market Memory.

### Prerequisites Before Implementation

Before implementation begins, architecture review should confirm:

- which event sources are production-approved;
- which current event modules are mock or experimental;
- the initial supported categories;
- timestamp precision requirements;
- canonical market-data coverage;
- minimum sample thresholds;
- outcome-window definitions;
- confidence semantics;
- artifact publication maturity;
- Research and Replay context handoff.

The first implementation should be narrow and real. One reliable event category with verified outcomes is more valuable than broad unsupported coverage.

## Existing Assets and Gaps

### Reusable Assets

- Canonical OHLCV, funding, OI, liquidation, and orderbook-summary contracts.
- Historical market-state model.
- Exact forward-outcome conventions.
- Historical Analog V2 state similarity.
- Replay window reconstruction.
- Intelligence Artifact `event_impact` type.
- Supporting-evidence categories.
- Shared Investigation Context design.
- Existing review-queue and accepted-link concepts.

### Gaps

- No production-grade verified event catalog.
- Existing mock ingestion and mock historical repositories cannot serve as production evidence.
- No accepted taxonomy version.
- No deterministic market-derived event thresholds.
- No event-conditioned outcome producer.
- No calibrated confidence model.
- No durable artifact publication.
- Uneven canonical derivatives coverage.
- No production Event Impact Research workflow.

These gaps define implementation prerequisites. They do not justify new infrastructure during this documentation sprint.

