# Replay Cache Builder

## Purpose

Replay should be a viewer, not a heavy compute engine.

Heavy historical datasets should be downloaded and processed before the user opens Replay.

## Pipeline

Scheduler / Manual Job
бщ
Download raw data
бщ
Process datasets
бщ
Generate JSON cache
бщ
Replay reads cache

## Cached Outputs

- candles
- liquidations
- OI
- funding
- orderbook summaries
- event timeline

## Orderbook

Full CryptoHFTData orderbook reconstruction can exceed request runtime budget.

Orderbook should be precomputed into:

- bestBid
- bestAsk
- spread
- imbalance
- bidLiquidity
- askLiquidity
- top bids
- top asks

## Principle

Never reconstruct millions of rows inside a user request.
