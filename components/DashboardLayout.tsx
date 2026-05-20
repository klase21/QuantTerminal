"use client";

import { useEffect, useState } from "react";

import TickerBar from "@/components/TickerBar";
import Orderbook from "@/components/Orderbook";
import Footprint from "@/components/Footprint";
import Heatmap from "@/components/Heatmap";
import VolumeProfile from "@/components/VolumeProfile";

import Panel from "@/components/ui/Panel";

import RightPanelTabs from "@/components/right-panel/RightPanelTabs";
import ResizablePanelGroup from "@/components/ResizablePanelGroup";

import useMarketSocket from "@/hooks/useMarketSocket";
import useOrderbookSocket from "@/hooks/useOrderbookSocket";
import useTradeSocket from "@/hooks/useTradeSocket";
import useLiquidationSocket from "@/hooks/useLiquidationSocket";
import useTradeFlowSocket from "@/hooks/useTradeFlowSocket";
import useFootprint from "@/hooks/useFootprint";
import useDepthHeatmap from "@/hooks/useDepthHeatmap";
import useVolumeProfile from "@/hooks/useVolumeProfile";

import { useHeatmapHistory } from "@/hooks/useHeatmapHistory";

import useLiquidityEvents from "@/hooks/useLiquidityEvents";
import useAbsorptionDetector from "@/hooks/useAbsorptionDetector";

import { useMarketStore } from "@/stores/useMarketStore";

import MultiChartWorkspace from "@/components/MultiChartWorkspace";

import AlertCenter from "@/components/AlertCenter";
import useAlertEngine from "@/hooks/useAlertEngine";

