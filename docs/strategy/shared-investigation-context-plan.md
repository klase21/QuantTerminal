# QuantTerminal Shared Investigation Context Plan

Status: Product workflow architecture  
Scope: Cross-page investigation continuity  
Last updated: 2026-06-20

## Purpose

QuantTerminal has the intelligence required to support a continuous investigation, but its product surfaces do not yet share a consistent investigation identity.

A user may inspect ETHUSDT on Dashboard, enter Research where historical controls default to BTCUSDT and 1h, select an analog in Historical Intelligence, then open Replay on a default or unrelated time window. Each page can be internally correct while the complete workflow is wrong.

The Shared Investigation Context defines the minimum portable information required to preserve the user's subject and selected evidence across:

- Dashboard;
- Research;
- Historical Intelligence;
- Replay;
- future Event Impact;
- future Market Memory.

This plan does not introduce a global store, registry, cache, or new backend service. It defines product ownership, public context fields, propagation rules, invalidation rules, and an incremental adoption sequence using existing routing and systems.

## 1. Investigation Context Definition

### Core Definition

An Investigation Context is a small, user-facing description of the question currently being investigated.

It identifies:

- the market subject;
- the temporal resolution;
- the investigation purpose;
- the current point in time;
- any selected historical case or event.

It is not an intelligence result. It does not contain market data, analog statistics, Replay datasets, confidence calculations, cache manifests, or internal implementation identifiers.

### Minimum Fields

#### Symbol

Meaning:

The exact market symbol under investigation.

Examples:

- `BTCUSDT`
- `ETHUSDT`
- `SOLUSDT`

Rules:

- Normalize to the canonical uppercase symbol used by the target exchange.
- Never silently substitute another symbol.
- A selected historical case must normally use the same symbol unless a product explicitly supports and labels cross-symbol comparison.
- If a target module has no coverage for the symbol, it returns an explicit unavailable state while preserving the requested symbol.

Ownership:

- The initiating user action or source page owns the initial symbol.
- A deliberate symbol change by the user creates a revised investigation context.
- Downstream modules consume the symbol; they do not replace it with local defaults when it is present.

#### Exchange

Meaning:

The exchange or market venue that defines the symbol and historical source identity.

Examples:

- `binance_futures`
- `binance_spot`

Rules:

- Exchange and symbol together form market identity.
- Exchange must be explicit before opening venue-specific Replay data.
- If the upstream source is exchange-agnostic, exchange may be absent until a venue-specific workflow is selected.
- A downstream default may be used only when exchange is absent and the UI clearly identifies the default.
- Exchange must not be inferred from a cache path exposed to the user.

Ownership:

- Markets or the initiating signal source may establish exchange.
- Historical case metadata establishes the exchange for Replay only when verified.
- Replay owns user-driven exchange changes after entry.

#### Timeframe

Meaning:

The analysis resolution of the investigation.

Examples:

- `1h`
- `4h`
- `1d`

Rules:

- Timeframe describes analytical state, not Replay duration.
- It must map to a supported public interval.
- Changing timeframe invalidates selected historical cases whose similarity was calculated for another interval.
- Replay may display finer-grained candles while retaining the originating analytical timeframe as context.

Ownership:

- The initiating workflow establishes the timeframe.
- Research and Historical Intelligence may allow deliberate changes.
- Replay consumes the timeframe as provenance but owns its display resolution.

#### Investigation Type

Meaning:

The user's current research question.

Recommended public values:

- `market_state`: understand the current market state.
- `historical_analog`: compare the current state with similar historical states.
- `historical_case`: inspect one selected historical case.
- `event_impact`: inspect the effect of a selected event.
- `market_memory`: inspect a recurring market regime or memory.
- `replay`: reconstruct a verified historical window.

Rules:

- Investigation type controls workflow emphasis, not data identity.
- Pages may support several investigation types.
- Unknown values should fall back to a neutral market-state view without discarding symbol, exchange, timeframe, or timestamp.
- Investigation type must not expose a producer class or cache dataset name.

Ownership:

- The user action that changes the research question owns the type.
- Opening Historical Intelligence changes the type to `historical_analog`.
- Selecting a case changes it to `historical_case`.
- Opening Replay changes it to `replay`.

#### Selected Historical Case

Meaning:

The user-selected historical period being treated as evidence.

Required public attributes when available:

- case id or stable public case reference;
- symbol;
- exchange when known;
- historical timestamp;
- analytical timeframe;
- Replay date and hour only when verified;
- source producer, such as Historical Analog V2.

Rules:

- A selected case is optional.
- A case belongs to the symbol and timeframe for which it was produced.
- Changing symbol or timeframe clears an incompatible selected case.
- A case reference must not be a raw cache file path, manifest path, partition key, or storage-specific id.
- Replay is enabled only when exchange, symbol, date, and hour are verified.
- A case date without a verified hour is sufficient for historical analysis but not for an exact Replay deep link.

Ownership:

- Historical Intelligence owns case selection.
- Research may display and update the selected case when embedding the same case workflow.
- Replay consumes the selected case and must not reinterpret it as a different window.

#### Selected Event

Meaning:

A verified event under investigation.

Required public attributes when Event Impact exists:

- stable public event id;
- event type or category;
- observed timestamp;
- affected symbol or market scope;
- source reference;
- verification status.

Rules:

- A selected event is optional.
- Only verified real events may become investigation context in production.
- Event identity is independent of cache identity.
- An event may be market-wide, but any symbol-level impact claim must identify the affected symbol.
- Changing to an unrelated symbol should clear or explicitly retain the event as market-wide context.

Ownership:

- Future Event Impact or a verified information-flow source owns event selection.
- Research owns whether the event remains active in the investigation.

#### Investigation Timestamp

Meaning:

The market-state time the user is investigating.

Rules:

- For a current investigation, it is the timestamp of the prepared current state or the time the context was established.
- For a historical case, it is the selected case timestamp.
- For an event investigation, it is the event timestamp unless the user selects another reference time.
- Store and transmit timestamps in UTC using ISO 8601 or epoch milliseconds.
- Do not replace an explicit timestamp with "now."
- Display formatting may use the user's timezone, but identity remains UTC.

Ownership:

- The initiating source establishes the timestamp.
- Selecting a historical case or event deliberately replaces it.
- Replay derives its date and hour from the verified historical timestamp when exact coordinates are available.

### Recommended Supporting Fields

The following fields improve provenance without becoming mandatory identity:

- `origin`: Dashboard, Research, Historical Intelligence, Replay, Event Impact, or Market Memory.
- `originReason`: tactical alert, historical evidence, user search, selected analog, selected event, or direct navigation.
- `setup`: selected setup label when the investigation originated from a signal.
- `direction`: source direction when known.
- `confidence`: source confidence when known and properly labeled.
- `reason`: concise source explanation.
- `contextVersion`: version of the public context contract.

These are hints. They must not override canonical intelligence returned by the destination.

### Conceptual Context Envelope

The public contract can be described conceptually as:

```text
InvestigationContext
  contextVersion
  symbol
  exchange?
  timeframe
  investigationType
  investigationTimestamp
  selectedHistoricalCase?
  selectedEvent?
  origin?
  originReason?
```

This is an architecture description, not an implementation requirement for a new shared package.

### Ownership Rules

#### The URL Is the Portable Handoff

Cross-page context should be represented by stable, human-inspectable route parameters.

Benefits:

- links are shareable;
- browser history retains investigation transitions;
- refresh does not destroy context;
- pages remain independently loadable;
- no global state service is required.

#### Each Page Owns Local Interaction State

A page may maintain local UI state such as:

- active panel;
- loading status;
- selected row;
- expanded evidence;
- chart zoom;
- manual-load state.

Local state is not a second authoritative Investigation Context. When a user makes a context-changing choice, the page should update the public route context or use it in the next cross-page link.

#### Producers Own Intelligence, Not Context

Historical Analog owns similarity and outcome results. Replay owns historical reconstruction. Event Impact will own event outcome intelligence.

They do not own the user's cross-page investigation identity. They return results associated with that identity.

