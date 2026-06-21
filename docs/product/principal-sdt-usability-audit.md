# QuantTerminal Principal Usability and Intelligence Workflow Audit

**Audit date:** 2026-06-20  
**Perspective:** First-time crypto researcher  
**Product principle tested:** Conclusion -> Reasons -> Evidence

## 1. Executive Summary

QuantTerminal has the foundations of a differentiated market intelligence product, but the current experience does not yet operate as a coherent Market Intelligence Operating System.

The Dashboard succeeds at the first part of the promise. Within five seconds, a user can see a conclusion: **Neutral, 62 confidence**, with three bull factors, one bear factor, named market drivers, execution guidance, invalidation, and tactical alerts. This is materially better than opening a conventional data terminal and having to synthesize dozens of charts.

The product weakens after that first conclusion. The path from reasons to evidence is fragmented across Research, Historical Intelligence, and Replay:

- Dashboard offers a current conclusion and reasons, but does not provide a clear investigation handoff.
- Research initially presents multiple unavailable or manual-load states and no single recommended next action.
- Historical Intelligence is the strongest evidence surface, but its cached current state can be materially older than the active investigation without making that mismatch prominent.
- Event Impact presents deterministic outcome statistics, but does not prove that the displayed event caused or explains the current market move.
- Replay reconstructs a historical window, but is primarily descriptive. It shows what happened; it rarely explains why it happened.
- Market Memory is not operational in the audited workflow and exposes an implementation-oriented unavailable reason.

The most serious product risk is **false continuity**. Symbol and timeframe propagate, but semantic continuity does not. A user can move through the intended workflow while the underlying state timestamp, event, replay coverage, and evidence basis change. The interface therefore feels connected while the investigation is not always connected.

The second major risk is **evidence confidence without evidence calibration**. Similarity scores near 95%, win rates, dominant outcomes, and event statistics look authoritative, but sample size, horizon, freshness, applicability, and contradicting evidence are not explained strongly enough for decision use.

The product currently transforms:

**Raw Data -> Information -> Partial Insight**

It does not consistently complete:

**Insight -> Defensible Decision**

The immediate priority should not be more widgets or more intelligence systems. It should be a single evidence chain that preserves:

1. the exact current state being explained,
2. the reason being investigated,
3. the historical or event evidence supporting it,
4. the decision implication,
5. the condition that would invalidate the conclusion.

## 2. Product Understanding

### What the product appears to be

QuantTerminal appears to be a crypto decision-support system that combines live market structure, narratives, historical analogs, event outcomes, and replay evidence.

### Who it appears to be for

The interface is best suited to:

- active crypto traders,
- discretionary researchers,
- analysts who understand funding, open interest, regimes, and liquidations,
- small trading teams seeking a repeatable evidence workflow.

It is not currently self-explanatory enough for a novice crypto investor. Terms such as OI, invalidation, volume z-score, comparable features, liquidity weakening, and dominant outcome are presented without progressive explanation.

### Why a user would use it

The strongest reason is speed of synthesis. The Dashboard provides a conclusion, supporting factors, and an execution posture faster than a user could assemble them from separate tools.

### Difference from CoinGlass

CoinGlass is primarily a market-data and derivatives-observation product. QuantTerminal's intended differentiation is the transformation of derivatives, narrative, historical, and event data into a reasoned conclusion and investigation workflow.

That difference is visible on Dashboard and Historical Intelligence, but not yet consistently delivered across the full workflow.

### Difference from Nansen

Nansen is strongest in entity, wallet, and on-chain intelligence. QuantTerminal is oriented toward market-state, derivatives, historical analog, and event-outcome intelligence. QuantTerminal does not currently communicate that boundary explicitly, so a first-time user must infer it from the available panels.

### Difference from ChatGPT

ChatGPT can generate explanations but may not provide deterministic, traceable, market-specific evidence. QuantTerminal's potential advantage is reproducible intelligence with source, timestamp, sample count, and replayable evidence.

