# Flow Replay V1

## Purpose

Flow Replay V1 provides factual Replay evidence when deterministic full
orderbook reconstruction is unavailable.

It answers:

- what moved;
- what market-structure activity was observed;
- which prepared sources support the investigation;
- which sources are degraded or unavailable.

It does not claim:

- complete historical orderbook depth;
- verified best bid or ask without initialization;
- seekable orderbook replay;
- deterministic full-book reconstruction;
- Replay Learning;
- a recommendation or confidence score.

## Target Implementation

The first implementation covers:

```text
exchange: binance_futures
symbol: BTCUSDT
date: 2026-02-22
hour: 12 UTC
timeframe: 1h
```

The manual builder is:

```powershell
npx.cmd tsx workers/replay/buildFlowReplayEvidence.ts `
  --exchange binance_futures `
  --symbol BTCUSDT `
  --date 2026-02-22 `
  --hour 12 `
  --timeframe 1h
```

The builder reads prepared local caches only. It does not download provider
data, rebuild orderbooks, or modify Replay runtime behavior.

## Contract

`FlowReplayEvidence` contains:

- versioned schema metadata;
- replay coordinates and exact UTC window;
- verified price movement when an exact canonical candle exists;
- factual market-structure observations;
- source-level quality and reasons;
- supporting, degraded, and unavailable evidence collections.

The source quality states are:

| State | Meaning |
| --- | --- |
| `verified` | The prepared source directly supports the stated fact. |
| `degraded` | The source supports a limited fact but not a complete claim. |
| `unavailable` | No prepared evidence exists for the selected window. |
| `unknown` | Source metadata is insufficient to classify safely. |

Quality is assigned per source, not to the market conclusion as a whole.

## Evidence Sources

### Price / OHLCV

Primary input:

```text
Canonical OHLCV cache
```

For the target, one exact Binance Vision 1h candle exists. Flow Replay records:

- open;
- high;
- low;
- close;
- return;
- range;
- volume.

This source is `verified`.

### Funding

Primary input:

```text
Canonical funding cache
```

No prepared target cache currently exists. The source is `unavailable`.

### Open Interest

Primary input:

```text
Canonical open-interest cache
```

No prepared target cache currently exists. The source is `unavailable`.

### Liquidations

Primary input:

```text
Canonical liquidation cache
```

No prepared target cache currently exists. The source is `unavailable`.

### Trades

There is no prepared canonical trades cache for the target. The source is
`unavailable`.

### Orderbook Flow

Primary input:

```text
Replay Orderbook Cache V2 diagnostic payload
```

Flow Replay uses only factual update-flow properties:

- source update count;
- compacted update count;
- bid update count;
- ask update count;
- positive-quantity changes;
- zero-quantity removals;
- observed timestamps.

The target V2 cache has no verified initial snapshot. Its checkpoint and
terminal book values cannot establish complete historical depth. Orderbook
evidence therefore remains `degraded`, even when its update rows are ordered
and its terminal spread is plausible.

The V1 static snapshot is used only as a degraded fallback when V2 is absent.

## Durable Artifact

The builder publishes one canonical artifact to the existing durable artifact
store:

```text
type: replay_intelligence
id: flow-replay:binance_futures:BTCUSDT:2026-02-22:12
source system: flow-replay-v1
```

The artifact contains compact prepared evidence only. It does not contain raw
orderbook files or raw market datasets.

Artifact confidence is:

```text
0
not_calibrated
```

No confidence is generated. Evidence validity is `PARTIAL` while any source is
degraded or unavailable.

## First Target Result

The first durable artifact reports:

- price moved from `68183.4` to `67892.4`;
- return was `-0.4268%`;
- intrahour high-low range was `0.5407%`;
- volume was `4777.343`;
- `3,921,823` source orderbook updates were observed;
- `368,165` compacted level updates were retained;
- compacted updates contained `194,190` bid changes and `173,975` ask changes;
- orderbook quality remained `degraded`;
- funding, open interest, liquidations, and trades were `unavailable`.

These values describe observed evidence. They do not imply causality,
confidence, or a complete reconstructed book.

## Audit

Run:

```powershell
npm run audit:flow-replay
```

The audit is read-only. It verifies:

- durable artifact availability;
- Flow Replay contract version;
- source quality states;
- price movement evidence;
- degraded orderbook labeling;
- explicit unavailable evidence;
- absence of a verified complete-orderbook claim.

## Failure Handling

Missing prepared sources do not fail the build.

They are recorded as:

```text
quality: unavailable
reason: <explicit cache status>
```

A degraded orderbook cache remains degraded. Flow Replay never promotes it to
valid or complete.

If no price candle exists, `whatMoved` is null and price evidence is
unavailable. The artifact still records any independent prepared evidence.

## Compatibility

Flow Replay V1:

- preserves existing Replay UI and loaders;
- uses the existing durable artifact contract;
- can later be consumed by Research;
- can later support Replay Learning only after separate factual learning rules
  are approved;
- does not alter Historical Analog, Event Impact, Market Memory, Decision
  Brief, or provider ingestion.

## Limitations

- Only one target has been built and audited.
- Funding, OI, liquidation, and trade coverage are absent for the target.
- Orderbook flow metrics use compacted V2 updates for side/change counts.
- Raw source update count is preserved separately.
- No directional interpretation or causal claim is generated.
- No UI consumes the artifact in V1.

## Recommended Next Sprint

Add prepared canonical funding, open-interest, liquidation, and trade coverage
for selected replay windows, then extend the Flow Replay audit to multiple
cases.

Do not add Replay Learning until evidence coverage and source-quality rules are
validated across more than one window.