#### Destinations Validate Context

Every destination:

1. parses supported public fields;
2. normalizes symbol, exchange, timeframe, and timestamp;
3. rejects or ignores invalid optional fields;
4. preserves valid context even if data is unavailable;
5. never silently replaces explicit values with defaults.

#### Defaults Apply Only to Missing Fields

Defaults may make a directly opened page useful.

Examples:

- Historical Intelligence may default to `BTCUSDT / 1h`.
- Replay may prefill a safe completed window.

Once an explicit value is provided, the default must not override it.

## 2. User Journey

### Target Journey

```text
Dashboard
  -> Research
  -> Historical Analog
  -> Replay
  -> Decision
```

The subject remains stable unless the user deliberately changes it.

### Dashboard: Establish the Question

Example:

Dashboard is focused on an ETHUSDT tactical alert.

Context:

```text
symbol: ETHUSDT
exchange: binance_futures
timeframe: 1h
investigationType: market_state
investigationTimestamp: <current prepared state time>
origin: dashboard
originReason: tactical_alert
```

Dashboard provides:

- market conclusion;
- primary reasons;
- compact evidence;
- alert setup and confidence where available.

The user chooses "Research" or an equivalent deep-investigation action.

Dashboard does not calculate historical context. It transfers the question.

### Research: Expand the Question

Research receives ETHUSDT, Binance Futures, 1h, and the investigation timestamp.

It uses the context to:

- display the current state under investigation;
- load relevant live narrative and information context;
- preserve source setup and reason;
- offer manual Historical Analog loading for ETHUSDT 1h.

Research must not default its historical loader to BTCUSDT when ETHUSDT is explicit.

The user chooses to inspect similar historical cases.

### Historical Analog: Select Evidence

Historical Intelligence receives:

```text
symbol: ETHUSDT
timeframe: 1h
investigationType: historical_analog
investigationTimestamp: <current state time>
origin: research
```

It reads the existing Historical Analog V2 cache and presents:

- the current state used by the builder;
- ranked similar cases;
- similarity reasons;
- forward outcomes.

The user selects a historical case.

The context becomes:

```text
investigationType: historical_case
selectedHistoricalCase:
  symbol: ETHUSDT
  timestamp: <historical case timestamp>
  timeframe: 1h
  source: historical-analog-v2
  exchange/date/hour: <only if verified>
```

The original current-state timestamp may remain as provenance, while the selected case timestamp becomes the active evidence timestamp.

### Replay: Reconstruct the Selected Case

If verified Replay coordinates exist, the user opens Replay.

Replay receives:

- exchange;
- symbol;
- exact date;
- exact hour;
- originating analytical timeframe;
- selected case reference;
- origin.

Replay prefills controls from the context. It does not require manual re-entry and does not choose a latest-safe window over explicit coordinates.

Replay remains user-driven. Context inheritance may prefill controls, but heavy loading should follow established Replay behavior and product policy.

### Decision: Return with Evidence

After examining the case, the user may return to Research or proceed to Markets or Trade.

The return path should preserve:

- symbol;
- exchange;
- timeframe;
- selected historical case;
- investigation timestamp;
- origin trail where useful.

Research can then present:

- what is happening now;
- what happened in the selected case;
- what usually happened across analogs;
- key supporting and contradictory evidence;
- confidence and limitations.

The system assists decision quality. It does not manufacture a trade recommendation.

## 3. Context Propagation

### Public Route Parameters

Cross-module propagation should use a small set of stable public route parameters.

Recommended names:

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

Replay-specific verified coordinates remain:

- `date`
- `hour`

Existing signal context may remain:

- `setup`
- `direction`
- `confidence`
- `reason`

Not every route must accept every field immediately. Unsupported fields should be ignored safely rather than copied into local ad hoc names.

### URL Examples

Dashboard to Research:

```text
/research?symbol=ETHUSDT&exchange=binance_futures&timeframe=1h&investigation=market_state&timestamp=<UTC>&source=dashboard
```

Research to Historical Intelligence:

```text
/historical-intelligence?symbol=ETHUSDT&exchange=binance_futures&timeframe=1h&investigation=historical_analog&timestamp=<UTC>&source=research
```

