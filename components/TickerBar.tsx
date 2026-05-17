// ======================================================
// components/TickerBar.tsx
// ======================================================

"use client"

import Marquee from "react-fast-marquee"

import {
  useMarketStore,
} from "@/stores/useMarketStore"

import {
  cn,
} from "@/lib/utils"

import type {
  Ticker,
} from "@/types/market"

export default function TickerBar() {

  // ======================================================
  // STORE
  // ======================================================

  const tickers =
    useMarketStore(
      (s) => s.tickers
    )

  // ======================================================
  // SORTED
  // ======================================================

  const sorted: Ticker[] =
    Object.values(
      tickers
    )

      // USDT ONLY
      .filter(
        (t) =>
          t.symbol.endsWith(
            "USDT"
          )
      )

      // 거래량 순
      .sort(
        (a, b) =>

          (b.quoteVolume || 0) -
          (a.quoteVolume || 0)
      )

      // TOP 40
      .slice(0, 40)

  // ======================================================
  // EMPTY
  // ======================================================

  if (
    sorted.length === 0
  ) {

    return (

      <div
        className="
          h-8
          flex
          items-center
          text-zinc-500
          text-sm
        "
      >
        Loading market data...
      </div>

    )

  }

  // ======================================================
  // RENDER
  // ======================================================

  return (

    <div
      className="
        w-full
        overflow-hidden
      "
    >

      <Marquee

        speed={45}

        pauseOnHover

        gradient={false}

      >

        {sorted.map(
          (ticker) => {

            const positive =
              ticker.change24h >= 0

            return (

              <div

                key={
                  ticker.symbol
                }

                className="
                  mx-5
                  flex
                  items-center
                  gap-3
                  text-sm
                  cursor-pointer
                  hover:opacity-80
                  transition-opacity
                "
              >

                {/* SYMBOL */}
                <div
                  className="
                    text-zinc-300
                    font-semibold
                    min-w-[90px]
                  "
                >
                  {ticker.symbol}
                </div>

                {/* PRICE */}
                <div
                  className="
                    text-white
                    font-medium
                  "
                >
                  $
                  {ticker.price.toLocaleString()}
                </div>

                {/* CHANGE */}
                <div

                  className={cn(

                    "font-bold",

                    positive
                      ? "text-green-400"
                      : "text-red-400"

                  )}
                >

                  {positive
                    ? "+"
                    : ""}

                  {ticker.change24h.toFixed(
                    2
                  )}

                  %

                </div>

                {/* VOLUME */}
                <div
                  className="
                    text-zinc-500
                    text-xs
                  "
                >

                  Vol:

                  {" "}

                  {(
                    (ticker.quoteVolume || 0) /
                    1_000_000
                  ).toFixed(1)}

                  M

                </div>

                {/* LATENCY */}
                <div
                  className="
                    text-zinc-600
                    text-[10px]
                  "
                >

                  {ticker.latency || 0}
                  ms

                </div>

              </div>

            )

          }
        )}

      </Marquee>

    </div>

  )

}