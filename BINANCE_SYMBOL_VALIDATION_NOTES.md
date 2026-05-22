# Binance Symbol Validation Upgrade

This build replaces the single giant Binance `/api/v3/ticker/24hr?symbols=[...]` request with a production-safe connector flow.

## What changed

- Fetches Binance `exchangeInfo` first.
- Filters the sector registry to active `TRADING` spot `USDT` pairs.
- Excludes inactive or nonexistent symbols before requesting tickers.
- Requests `/ticker/24hr` in chunks instead of one giant query.
- Keeps all upstream fetches `cache: "no-store"` to avoid Next.js 2MB data cache errors.
- Reports excluded symbols in `notes` and `binanceValidation`.
- Adds `binance-exchange-info` as a connector health source.

## Why

Binance returns `400` if any symbol in the `symbols` JSON array is invalid. A registry-driven terminal will inevitably contain delisted, renamed, or non-Binance symbols, so validation must happen before ticker fetches.
