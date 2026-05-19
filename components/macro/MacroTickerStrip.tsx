// ======================================================
// components/macro/MacroTickerStrip.tsx
// ======================================================

"use client"

interface Props {

  items?: any[]

}

export default function MacroTickerStrip({
  items = [],
}: Props) {

  const duplicated =
    [...items, ...items]

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

      {/* fade edges */}

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

      {/* ticker */}

      <div
        className="
          flex
          w-max
          animate-macroTicker

          hover:[animation-play-state:paused]

          will-change-transform
        "
      >

        {duplicated.map(
          (
            item,
            idx
          ) => {

            const positive =
              item.changePercent >= 0

            return (

              <div
                key={`${item.symbol}-${idx}`}
                className="
                  flex
                  items-center
                  gap-2

                  px-5
                  py-2

                  text-xs
                  whitespace-nowrap

                  border-r
                  border-zinc-900/60
                "
              >

                <span
                  className="
                    text-zinc-500
                    font-medium
                  "
                >

                  {item.label}

                </span>

                <span
                  className="
                    text-white
                    font-semibold
                  "
                >

                  {
                    item.price?.toFixed(2)
                  }

                </span>

                <span
                  className={
                    positive

                      ? "text-emerald-400"

                      : "text-red-400"
                  }
                >

                  {
                    positive
                      ? "+"
                      : ""
                  }

                  {
                    item.changePercent?.toFixed(2)
                  }%

                </span>

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