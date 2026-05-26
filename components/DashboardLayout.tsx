"use client";

import { useEffect, useState } from "react";

import useMarketSocket from "@/hooks/useMarketSocket";
import useOrderbookSocket from "@/hooks/useOrderbookSocket";
import useTradeSocket from "@/hooks/useTradeSocket";
import useLiquidationSocket from "@/hooks/useLiquidationSocket";
import useTradeFlowSocket from "@/hooks/useTradeFlowSocket";
import useMarketTradeFlowSocket from "@/hooks/useMarketTradeFlowSocket";
import useFootprint from "@/hooks/useFootprint";
import useDepthHeatmap from "@/hooks/useDepthHeatmap";
import useVolumeProfile from "@/hooks/useVolumeProfile";
import { useHeatmapHistory } from "@/hooks/useHeatmapHistory";
import useLiquidityEvents from "@/hooks/useLiquidityEvents";
import useAbsorptionDetector from "@/hooks/useAbsorptionDetector";
import useAlertEngine from "@/hooks/useAlertEngine";

import { useMarketStore } from "@/stores/useMarketStore";
import { useMarketModeStore } from "@/stores/useMarketModeStore";

import AlertCenter from "@/components/AlertCenter";
import DashboardFrame from "@/components/layout/DashboardFrame";
import ExecutionWorkspace from "@/components/layout/ExecutionWorkspace";
import RightIntelligenceRail from "@/components/layout/RightIntelligenceRail";
import TerminalSurfaceDeck from "@/components/layout/TerminalSurfaceDeck";

const LAYOUT_STORAGE_KEY = "qt-layout-collapse";

type CollapsedState = {
  workspace: boolean;
  rightPanel: boolean;
};

export default function DashboardLayout() {
  useMarketSocket();

  const symbol = useMarketStore((state) => state.selectedSymbol);
  const marketMode = useMarketModeStore((state) => state.marketMode);
  const orderbook = useMarketStore((state) => state.orderbook);

  useOrderbookSocket(symbol);

  const { trades } = useTradeSocket(symbol);
  const { liquidations } = useLiquidationSocket();
  const legacyFlow = useTradeFlowSocket(symbol);
  const spotFlow = useMarketTradeFlowSocket(symbol, "SPOT");
  const futuresFlow = useMarketTradeFlowSocket(symbol, "FUTURES");
  const flow = marketMode === "SPOT" ? spotFlow : futuresFlow;
  const footprint = useFootprint(symbol);
  const heatmap = useDepthHeatmap(symbol);

  // Keep the hook active for existing downstream stores and future panels.
  useVolumeProfile(symbol);

  const frames = useHeatmapHistory(orderbook?.bids || [], orderbook?.asks || []);

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

  const [collapsed, setCollapsed] = useState<CollapsedState>({
    workspace: false,
    rightPanel: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!saved) return;
      setCollapsed(JSON.parse(saved));
    } catch {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const togglePanel = (key: keyof CollapsedState) => {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-black text-white">
      <TerminalSurfaceDeck />

      <DashboardFrame
        workspaceCollapsed={collapsed.workspace}
        rightRailCollapsed={collapsed.rightPanel}
        onToggleWorkspace={() => togglePanel("workspace")}
        onToggleRightRail={() => togglePanel("rightPanel")}
        workspace={
          <ExecutionWorkspace
            orderbook={orderbook}
            trades={trades}
            flow={flow}
            spotFlow={spotFlow}
            futuresFlow={futuresFlow}
            marketMode={marketMode}
            symbol={symbol}
            footprint={footprint}
            frames={frames}
            liquidityEvents={liquidityEvents}
          />
        }
        rightRail={
          <RightIntelligenceRail
            trades={trades}
            liquidations={liquidations}
            frames={frames}
            absorptionEvents={absorptionEvents}
            liquidityEvents={liquidityEvents}
            flow={flow}
          />
        }
      />

      <AlertCenter />
    </div>
  );
}
