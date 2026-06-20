# QuantTerminal Market Memory Engine Plan

Status: Research architecture  
Scope: Future evidence-backed market memory using existing platform foundations  
Last updated: 2026-06-20

## Purpose

QuantTerminal has three distinct historical intelligence questions:

```text
Historical Analog:
What looked like this?

Event Impact:
What happened after this type of event?

Market Memory:
What has the market repeatedly taught us, and how did similar regimes ultimately resolve?
```

Market Memory is the long-term synthesis layer.

Its purpose is not to predict the next move or convert history into a rule that always applies. Its purpose is to preserve recurring, evidence-backed market experience and retrieve it when the current investigation shares relevant conditions.

The intended flow is:

```text
Observed Market State or Event
  -> Verified Evidence
  -> Measured Outcomes
  -> Repeated Pattern
  -> Memory Artifact
  -> Future Retrieval
  -> Research Context
```

This plan defines memory concepts, lifecycle, evidence requirements, product relationships, and a future adoption sequence. It does not implement a memory engine, add infrastructure, create caches, change APIs, or alter the user interface.

The repository currently contains mock-backed Market Memory types, repositories, and panels. Those modules demonstrate useful vocabulary but are not production Market Memory. A future implementation must use real Historical Analog states and outcomes, verified Event Impact evidence, canonical market data, and the existing artifact foundation.

## 1. Market Memory Vision

### What Is Market Memory?

Market Memory is a versioned, evidence-backed synthesis of recurring market experience.

A memory describes:

- the conditions that repeatedly occurred;
- the cases and events supporting the pattern;
- the outcomes that followed;
- the conditions under which the pattern held;
- the conditions under which it failed;
- the confidence warranted by the evidence;
- the age, scope, and provenance of the conclusion.

Example:

```text
Memory:
High positive funding with expanding OI during a sideways market
often preceded volatility expansion, but direction was inconsistent.

Evidence:
31 historical states across BTCUSDT and ETHUSDT.

Outcome:
24h realized volatility increased in 22 cases.
Directional win rate remained near balanced.

Limitation:
Liquidation coverage was available for only 12 cases.
```

This is memory because it preserves a recurring lesson across cases. It is not a prediction that the next instance must behave the same way.

### What Does the Market Remember?

The phrase "market memory" refers to repeated structural and behavioral patterns visible in historical evidence:

- how regimes tended to transition;
- how participants responded to recurring events;
- how narratives accelerated and decayed;
- how leverage and liquidity conditions resolved;
- which outcome patterns repeated;
- which apparent patterns failed under changed conditions.

The market does not literally remember. QuantTerminal remembers measured experience on the user's behalf.

### Why Market Memory Exists

Individual historical cases are useful but cognitively expensive. Users must compare many cases, identify recurring conditions, discount outliers, and remember failure modes.

Market Memory compresses repeated evidence into a retrievable research object while preserving links to the underlying cases.

It should help answer:

- Which recurring environment does the current state resemble?
- How did that environment usually resolve?
- Which conditions strengthened the pattern?
- Which conditions caused it to fail?
- Is this memory still supported by current evidence?

### Difference from Historical Analog

Historical Analog is a retrieval system for individual states.

It answers:

> Which historical periods looked most similar to the current state?

Its result is primarily:

- ranked cases;
- similarity scores;
- comparable features;
- case outcomes;
- aggregate statistics for the current query.

Market Memory is a synthesis system across repeated historical evidence.

It answers:

> Which recurring pattern or regime has been observed across many cases, and what lessons survived repeated outcomes?

Its result is primarily:

- named memory;
- defining conditions;
- supporting and contradicting cases;
- outcome distribution;
- failure conditions;
- confidence and maturity;
- retrieval relevance.

Historical Analog may retrieve evidence for a memory. It should not generate narrative lessons or become the memory catalog itself.

### Difference from Event Impact

Event Impact begins with a verified event.

It answers:

> What happened after this type of event under comparable conditions?

Market Memory can accumulate Event Impact results across time.

It answers:

> What durable experience has emerged from repeated events and their differing contexts?

Event Impact may conclude:

```text
Negative regulatory events were associated with adverse 24h returns
in 18 comparable cases.
```

Market Memory may later conclude:

```text
Negative regulatory shocks during already-weak liquidity regimes
produced deeper and longer drawdowns than the same event class
during liquid uptrends.
```

The memory is broader because it integrates event type, market regime, outcomes, and failure conditions across evidence.

### Memory Is Not Prediction

Market Memory should never state:

```text
This happened before, therefore it will happen again.
```

