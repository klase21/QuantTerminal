"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import useMarketSocket from "@/hooks/useMarketSocket";
import useOrderbookSocket from "@/hooks/useOrderbookSocket";
import useTradeSocket from "@/hooks/useTradeSocket";
import useLiquidationSocket from "@/hooks/useLiquidationSocket";
import useDepthHeatmap from "@/hooks/useDepthHeatmap";
import useLiquidityEvents from "@/hooks/useLiquidityEvents";
import useAbsorptionDetector from "@/hooks/useAbsorptionDetector";
import useAlertEngine from "@/hooks/useAlertEngine";

import { useMarketStore } from "@/stores/useMarketStore";
import { useTacticalRoute } from "@/hooks/tactical/useTacticalRoute";
import GlobalTacticalContextBridge from "@/components/context/GlobalTacticalContextBridge";

import AlertCenter from "@/components/AlertCenter";
import DashboardV1 from "@/components/product/DashboardV1";
import { createInvestigationContext, readInvestigationContext, toHistoricalTimeframe } from "@/lib/investigation/context";
import { createInvestigationThesis, withInvestigationThesisView } from "@/lib/investigation/thesis";

const FALLBACK_INVESTIGATION_TIMESTAMP = "1970-01-01T00:00:00.000Z";

function stableTimestamp(value?: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function buildStableDashboardHref(
  pathname: string,
  input: {
    symbol: string;
    exchange: string;
    timeframe: string;
    timestamp: string | null;
  },
) {
  const params = new URLSearchParams({
    symbol: input.symbol,
    exchange: input.exchange,
    timeframe: input.timeframe,
    investigation: "market_state",
    source: "dashboard",
  });

  if (input.timestamp) params.set("timestamp", input.timestamp);

  return `${pathname}?${params.toString()}`;
}

export default function DashboardLayout() {
  useMarketSocket();

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const route = useTacticalRoute();
  const symbol = route.symbol;
  const marketMode = route.marketMode;
  const btcPrice = useMarketStore((state) => state.btcPrice);
  const tickerPrice = useMarketStore((state) => Number(state.tickers[symbol]?.price ?? 0));

  useOrderbookSocket(symbol);

  const { trades } = useTradeSocket(symbol);
  const { liquidations } = useLiquidationSocket();
  const heatmap = useDepthHeatmap(symbol);

  const liquidityEvents = useLiquidityEvents(
    heatmap?.flatMap((frame: any) => [
      ...(frame?.bids || []),
      ...(frame?.asks || []),
    ]) || []
  );

  const absorptionEvents = useAbsorptionDetector(trades || []);

  useAlertEngine({
    absorptionEvents,
    liquidityEvents,
    liquidations,
  });

  const stableUrlTimestamp = stableTimestamp(searchParams.get("timestamp"));

  const investigationContext = useMemo(
    () => {
      const timeframe = toHistoricalTimeframe(route.timeframe);
      const investigationTimestamp = stableUrlTimestamp ?? FALLBACK_INVESTIGATION_TIMESTAMP;
      const fallback = createInvestigationContext({
        symbol,
        exchange: route.venue === "BINANCE_SPOT" ? "binance_spot" : "binance_futures",
        timeframe,
        investigationTimestamp,
        investigationType: "market_state",
        source: "dashboard",
        thesis: createInvestigationThesis({
          thesisId: `market-state:${symbol}:${timeframe}:${investigationTimestamp}`,
          title: `${symbol} Market Investigation`,
          question: `What is driving ${symbol} over the ${timeframe} decision horizon?`,
          decisionHorizon: timeframe,
          createdAt: investigationTimestamp,
          currentView: "dashboard",
          tags: ["market-state", symbol.toLowerCase()],
        }),
      });
      const incoming = readInvestigationContext(searchParams, fallback);
      return {
        ...fallback,
        thesis: withInvestigationThesisView(incoming.thesis, "dashboard"),
      };
    },
    [route.timeframe, route.venue, searchParams, stableUrlTimestamp, symbol],
  );

  useEffect(() => {
    const href = buildStableDashboardHref(pathname, {
      symbol: investigationContext.symbol,
      exchange: investigationContext.exchange,
      timeframe: investigationContext.timeframe,
      timestamp: stableUrlTimestamp,
    });
    if (`${window.location.pathname}${window.location.search}` !== href) {
      router.replace(href, { scroll: false });
    }
  }, [investigationContext.exchange, investigationContext.symbol, investigationContext.timeframe, pathname, router, stableUrlTimestamp]);

  return (
    <div className="min-h-screen bg-black text-white">
      <GlobalTacticalContextBridge />

      <DashboardV1
        symbol={symbol}
        marketMode={marketMode}
        price={tickerPrice || btcPrice}
        tradeCount={trades?.length ?? 0}
        liquidationCount={liquidations?.length ?? 0}
      />

      <AlertCenter />
    </div>
  );
}