The current product partially demonstrates this advantage through Binance Vision provenance, cache generation time, analog cases, and deterministic outcomes. It weakens the distinction when generic labels or seed event samples appear without a clear connection to the current investigation.

### Product understanding issue

**Severity:** P1  
**Evidence:** The first screen communicates a market conclusion but never states the product's unique workflow or tells a first-time user how Dashboard, Research, Intelligence, and Replay relate. Navigation labels describe destinations, not the decision journey.  
**Recommended fix:** Express the workflow through contextual actions and transitions, not marketing copy: “Investigate reasons,” “Compare historical cases,” “Replay this case,” and “Review decision evidence.”

## 3. Dashboard Review

### Five-second assessment

Yes. The user can determine the market direction within five seconds:

- confidence: 62,
- direction: Neutral,
- explanation: mixed evidence,
- factors: three bull and one bear,
- action: confirmation required.

This is the clearest realization of the Conclusion -> Reasons -> Evidence principle in the product.

### Scores

| Dimension | Score | Assessment |
|---|---:|---|
| Clarity | 8/10 | The primary conclusion is immediate and visually dominant. |
| Actionability | 7/10 | Break levels, invalidation, and tactical alerts are useful, but competing thresholds and neutral posture need prioritization. |
| Trustworthiness | 6/10 | Sources exist, but evidence freshness and cross-section consistency are not always visible. |
| Information Hierarchy | 7/10 | Top-row hierarchy is strong; the remainder becomes dense and horizontally fragmented. |

### Strengths

- “Neutral” is more prominent than the underlying metrics.
- Market drivers are expressed as human-readable claims.
- Execution Guidance separates “Do” from “Avoid.”
- Tactical Alerts provide a direct route to inspect a selected market.
- Signal Evidence includes action and invalidation, which are essential for decision quality.

### Issues

#### Dashboard evidence is broad, not traceable

**Severity:** P0  
**Evidence:** “Breakout attempt,” “sector rotation improving,” and “crowded positioning” appear as reasons, but the user cannot open a driver to see its exact supporting observations, freshness, or contradiction set.  
**Recommended fix:** Make each driver a traceable evidence claim with source, observation time, and a contextual “Investigate” action.

#### Historical Evidence can imply freshness it does not possess

**Severity:** P0  
**Evidence:** Dashboard showed “25 similar cases,” “24H AVG -0.22%,” “WIN RATE 60%,” and a current generated time. The Historical Intelligence page revealed that the cached current market state was timestamped **2026-06-01 08:00**, while the active investigation was **2026-06-20**. The generated time can therefore be mistaken for data freshness.  
**Recommended fix:** Display both “state observed at” and “artifact generated at.” Suppress or clearly mark evidence whose state timestamp does not match the current investigation tolerance.

#### The page becomes a dashboard after the conclusion

**Severity:** P1  
**Evidence:** Tactical Alerts, Signal Evidence, Prediction Markets, ETF Flow, Liquidity Conditions, Narrative Heatmap, Information Flow, Trend Change Risk, and System Status compete below the main conclusion.  
**Recommended fix:** Keep the conclusion and its direct reasons primary. Group secondary evidence by whether it supports, contradicts, or contextualizes the conclusion.

#### Competing action thresholds reduce certainty

**Severity:** P1  
**Evidence:** Execution Guidance referenced break levels at 65,851 and 60,969 while a separate avoid/invalidation level used 59,130. The relationship between confirmation, invalidation, and avoidance is not explained.  
**Recommended fix:** Present a single ordered decision rule: confirm above, remain neutral inside, invalidate below.

#### Tactical Alerts compete with the market-level conclusion

**Severity:** P1  
**Evidence:** Dashboard concludes Neutral for the market while high-priority HYPEUSDT and BZUSDT alerts appear Bullish. The distinction between market regime and asset opportunity is implied, not explicit.  
**Recommended fix:** Label the scope of every conclusion: market-wide regime versus asset-specific setup.