It should state:

```text
Under these historical conditions, these outcomes occurred with
this frequency and variation. The current case differs in these ways.
```

Memory informs expectations. It does not determine the future.

### Memory Is Not Prose Storage

A paragraph saved by a user or generated by an LLM is not automatically Market Memory.

A production memory requires:

- defined scope;
- real evidence;
- measurable outcomes;
- reproducible inclusion rules;
- provenance;
- confidence;
- known limitations;
- a lifecycle state.

Narrative text is a presentation of memory, not its source of truth.

### Operating Principles

- Synthesize only from verified evidence.
- Preserve links to cases, events, states, and outcomes.
- Separate supporting evidence from contradicting evidence.
- Record conditions of success and failure.
- Keep symbols, exchanges, timeframes, and market scope explicit.
- Never silently generalize a symbol-specific memory to the entire market.
- Treat old memories as reviewable, not eternally true.
- Use deterministic retrieval and versioned definitions.
- Do not run synthesis during user requests.
- Expose confidence reasons and limitations.

## 2. Memory Types

Memory types should represent genuinely different forms of accumulated experience. They should not become duplicate labels for the same analog list.

### Regime Memory

Purpose:

Preserve recurring market environments and how they transitioned or resolved.

Examples:

- bull market;
- bear market;
- range market;
- high-volatility risk-off regime;
- low-volatility compression;
- liquidity recovery;
- post-capitulation stabilization.

Defining evidence:

- repeated historical market states;
- trend and volatility structure;
- participation and volume;
- funding and OI where available;
- regime duration;
- transition outcomes.

Questions answered:

- Which regime family resembles the current environment?
- How long did similar regimes persist?
- What transitions commonly followed?
- Which conditions preceded continuation, reversal, or range resolution?

Regime Memory must add synthesis beyond Historical Analog. A list of uptrend analogs is not yet a regime memory.

### Event Memory

Purpose:

Preserve accumulated experience from repeated verified event classes.

Examples:

- ETF approvals or rejections;
- exceptional ETF inflows or outflows;
- exchange failures;
- regulatory enforcement;
- macro shocks;
- stablecoin depegs;
- token unlocks;
- protocol exploits.

Defining evidence:

- verified Event Impact cases;
- event category and subtype;
- pre-event market state;
- observed outcomes;
- confounders;
- context-dependent differences.

Questions answered:

- How did this event class usually affect the market?
- Under which regimes was the impact amplified?
- When did the expected reaction fail?
- Did initial reactions persist or reverse?

Event Memory consumes Event Impact. It does not reclassify events or recalculate event outcomes.

### Narrative Memory

Purpose:

Preserve recurring attention cycles and the market behavior associated with them.

Examples:

- AI;
- real-world assets;
- stablecoins;
- Bitcoin institutional adoption;
- Ethereum scaling;
- meme speculation;
- DeFi revival;
- Layer 1 rotation.

Defining evidence:

- narrative heat and source coverage;
- regional participation;
- narrative acceleration and decay;
- related asset breadth;
- price and volume outcomes;
- event links where verified;
- contradictory periods.

Questions answered:

- How did this narrative typically emerge, accelerate, peak, and decay?
- Which assets participated?
- Did price lead attention or follow it?
- When did narrative heat fail to produce sustained market response?

Narrative Memory must not turn article counts into causal claims. It preserves observed attention and associated outcomes.

### Structural Memory

Purpose:

Preserve recurring market-microstructure and derivatives conditions.

Examples:

- funding extremes;
- OI expansions;
- leverage resets;
- liquidation cascades;
- liquidity crises;
- spread deterioration;
- post-liquidation recovery;
- cross-venue positioning divergence.

Defining evidence:

- canonical funding and OI;
- liquidation events;
- liquidity or orderbook summaries where prepared;
- price and volatility response;
- pre-condition duration;
- resolution path.

Questions answered:

- How did similar leverage conditions resolve?
- Did price continue with OI expansion or reverse after crowding?
- How often did liquidation cascades produce continuation versus recovery?
- Which liquidity conditions increased adverse outcomes?

Structural Memory requires deterministic event or state definitions. Terms such as "extreme" or "crisis" must be versioned.

### Setup Memory

Purpose:

Preserve recurring setup conditions and measured outcome patterns without replacing Trade execution planning.

Examples:

- breakout with expanding participation;
- failed breakout under weak volume;
- support hold after liquidation flush;
- range rejection with crowded funding;
- retest after narrative acceleration.

Defining evidence:

