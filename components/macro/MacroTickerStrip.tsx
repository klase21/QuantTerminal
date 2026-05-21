// ======================================================
// components/macro/MacroTickerStrip.tsx
// ======================================================

"use client"

import { useEffect, useRef, useState } from "react"


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
      Number(
        String(previous.current)
          .replace("%", "")
          .replace("+", "")
          .replace("B", "")
      )

    const nextNum =
      Number(
        String(value)
          .replace("%", "")
          .replace("+", "")
          .replace("B", "")
      )

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
      className={`
        rounded
        px-1
        transition-colors
        duration-500
        ${className}
        ${
          flash === "up"
            ? "bg-emerald-500/20"
            : flash === "down"
              ? "bg-red-500/20"
              : ""
        }
      `}
    >
      {value}
    </span>
  )
}

interface MacroTickerItem {
  symbol?: string
  label?: string
  price?: number
  value?: string
  changePercent?: number
  change?: string
  signal?: string
}

interface Props {
  items?: MacroTickerItem[]
}

const defaultItems: MacroTickerItem[] = [
  {
    symbol: "DXY",
    label: "DXY",
    value: "99.44",
    change: "+0.12%",
    signal: "Dollar Pressure",
  },
  {
    symbol: "US10Y",
    label: "US10Y",
    value: "4.65",
    change: "-0.30%",
    signal: "Yields Easing",
  },
  {
    symbol: "NASDAQ",
    label: "NASDAQ",
    value: "26028",
    change: "+0.81%",
    signal: "Risk-On",
  },
  {
    symbol: "SPX",
    label: "S&P500",
    value: "6624",
    change: "+0.48%",
    signal: "Equity Beta",
  },
  {
    symbol: "VIX",
    label: "VIX",
    value: "14.80",
    change: "-2.15%",
    signal: "Vol Compression",
  },
  {
    symbol: "GOLD",
    label: "GOLD",
    value: "2408",
    change: "+0.22%",
    signal: "Safe Haven",
  },
  {
    symbol: "OIL",
    label: "OIL",
    value: "78.42",
    change: "-0.64%",
    signal: "Energy Pressure",
  },
  {
    symbol: "US2Y",
    label: "US2Y",
    value: "4.28",
    change: "-0.21%",
    signal: "Fed Path",
  },
  {
    symbol: "MOVE",
    label: "MOVE",
    value: "96.30",
    change: "-1.04%",
    signal: "Bond Vol",
  },
  {
    symbol: "TOTAL3",
    label: "TOTAL3",
    value: "692B",
    change: "+1.31%",
    signal: "Alt Liquidity",
  },
]

function parseChange(
  item: MacroTickerItem
) {
  if (
    typeof item.changePercent === "number"
  ) {
    return item.changePercent
  }

  const raw =
    item.change || "0"

  return Number(
    raw.replace("%", "")
  ) || 0
}

function displayValue(
  item: MacroTickerItem
) {
  if (
    typeof item.price === "number"
  ) {
    return item.price.toFixed(2)
  }

  return item.value || "-"
}

export default function MacroTickerStrip({
  items,
}: Props) {

  const sourceItems =
    items && items.length > 0
      ? items
      : defaultItems

  const duplicated =
    [
      ...sourceItems,
      ...sourceItems,
      ...sourceItems,
    ]

  return (

    <div
      className="
        relative
        overflow-hidden
        border-b
        border-zinc-800
        bg-zinc-950
      "
    >

      <div
        className="
          pointer-events-none
          absolute
          left-0
          top-0
          z-10
          h-full
          w-16
          bg-gradient-to-r
          from-zinc-950
          to-transparent
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          right-0
          top-0
          z-10
          h-full
          w-16
          bg-gradient-to-l
          from-zinc-950
          to-transparent
        "
      />

      <div
        className="
          flex
          w-max
          animate-macroTicker
          hover:[animation-play-state:paused]
          will-change-transform
        "
        style={{
          animationDuration: "180s",
        }}
      >

        {duplicated.map(
          (
            item,
            idx
          ) => {

            const change =
              parseChange(item)

            const positive =
              change >= 0

            return (

              <div
                key={`${item.symbol || item.label}-${idx}`}
                className="
                  flex
                  items-center
                  gap-2
                  border-r
                  border-zinc-900/60
                  px-5
                  py-2
                  text-xs
                  whitespace-nowrap
                "
              >

                <span
                  className="
                    font-medium
                    text-zinc-500
                  "
                >
                  {item.label || item.symbol}
                </span>

                <span
                  className="
                    font-semibold
                    text-white
                  "
                >
                  <FlashValue
                    value={displayValue(item)}
                  />
                </span>

                <span
                  className={
                    positive
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  <FlashValue
                    value={`${positive ? "+" : ""}${change.toFixed(2)}%`}
                  />
                </span>

                {item.signal && (
                  <span
                    className="
                      rounded-md
                      bg-zinc-900
                      px-1.5
                      py-0.5
                      text-[10px]
                      text-zinc-400
                    "
                  >
                    {item.signal}
                  </span>
                )}

                <div
                  className={`
                    h-1.5
                    w-1.5
                    rounded-full
                    ${
                      positive
                        ? "bg-emerald-400"
                        : "bg-red-400"
                    }
                  `}
                />

              </div>

            )

          }
        )}

      </div>

    </div>

  )

}