## 4. Research Review

### Workflow assessment

The page order reflects the intended investigation:

Current State -> Narrative Context -> Historical Analog -> Event Impact -> Market Memory -> Replay -> Evidence.

The flow is structurally correct but behaviorally weak. On first entry, the user sees:

- Narrative Context unavailable,
- Prediction Markets unavailable,
- Historical Analog manual load required,
- Event Impact manual load required,
- Market Memory manual load required,
- Replay coordinates required,
- Evidence pending,
- Information Flow unavailable.

This makes Research feel like a control panel for subsystems rather than an active investigation.

### Issues

#### No primary research question or recommended next action

**Severity:** P0  
**Evidence:** Three equal-weight manual-load buttons are presented. The user is not told whether to load Historical Intelligence, Event Impact, or Market Memory first.  
**Recommended fix:** Establish one investigation sequence. Start with the current question and promote one next action at a time.

#### Current State is context, not a conclusion

**Severity:** P1  
**Evidence:** The Research header shows symbol, exchange, timeframe, timestamp, regime, and 24h return. It does not state the working conclusion being investigated or carry the Dashboard reason into Research.  
**Recommended fix:** Preserve the initiating claim, such as “Investigating BTC breakout attempt,” and show whether subsequent evidence supports or contradicts it.

#### Narrative continuity breaks immediately

**Severity:** P0  
**Evidence:** Dashboard displayed active Bitcoin narrative heat and information flow. Research for the same BTC context displayed “Narrative Heatmap returned no tagged items” and “Macro and narrative flow returned no current items.”  
**Recommended fix:** Unify narrative consumption or explain scope differences. The same investigation should not show narrative evidence on one page and no narrative evidence on the next without an explicit reason.

#### Manual loading preserves performance but fragments reasoning

**Severity:** P1  
**Evidence:** After loading Historical Intelligence, the page becomes substantially more useful. Event Impact and Market Memory still require separate actions, leaving the user to assemble the chain.  
**Recommended fix:** Keep computation manual/cache-only, but make the interaction a staged investigation rather than three independent subsystem loads.

#### Evidence is provenance-oriented, not argument-oriented

**Severity:** P1  
**Evidence:** Evidence shows source, generated time, cache status, and schema version. It does not show which evidence supports the current conclusion, which contradicts it, or how much weight it should receive.  
**Recommended fix:** Organize evidence by claim and stance: supporting, contradicting, and unknown.

#### Internal implementation language leaks into the product

**Severity:** P1  
**Evidence:** “Market Memory catalog not generated in this process,” “schema version,” and “cache has not been requested” describe implementation state rather than user meaning.  
**Recommended fix:** Translate system states into research states, such as “No evidence-backed memory is available for this market.”

## 5. Historical Intelligence Review

Historical Intelligence is currently the strongest deep-analysis page.

It clearly provides:

- current market state,
- outcome distributions across 1h, 4h, 24h, and 7d,
- similar cases with similarity scores,
- a selected case,
- reasons for matching,
- forward outcomes,
- source and generation time.

### Insight versus data

The page generates partial insight. “Why it matched” and “what happened next” are meaningful analytical abstractions, not raw historical data. However, the page stops short of explaining whether the evidence is applicable to the current decision.

### Issues

#### State freshness mismatch can invalidate the entire analysis

**Severity:** P0  
**Evidence:** The explorer's “Current Market State” was dated 2026-06-01 while the active investigation date was 2026-06-20. This was not presented as a blocking mismatch.  
**Recommended fix:** Treat state timestamp alignment as a validity requirement, not metadata. Clearly block decision interpretation when stale.

#### Similarity is precise but not calibrated

**Severity:** P0  
**Evidence:** Cases display similarity around 92-95%. “Trend structure matched,” “volatility profile aligned,” “volume participation similar,” and “24h momentum aligned” explain dimensions, but not weights, tolerances, or what a 94.7% score means operationally.  
**Recommended fix:** Explain similarity as feature contributions and provide a reliability band rather than an unexplained high-precision score.

