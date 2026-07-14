# MVP Evidence Rule Contract

## Scope

MVP-2 evaluates the six governed instruments over the 14 daily windows from
2026-06-28 through 2026-07-11. It reads only the immutable bounded corpus with
checksum `7a65145af0f84522866cb9a6cc04d52d0b2f3aa243718f2f8720eed37cb2f2ce`.
The evaluation is retrospective: Event Time remains source time and the
Knowledge Time cutoff is the latest persisted input availability for each day.

## Governed Rules

| Rule | Required inputs | Window/baseline | Trigger |
| --- | --- | --- | --- |
| `DERIVATIVES_POSITIONING_EXPANSION` | OHLCV, OI | P1D/P30D | Absolute OI change is at least `max(1%, 1.5 * median prior daily absolute OI change)`. Price direction is context, never a directional label. |
| `FUNDING_PRESSURE` | Funding | P1D/P30D | Absolute latest provider event rate is at least `max(0.0001, prior absolute-rate P80)`. |
| `AGGRESSIVE_FLOW_IMBALANCE` | AggTrades Segment | P1D/P14D | Absolute quantity imbalance is at least `0.10` and trade-count intensity is at least `0.75`. Buyer-maker semantics are preserved: buyer-maker quantity is aggressive sell quantity. |
| `DERIVATIVES_OVERHEATING` | OHLCV, OI, Funding | P1D/P30D | Material positive OI expansion and Funding pressure plus either absolute price return of at least `1%` or directionally confirming flow imbalance of at least `0.10`. AggTrades is optional confirmation. |
| `DELEVERAGING_OR_NORMALIZATION` | OHLCV, OI, Funding | P1D/P30D | Material OI contraction plus Funding normalization ratio at most `0.75`, flow imbalance at most `0.05`, or absolute price return at most `1%`. |

All rules require at least `0.95` Coverage for low-density required inputs;
AggTrades requires complete Segment Coverage. Missing mandatory inputs produce
`NOT_EVALUABLE`, never a weak narrative. Liquidation and Order Book are
optional enrichment and are explicitly listed as unavailable limitations.

## Measurements And Identity

Measurements retain instrument, Event-Time range, Knowledge-Time cutoff,
calculation version, units, bounded Coverage, source-reference digest/count,
lineage count, and Segment checksum. AggTrades decimal quantities are summed
without JavaScript floating-point conversion. Provider IDs remain in the
Segment and are not rewritten as derived Facts.

Assessment identity is deterministic over corpus identity, instrument, time
scope, rule versions, measurement version, Knowledge Time, and source digest.
A changed rule version or changed source truth therefore creates a new version.
Exact reruns reuse Results, packets, and assessments.

## Output Boundary

Structured assessment fields are authoritative. Human-readable summaries may
be derived later. The worker does not create Consumer Projections, publish to
pages, or change D2 publication state.