Historical Intelligence to Replay:

```text
/replay?exchange=binance_futures&symbol=ETHUSDT&date=2025-08-01&hour=20&timeframe=1h&investigation=replay&case=<public-case-reference>&caseTimestamp=<UTC>&source=historical-intelligence
```

### Context Resolution Order

Each destination should conceptually resolve context in this order:

1. Explicit valid URL fields.
2. Valid local state created by deliberate user interaction on that page.
3. Page default for fields that are absent.

Never:

1. Page default.
2. URL.

That reversal caused the class of fragmentation where an explicit historical date or symbol was replaced by a local default.

### Validation Rules

#### Symbol

- trim;
- uppercase;
- permit only the existing supported symbol syntax;
- preserve explicit unsupported symbols as requested context while showing coverage unavailable.

#### Exchange

- accept known public exchange ids;
- do not infer spot versus futures from symbol alone when exact venue matters.

#### Timeframe

- accept supported analytical intervals;
- map legacy `interval` parameters to `timeframe` during migration where necessary;
- emit one canonical parameter in new links.

#### Timestamp

- accept valid ISO UTC or epoch time;
- reject invalid timestamps without replacing another valid context field;
- label whether it represents current state, case, or event.

#### Historical Case

- accept a stable public reference and public coordinates;
- validate symbol and timeframe consistency;
- never expose filesystem or cache identity.

#### Event

- accept a stable public event reference;
- require verified timestamps before enabling historical outcome or Replay actions.

### Invalidating Dependent Context

Changing a parent field invalidates incompatible child selections.

Rules:

- Changing symbol clears selected historical case unless the case explicitly belongs to the new symbol.
- Changing timeframe clears a case generated for another timeframe.
- Changing exchange clears venue-specific Replay coordinates when they belong to another exchange.
- Changing investigation timestamp clears stale current-state results.
- Selecting a historical case clears an unrelated selected event unless the workflow explicitly links them.
- Selecting an event does not erase the symbol if the event applies to that symbol.

Invalidation should be visible. The interface should not silently retain a case that no longer matches the parent context.

### Context and Data Loading

Context propagation does not imply automatic heavy loading.

Examples:

- Research receives symbol and timeframe immediately but Historical Analog remains manual-load.
- Replay receives date and hour but follows the established user-driven loading policy.
- Event Impact can receive an event id before its prepared artifact is requested.

The context tells a module what to load if requested. It does not authorize request-time computation.

### Context and Caching

Investigation Context must not contain:

- cache namespace;
- dataset id;
- manifest version;
- schema partition;
- payload filename;
- file path;
- storage key.

Consumers may use public context to query existing routes. Those routes own cache identity construction and validation.

### Context and Intelligence Artifacts

The future artifact ecosystem already provides public subjects:

- symbols;
- exchanges;
- event ids;
- case ids.

Investigation Context can later query artifacts using those public subjects. It must not depend on a registry implementation or store artifact payloads inside the URL.

### No Global Authority Store

This plan does not recommend a permanent client-wide mutable store for investigation context.

The preferred model is:

```text
URL for portable identity
  + page-local state for interaction
  + existing APIs for data
```

A small parser or link helper may later reduce duplication, but it must remain a utility, not a new state platform.

## 4. Replay Integration

### Replay Context Requirements

Replay requires a more precise context than other modules.

Minimum to prefill a historical window:

- exchange;
- symbol;
- date;
- hour.

Recommended provenance:

- analytical timeframe;
- selected historical case reference;
- case timestamp;
- origin.

### Inheritance Behavior

When Replay opens from a selected historical case:

1. Use the explicit exchange.
2. Use the exact case symbol.
3. Derive date and hour only from the verified case timestamp or prepared Replay coordinates.
4. Preserve timeframe as analytical provenance.
5. Identify the selected case in the Replay header or return link where appropriate.

Replay must not:

- replace the case date with today's date;
- replace it with the latest-safe window;
- substitute BTCUSDT;
- infer Binance Spot when Binance Futures was selected;
- search for a different case;
- recompute Historical Analog.