#### Dominant outcome is horizon-ambiguous

**Severity:** P1  
**Evidence:** “Dominant outcome UP” appears alongside negative 1h, 4h, and 24h average returns and a positive 7d average. The user cannot tell which horizon defines dominance.  
**Recommended fix:** Bind every directional conclusion to an explicit horizon.

#### Case comparison is scan-heavy

**Severity:** P1  
**Evidence:** Twenty-five cases are shown in a dense list. The user can select one case but cannot easily compare two cases, isolate winners versus failures, or understand distribution shape.  
**Recommended fix:** Support comparison through a small, decision-oriented subset: representative, best, worst, and contradiction cases.

#### Contradicting cases are not elevated

**Severity:** P1  
**Evidence:** The system reports a 60% 24h win rate, meaning 40% of cases did not support the dominant interpretation. Those failures are not made equally legible.  
**Recommended fix:** Always surface the strongest counterexample and explain how it differed.

## 6. Replay Review

Replay has the correct operational posture: manual load, explicit source, a large chart area, market snapshot, event timeline, OI, funding, liquidations, orderbook, summary, and hold-return sections.

### What Replay answers

Replay can answer:

- how price evolved,
- when liquidations occurred,
- how OI and funding changed,
- what the orderbook looked like when cached data exists.

It does not consistently answer:

- what caused the move,
- which event or narrative was active,
- which observation confirms the research thesis,
- what the user should learn from the replay.

### Issues

#### The unloaded state looks like failed analysis

**Severity:** P1  
**Evidence:** Before the user clicks Load Replay, the page simultaneously shows “Replay ready” and multiple “NO DATA,” “unavailable,” zero liquidity, and zero liquidation values.  
**Recommended fix:** Keep all analysis sections in a single neutral pre-load state until the user requests the replay.

#### Replay is descriptive, not educational

**Severity:** P0  
**Evidence:** The page contains charts and derived event markers but no explicit link from the initiating research claim to the replay evidence.  
**Recommended fix:** Carry the research question into Replay and mark observations that support or contradict it.

#### Historical case handoff can promise unavailable microstructure

**Severity:** P0  
**Evidence:** Research selected a Binance Vision analog from 2023-10-13 and enabled Open Replay. CryptoHFTData microstructure coverage starts much later. The chart may load from Binance klines, while orderbook, liquidations, OI, or funding can remain unavailable.  
**Recommended fix:** Describe replay capability before navigation: price-only replay versus full microstructure replay.

#### “What Happened” risks restating metrics

**Severity:** P1  
**Evidence:** The summary is derived from price, OI, funding, and liquidation changes. Without event or narrative linkage, it can summarize observations but cannot explain cause.  
**Recommended fix:** Clearly distinguish “observed sequence” from “causal explanation.”

#### Replay lacks an explicit return path to the investigation

**Severity:** P1  
**Evidence:** Global navigation preserves basic context, but there is no dominant action such as “Return to BTC investigation with this evidence.”  
**Recommended fix:** Make Replay an evidence step within the investigation, not a terminal destination.

## 7. Event Impact Review

Event Impact is deterministic and appropriately includes:

- verified event name,
- event and observation count,
- average and median outcome,
- win rate,
- best and worst case,
- source,
- generated time.

This is a sound evidence artifact. It is not yet a sound answer to “Why is BTC moving today?”

### Issues

#### Event relevance is not established

**Severity:** P0  
**Evidence:** The audited BTC investigation displayed “Federal Reserve issues FOMC statement” from a verified seed catalog after Event Impact was loaded. The product did not establish that an FOMC event occurred in the current investigation window or caused the current move.  
**Recommended fix:** Show Event Impact only when a verified event is explicitly selected or linked to the investigation.

#### Sample size is too small for confident interpretation

