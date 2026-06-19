"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

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
import { buildInvestigationHref, createInvestigationContext, toHistoricalTimeframe } from "@/lib/investigation/context";

export default function DashboardLayout() {
  useMarketSocket();

  const pathname = usePathname();
  const router = useRouter();
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

  const investigationContext = useMemo(
    () => createInvestigationContext({
      symbol,
      exchange: route.venue === "BINANCE_SPOT" ? "binance_spot" : "binance_futures",
      timeframe: toHistoricalTimeframe(route.timeframe),
      investigationType: "market_state",
      source: "dashboard",
    }),
    [route.timeframe, route.venue, symbol],
  );

  useEffect(() => {
    const href = buildInvestigationHref(pathname, investigationContext);
    if (`${window.location.pathname}${window.location.search}` !== href) {
      router.replace(href, { scroll: false });
    }
  }, [investigationContext, pathname, router]);

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
