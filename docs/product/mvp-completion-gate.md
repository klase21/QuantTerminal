# QuantTerminal Working MVP Completion Gate

Status: not met
Applies to: Dashboard, Replay, Research, Markets, Scanner, and Trade

## Release Gate

The Working MVP is complete only when every assertion below is backed by real persisted state and page-level verification.

### Corpus

- [ ] The six-instrument 90-day OHLCV, OI, and Funding corpus is populated or every missing interval has an explicit terminal classification.
- [ ] All six instruments share a deterministic usable core window.
- [ ] The capacity-approved 14-day AggTrades Segment corpus is populated and reconciled.
- [ ] Raw Artifact, Canonical, lineage, Coverage, and checkpoint counts reconcile for the bounded corpus.
- [ ] Full historical execution remains outside this release gate.

### Evidence And Projections

- [ ] Minimum versioned D4 market-state and event Evidence profiles are active.
- [ ] Mandatory fact, counter-evidence, limitation, and Confidence-component rules are enforced.
- [ ] All required Consumer Projections have deterministic identity, Event Time, Knowledge Time, version, lineage, cache policy, and stale behavior.
- [ ] No primary feature reads a legacy value when its matrix row requires a governed Projection.
- [ ] No Evidence conclusion or Confidence appears when a mandatory component is unavailable.

### Dashboard

- [ ] Direction, drivers, risk, OI, Funding, intensity, liquidation status, Coverage, and Evidence drill-down each show a value or classified status.
- [ ] Direction and driver facts agree on instrument and Event Time.
- [ ] Liquidation is visibly lower-bound/experimental where used.
- [ ] Initial loading is visible; the page never presents an unexplained blank.

### Replay

- [ ] Price, Funding, OI, and AggTrades share a synchronized selected Event-Time window.
- [ ] Playback and time navigation operate over the common mandatory interval.
- [ ] Liquidation, order-book, annotations, and Evidence markers show real data or exact limitation states.
- [ ] Historical depth never claims a full reconstructed book from update-only files.
- [ ] Heavy history is manual/cache-backed and does not block the request path.

### Research

- [ ] Conclusion, verified facts, interpretation, counter-evidence, limitations, lineage, and version metadata are visibly distinct.
- [ ] Confidence exposes component availability and sample size, or is unavailable.
- [ ] At least four approved Demo Evidence events are reproducible from persisted canonical inputs.
- [ ] Historical tools remain manual-load and gracefully unavailable on cache/source failure.

### Markets

- [ ] All six governed instruments show price/change, OI, Funding, market state, Coverage, latest Evidence status, and detail navigation.
- [ ] A supplemental API failure does not remove or block the core instrument summary.
- [ ] Realtime values remain identified separately from frozen/canonical comparison data.

### Scanner

- [ ] Ranked candidates use real comparable Coverage and observable versioned reason codes.
- [ ] Insufficiently covered instruments are excluded with visible reasons.
- [ ] Candidate Evidence and Confidence status are explicit.
- [ ] Candidate selection persists across page navigation by durable identity.

### Trade

- [ ] The selected candidate, market context, supporting facts, counter-evidence, risks, invalidation conditions, related Evidence, and data status are present or classified.
- [ ] No price level, Confidence, or conclusion is fabricated when its source is unavailable.
- [ ] The page is explicitly planning-only; order execution is not implied.

### Cross-Page And Failure QA

- [ ] Instrument, Event Time/window, candidate ID, Evidence ID, and projection version remain consistent through every handoff.
- [ ] `AVAILABLE`, `BACKFILL_PENDING`, `SOURCE_UNAVAILABLE`, `SOURCE_BLOCKED`, `UNSUPPORTED`, `NOT_APPLICABLE`, `GAP`, `STALE`, `EXPERIMENTAL`, and `LOWER_BOUND` render distinctly.
- [ ] Missing data is never zero-filled or silently forward-filled.
- [ ] Partial charts expose their exact window and gaps.
- [ ] Credential, package, lockfile, protected realtime, and operational-state scans are clean for the release changes.

## Demo-Quality Gate

Demo quality additionally requires:

- four to six frozen Evidence Corpus events with authoritative annotations and measured source sizes;
- the BTC Coinalyze supplemental path migrated and certified, or visibly omitted as experimental unavailable;
- a bounded historical order-flow/depth corpus with truthful snapshot limitations;
- responsive and mobile page QA, polished limitation states, and a reproducible six-page walkthrough.

These items may improve the demo without weakening the Working MVP truth gate.

## Explicit Deferrals

- inception-to-present completion;
- all symbols and market regimes;
- complete individual-event liquidation history while no approved source exists;
- broad historical order-book reconstruction;
- full D3/D4/D5 Phase V certification;
- production-scale performance and full historical recomputation;
- real order execution.

No deferred item may be represented as complete in the MVP UI.
