"use client"

import { useState } from "react"

import MarketOverview from "@/components/MarketOverview"
import TradeTape from "@/components/TradeTape"
import LiquidationFeed from "@/components/LiquidationFeed"
import HeatmapCanvas from "@/components/HeatmapCanvas"
import AbsorptionPanel from "@/components/AbsorptionPanel"
import CVDPanel from "@/components/CVDPanel"

import AlertRulePanel
  from "@/components/AlertRulePanel"

interface Props {

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
    | "analytics"
    | "alerts"

  >("flow")

  return (

    <div className="space-y-4">

      {/* ====================================================== */}
      {/* TABS */}
      {/* ====================================================== */}

      <div
        className="
          rounded-2xl
          border
          border-zinc-800
          bg-zinc-950
          p-2
        "
      >

        <div
          className="
            grid
            grid-cols-4
            gap-2
          "
        >

          {/* FLOW */}
          <button

            onClick={() =>
              setTab("flow")
            }

            className={`
              rounded-xl
              px-3
              py-2
              text-sm
              font-medium
              transition-all

              ${
                tab === "flow"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white"
              }
            `}
          >

            FLOW

          </button>

          {/* LIQUIDITY */}
          <button

            onClick={() =>
              setTab("liquidity")
            }

            className={`
              rounded-xl
              px-3
              py-2
              text-sm
              font-medium
              transition-all

              ${
                tab === "liquidity"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white"
              }
            `}
          >

            LIQUIDITY

          </button>

          {/* ANALYTICS */}
          <button

            onClick={() =>
              setTab("analytics")
            }

            className={`
              rounded-xl
              px-3
              py-2
              text-sm
              font-medium
              transition-all

              ${
                tab === "analytics"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white"
              }
            `}
          >

            ANALYTICS

          </button>

          {/* ALERTS */}
          <button

            onClick={() =>
              setTab("alerts")
            }

            className={`
              rounded-xl
              px-3
              py-2
              text-sm
              font-medium
              transition-all

              ${
                tab === "alerts"
                  ? "bg-red-500/20 text-red-400"
                  : "text-zinc-500 hover:text-white"
              }
            `}
          >

            ALERTS

          </button>

        </div>

      </div>

      {/* ====================================================== */}
      {/* FLOW */}
      {/* ====================================================== */}

      {
        tab === "flow" && (

          <div className="space-y-4">

            <MarketOverview />

            <CVDPanel

              buyVolume={
                flow?.buyVolume || 0
              }

              sellVolume={
                flow?.sellVolume || 0
              }

              delta={
                flow?.delta || 0
              }

              cvd={
                flow?.cvd || 0
              }

            />

            <TradeTape
              trades={trades}
            />

            <AbsorptionPanel
              events={
                absorptionEvents
              }
            />

          </div>

        )
      }

      {/* ====================================================== */}
      {/* LIQUIDITY */}
      {/* ====================================================== */}

      {
        tab === "liquidity" && (

          <div className="space-y-4">

            <LiquidationFeed
              liquidations={
                liquidations
              }
            />

            <HeatmapCanvas
              frames={frames}
            />

            {/* LIQUIDITY EVENTS */}
            <div
              className="
                rounded-2xl
                border
                border-zinc-800
                bg-zinc-950
                p-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                  mb-4
                "
              >

                <div
                  className="
                    text-sm
                    font-semibold
                  "
                >

                  Liquidity Events

                </div>

                <div
                  className="
                    text-xs
                    text-zinc-500
                  "
                >

                  Real-Time

                </div>

              </div>

              <div
                className="
                  space-y-2
                  max-h-[420px]
                  overflow-auto
                "
              >

                {
                  liquidityEvents
                    .slice(0, 20)
                    .map((event, idx) => (

                      <div

                        key={idx}

                        className="
                          rounded-lg
                          border
                          border-zinc-800
                          bg-black/40
                          p-3
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            mb-1
                          "
                        >

                          <div
                            className={
                              event.side === "bid"

                                ? "text-green-400 text-xs font-semibold"

                                : "text-red-400 text-xs font-semibold"
                            }
                          >

                            {
                              event.side === "bid"

                                ? "BID LIQUIDITY"

                                : "ASK LIQUIDITY"
                            }

                          </div>

                          <div
                            className="
                              text-[10px]
                              text-zinc-500
                            "
                          >

                            {event.time}

                          </div>

                        </div>

                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            text-sm
                          "
                        >

                          <div
                            className="
                              font-mono
                            "
                          >

                            {
                              event.price.toFixed(1)
                            }

                          </div>

                          <div
                            className="
                              font-mono
                              text-zinc-400
                            "
                          >

                            {
                              event.size.toFixed(2)
                            }

                          </div>

                        </div>

                      </div>

                    ))
                }

              </div>

            </div>

          </div>

        )
      }

      {/* ====================================================== */}
      {/* ANALYTICS */}
      {/* ====================================================== */}

      {
        tab === "analytics" && (

          <div className="space-y-4">

            <div
              className="
                rounded-2xl
                border
                border-zinc-800
                bg-zinc-950
                p-4
              "
            >

              <div
                className="
                  text-sm
                  font-semibold
                  mb-2
                "
              >

                Analytics

              </div>

              <div
                className="
                  text-sm
                  text-zinc-400
                "
              >

                Upcoming modules:

              </div>

              <div
                className="
                  mt-4
                  space-y-2
                  text-sm
                "
              >

                <div
                  className="
                    rounded-lg
                    bg-black/40
                    p-3
                    border
                    border-zinc-800
                  "
                >

                  AI Narrative Engine

                </div>

                <div
                  className="
                    rounded-lg
                    bg-black/40
                    p-3
                    border
                    border-zinc-800
                  "
                >

                  Volatility Regime

                </div>

                <div
                  className="
                    rounded-lg
                    bg-black/40
                    p-3
                    border
                    border-zinc-800
                  "
                >

                  Market Structure

                </div>

                <div
                  className="
                    rounded-lg
                    bg-black/40
                    p-3
                    border
                    border-zinc-800
                  "
                >

                  Session Strength

                </div>

              </div>

            </div>

          </div>

        )
      }

      {/* ====================================================== */}
      {/* ALERTS */}
      {/* ====================================================== */}

      {
        tab === "alerts" && (

          <div className="space-y-4">

            <AlertRulePanel />

          </div>

        )
      }

    </div>

  )

}