import MacroTickerStrip from "@/components/macro/MacroTickerStrip";
import RealtimeIntelligenceStrip from "@/components/macro/RealtimeIntelligenceStrip";
import MacroMiniCardsRow from "@/components/macro/MacroMiniCardsRow";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function DashboardLayout() {

  useMarketSocket();

  const symbol =
    useMarketStore(
      (s) => s.selectedSymbol
    );

  useOrderbookSocket(symbol);

  const orderbook =
    useMarketStore(
      (s) => s.orderbook
    );

  const { trades } =
    useTradeSocket(symbol);

  const { liquidations } =
    useLiquidationSocket();

  const flow =
    useTradeFlowSocket(symbol);

  const footprint =
    useFootprint(symbol);

  const heatmap =
    useDepthHeatmap(symbol);

  const volumeProfile =
    useVolumeProfile(symbol);

  const frames =
    useHeatmapHistory(
      orderbook?.bids || [],
      orderbook?.asks || []
    );

  const liquidityEvents =
    useLiquidityEvents(
      heatmap?.flatMap(
        (f: any) => [
          ...(f?.bids || []),
          ...(f?.asks || []),
        ]
      ) || []
    );

  const absorptionEvents =
    useAbsorptionDetector(
      trades || []
    );

  useAlertEngine({
    absorptionEvents,
    liquidityEvents,
    liquidations,
  });

  const [
    collapsed,
    setCollapsed,
  ] = useState<
    Record<string, boolean>
  >({
    workspace: false,
    rightPanel: false,
  });

  useEffect(() => {

    const saved =
      localStorage.getItem(
        "qt-layout-collapse"
      );

    if (saved) {

      setCollapsed(
        JSON.parse(saved)
      );

    }

  }, []);

  useEffect(() => {

    localStorage.setItem(
      "qt-layout-collapse",
      JSON.stringify(collapsed)
    );

  }, [collapsed]);

  const togglePanel = (
    key: string
  ) => {

    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

  };

  return (

    <div
      className="
        flex
        min-h-screen
        flex-col
        overflow-hidden
        bg-black
        text-white
      "
    >

      {/* TOP TICKER */}

      <div
        className="
          shrink-0
          border-b
          border-zinc-900
          bg-zinc-950
          px-4
          py-3
        "
      >

        <TickerBar />

      </div>

      {/* MACRO TICKER */}

      <div
        className="
          shrink-0
          border-b
          border-zinc-900
          bg-zinc-950/80
        "
      >

        <MacroTickerStrip />

      </div>

      {/* REALTIME INTELLIGENCE STRIP */}

      <div
        className="
          shrink-0
          border-b
          border-emerald-500/10
          bg-black
          px-4
          py-2
        "
      >

        <RealtimeIntelligenceStrip />

      </div>


      {/* COMPACT MACRO ROW */}

      <div
        className="
          shrink-0
          border-b
          border-zinc-900
          bg-black
          px-4
          py-2
        "
      >

        <MacroMiniCardsRow />

      </div>

      {/* MAIN */}

      <main
        className="
          flex-1
          min-h-0
          overflow-hidden
          p-4
        "
      >

        <ResizablePanelGroup

          left={

            <div
              className="
                flex
                h-full
                min-h-0
                flex-col
                gap-4
              "
            >

              <Panel
                title="Execution Workspace"
                collapsible
                collapsed={
                  collapsed.workspace
                }
                onToggle={() =>
                  togglePanel(
                    "workspace"
                  )
                }
              >

                {!collapsed.workspace && (

                  <Tabs
                    defaultValue="charts"
                    className="
                      flex
                      h-full
                      min-h-0
                      flex-col
                      gap-4
                    "
                  >

                    {/* TABS */}

                    <TabsList
                      className="
                        flex
                        w-full
                        shrink-0
                        flex-wrap
                        justify-start
                        gap-2
                        border-b
                        border-zinc-800
                        bg-transparent
                        pb-2
                      "
                    >

                      <TabsTrigger value="charts">
                        Multi Charts
                      </TabsTrigger>

                      <TabsTrigger value="orderbook">
                        Orderbook
                      </TabsTrigger>

                      <TabsTrigger value="footprint">
                        Footprint
                      </TabsTrigger>

                      <TabsTrigger value="volume">
                        Volume Profile
                      </TabsTrigger>

                      <TabsTrigger value="liquidity">
                        Liquidity
                      </TabsTrigger>

                    </TabsList>

                    {/* CONTENT */}

                    <div
                      className="
                        flex
                        flex-1
                        min-h-0
                        flex-col
                        gap-4
                      "
                    >

                      <TabsContent
                        value="charts"
                        className="
                          m-0
                          min-h-0
                        "
                      >

                        <MultiChartWorkspace />

                      </TabsContent>

                      <TabsContent
                        value="orderbook"
                        className="
                          m-0
                          min-h-0
                        "
                      >

                        <Orderbook
                          bids={
                            orderbook?.bids || []
                          }
                          asks={
                            orderbook?.asks || []
                          }
                        />

                      </TabsContent>

                      <TabsContent
                        value="footprint"
                        className="
                          m-0
                          min-h-0
                        "
                      >

                        <div
                          className="
                            h-full
                            min-h-0
                            overflow-hidden
                          "
                        >

                          <Footprint
                            levels={footprint}
                          />

                        </div>

                      </TabsContent>

                      <TabsContent
                        value="volume"
                        className="
                          m-0
                          min-h-0
                        "
                      >

                        <div
                          className="
                            h-full
                            min-h-0
                            overflow-hidden
                          "
                        >

                          <VolumeProfile
                            levels={
                              volumeProfile
                            }
                          />

                        </div>

                      </TabsContent>

                      <TabsContent
                        value="liquidity"
                        className="
                          m-0
                          min-h-0
                        "
                      >

                        <Heatmap
                          levels={heatmap}
                        />

                      </TabsContent>

                    </div>

                  </Tabs>

                )}

              </Panel>

            </div>

          }

          center={
            <div />
          }

          right={

            <div
              className="
                h-full
                min-h-0
              "
            >

              <Panel
                title="Macro Intelligence"
                collapsible
                collapsed={
                  collapsed.rightPanel
                }
                onToggle={() =>
                  togglePanel(
                    "rightPanel"
                  )
                }
              >

                {!collapsed.rightPanel && (

                  <RightPanelTabs
                    trades={trades}
                    liquidations={
                      liquidations
                    }
                    frames={frames}
                    absorptionEvents={
                      absorptionEvents
                    }
                    liquidityEvents={
                      liquidityEvents
                    }
                    flow={flow}
                  />

                )}

              </Panel>

            </div>

          }

        />

      </main>

      <AlertCenter />

    </div>
  );
}