### Partial Coordinates

Historical Analog can produce a valid historical case without enough information for exact Replay.

If exchange, date, or hour is missing:

- retain the selected case in Research and Historical Intelligence;
- disable the Replay action;
- state `Replay coordinates unavailable`;
- do not construct a partial deep link that falls back to an unrelated Replay window.

### Replay Local Changes

If the user changes exchange, symbol, date, or hour inside Replay, Replay creates a revised local investigation context.

The selected historical case should then be:

- retained only if the window still matches the case; or
- visibly cleared as no longer applicable.

Replay controls are not subordinate forever to the upstream context. Inheritance initializes the workflow; deliberate user action owns subsequent local changes.

### Return Path

Replay should be able to return to Research or Historical Intelligence with:

- the original current subject;
- selected case;
- Replay window actually viewed.

The return context should not include loaded trades, candles, liquidations, OI, funding, or orderbook data.

## 5. Historical Analog Integration

### Current-State Identity

Historical Analog requires:

- symbol;
- timeframe;
- the prepared current state represented by the cache.

The requested investigation timestamp and the cache's current-state timestamp may differ.

Historical Intelligence must display the state timestamp actually used by Historical Analog V2. It should not imply that an older cache represents the exact current moment.

### Manual Cache Consumption

Context propagation preserves identity, but Historical Analog remains manual-load or cache-read only.

Flow:

```text
Investigation Context
  -> user requests historical context
  -> existing cache-only API
  -> validated analog result
```

No builder, backfill, historical search, or outcome calculation runs in the interaction.

### Selected Analog as Context

When the user selects an analog:

- set investigation type to `historical_case`;
- attach the stable public case reference;
- attach case symbol and timeframe;
- attach case timestamp;
- attach producer/source;
- attach verified Replay coordinates only if available.

The selected case becomes evidence within the broader investigation. It does not erase the original current market-state question.

Conceptually, the context retains:

```text
Current subject:
  ETHUSDT / 1h / current-state timestamp

Selected evidence:
  ETHUSDT / 1h / historical-case timestamp
```

This distinction prevents the historical case from being mistaken for the current market.

### Case Compatibility

A case is compatible when:

- symbol matches;
- timeframe matches;
- producer contract is supported;
- case timestamp is valid.

If the user changes symbol or timeframe, incompatible selected case context is cleared.

### Cross-Symbol Analogs

Historical Analog V2 currently prohibits silent cross-symbol substitution.

The Shared Investigation Context preserves that rule.

If a future system intentionally supports cross-symbol analogs:

- requested symbol and matched symbol must both be explicit;
- the comparison type must be labeled;
- Replay must open the matched symbol, not the requested symbol;
- no benchmark may be presented as symbol-specific history.

## 6. Event Impact Integration

Event Impact is future work, but its public context can fit the same model.

### Event Selection

Selecting a verified event adds:

- event id;
- event type;
- event timestamp;
- event source;
- affected symbol or market scope;
- verification state.

It changes investigation type to `event_impact`.

### Event and Market Context

An event does not replace market identity.

The context should preserve:

- which event occurred;
- which symbol is being evaluated;
- which exchange is relevant;
- which timeframe or outcome horizon is under review;
- which timestamp anchors the analysis.

Example:

```text
event: verified ETF flow release
symbol: BTCUSDT
exchange: binance_futures
timeframe: 1h
eventTimestamp: <UTC>
investigationType: event_impact
```

### Replay from Event Impact

Replay can open an event window only when:

- event timestamp is verified;
- exchange and symbol are explicit;
- the desired replay hour can be derived without ambiguity.

Replay should receive the event reference as provenance. It should not calculate event outcomes.

### Historical Analog from Event Impact

Event Impact may later identify market states around similar events.

The Investigation Context should carry:

- selected event;
- market subject;
- selected analog case if one is chosen.

The Event Impact producer owns event matching. Historical Analog owns market-state similarity. Research composes their evidence without merging implementation identities.

### Failure Behavior

If no Event Impact artifact exists:

