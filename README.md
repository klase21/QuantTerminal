# QuantTerminal

Advanced multi-chart crypto trading dashboard built with **Next.js 14**, **TypeScript**, **Zustand**, and real-time Binance market data.

---

## Features

### Multi-Chart Workspace

* Open multiple charts simultaneously
* Independent timeframe switching per chart
* Responsive grid layout
* Remove/add charts dynamically

### Real-Time Market Data

* Binance WebSocket integration
* Live candlestick updates
* Liquidation stream support
* Orderbook tracking
* Ticker monitoring

### Trading UI Components

* Lightweight Charts integration
* Custom reusable panel system
* Resizable dashboard layout
* Dark trading-terminal aesthetic

### State Management

* Zustand-powered global stores
* Modular workspace management
* Real-time reactive UI updates

---

## Tech Stack

| Category    | Stack                 |
| ----------- | --------------------- |
| Framework   | Next.js 14            |
| Language    | TypeScript            |
| State       | Zustand               |
| Charts      | lightweight-charts    |
| Styling     | TailwindCSS           |
| Icons       | Lucide React          |
| Data Source | Binance WebSocket API |

---

## Screenshots

> Add screenshots or GIF previews here.

```md
/assets/dashboard-preview.png
/assets/multi-chart.gif
```

---

## Installation

```bash
git clone https://github.com/klase21/QuantTerminal.git

cd QuantTerminal

npm install
```

---

## Development

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## Production Build

```bash
npm run build
npm start
```

---

## Project Structure

```txt
+---app
|       globals.css
|       layout.tsx
|       page.tsx
|       
+---components
|   |   AbsorptionPanel.tsx
|   |   AlertCenter.tsx
|   |   AlertEngine.tsx
|   |   AlertRuleBuilder.tsx
|   |   AlertRuleList.tsx
|   |   AlertRulePanel.tsx
|   |   AlertSoundToggle.tsx
|   |   AlertToast.tsx
|   |   BTCPriceCard.tsx
|   |   ChartTile.tsx
|   |   CVDPanel.tsx
|   |   DashboardLayout.tsx
|   |   FloatingChartModal.tsx
|   |   Footprint.tsx
|   |   Heatmap.tsx
|   |   HeatmapCanvas.tsx
|   |   LatencyPanel.tsx
|   |   LightweightChart.tsx
|   |   LiquidationFeed.tsx
|   |   LiquidationPanel.tsx
|   |   LiveTicker.tsx
|   |   MacroIntel.tsx
|   |   MacroPanel.tsx
|   |   MarketOverview.tsx
|   |   MultiChartWorkspace.tsx
|   |   NarrativeIntel.tsx
|   |   NarrativePanel.tsx
|   |   Orderbook.tsx
|   |   OrderBookPanel.tsx
|   |   orderbookWorker.tsx
|   |   OrderflowPanel.tsx
|   |   ResizablePanelGroup.tsx
|   |   RightPanelTabs.tsx
|   |   SentimentPanel.tsx
|   |   SoundToggle.tsx
|   |   SymbolSelector.tsx
|   |   TickerBar.tsx
|   |   Topbar.tsx
|   |   TradeTape.tsx
|   |   TradingChart.tsx
|   |   TradingViewChart.tsx
|   |   VolumeProfile.tsx
|   |   
|   \---ui
|           button.tsx
|           card.tsx
|           input.tsx
|           Panel.tsx
|           select.tsx
|           switch.tsx
|           
+---hooks
|       AlertRulePanel.ts.bak
|       AlertRulePanel.tsx
|       useAbsorptionDetector.ts
|       useAlertEngine.ts
|       useAlertSound.ts
|       useBinanceSocket.ts
|       useDepthHeatmap.ts
|       useFootprint.ts
|       useHeatmapHistory.ts
|       useKlineSocket.ts
|       useLiquidationSocket.ts
|       useLiquidityEvents.ts
|       useMarketSocket.ts
|       useMarketWorker.ts
|       useOrderbook.ts
|       useOrderbookSocket.ts
|       useRealtimeFeed.ts
|       useTickerSocket.ts
|       useTradeFlowSocket.ts
|       useTradeSocket.ts
|       useVolumeProfile.ts
|       useWorkerSocket.ts
|       
+---lib
|   |   alert-engine.ts
|   |   alert-sound.ts
|   |   generate-id.ts
|   |   store.ts
|   |   utils.ts
|   |   
|   +---stores
|   |       marketStore.ts
|   |       
|   \---websocket
|       +---core
|       |       BaseSocket.ts
|       |       SocketManager.ts
|       |       types.ts
|       |       
|       +---exchanges
|       |       binance.ts
|       |       bybit.ts
|       |       upbit.ts
|       |       
|       \---hooks
|               useTickerSocket.ts
|               
+---public
|   |   ws-worker.js
|   |   
|   \---sounds
|           absorption.mp3
|           alert.mp3
|           liquidation.mp3
|           
+---services
|       mockFeed.ts
|       
+---stores
|       useAlertRuleStore.ts
|       useAlertStore.ts
|       useExchangeStore.ts
|       useLiquidationStore.ts
|       useMarketStore.ts
|       useMultiExchangeSocket.ts
|       useNarrativeStore.ts
|       useOrderbookStore.ts
|       useTickerStore.ts
|       useWorkspaceStore.ts
|       
+---types
|       alert.ts
|       market.ts
|       orderbook.ts
|       
\---workers
        marketWorker.ts
        multiExchangeWorker.ts
```

---

## Current Version

```txt
v0.5.1
```

### Latest Changes

* Added multi-chart timeframe switching
* Improved Zustand workspace architecture
* Fixed TypeScript typing issues
* Fixed lightweight-charts Time typing
* Improved orderbook store structure
* Added rollback tagging support

---

## Roadmap

### Planned Features

* Drag & resize chart panels
* TradingView-style layouts
* Technical indicators
* Drawing tools
* Persistent workspace saving
* Exchange selector
* Futures positions panel
* Heatmap integration
* News & sentiment widgets
* Alert engine improvements

---

## Git Workflow

### Create Rollback Point

```bash
git tag v0.5.1
```

### Restore Previous Version

```bash
git checkout v0.5.1
```

---

## Author

### Hyjeon

* Crypto product strategist
* Quant/trading UI builder
* Exchange product & growth experience

LinkedIn:

```txt
https://www.linkedin.com/in/hyjeon/
```

GitHub:

```txt
https://github.com/klase21
```

---

## License

MIT License