**Severity:** P0  
**Evidence:** The section showed two verified events and two market observations with a 50% win rate. The visual treatment still resembled production-grade statistical evidence.  
**Recommended fix:** Make sample adequacy a first-class status and suppress directional conclusions below a defined evidence threshold.

#### Causality and conditional outcome are conflated

**Severity:** P1  
**Evidence:** The section summarizes what happened after events of a type, but placement within the research chain can imply that the event explains today's movement.  
**Recommended fix:** Label the artifact as conditional historical behavior unless causal attribution is explicitly verified.

## 8. Market Memory Review

Market Memory did not function as institutional memory in the audited workflow.

The page returned:

“Market Memory unavailable. Reason: Market Memory catalog not generated in this process.”

### Issues

#### Memory is operationally absent

**Severity:** P1  
**Evidence:** No reusable lesson, supporting artifact set, contradicting evidence, or applicability condition was available.  
**Recommended fix:** Keep the section hidden until durable memories exist for the selected context.

#### The unavailable reason is implementation-centric

**Severity:** P1  
**Evidence:** “Not generated in this process” exposes runtime architecture and gives the user no decision-relevant explanation.  
**Recommended fix:** State whether no verified memory exists, the evidence is insufficient, or the catalog is unavailable.

#### The product has not yet demonstrated earned memory

**Severity:** P1  
**Evidence:** The workflow provides analog and event outputs, but no accumulated lesson showing supporting and contradicting artifacts.  
**Recommended fix:** Require every memory to state the lesson, applicability conditions, failure conditions, and linked evidence.

## 9. Cross-Page Workflow Review

### Investigation attempted

Question: **Why is BTC moving today?**

### Dashboard

The investigation becomes easier immediately. The page answers:

- market is Neutral,
- breakout attempt is active,
- sector rotation is improving,
- positioning is crowded,
- confirmation is required.

The weakness is that these are claims without drill-down evidence.

### Dashboard -> Research

The investigation becomes harder.

The symbol and timeframe persist, but the reasons do not. Research does not open with “Investigating breakout attempt” or “Why BTC is moving.” Narrative and information-flow data that appeared on Dashboard become unavailable.

**Abandonment risk:** High. The user has moved to a deeper page and received less explanatory continuity.

### Research -> Historical Intelligence

The investigation becomes easier after manual loading.

The user gains analog counts, outcomes, selected cases, and provenance. However, the state timestamp mismatch makes the evidence potentially inapplicable to today's move.

**Abandonment risk:** Medium. The page is useful but analytically demanding.

### Historical Intelligence -> Replay

The investigation becomes harder again.

The selected case passes to Replay, but older Binance Vision cases can only provide price coverage while microstructure enrichment may be unavailable. The user is not told this before opening Replay.

**Abandonment risk:** High when the replay opens with partial or unavailable datasets.

### Event Impact

The investigation becomes misleading rather than easier if the displayed event is not explicitly linked to today's move.

**Abandonment risk:** Medium; decision-error risk is higher than abandonment risk.

### Market Memory

The workflow ends without accumulated guidance because memory is unavailable.

### Overall continuity assessment

The system preserves **routing context** better than **reasoning context**.

It carries:

- symbol,
- exchange,
- timeframe,
- timestamps and selected cases in some links.

It does not reliably carry:

- the question,
- the claim being tested,
- the evidence already accepted,
- the evidence still missing,
- the decision under consideration.

## 10. Decision Intelligence Evaluation

### Raw Data -> Information

**Strong.** QuantTerminal structures live market feeds, derivatives context, narratives, analog cases, event outcomes, and replay data into legible modules.

### Information -> Insight

**Moderate.** Dashboard drivers, analog similarity, outcome summaries, and replay-derived events provide meaningful interpretation.

### Insight -> Decision

**Weak to moderate.** Dashboard offers execution guidance and invalidation, but deeper evidence does not consistently update or challenge that decision.

### Decision quality gaps

1. Freshness mismatch is not treated as a validity failure.
2. Historical similarity is not calibrated.
3. Event relevance is not established.
4. Counterevidence is not prominent.
5. Replay observations are not tied back to the initiating thesis.
6. The final decision record is absent.