- preserve event selection;
- show `Event impact unavailable`;
- do not fabricate outcomes;
- do not fall back to generic narrative heat as measured impact.

## 7. Market Memory Integration

Market Memory is future synthesis over recurring market states and outcomes.

### Memory Selection

Selecting a memory adds a stable public memory or regime reference and changes investigation type to `market_memory`.

Public context may include:

- memory id;
- regime label;
- symbol or market scope;
- timeframe;
- reference timestamp;
- producer/source.

The minimum required context remains symbol, timeframe, and timestamp.

### Relationship to Historical Analog

Historical Analog answers:

> Which individual historical states looked similar?

Market Memory should answer:

> Which recurring regime or learned market pattern does this resemble?

The context may retain both:

- selected memory as synthesis;
- selected historical case as evidence.

They are not interchangeable.

### Compatibility Rules

- A symbol-specific memory cannot silently apply to another symbol.
- A market-wide memory must be labeled as market-wide.
- Timeframe compatibility must be explicit.
- Changing the investigation subject clears incompatible memory selection.

### Research Consumption

Research should display Market Memory only after explicit load or artifact selection.

The context tells Research which memory to request. It does not trigger memory generation or historical recomputation.

### Replay Relationship

A regime memory does not automatically identify a Replay window.

Replay requires a selected historical case or verified event with exact coordinates. Market Memory may suggest candidate cases, but the user must select one before Replay is enabled.

## 8. Anti Goals

The Shared Investigation Context must not:

- Create a complex global client state system.
- Introduce a new backend context service.
- Introduce a new registry, cache, builder, or storage layer.
- Duplicate authoritative context in URLs, localStorage, stores, and component state without resolution rules.
- Store complete intelligence artifacts in route parameters.
- Store market data or Replay datasets in context.
- Expose cache ids, cache paths, manifest fields, dataset partitions, or payload filenames.
- Couple Dashboard directly to Historical Analog implementation modules.
- Couple Research directly to Replay internals.
- Couple Replay to Historical Analog search.
- Require every page to support every context field immediately.
- Make context propagation trigger heavy automatic loading.
- Use source confidence as destination confidence.
- Preserve a selected case after symbol or timeframe becomes incompatible.
- Preserve a selected event after the investigation changes to an unrelated subject without explicit user intent.
- Silently infer exchange when venue identity affects data.
- Silently replace explicit timestamps with current time or safe defaults.
- Silently substitute BTCUSDT or another benchmark.
- Encode UI presentation state such as open panels or chart zoom into the canonical context.
- Make an internal artifact-registry implementation part of the public route contract.
- Turn investigation origin history into an unbounded chain.

The context should remain small, public, inspectable, and replaceable.

## 9. Migration Strategy

Adoption should be incremental. Existing pages must remain independently usable throughout the migration.

### Phase 0: Agree on Public Vocabulary

Before UI implementation:

- adopt canonical public names for symbol, exchange, timeframe, investigation type, timestamp, case, and event;
- document normalization rules;
- define which existing `interval` parameters map to `timeframe`;
- define supported exchange ids;
- define the difference between current-state timestamp and selected-case timestamp.

No new infrastructure is required.

Exit condition:

New cross-page links stop inventing page-specific parameter names.

### Phase 1: Dashboard Establishes Context

Dashboard is the first adopter because it often establishes user attention.

Behavior:

- Dashboard continues to load quickly.
- Existing Markets links remain valid.
- Deep-investigation links carry symbol, exchange when known, timeframe, timestamp, investigation type, and source.
- Historical Evidence remains summary-only.
- Dashboard does not load Historical Analog to create context.

Recommended first handoff:

```text
Dashboard -> Research
```

Why first:

Without a correct origin context, every downstream page must guess.

Exit condition:

An ETHUSDT Dashboard investigation opens Research as ETHUSDT rather than a local BTCUSDT default.

### Phase 2: Research Becomes the Context Hub

Research consumes the Dashboard context and displays it consistently.

Behavior:

- live narratives and prediction markets remain independent;
- historical loaders use active symbol and timeframe;
- not-requested historical state remains distinct from unavailable;
- deliberate context changes are reflected in outgoing links;
- no global store is introduced.

