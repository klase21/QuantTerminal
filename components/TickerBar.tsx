"use client"

import { useMemo } from "react"

import Marquee
  from "react-fast-marquee"

import {
  useMarketStore,
} from "@/stores/useMarketStore"

import {
  cn,
} from "@/lib/utils"

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

  const sorted = useMemo(() => {

    return Object.values(
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

          b.quoteVolume -
          a.quoteVolume
      )

      // TOP 40
      .slice(0, 40)

  }, [tickers])

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
        speed={28}
        pauseOnHover
        gradient={false}
        autoFill
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
                  transition-all duration-300 will-change-transform
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

                  {(ticker.change24h ?? 0).toFixed(2)}

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
                    ticker.quoteVolume /
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

                  {ticker.latency}
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