- setup conditions;
- selected market state features;
- actual outcomes;
- favorable and adverse movement where available;
- failure modes;
- sample size.

Questions answered:

- Under which conditions did this setup tend to work?
- What was the most common failure mode?
- Which confirmation variables mattered?

Setup Memory should remain evidence, not automated trade advice.

### Expectation Memory

Purpose:

Preserve how market expectations compared with realized outcomes.

Examples:

- heavily priced-in macro decision;
- prediction-market consensus;
- expected ETF approval;
- consensus narrative breakout;
- anticipated token unlock pressure.

Defining evidence:

- expectations captured before the outcome;
- source and timestamp;
- surprise;
- realized reaction;
- subsequent revision.

Questions answered:

- What happened when an event was already priced in?
- How did surprise magnitude affect the reaction?
- When did consensus prove wrong?

Expectation Memory is valid only when the expectation was recorded before the outcome.

### Failure Memory

Purpose:

Preserve recurring conditions under which a regime, event thesis, narrative, or setup failed.

Examples:

- bullish analogs failed under deteriorating liquidity;
- ETF-flow continuation failed when macro risk dominated;
- funding normalization did not prevent a further selloff;
- narrative heat peaked after price had already exhausted.

Defining evidence:

- contradicted outcomes;
- common missing conditions;
- confounders;
- state differences;
- sample coverage.

Questions answered:

- When should this memory not be applied?
- Which variables invalidated the recurring pattern?
- Which apparently similar cases resolved differently?

Failure Memory should usually be attached to another memory rather than presented as a disconnected warning catalog.

### Memory Scope

Every memory must declare its scope:

- symbol-specific;
- sector or asset-class;
- exchange-specific;
- market-wide;
- timeframe-specific;
- event-category-specific;
- narrative-specific.

Generalization beyond evidence scope is prohibited.

## 3. Memory Lifecycle

The required lifecycle is:

```text
Observation
  -> Evidence
  -> Outcome
  -> Stored Memory
  -> Future Retrieval
```

A production lifecycle should make validation, synthesis, and revision explicit:

```text
Observation
  -> Evidence Linked
  -> Outcome Completed
  -> Pattern Candidate
  -> Memory Validated
  -> Memory Published
  -> Future Retrieval
  -> Reinforced / Weakened / Superseded
```

### Stage 1: Observation

An observation is a real market state, verified event, narrative condition, structural condition, or setup.

Examples:

- a Historical Analog market state;
- a verified Event Impact event;
- a funding extreme defined by a versioned rule;
- a narrative shift with real source coverage;
- an execution setup with recorded conditions.

An observation is not a memory. It is a candidate piece of experience.

Required identity:

- symbol or market scope;
- exchange when relevant;
- timeframe;
- timestamp;
- source;
- observation type;
- versioned definition.

### Stage 2: Evidence

The observation is linked to evidence:

- canonical market data;
- market-state features;
- verified event record;
- narrative measurements;
- Replay window;
- source references;
- supporting and contradicting cases.

Evidence must remain inspectable.

No memory should exist only as a conclusion string.

### Stage 3: Outcome

Actual outcomes are attached after their real windows complete.

Possible outcomes:

- returns by horizon;
- maximum favorable movement;
- maximum adverse movement;
- volatility change;
- volume change;
- funding and OI changes;
- liquidation activity;
- regime transition;
- narrative continuation or decay;
- setup success or failure where defined.

Missing future coverage remains unavailable. Incomplete outcomes do not become zero.

### Stage 4: Pattern Candidate

A pattern candidate emerges when multiple compatible observations share:

- defining conditions;
- comparable scope;
- measurable outcomes;
- sufficient evidence to justify aggregation.

The candidate records:

- inclusion criteria;
- exclusion criteria;
- supporting cases;
- contradicting cases;
- sample size;
- outcome distribution;
- possible lesson;
- unresolved limitations.

A single compelling case should not become a broad memory.

### Stage 5: Memory Validated

A memory becomes valid when:

- its evidence is real and source-linked;
- its scope is explicit;
- its inclusion logic is reproducible;
- outcomes are sufficiently complete;
- sample size is disclosed;
- contradictions and failure modes are recorded;
- confidence is justified;
- no unsupported causal language is used.

Validation may conclude:

- ready;
- insufficient evidence;
- too broad;
- duplicate memory;
- conflicting evidence;
- unsupported generalization.

### Stage 6: Stored Memory

The validated memory is published through existing platform contracts.

The storage representation is outside this plan. The existing `market_memory` intelligence artifact type is the intended future producer-consumer boundary.

The memory must include:

- version;
- identity;
- title and summary;
- scope;
- defining conditions;
- evidence references;
- outcome summary;
- confidence;
- freshness;
- provenance;
- lifecycle status.

### Stage 7: Future Retrieval

Retrieval begins with Shared Investigation Context:

- symbol;
- exchange;
- timeframe;
- investigation timestamp;
- selected event or case when applicable.

The retrieval system returns relevant memories based on compatible public context and memory metadata.

Retrieval should be deterministic and explain why a memory was selected:

- same regime;
- same event category;
- same narrative;
- same structural condition;
- same symbol or market scope;
- compatible timeframe;
- similar state features.

Retrieval does not rewrite memory confidence.

### Stage 8: Reinforcement and Revision

New evidence may:

- reinforce the memory;
- weaken it;
- narrow its scope;
- split it into distinct memories;
- identify a new failure condition;
- supersede it with a newer version.

Memory should not be silently overwritten.

The system should preserve:

- prior version;
- reason for revision;
- new evidence;
- changed confidence;
- changed scope;
- superseding memory reference.

### Memory Lifecycle States

Conceptual states:

- `candidate`
- `insufficient_evidence`
- `validated`
- `active`
- `weakened`
- `superseded`
- `archived`
- `invalidated`

These states describe future research behavior. They do not require a new lifecycle service during this documentation sprint.

### Memory Freshness

Memory freshness differs from live-data freshness.

A historical memory does not become false merely because it is old. Freshness should describe:

- when evidence was last added;
- the latest included observation;
- whether recent evidence is represented;
- whether source definitions changed;
- whether the memory has been revalidated under the current schema.

Possible freshness labels:

- current;
- aging;
- historical;
- stale definition;
- awaiting revalidation.

Freshness must not erase the historical period the memory describes.

## 4. Relationship to Historical Analog

### Historical Analog Retrieves Cases

Historical Analog answers:

> Which individual historical states looked most like the current state?

Its evidence is query-specific:

- current state;
- ranked cases;
- similarity;
- comparable features;
- forward outcomes;
- query-time aggregate over prepared cache data.

### Market Memory Preserves Lessons

Market Memory answers:

> Across repeated cases, which durable pattern emerged, under what conditions, and how did it fail?

Its evidence is synthesis-specific:

- stable defining conditions;
- supporting cases across time;
- contradicting cases;
- recurring outcome distribution;
- regime transitions;
- failure conditions;
- maturity and confidence.

### Historical Analog as a Memory Input

Historical Analog V2 provides production-grade reusable inputs:

- market states;
- exact forward outcomes;
- deterministic similarity;
- comparable feature counts;
- aggregate horizon statistics.

Market Memory should consume those outputs rather than:

- rebuilding market states;
- implementing another similarity engine;
- recalculating outcomes;
- parsing raw historical data.

### Memory as a Retrieval Aid

Market Memory may guide Research toward:

- relevant analog groups;
- representative cases;
- failure cases;
- transitions worth inspecting.

It must not change Historical Analog rankings after the fact.

### Example

Historical Analog result:

```text
Current BTCUSDT state matched 22 prior high-volatility uptrends.
The selected case had 91% similarity.
```

Market Memory:

```text
High-volatility uptrends with expanding participation often continued
over 24h, but failure risk increased when funding was already extreme.

Supporting cases: 18
Contradicting cases: 7
Primary failure condition: positive funding above the defined threshold.
```

The memory is not one analog and is not the same as the current query aggregate. It preserves the recurring conditional lesson.

### When Analog and Memory Disagree

Historical Analog may retrieve recent cases that differ from a long-lived memory.

Research should show:

```text
Current analog sample:
Mostly positive 24h outcomes.

Long-term memory:
Mixed outcomes when funding was extreme.

Current difference:
Funding is currently extreme.
```

The disagreement reduces confidence and improves understanding.

No system should silently override the other.

### No Mandatory Analog Dependency

Some memories may originate from Event Impact or narrative cycles rather than state similarity.

Market Memory should use Historical Analog when state comparison is relevant, but it should not require an analog query for every retrieval.

## 5. Relationship to Event Impact

### Event Impact Analyzes an Event Class

Event Impact answers:

> What happened after this verified event type under comparable conditions?

It owns:

- event verification;
- taxonomy;
- event attributes;
- pre-event state;
- event-conditioned outcomes;
- comparable events;
- confounders;
- attribution confidence.

### Market Memory Accumulates Event Experience

Market Memory answers:

> What durable lesson emerged across repeated Event Impact results, regimes, and outcomes?

It may preserve:

- event effects by regime;
- expectation versus surprise patterns;
- persistence versus reversal;
- common confounders;
- conditions that amplified or muted impact;
- recurring failure modes.

### Example

Event Impact:

```text
ETF outflows were followed by negative 24h returns in 14 of 22
comparable events.
```

Market Memory:

```text
ETF outflows had the strongest downside association when they occurred
during weakening liquidity and negative price momentum. In liquid
uptrends, the same event class frequently produced only a temporary dip.
```

### Event Impact as Evidence

A memory linked to events should reference:

- Event Impact artifacts or prepared results;
- event ids;
- event category and version;
- pre-event states;
- measured outcomes;
- supporting and contradicting event cases;
- attribution limitations.

Market Memory must not reinterpret an unverified headline as an event.

### Memory Does Not Replace Event Impact

Users still need Event Impact for:

- the selected event;
- exact timing;
- current reaction;
- historical same-category outcomes;
- confounders;
- Replay validation.

Market Memory provides broader accumulated experience. It should link back to individual Event Impact cases.

### Avoid Circular Confidence

Event Impact may become evidence for memory.

Memory must not then feed its own confidence back into the same Event Impact result as independent evidence.

The provenance chain should remain:

```text
Event evidence
  -> Event Impact
  -> Market Memory
```

not:

```text
Event Impact
  -> Market Memory
  -> Event Impact confidence
```

### Incomplete Event Evidence

If Event Impact is unavailable:

- event memories relying on it cannot be generated or refreshed;
- existing memories remain historical but disclose outdated coverage;
- Research must not substitute narrative heat or raw news counts as event outcome evidence.

## 6. Memory Artifact Model

Market Memory should eventually publish through the existing `market_memory` intelligence artifact type.

This section defines the conceptual content. It does not create a schema or implementation.

### Identity

Each memory needs:

- stable public memory id;
- memory type;
- memory version;
- lifecycle status;
- scope;
- title;
- generated and updated timestamps;
- optional superseding memory reference.

The id must not expose a cache path or storage implementation.

### Title

The title names the recurring pattern.

Good:

```text
Crowded Positive Funding in Sideways Markets
```

Bad:

```text
BTC Will Fall After High Funding
```

Titles should describe conditions, not promise outcomes.

### Summary

The summary states:

- defining conditions;
- recurring observed outcome;
- key limitation.

Example:

```text
Sideways BTCUSDT periods with extreme positive funding and expanding OI
were frequently followed by volatility expansion, but direction was
mixed. Evidence is limited before 2024 for open-interest value.
```

### Memory Type and Scope

Required:

- regime, event, narrative, structural, setup, expectation, or failure;
- symbol-specific, sector, exchange, or market-wide scope;
- timeframe;
- applicable event category or narrative when relevant;
- start and end of evidence coverage.

### Defining Conditions

The memory records versioned conditions such as:

- trend regime;
- volatility range;
- return profile;
- volume state;
- funding threshold;
- OI change;
- liquidity state;
- event category;
- narrative stage;
- expectation state.

Conditions should use named fields and explicit thresholds.

### Evidence

Required evidence references may include:

- historical state ids;
- Historical Analog case ids;
- Event Impact artifact ids;
- verified event ids;
- Replay case or window references;
- outcome records;
- narrative measurements;
- canonical source references.

Evidence roles:

- supporting;
- contradicting;
- representative;
- failure case;
- source reference;
- missing.

The artifact should summarize evidence but preserve paths to inspect it.

### Outcome

The memory outcome model should include relevant measured dimensions:

- case count;
- usable case count by horizon;
- average and median returns;
- positive/negative rate;
- best and worst case;
- maximum favorable and adverse movement when available;
- transition outcome;
- persistence or reversal;
- distribution or dispersion;
- common failure mode.

Outcome dimensions vary by memory type. Missing dimensions remain unavailable.

### Lesson

The lesson is a concise synthesis:

- what tended to happen;
- under which conditions;
- what invalidated it.

It must be mechanically traceable to evidence.

Example:

```text
Continuation was more common when OI expansion accompanied price and
volume. Expansion without volume confirmation had a higher failure rate.
```

The lesson is not a recommendation to enter a trade.

### Confidence

Confidence requires:

- level or calibrated score;
- reasons;
- limitations;
- sample size;
- evidence diversity;
- contradiction rate;
- source quality;
- outcome completeness;
- condition stability;
- recency of validation.

No numeric confidence should be published until its model is versioned and calibrated.

### Freshness

Required:

