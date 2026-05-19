// ======================================================
// components/macro/MacroTickerStrip.tsx
// ======================================================

"use client"

interface Props {

  items: any[]

}

export default function MacroTickerStrip({
  items,
}: Props) {

  // ======================================================
  // INFINITE LOOP
  // ======================================================

  const looped = [
    ...items,
    ...items,
  ]

  return (

    <div
      className="
        relative
        overflow-hidden

        border-b
        border-zinc-800

        bg-black
      "
    >

      {/* FADE LEFT */}

      <div
        className="
          pointer-events-none

          absolute
          left-0
          top-0
          z-10

          h-full
          w-12

          bg-gradient-to-r
          from-black
          to-transparent
        "
      />

      {/* FADE RIGHT */}

      <div
        className="
          pointer-events-none

          absolute
          right-0
          top-0
          z-10

          h-full
          w-12

          bg-gradient-to-l
          from-black
          to-transparent
        "
      />

      {/* STRIP */}

      <div
        className="
          flex
          w-max
          items-center
          gap-6

          whitespace-nowrap

          px-4
          py-2

          animate-[macroTicker_35s_linear_infinite]
        "
      >

        {looped.map(
          (item, idx) => {

            const positive =
              item.changePercent >= 0

            return (

              <div
                key={`${item.symbol}-${idx}`}
                className="
                  flex
                  items-center
                  gap-2

                  rounded-lg

                  border
                  border-zinc-800

                  bg-zinc-950/80

                  px-3
                  py-1.5

                  backdrop-blur
                "
              >

                {/* LABEL */}

                <span
                  className="
                    text-[11px]
                    font-medium
                    text-zinc-500
                  "
                >

                  {item.label}

                </span>

                {/* PRICE */}

                <span
                  className="
                    text-xs
                    font-semibold
                    text-white
                  "
                >

                  {
                    item.price?.toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits: 2,
                      }
                    )
                  }

                </span>

                {/* CHANGE */}

                <span
                  className={`
                    text-xs
                    font-bold

                    ${
                      positive

                        ? "text-emerald-400"

                        : "text-red-400"
                    }
                  `}
                >

                  {positive ? "+" : ""}

                  {
                    item.changePercent?.toFixed(2)
                  }%

                </span>

              </div>

            )

          }
        )}

      </div>

    </div>

  )

}