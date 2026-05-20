"use client"

import { useState } from "react"

import FlowPanel from "@/components/right-panel/FlowPanel"
import LiquidityPanel from "@/components/right-panel/LiquidityPanel"
import AnalyticsPanel from "@/components/right-panel/AnalyticsPanel"
import AlertsPanel from "@/components/right-panel/AlertsPanel"

import MacroPanel from "@/components/macro/MacroPanel"
import MacroNewsCorrelation from "@/components/macro/MacroNewsCorrelation"

import NewsFeed from "@/components/news/NewsFeed"

type Props = {
  trades: any[]
  liquidations: any[]
  frames: any[]
  absorptionEvents: any[]
  liquidityEvents: any[]
  flow: any
}

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
    | "news"
    | "macro"
    | "correlation"
  >("macro")

  const tabs = [
    "macro",
    "correlation",
    "flow",
    "liquidity",
    "news",
  ]

  return (

    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-zinc-900
        bg-zinc-950/40
      "
    >

      {/* TAB HEADER */}

      <div
        className="
          shrink-0
          overflow-x-auto
          border-b
          border-zinc-800
          p-2
        "
      >

        <div
          className="
            flex
            min-w-max
            gap-2
          "
        >

          {tabs.map((t) => (

            <button
              key={t}
              onClick={() =>
                setTab(t as any)
              }
              className={`
                rounded-xl
                px-3
                py-2
                text-xs
                font-semibold
                whitespace-nowrap
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

      </div>

      {/* CONTENT */}

      <div
        className="
          flex-1
          min-h-0
          overflow-y-auto
          scrollbar-thin
          scrollbar-thumb-zinc-800
        "
      >

        {tab === "macro" && (

          <div className="p-4">

            <MacroPanel />

          </div>

        )}

        {tab === "correlation" && (

          <div className="p-4">

            <MacroNewsCorrelation />

          </div>

        )}

        {tab === "flow" && (

          <div className="h-full min-h-0">

            <FlowPanel
              trades={trades}
              flow={flow}
            />

          </div>

        )}

        {tab === "liquidity" && (

          <div className="h-full min-h-0">

            <LiquidityPanel
              frames={frames}
              liquidityEvents={
                liquidityEvents
              }
            />

          </div>

        )}

        {tab === "news" && (

          <div className="p-4">

            <NewsFeed />

          </div>

        )}

      </div>

    </div>
  )
}