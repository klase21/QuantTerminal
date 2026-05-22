"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import Marquee
  from "react-fast-marquee"

import {
  useMarketStore,
} from "@/stores/useMarketStore"

import {
  cn,
} from "@/lib/utils"


function FlashValue({
  value,
  className = "",
}: {
  value: string | number
  className?: string
}) {
  const previous =
    useRef(value)

  const [flash, setFlash] =
    useState<"up" | "down" | null>(null)

  useEffect(() => {
    if (previous.current === value) return

    const prevNum =
      Number(previous.current)

    const nextNum =
      Number(value)

    if (
      !Number.isNaN(prevNum) &&
      !Number.isNaN(nextNum)
    ) {
      setFlash(
        nextNum >= prevNum
          ? "up"
          : "down"
      )
    } else {
      setFlash("up")
    }

    previous.current = value

    const timeout =
      window.setTimeout(
        () => setFlash(null),
        650
      )

    return () =>
      window.clearTimeout(timeout)
  }, [value])

  return (
    <span
      className={cn(
        className,
        "rounded px-1 transition-colors duration-500",
        flash === "up" &&
          "bg-emerald-500/20",
        flash === "down" &&
          "bg-red-500/20"
      )}
    >
      {value}
    </span>
  )
}

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

      // Sort by volume.
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
        speed={12}
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
                  <FlashValue
                    value={`$${ticker.price.toLocaleString()}`}
                  />
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

                  <FlashValue
                    value={`${positive ? "+" : ""}${(ticker.change24h ?? 0).toFixed(2)}%`}
                  />

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