### Verdict

QuantTerminal currently behaves as an **intelligence-rich terminal with an emerging decision workflow**. It is not yet a complete Market Intelligence Operating System because the investigation does not maintain one coherent argument from conclusion through evidence to decision.

## 11. Top 10 UX Problems

| # | Problem | Severity | Evidence | Recommended Fix |
|---:|---|---|---|---|
| 1 | Research loses the Dashboard question | P0 | BTC context persisted, but “breakout attempt” did not. | Carry the initiating claim and decision question across pages. |
| 2 | Stale historical state appears current | P0 | Current state was June 1 during a June 20 investigation. | Enforce and display state-time alignment. |
| 3 | Narrative evidence contradicts across pages | P0 | Dashboard had Bitcoin heat; Research had no tagged narratives. | Use a shared narrative artifact or explain scope differences. |
| 4 | Event Impact can appear causally relevant without proof | P0 | FOMC seed event appeared in a generic BTC investigation. | Require explicit verified event selection/linkage. |
| 5 | Research has no recommended next action | P0 | Three equal manual-load buttons compete. | Stage the workflow with one primary next action. |
| 6 | Replay pre-load state looks broken | P1 | “Ready” coexists with NO DATA and unavailable sections. | Use a unified pre-load state. |
| 7 | Similarity scores are opaque | P1 | 94.7% appears precise without calibration. | Show contribution, tolerance, and reliability. |
| 8 | Historical case list is difficult to compare | P1 | 25 dense rows and one detail panel. | Elevate representative and counterexample cases. |
| 9 | Implementation language leaks into UX | P1 | “Catalog not generated in this process.” | Translate to user-meaningful evidence states. |
| 10 | Replay has no investigation return action | P1 | User reaches Replay but cannot close the evidence loop. | Add contextual return to the originating investigation. |

## 12. Top 10 Product Risks

| # | Risk | Severity | Evidence | Recommended Fix |
|---:|---|---|---|---|
| 1 | Users make decisions from stale intelligence | P0 | Cached market state lagged the investigation by 19 days. | Apply freshness gates to all decision-facing artifacts. |
| 2 | Apparent causality exceeds evidence | P0 | Event outcome statistics appear without current-event linkage. | Separate observed event, comparable event, and causal claim. |
| 3 | High-precision scores create false certainty | P0 | Similarity and confidence numbers lack calibration. | Publish definitions and uncertainty limits. |
| 4 | Cross-page inconsistency damages trust | P0 | Narrative present on Dashboard and unavailable in Research. | Establish shared artifact consumption and state semantics. |
| 5 | Partial replay is mistaken for complete evidence | P0 | Old analogs can open beyond microstructure coverage. | Declare replay capability before opening a case. |
| 6 | The platform becomes a collection of subsystems | P1 | Research exposes independent Historical, Event, and Memory loads. | Organize around questions and claims, not engines. |
| 7 | Counterevidence is underrepresented | P1 | 40% losing analogs are not emphasized. | Require contradiction evidence in every conclusion. |
| 8 | First-time users cannot distinguish scope | P1 | Market regime and asset-specific bullish alerts coexist. | Label market, sector, and asset scope consistently. |
| 9 | Unavailable states dominate perceived product value | P1 | Research initially contains several unavailable/manual states. | Reveal modules progressively when they can contribute. |
| 10 | Product differentiation remains implicit | P2 | The evidence-based advantage over data tools and chat tools is not explained through workflow. | Make provenance and reproducibility visible at decision points. |

## 13. Top 10 Product Strengths