- generated timestamp;
- last evidence timestamp;
- last validation timestamp;
- evidence coverage period;
- current, aging, historical, or awaiting-revalidation status.

### Provenance

Required:

- producer system;
- producer version;
- source datasets;
- state model version;
- outcome model version;
- Event Impact version when used;
- taxonomy or threshold versions;
- evidence references.

### Contradictions and Failure Conditions

Every mature memory should include:

- contradictory case count;
- strongest contradicting cases;
- conditions associated with failure;
- unresolved confounders;
- known coverage gaps.

A memory without failure conditions is likely too broad or immature.

### Retrieval Metadata

To support future deterministic retrieval:

- symbols;
- exchanges;
- timeframes;
- memory type;
- regime tags;
- event categories;
- narrative tags;
- structural-condition tags;
- evidence period;
- confidence;
- lifecycle state.

These align with the existing artifact subject and tag concepts.

### Conceptual Artifact

```text
MarketMemoryArtifact
  id
  version
  type
  status
  title
  summary
  scope
  definingConditions
  evidence
  outcomes
  lesson
  failureConditions
  confidence
  freshness
  provenance
  retrievalMetadata
```

This is a conceptual model only.

## 7. Research Integration

Market Memory belongs in Research as a synthesis layer after direct evidence.

The intended order is:

```text
Current State
  -> Historical Analog
  -> Event Impact
  -> Market Memory
  -> Evidence Review
  -> Decision
```

### Why Memory Comes After Direct Evidence

Users should first see:

- the current state;
- selected historical cases;
- selected events;
- measured outcomes.

Only then should Research show the broader memory synthesized from those observations.

Otherwise memory becomes an unexplained conclusion.

### Research Entry

Market Memory should use Shared Investigation Context:

- symbol;
- exchange;
- timeframe;
- investigation timestamp;
- selected historical case;
- selected event;
- investigation type.

Memory retrieval remains manual-load or explicit artifact selection.

No automatic heavy polling.

### Memory Summary

Research should show:

- memory title;
- memory type;
- applicability;
- concise lesson;
- confidence;
- last validated time;
- supporting and contradicting case counts.

Example:

```text
Structural Memory
Crowded Funding During Sideways Markets

Lesson:
Volatility expansion was common; direction remained mixed.

Evidence:
31 supporting cases / 12 contradicting cases

Confidence:
Moderate

Last validated:
2026-06-01
```

### Why This Memory Was Retrieved

Research must explain retrieval:

- same symbol or market scope;
- same timeframe;
- matching trend regime;
- matching funding condition;
- matching event category;
- matching narrative stage;
- selected analog cases overlap.

The memory should not appear as an opaque recommendation.

### Supporting Evidence

Research should allow inspection of:

- representative Historical Analog cases;
- Event Impact cases;
- outcome distributions;
- Replay links with verified coordinates;
- contradicting cases;
- source coverage.

### Differences from the Current Investigation

Research should show:

- current conditions matching memory;
- current conditions differing from memory;
- missing current features;
- stale memory definitions;
- unsupported scope differences.

Example:

```text
Matches:
- Sideways regime
- Positive funding extreme
- Expanding OI

Differs:
- Current liquidity is stronger than the memory sample.
- Narrative participation is broader.
```

### Confidence and Limitations

Research should display:

- confidence reasons;
- sample size;
- contradiction rate;
- freshness;
- source limitations;
- incomplete features.

It must not inherit an unexplained confidence value from current mock Market Memory modules.

### Selecting a Memory

Selecting a memory updates Shared Investigation Context with:

- public memory id;
- memory type;
- symbol or market scope;
- timeframe;
- producer/source;
- reference timestamp.

The selected memory may coexist with:

- selected historical case;
- selected event.

Their roles remain distinct.

### Replay Relationship

A memory is not a Replay window.

Research enables Replay only after the user selects:

- a supporting historical case; or
- a verified event with exact exchange, symbol, date, and hour.

### Dashboard Relationship

Dashboard may eventually show a compact prepared memory evidence line if it remains lightweight:

- memory title;
- one lesson;
- confidence level;
- last validated time.

Dashboard must not:

- retrieve broad memory catalogs;
- synthesize memory;
- inspect supporting cases;
- block on memory availability.

The deep workflow remains in Research.

### Scanner and Trade Relationship

Market Memory should not directly rerank Scanner or generate Trade setups until:

- the memory producer is production-grade;
- confidence is calibrated;
- applicability rules are explicit;
- product impact is evaluated.

Initially, memory is research evidence only.

### Unavailable States

Research should distinguish:

- memory not requested;
- no compatible memory;
- insufficient evidence;
- memory superseded;
- memory awaiting revalidation;
- source coverage missing;
- artifact unavailable;
- request failure.

It must not show a mock tactical takeaway as production memory.

## 8. Anti Goals

Market Memory must not:

- Create narrative fiction.
- Create unsupported lessons.
- Create memory without inspectable evidence.
- Treat one case as a recurring memory.
- Replace Historical Analog.
- Replace Event Impact.
- Replace Replay.
- Recalculate market states already owned by Historical Analog V2.
- Recalculate event outcomes already owned by Event Impact.
- Store raw provider data as memory.
- Store arbitrary LLM prose as memory.
- Use an LLM as the source of outcome, confidence, or evidence.
- Present mock-backed repository output as production memory.
- Silently generalize symbol-specific evidence to the market.
- Silently substitute BTCUSDT or another benchmark.
- Mix incompatible timeframes.
- Mix event categories because their price outcomes look similar.
- Hide contradictory cases.
- Hide sample size.
- Treat missing outcomes as zero.
- Preserve obsolete definitions without revalidation status.
- Produce trade recommendations.
- Create permanent rules from temporary regimes.
- Build another infrastructure layer.
- Create a new cache, registry, builder, database, or global state system during the product-design phase.
- Automatically poll memory in Research.
- Surface memory before direct evidence.
- Collapse memory, analog, event, and case into one ambiguous concept.
- Allow circular confidence between Event Impact and Market Memory.

Market Memory should synthesize, not speculate.

## 9. Future Roadmap

### Phase 1: Memory Catalog

Goal:

Define and curate a small catalog of evidence-backed memory candidates.

Use existing:

- Historical Analog V2 market states and outcomes;
- canonical market data;
- verified Event Impact results when available;
- artifact model;
- Shared Investigation Context.

Work:

- finalize memory types;
- define scope rules;
- define candidate and validation criteria;
- identify duplicate and overlapping memory concepts;
- separate mock-backed memory records from production candidates;
- define lifecycle and versioning;
- select a narrow initial set of real memories.

Recommended initial memories:

- one regime memory;
- one structural memory;
- one event memory after Event Impact is production-ready.

Exit criteria:

- Each candidate has real evidence.
- Each candidate has explicit scope.
- Each candidate has supporting and contradicting cases.
- No memory is yet retrieved automatically.

### Phase 2: Memory Retrieval

Goal:

Retrieve relevant validated memories for Shared Investigation Context.

Work:

- define deterministic compatibility rules;
- explain retrieval reasons;
- enforce symbol, scope, exchange, and timeframe compatibility;
- rank by applicability, confidence, freshness, and evidence quality;
- preserve manual-load behavior in Research;
- return explicit no-compatible-memory states.

Exit criteria:

- Retrieval is reproducible.
- Users understand why a memory appeared.
- Unsupported contexts do not receive benchmark memories.
- Retrieval does not calculate new memory.

### Phase 3: Memory Evidence Linking

Goal:

Make every memory inspectable.

Work:

- link Historical Analog cases;
- link Event Impact cases;
- link outcomes;
- link verified Replay windows;
- mark supporting, contradicting, representative, and failure cases;
- expose provenance and freshness;
- identify superseded memory versions.

Exit criteria:

- Every lesson is traceable.
- Contradicting evidence is visible.
- Replay actions use exact verified coordinates.
- No raw cache ids are exposed as the product contract.

### Phase 4: Memory-Driven Research Workflows

Goal:

Integrate memory into the Research investigation sequence.

Work:

- show memory after current state, analogs, and Event Impact;
- show retrieval reasons and current differences;
- compare memory with current evidence;
- expose confidence and limitations;
- preserve Shared Investigation Context;
- support deliberate memory selection.

Exit criteria:

- Research can answer what the market has repeatedly taught.
- Memory does not duplicate the analog case list.
- Memory disagreement reduces confidence visibly.
- Research remains useful without memory availability.

### Phase 5: Intelligence Artifact Integration

Goal:

Publish and consume Market Memory through the existing intelligence artifact model.

Prerequisite:

The current in-memory reference registry must be replaced or supplemented by an operational durable publication path. This phase does not require a new artifact model.

Work:

- publish `market_memory` artifacts;
- include evidence, confidence, freshness, provenance, and public subjects;
- support artifact search by symbol, exchange, timeframe, event, narrative, and memory type;
- preserve lifecycle states such as active, weakened, superseded, and archived;
- decouple Research from producer modules.

Exit criteria:

