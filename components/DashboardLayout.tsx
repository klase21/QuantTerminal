// ======================================================
// app/dashboard/DashboardLayout.tsx
// ======================================================

"use client"

import {
  useEffect,
  useState,
} from "react"

import TickerBar from "@/components/TickerBar"
import Orderbook from "@/components/Orderbook"
import Footprint from "@/components/Footprint"
import Heatmap from "@/components/Heatmap"
import VolumeProfile from "@/components/VolumeProfile"
import SymbolSelector from "@/components/SymbolSelector"

import Panel from "@/components/ui/Panel"

import RightPanelTabs from "@/components/right-panel/RightPanelTabs"
import ResizablePanelGroup from "@/components/ResizablePanelGroup"

import useMarketSocket from "@/hooks/useMarketSocket"
import useOrderbookSocket from "@/hooks/useOrderbookSocket"
import useTradeSocket from "@/hooks/useTradeSocket"
import useLiquidationSocket from "@/hooks/useLiquidationSocket"
import useTradeFlowSocket from "@/hooks/useTradeFlowSocket"
import useFootprint from "@/hooks/useFootprint"
import useDepthHeatmap from "@/hooks/useDepthHeatmap"
import useVolumeProfile from "@/hooks/useVolumeProfile"

import { useHeatmapHistory } from "@/hooks/useHeatmapHistory"

import useLiquidityEvents from "@/hooks/useLiquidityEvents"
import useAbsorptionDetector from "@/hooks/useAbsorptionDetector"

import { useMarketStore } from "@/stores/useMarketStore"

import MultiChartWorkspace from "@/components/MultiChartWorkspace"

import AlertCenter from "@/components/AlertCenter"
import useAlertEngine from "@/hooks/useAlertEngine"

// ======================================================
// REMOVE DUPLICATE NEWS/MACRO IMPORTS
// ======================================================

// import MacroIntel from "@/components/MacroIntel"
// import NewsFeed from "./news/NewsFeed"

