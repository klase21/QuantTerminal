# Valley Dashboard Integration V1

## Purpose

Valley Dashboard Integration V1 reorganizes the Dashboard around:

```text
Conclusion
Why
Evidence
```

The sprint adds no intelligence, scoring, prediction, or evidence generation.
It consumes the existing Market Driver Engine through a thin read-only API.

## First-Viewport Workflow

### Market Direction

The first section displays:

- Bullish, Bearish, or Neutral evidence balance;
- evidence coverage confidence;
- available driver count;
- intelligence observation time.

Confidence is the Market Driver Engine's coverage-and-quality measure. It is
not predictive confidence.

### Why Market Is Moving

Drivers are displayed in engine ranking order with:

- title;
- category;
- impact score.

No client-side re-ranking or scoring occurs.

### Supporting Evidence

The section displays only available:

- ETF evidence;
- Funding evidence;
- Open Interest evidence;
- Historical Analog evidence;
- Event Impact evidence.

Each item exposes its source, quality, and factual evidence summary.

## Dashboard Order

The resulting order is:

1. Market Direction;
2. Why Market Is Moving;
3. Supporting Evidence;
4. Historical Evidence;
5. Prediction Markets;
6. Tactical Alerts and existing lower-priority analytics.

Historical Evidence and Prediction Markets are preserved. Existing ETF,
Liquidity, Narrative, Signal Evidence, Tactical Alerts, Information Flow,
Trend Change Risk, Guidance, and System Status surfaces remain available lower
on the page.

## Data Flow

```text
Dashboard
  -> /api/market-drivers?symbol=<SYMBOL>
  -> buildMarketDrivers()
  -> prepared artifacts and current provider evidence
```

The Market Driver request:

- is independent from other Dashboard requests;
- has an eight-second client timeout;
- aborts on unmount or symbol change;
- never blocks the Dashboard shell;
- exposes loading, empty, and unavailable states.

## Audit

Run:

```powershell
npm run audit:dashboard-integration
```

The audit verifies:

- Market Direction is visible;
- ranked Driver section is visible;
- Evidence section is visible;
- Historical Evidence remains present;
- Prediction Markets remains present;
- the sections follow Conclusion -> Why -> Evidence order;
- the Market Driver API is connected;
- loading, empty, and unavailable states exist.

## Limitations

- Dashboard direction is an evidence balance, not a forecast.
- Missing Market Driver categories remain absent from Supporting Evidence.
- The API depends on the existing Market Driver Engine and its provider
  timeout behavior.
- No mobile navigation or application-wide layout changes are included.
