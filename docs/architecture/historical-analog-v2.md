# Historical Analog V2

## Purpose

Historical Analog should compare the current market state with similar past market states.

## Primary Data

Use long-coverage sources first:

- Binance Vision
- Binance historical APIs

## Secondary Data

- funding history
- open interest history
- volume
- volatility
- trend regime

## Enrichment

- CryptoHFTData
- liquidations
- orderbook summaries
- prediction markets
- narrative/event impact data

## Dashboard Rule

Historical Analog may return to Dashboard only as a precomputed summary.

Dashboard must never calculate analogs directly.

## Example Output

- Similar cases
- Average forward return
- Win rate
- Dominant outcome
- Open in Research / Replay