export default function DashboardLayout() {

  // ======================================================
  // SOCKETS
  // ======================================================

  useMarketSocket()

  // ======================================================
  // SELECTED SYMBOL
  // ======================================================

  const symbol =
    useMarketStore(
      (s) => s.selectedSymbol
    )

  // ======================================================
  // ORDERBOOK
  // ======================================================

  useOrderbookSocket(
    symbol
  )

  const orderbook =
    useMarketStore(
      (s) => s.orderbook
    )

  // ======================================================
  // STREAMS
  // ======================================================

  const { trades } =
    useTradeSocket(
      symbol
    )

  const { liquidations } =
    useLiquidationSocket()

  const flow =
    useTradeFlowSocket(
      symbol
    )

  // ======================================================
  // ANALYTICS
  // ======================================================

  const footprint =
    useFootprint(
      symbol
    )

  const heatmap =
    useDepthHeatmap(
      symbol
    )

  const volumeProfile =
    useVolumeProfile(
      symbol
    )

  const frames =
    useHeatmapHistory(

      orderbook?.bids || [],

      orderbook?.asks || []

    )

  const liquidityEvents =
    useLiquidityEvents(
      heatmap?.flatMap(
        (frame) => [
          ...(frame.bids || []),
          ...(frame.asks || []),
        ]
      ) || []
    )

  const absorptionEvents =
    useAbsorptionDetector(
      trades || []
    )

  // ======================================================
  // ALERT ENGINE
  // ======================================================

  useAlertEngine({

    absorptionEvents,

    liquidityEvents,

    liquidations,

  })

  // ======================================================
  // PANEL COLLAPSE
  // ======================================================

  const [
    collapsed,
    setCollapsed,
  ] = useState<
    Record<
      string,
      boolean
    >
  >({

    orderbook: false,

    heatmap: false,

    workspace: false,

    footprint: false,

    volumeProfile: false,

    rightPanel: false,

  })

  // ======================================================
  // LOAD LAYOUT
  // ======================================================

  useEffect(() => {

    const saved =
      localStorage.getItem(
        "qt-layout-collapse"
      )

    if (saved) {

      setCollapsed(
        JSON.parse(saved)
      )

    }

  }, [])

  // ======================================================
  // SAVE LAYOUT
  // ======================================================

  useEffect(() => {

    localStorage.setItem(

      "qt-layout-collapse",

      JSON.stringify(
        collapsed
      )

    )

  }, [collapsed])

  // ======================================================
  // SHORTCUTS
  // ======================================================

  useEffect(() => {

    const onKey = (
      e: KeyboardEvent
    ) => {

      // ALT + 1
      if (
        e.altKey &&
        e.key === "1"
      ) {

        setCollapsed(
          (prev) => ({

            ...prev,

            orderbook:
              !prev.orderbook,

          })
        )

      }

      // ALT + 2
      if (
        e.altKey &&
        e.key === "2"
      ) {

        setCollapsed(
          (prev) => ({

            ...prev,

            heatmap:
              !prev.heatmap,

          })
        )

      }

      // ALT + 3
      if (
        e.altKey &&
        e.key === "3"
      ) {

        setCollapsed(
          (prev) => ({

            ...prev,

            footprint:
              !prev.footprint,

          })
        )

      }

      // ALT + 4
      if (
        e.altKey &&
        e.key === "4"
      ) {

        setCollapsed(
          (prev) => ({

            ...prev,

            workspace:
              !prev.workspace,

          })
        )

      }

    }

    window.addEventListener(
      "keydown",
      onKey
    )

    return () =>

      window.removeEventListener(
        "keydown",
        onKey
      )

  }, [])

  // ======================================================
  // TOGGLE PANEL
  // ======================================================

  function togglePanel(
    key: string
  ) {

    setCollapsed(
      (prev) => ({

        ...prev,

        [key]:
          !prev[key],

      })
    )

  }

  // ======================================================
  // RENDER
  // ======================================================

  return (

    <div
      className="
        flex
        flex-col
        min-h-screen
        bg-black
        text-white
        overflow-x-hidden
      "
    >

      {/* ======================================================
          TOP TICKER BAR
      ====================================================== */}

      <div
        className="
          border-b
          border-zinc-900
          px-4
          py-3
          shrink-0
          bg-zinc-950
        "
      >

        <TickerBar />

      </div>

      {/* ======================================================
          SYMBOL SELECTOR
      ====================================================== */}

      <div
        className="
          border-b
          border-zinc-900
          px-4
          py-3
          shrink-0
        "
      >

        <SymbolSelector />

      </div>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main
        className="
          flex-1
          overflow-y-auto
          p-4
        "
      >

        <ResizablePanelGroup

          // ======================================================
          // LEFT
          // ======================================================

          left={

            <div className="space-y-4">

              {/* ORDERBOOK */}
              <Panel
                title="Orderbook"
                right="ALT+1"
                collapsible
                collapsed={
                  collapsed.orderbook
                }
                onToggle={() =>
                  togglePanel(
                    "orderbook"
                  )
                }
              >

                {!collapsed.orderbook && (

                  <Orderbook
                    bids={
                      orderbook?.bids || []
                    }
                    asks={
                      orderbook?.asks || []
                    }
                  />

                )}

              </Panel>

              {/* HEATMAP */}
              <Panel
                title="Heatmap"
                right="ALT+2"
                collapsible
                collapsed={
                  collapsed.heatmap
                }
                onToggle={() =>
                  togglePanel(
                    "heatmap"
                  )
                }
              >

                {!collapsed.heatmap && (

                  <Heatmap
                    levels={
                      heatmap
                    }
                  />

                )}

              </Panel>

            </div>

          }

          // ======================================================
          // CENTER
          // ======================================================

          center={

            <div className="space-y-4">

              {/* MULTI CHART */}
              <Panel
                title="Multi-Chart Workspace"
                right="ALT+4"
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
                  <MultiChartWorkspace />
                )}

              </Panel>

              {/* FOOTPRINT */}
              <Panel
                title="Footprint Heatmap"
                right="ALT+3"
                collapsible
                collapsed={
                  collapsed.footprint
                }
                onToggle={() =>
                  togglePanel(
                    "footprint"
                  )
                }
              >

                {!collapsed.footprint && (

                  <Footprint
                    levels={
                      footprint
                    }
                  />

                )}

              </Panel>

              {/* VOLUME PROFILE */}
              <Panel
                title="Volume Profile"
                collapsible
                collapsed={
                  collapsed.volumeProfile
                }
                onToggle={() =>
                  togglePanel(
                    "volumeProfile"
                  )
                }
              >

                {!collapsed.volumeProfile && (

                  <VolumeProfile
                    levels={
                      volumeProfile
                    }
                  />

                )}

              </Panel>

            </div>

          }

          // ======================================================
          // RIGHT
          // ======================================================

          right={

            <Panel

              title="Right Workspace"

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

                  trades={
                    trades
                  }

                  liquidations={
                    liquidations
                  }

                  frames={
                    frames
                  }

                  absorptionEvents={
                    absorptionEvents
                  }

                  liquidityEvents={
                    liquidityEvents
                  }

                  flow={
                    flow
                  }

                />

              )}

            </Panel>

          }

        />

      </main>

      {/* ======================================================
          ALERT CENTER
      ====================================================== */}

      <AlertCenter />

    </div>

  )

}