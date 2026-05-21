// ======================================================
// components/macro/MacroTickerStrip.tsx
// Dynamic macro ticker
// ======================================================

"use client"

import {
  useEffect,
  useRef,
  useState,
} from "react"

import useMacroTicker from "@/hooks/useMacroTicker"

import {
  MacroTickerItem,
} from "@/lib/macroTicker"

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
          .replace(",", "")
      )

    const nextNum =
      Number(
        String(value)
          .replace("%", "")
          .replace("+", "")
          .replace("B", "")
          .replace(",", "")
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

function parseChange(
  item: MacroTickerItem
) {
  const raw =
    item.change || "0"

  return Number(
    raw.replace("%", "")
  ) || 0
}

export default function MacroTickerStrip() {
  const { items } =
    useMacroTicker()

  const visibleItems =
    items.filter(
      (item) => !item.hidden
    )

  const duplicated =
    [
      ...visibleItems,
      ...visibleItems,
      ...visibleItems,
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
          animationDuration: "90s",
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
                key={`${item.symbol}-${idx}`}
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
                    value={item.value}
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
                    value={item.change}
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