Exit condition:

Research maintains one symbol, exchange, timeframe, and timestamp across current state, historical loading, and outgoing navigation.

### Phase 3: Historical Intelligence Adopts Context

Historical Intelligence currently initializes independently.

Behavior:

- accept symbol and timeframe from route context;
- retain its direct-navigation defaults only when fields are absent;
- display the cache current-state timestamp actually used;
- write selected historical case into outgoing context;
- clear incompatible cases when symbol or timeframe changes.

Exit condition:

Research to Historical Intelligence preserves the investigation, and case selection produces a portable public case context.

### Phase 4: Replay Consumes Verified Case Context

Replay already accepts exchange, symbol, date, and hour.

Behavior:

- accept selected case and analytical timeframe as provenance;
- preserve explicit date/hour over Replay defaults;
- disable case-based Replay links when coordinates are incomplete;
- retain user-driven loading and independent dataset failures;
- provide a context-preserving return path.

Exit condition:

The case displayed in Historical Intelligence is the exact window opened in Replay.

### Phase 5: Event Impact Adoption

After Event Impact exists:

- add selected event context;
- preserve symbol and event timestamp;
- require verification before Replay;
- expose unavailable state without fallback intelligence.

Exit condition:

Research can move from a verified event to prepared impact evidence and a matching Replay window without losing identity.

### Phase 6: Market Memory Adoption

After Market Memory exists:

- add memory/regime reference;
- preserve symbol, timeframe, and timestamp;
- distinguish memory synthesis from selected case;
- require a selected case before Replay.

Exit condition:

Research can compare current state, memory, analog cases, and selected Replay evidence without conflating them.

### Phase 7: Artifact-Aware Discovery

Only after durable artifact publication exists:

- use symbols, exchanges, event ids, and case ids from Investigation Context to discover relevant artifacts;
- keep the public context independent of registry storage;
- preserve current URL handoff behavior if the registry implementation changes.

Exit condition:

New intelligence producers can participate in Research without inventing another cross-page identity model.

### Compatibility During Migration

During adoption:

- existing links continue to work;
- missing new parameters use current defaults;
- new pages tolerate legacy `interval`;
- new links emit canonical `timeframe`;
- invalid optional fields are ignored safely;
- explicit legacy symbol/date/hour values are never overridden.

### Recommended Adoption Sequence

1. Public field vocabulary and resolution rules.
2. Dashboard-to-Research context handoff.
3. Research shared context.
4. Historical Intelligence route initialization and selected-case handoff.
5. Replay exact case inheritance and return path.
6. Event Impact context when the producer exists.
7. Market Memory context when the producer exists.
8. Artifact-aware discovery after durable publication exists.

This sequence corrects the most damaging fragmentation first without introducing new architecture.

## Fragmentation Risks Discovered

1. Research historical requests currently default to `BTCUSDT / 1h`, independent of the market the user was previously investigating.
2. Historical Intelligence currently initializes and automatically reads `BTCUSDT / 1h` rather than consuming upstream route context.
3. Replay accepts exchange, symbol, date, and hour, but incomplete upstream case links can fall back to Replay defaults and display a different window.
4. Dashboard currently propagates detailed context to Markets, but it does not provide an equivalent deep-investigation handoff to Research.
5. Markets and Trade already use route-driven symbol context, while Research and Historical Intelligence use separate local defaults. The product has inconsistent context ownership across pages.
6. `interval` and `timeframe` are conceptually similar but not standardized as one public cross-page name.
7. Historical Analog cases contain timestamps, while some consumer adapters reduce them to dates. Date-only cases cannot safely identify a Replay hour.
8. The investigation timestamp, selected historical-case timestamp, and Replay window are different concepts but are not consistently distinguished.
9. Existing signal query fields such as setup, direction, confidence, reason, and source can preserve origin context, but they are not a substitute for symbol, exchange, timeframe, and timestamp.
10. Future artifact subjects already support symbols, exchanges, event ids, and case ids, but the current in-memory registry should not become a dependency of the public context contract.

