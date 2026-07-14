# MVP Functional Cutover Report

## Result

All six routes now default to the bounded governed Projection facade. The live API returned 200 for Dashboard (43 objects), Markets (36), Scanner (31), Trade (8), Replay (7), and Research (7). Browser verification rendered every route without console errors and preserved a Scanner candidate through direct Trade reload.

## Exposure

The append-only rollback test produced `409 ROLLBACK_ACTIVE`. A subsequent CUTOVER decision `mvpx_9b288622338c1c672912d72dec050d68930a1a525ed1ca4e89aa9ae4faf2ba09` restored effective `CONSUMER_VISIBLE` exposure for corpus checksum `3f33e07c45a8814ac531ee707e8744654d3ae8dfcc84e44fcbc1e792a92824ab`. D2 publication remains `PENDING`; all 868 Projection payloads and checksums remain unchanged.

## Functional Boundary

Projection failures render bounded classified states. Legacy page components load only under an explicit valid rollback decision. Dashboard, Markets, and Trade may show a separately labeled Binance live quote with observation time and freshness; it does not alter governed Evidence.

Replay uses one-day bounded Projection windows, native Funding markers, and AggTrades summaries rather than raw events. Liquidation, historical Order Book, and news enrichment remain explicitly limited or blocked. The protected realtime Order Book implementation was not changed.

## Feature Result

Of 52 inventoried features, 43 are Projection-backed, 6 are Projection-backed with visible limitations, 1 remains source-blocked, 2 are outside MVP scope, and 0 are broken. No primary feature defaults to mock or legacy truth.

