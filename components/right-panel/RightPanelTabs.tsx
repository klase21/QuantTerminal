// ======================================================
// components/right-panel/RightPanelTabs.tsx
// ======================================================

"use client"

import { useState } from "react"

// ======================================================
// EXISTING COMPONENTS
// ======================================================

import FlowPanel
  from "@/components/right-panel/FlowPanel"

import LiquidityPanel
  from "@/components/right-panel/LiquidityPanel"

import AnalyticsPanel
  from "@/components/right-panel/AnalyticsPanel"

import AlertsPanel
  from "@/components/right-panel/AlertsPanel"

import MacroPanel
  from "@/components/macro/MacroPanel"

// ======================================================
// NEWS FEED
// ======================================================

import NewsFeed
  from "@/components/news/NewsFeed"

// ======================================================
// TYPES
// ======================================================

type Props = {

  trades: any[]

  liquidations: any[]

  frames: any[]

  absorptionEvents: any[]

  liquidityEvents: any[]

  flow: any

}

// ======================================================
// COMPONENT
// ======================================================

export default function RightPanelTabs({

  trades,

  liquidations,

  frames,

  absorptionEvents,

  liquidityEvents,

  flow,

}: Props) {

  const [tab, setTab] = useState<

    | "flow"
    | "liquidity"
    | "analytics"
    | "alerts"
    | "news"
    | "macro"

  >("flow")

  return (

    <div
      className="
        h-full
        flex
        flex-col
        overflow-hidden
      "
    >

      {/* TAB HEADER */}

      <div
        className="
          grid
          grid-cols-6
          gap-2
          p-2
          border-b
          border-zinc-800
        "
      >

        {[
          "flow",
          "liquidity",
          "analytics",
          "alerts",
          "news",
          "macro",
        ].map((t) => (

          <button

            key={t}

            onClick={() =>
              setTab(t as any)
            }

            className={`
              rounded-xl
              px-3
              py-2
              text-sm
              font-medium
              transition-all

              ${
                tab === t
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white"
              }
            `}
          >

            {t.toUpperCase()}

          </button>

        ))}

      </div>

      {/* TAB CONTENT */}

      <div
        className="
          flex-1
          overflow-y-auto
          scrollbar-thin
          scrollbar-thumb-zinc-800
        "
      >

        {
          tab === "flow" && (

            <div className="h-full">

              <FlowPanel
                trades={trades}
                flow={flow}
              />

            </div>

          )
        }

        {
          tab === "liquidity" && (

            <div className="h-full">

              <LiquidityPanel
                frames={frames}
                liquidityEvents={
                  liquidityEvents
                }
              />

            </div>

          )
        }

        {
          tab === "analytics" && (

            <div className="h-full">

              <AnalyticsPanel
                absorptionEvents={
                  absorptionEvents
                }
              />

            </div>

          )
        }

        {
          tab === "alerts" && (

            <div className="h-full">

              <AlertsPanel
                liquidations={
                  liquidations
                }
              />

            </div>

          )
        }

        {
          tab === "news" && (

            <div
              className="
                h-full
                p-4
              "
            >

              <NewsFeed />

            </div>

          )
        }

        {
          tab === "macro" && (

            <div
              className="
                h-full
                p-4
              "
            >

              <MacroPanel />

            </div>

          )
        }

      </div>

    </div>

  )

}