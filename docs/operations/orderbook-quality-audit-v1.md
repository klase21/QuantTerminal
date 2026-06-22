# Replay Orderbook Quality Audit V1

## Purpose

Replay Orderbook Quality Audit V1 separates cache existence from evidence
quality. It validates existing local Replay orderbook caches without provider
requests, cache generation, file mutation, or Replay runtime changes.

Run:

```powershell
npm run audit:orderbook-quality
```

## Methodology

The audit:

1. Reads Replay-compatible Historical Analog coordinates from Replay Coverage
   Audit V1.
2. Selects coordinates with an existing local
   `replay/orderbook-snapshot` cache entry.
3. Reads each entry through the existing cache reader and schema validation.
4. Evaluates source-row metadata and the persisted top-of-book payload.

The audit reports:

- cache readability;
- source row, snapshot, and update counts;
- initial-snapshot evidence;
- bid/ask initialization quality;
- spread validity;
- replay-advance capability;
- explicitly persisted timestamps;
- deterministic quality status.

## Quality Definitions

### Valid

- cache is readable;
- an initial snapshot or equivalent complete initialization is verified;
- best bid and best ask are positive;
- best ask is greater than best bid;
- the stored evidence can advance through Replay time.

### Degraded

- cache is readable;
- a usable final bid/ask state exists;
- updates exist but no initial snapshot is verified, or the cache cannot
  represent Replay progression.

### Invalid

- cache is unreadable, empty, or schema-incompatible;
- the payload cannot initialize usable bid and ask levels;
- source row count is zero.

### Unknown

The cache is readable, but required row, event, or timestamp metadata is
missing and prevents deterministic classification.

## Timestamp Semantics

Replay orderbook cache schema V1 stores one final snapshot timestamp.

It does not store:

- the first source-event timestamp;
- intermediate book states;
- a timestamped update sequence.

Therefore:

- `firstTimestamp` is `null`;
- `lastTimestamp` comes from the payload snapshot timestamp;
- `canAdvanceReplay` is `false`.

The audit does not substitute the selected window start as a fabricated first
event timestamp.

## Known Limitations

- Quality is evaluated from prepared cache payload and manifest metadata only.
- Raw provider rows are not reopened or downloaded.
- A plausible final spread does not prove the reconstructed book began from a
  complete exchange snapshot.
- Schema V1 is useful for a static orderbook evidence panel but cannot drive
  historical book animation.
- Corrupted entries are reported invalid but are not repaired.

## Current Cache Quality

Audit date: 2026-06-22.

| Window | Rows | Snapshots | Updates | Initialize | Advance | Status |
| --- | ---: | ---: | ---: | --- | --- | --- |
| BTCUSDT 2025-07-20 17 UTC | 4,038,569 | 0 | 4,038,569 | Yes | No | degraded |
| BTCUSDT 2026-02-22 12 UTC | 3,921,890 | 0 | 3,921,890 | Yes | No | degraded |

Both payloads contain positive best bid and ask values with valid spreads:

- 2025-07-20: best bid 118,003.4; best ask 118,003.5.
- 2026-02-22: best bid 67,892.3; best ask 67,892.4.

Neither cache proves full initialization because no `snapshot` event was
recorded. Neither can advance Replay because schema V1 persists no intermediate
states.

## Recommended Next Sprint

Define Replay Orderbook Cache Schema V2 before further broad backfill.

Schema V2 should preserve bounded timestamped snapshots or checkpoints that:

- include a verified initialization snapshot;
- record first and last event timestamps;
- permit deterministic advancement through the selected hour;
- retain existing top-of-book summary fields;
- remain generated outside request paths.

Do not treat additional update-only V1 caches as full Replay evidence until
initialization and progression semantics are established.
