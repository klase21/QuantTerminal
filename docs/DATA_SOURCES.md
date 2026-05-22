# Data Sources

This document records the current QuantTerminal data-source strategy.

---

## Binance

### Purpose

Binance is used as the primary global price-discovery and liquidity source.

### Current Usage

- Spot ticker data
- 24h price change
- 24h quote volume
- sector-level aggregation
- global rotation ranking
- WebSocket realtime direction

### Important Implementation Notes

The route must not download the full Binance 24hr ticker payload into Next.js data cache. The full response can exceed Next.js cache item limits.

Current long-term strategy:

1. Fetch Binance `exchangeInfo`.
2. Build a valid symbol map.
3. Keep only `TRADING` Spot `USDT` symbols.
4. Filter registry symbols against the valid symbol map.
5. Fetch `/api/v3/ticker/24hr` in chunks.
6. Mark invalid/inactive symbols in diagnostics.
7. Use `cache: "no-store"` for large/volatile upstream payloads.

### Health Signals

- symbol map status
- invalid symbol count
- chunk fetch status
- latency
- stale state
- partial data state

---

## Upbit

### Purpose

Upbit is used as the Korean retail overlay.

### Current Usage

- KRW market activity
- Korean market coverage
- local retail intensity
- Korean divergence vs global flow

### Health Signals

- market list status
- KRW ticker status
- active KRW markets
- latency
- stale state

---

## Upbit DataLab

### Purpose

Upbit DataLab provides market-intelligence indicators that help contextualize regime and historical positioning.

### Confirmed Endpoints

Overview:

```txt
https://datalab-api.upbit.com/api/v1/indicator/overview
```

Fear/Greed history:

```txt
https://datalab-api.upbit.com/api/v1/indicator/fear/candles/days?count=1825
```

Volatility history:

```txt
https://datalab-api.upbit.com/api/v1/indicator/volatility/index/candles/days?code=IDX.UPBIT.UPBIT_COMP&count=1825
```

Altseason history:

```txt
https://datalab-api.upbit.com/api/v1/indicator/altseason/candles/days?count=1826
```

BTC dominance history:

```txt
https://datalab-api.upbit.com/api/v1/indicator/mdom/candles/days?count=1825
```

Upbit trade volume history:

```txt
https://datalab-api.upbit.com/api/v1/indicator/katp/candles/days?count=1825
```

Upbit premium history:

```txt
https://datalab-api.upbit.com/api/v1/indicator/premium/candles/days?count=1825
```

Market category index:

```txt
https://datalab-api.upbit.com/api/v1/index/category/main?categoryType=market
```

### Notes

- Premium history begins later than full 5Y history, roughly from 2024.
- DataLab should be displayed as `Upbit DataLab`, not just `DataLab`, to avoid ambiguity.
- Use `coverage` in UI to show history reliability.

---

## News Feeds

### Purpose

News feeds support narrative validation.

The system should distinguish:

```txt
News Buzz + Liquidity Inflow = Validated Narrative
News Buzz + Weak Flow = News-only / weak narrative
Flow + No News = Flow-only / stealth accumulation
```

### Notes

- Debug logs should not pollute the console.
- Fetchers should fail quietly into fallback/degraded states.
- Region tags should be preserved where possible: KR / CN / EN.