- Research consumes memory artifacts through established readers.
- Producer replacement does not redesign Research.
- Memory versions and supersession remain inspectable.

### Recommended Roadmap

1. Define production memory types and scope.
2. Mark current mock-backed Market Memory as prototype-only.
3. Select a narrow real evidence set from Historical Analog V2.
4. Create memory candidates with supporting and contradicting cases.
5. Validate lifecycle, confidence, and freshness semantics.
6. Add deterministic retrieval using Shared Investigation Context.
7. Link cases, outcomes, and Replay evidence.
8. Integrate manual memory retrieval into Research.
9. Add Event Memory after Event Impact is production-ready.
10. Publish through the existing artifact model when durable publication exists.

### Implementation Gate

Implementation should not begin until:

- Historical Analog coverage is sufficient for the selected scope;
- memory categories and definitions are accepted;
- minimum evidence requirements are defined;
- current mock-backed modules are clearly separated;
- confidence semantics are agreed;
- Research investigation context is available;
- artifact publication maturity is understood.

The first production memory should be narrow, measurable, and inspectable.

## 10. End-State Vision

QuantTerminal's historical intelligence should operate as three cooperating layers.

### State Intelligence

Owned by Historical Analog and market-state systems.

Answers:

- What does the current market look like?
- Which historical states were similar?
- What happened after those states?

Outputs:

- market states;
- analog cases;
- similarity reasons;
- state-conditioned outcomes.

### Event Intelligence

Owned by Event Impact.

Answers:

- What verified event occurred?
- What changed after it?
- What happened after comparable events?
- How strong is the attribution evidence?

Outputs:

- event identity;
- event-conditioned outcomes;
- comparable events;
- confounders;
- impact confidence.

### Market Memory

Owned by the future Market Memory producer.

Answers:

- Which recurring regime, event pattern, narrative cycle, or structural condition has the market exhibited?
- What durable lesson emerged?
- Under which conditions did it hold?
- Under which conditions did it fail?
- Is the memory still supported?

Outputs:

- memory artifacts;
- recurring conditions;
- synthesized outcomes;
- failure conditions;
- supporting and contradicting evidence;
- confidence and freshness.

### Combined Research Flow

```text
Current Investigation
  -> State Intelligence
  -> Event Intelligence
  -> Market Memory
  -> Evidence and Contradictions
  -> Confidence and Limitations
  -> User Decision
```

### Example End State

```text
Current State:
ETHUSDT is in a high-volatility uptrend with expanding OI.

Historical Analog:
24 similar states; 24h outcomes were positive in 63% of usable cases.

Event Impact:
A verified regulatory decision occurred. Comparable events had mixed
24h outcomes and strong regime dependence.

Market Memory:
Regulatory shocks during liquid uptrends often caused brief volatility
without ending the trend. The memory weakened when funding was extreme.

Current Difference:
Funding is currently elevated.

Confidence:
Moderate. State evidence is constructive, event evidence is mixed,
and the primary memory failure condition is present.
```

No layer predicts the future. Together they make the evidence and uncertainty easier to reason about.

### Architectural Outcome

The end-state platform is:

```text
State Intelligence
  +
Event Intelligence
  +
Market Memory
```

working through:

- canonical real data;
- deterministic prepared intelligence;
- existing cache-first consumption;
- evidence-backed artifacts;
- Shared Investigation Context;
- Research as the primary synthesis workspace;
- Replay as inspectable historical evidence.

The goal is not to make the system sound experienced.

The goal is to make its experience real, retrievable, and accountable.

## Existing Assets and Gaps

### Reusable Assets

- Historical Analog V2 market states.
- Exact forward outcomes.
- Historical Analog case evidence.
- Canonical market-data contracts.
- Event Impact architecture.
- Replay evidence.
- Intelligence Artifact `market_memory` type.
- Supporting-evidence contract.
- Shared Investigation Context.
- Research Renaissance workflow.
- Existing memory-record and relationship concepts.

### Gaps

- Current Market Memory engine is mock-backed.
- Current Market Memory repository uses mock Replay cases and derived tactical prose.
- No production memory catalog exists.
- No validated memory definitions or minimum sample rules exist.
- No deterministic production retrieval model exists.
- No memory confidence calibration exists.
- No lifecycle for weakened or superseded memory is implemented.
- No durable memory artifact publication exists.
- Existing memory, event-linker, similar-event, and outcome panels overlap conceptually.
- Research currently presents a simplified manual memory panel rather than an evidence-backed memory workflow.

These gaps define future work. They are not reasons to add new infrastructure before the product and evidence contracts are validated.