| # | Strength | Severity if lost | Evidence | Recommended Action |
|---:|---|---|---|---|
| 1 | Immediate market conclusion | P0 | Neutral and 62 confidence dominate Dashboard. | Preserve as the first visual priority. |
| 2 | Human-readable market drivers | P0 | Breakout, sector rotation, and positioning are understandable claims. | Make each claim traceable. |
| 3 | Execution guidance and invalidation | P0 | The product moves beyond description toward action. | Clarify threshold hierarchy. |
| 4 | Deterministic historical analogs | P0 | Cases, outcomes, and sources are reproducible. | Add freshness and calibration controls. |
| 5 | “Why it matched” transparency | P1 | Trend, volatility, volume, and momentum reasons are visible. | Show feature contributions and counterfeatures. |
| 6 | Multi-horizon outcome presentation | P1 | 1h, 4h, 24h, and 7d outcomes support different decisions. | Tie conclusions to explicit horizons. |
| 7 | Manual, responsive heavy workflows | P1 | Research and Replay avoid automatic expensive processing. | Preserve while improving staged guidance. |
| 8 | Context-aware navigation foundation | P1 | Symbol, exchange, timeframe, and cases propagate in links. | Extend from routing context to reasoning context. |
| 9 | Provenance and generated time | P1 | Binance Vision and generation metadata are visible. | Add observed-at timestamps and freshness status. |
| 10 | Clear real-data discipline | P0 | Unavailable states are shown instead of fabricated metrics. | Preserve; make states less implementation-oriented. |

## 14. Recommended Priorities

### Priority 1: Establish evidence validity gates

**Severity:** P0  
**Evidence:** Stale market state and incomplete replay coverage can appear inside a current investigation.  
**Recommended fix:** Define validity rules for timestamp alignment, source coverage, sample adequacy, and horizon applicability. Invalid evidence must not support a decision conclusion.

### Priority 2: Preserve the investigation claim across pages

**Severity:** P0  
**Evidence:** Symbol continuity exists, but the question “Why is BTC moving?” and the Dashboard reasons disappear in Research.  
**Recommended fix:** Extend investigation context to include the active claim, decision horizon, and requested evidence.

### Priority 3: Turn Research into a guided sequence

**Severity:** P0  
**Evidence:** Research presents independent manual loaders rather than one investigation path.  
**Recommended fix:** Lead the user through current claim -> historical comparison -> event relevance -> replay validation -> evidence verdict.

### Priority 4: Make contradiction mandatory

**Severity:** P0  
**Evidence:** Win rates below 100% and negative cases exist, but failure evidence is not prominent.  
**Recommended fix:** Every intelligence conclusion should expose its strongest counterexample and invalidation condition.

### Priority 5: Separate event relevance from event statistics

**Severity:** P0  
**Evidence:** A verified FOMC sample can be interpreted as explaining the current BTC move.  
**Recommended fix:** Do not show outcome statistics until an event is verified as part of the investigation.

### Priority 6: Clarify replay capability and purpose

**Severity:** P1  
**Evidence:** Price replay and microstructure replay have different coverage, and Replay primarily describes rather than teaches.  
**Recommended fix:** Declare available evidence before entry and carry the thesis into the replay.

### Priority 7: Calibrate confidence and similarity

**Severity:** P1  
**Evidence:** 94.7% similarity and 60% win rate look authoritative without interpretation.  
**Recommended fix:** Explain score construction, sample sufficiency, freshness, and expected error.

### Priority 8: Reduce unavailable-state dominance

**Severity:** P1  
**Evidence:** Research and unloaded Replay lead with multiple unavailable messages.  
**Recommended fix:** Use progressive disclosure and a single next action; hide dormant modules until relevant.

### Priority 9: Close the decision loop

**Severity:** P1  
**Evidence:** The workflow ends at evidence surfaces without a consolidated decision.  
**Recommended fix:** Return to a decision summary that states conclusion, evidence for, evidence against, confidence basis, and invalidation.

### Priority 10: Preserve the current architectural discipline

**Severity:** P0  
**Evidence:** Cache-first, deterministic, real-data-only systems are the product's strongest trust foundation.  
**Recommended fix:** Improve coherence through consumption and context. Do not solve these UX problems by reintroducing request-time computation or fabricated intelligence.
