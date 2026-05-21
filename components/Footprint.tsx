"use client"

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

interface Level {
  price: number
  buyVolume: number
  sellVolume: number
  delta: number
  total: number
}

interface Props {
  levels: Level[]
}

const ROW_HEIGHT = 30

function Footprint({
  levels,
}: Props) {

  const safeLevels =
    levels || []

  const containerRef =
    useRef<HTMLDivElement>(null)

  const [visibleRows, setVisibleRows] =
    useState(18)

  useEffect(() => {

    const updateSize = () => {

      if (!containerRef.current)
        return

      const height =
        containerRef.current.clientHeight

      const reserved =
        84 // header
        + 36 // columns
        + 16 // padding

      const rows =
        Math.max(
          6,
          Math.floor(
            (height - reserved)
            / ROW_HEIGHT
          )
        )

      setVisibleRows(rows)
    }

    updateSize()

    const observer =
      new ResizeObserver(
        updateSize
      )

    if (containerRef.current) {
      observer.observe(
        containerRef.current
      )
    }

    window.addEventListener(
      "resize",
      updateSize
    )

    return () => {
      observer.disconnect()

      window.removeEventListener(
        "resize",
        updateSize
      )
    }

  }, [])

  const dynamicLevels =
    useMemo(() => {

      return safeLevels
        .slice(0, visibleRows)

    }, [
      safeLevels,
      visibleRows,
    ])

  const max = Math.max(
    ...dynamicLevels.map(
      (l) => l.total || 0
    ),
    1
  )

  return (

    <div
      ref={containerRef}
      className="
        flex
        h-full
        min-h-0
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-zinc-800
        bg-zinc-950
      "
    >

      {/* HEADER */}

      <div
        className="
          shrink-0
          border-b
          border-zinc-800
          px-4
          pt-4
          pb-3
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >

          <div>

            <div
              className="
                text-sm
                font-semibold
                text-zinc-300
              "
            >
              Footprint
            </div>

            <div
              className="
                mt-1
                text-xs
                text-zinc-500
              "
            >
              Dynamic footprint aggregation
            </div>

          </div>

          <div
            className="
              flex
              shrink-0
              items-center
              gap-3
              text-[11px]
              text-zinc-400
            "
          >

            <div className="flex items-center gap-1">

              <div
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-green-500
                "
              />

              Buy

            </div>

            <div className="flex items-center gap-1">

              <div
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-red-500
                "
              />

              Sell

            </div>

          </div>

        </div>

      </div>

      {/* TABLE */}

      <div
        className="
          flex-1
          min-h-0
          overflow-hidden
        "
      >

        {/* COLUMN HEADER */}

        <div
          className="
            grid
            grid-cols-5
            gap-2
            border-b
            border-zinc-800
            bg-zinc-950
            px-3
            py-2
            text-[10px]
            uppercase
            tracking-wider
            text-zinc-500
          "
        >

          <div>Price</div>

          <div className="text-right">
            Buy
          </div>

          <div className="text-right">
            Sell
          </div>

          <div className="text-right">
            Delta
          </div>

          <div className="text-right">
            Total
          </div>

        </div>

        {/* LEVELS */}

        <div
          className="
            flex
            flex-col
            gap-[2px]
            p-2
          "
        >

          {dynamicLevels.map((level) => {

            const strength =
              (level.total / max) * 100

            const isBuy =
              level.delta >= 0

            return (

              <div
                key={level.price}
                className="
                  relative
                  h-[28px]
                  shrink-0
                  overflow-hidden
                  rounded-md
                  border
                  border-zinc-900
                  bg-black
                "
              >

                {/* HEATMAP */}

                <div
                  className={`
                    absolute
                    left-0
                    top-0
                    bottom-0
                    opacity-20
                    ${
                      isBuy
                        ? "bg-green-500"
                        : "bg-red-500"
                    }
                  `}
                  style={{
                    width: `${strength}%`,
                  }}
                />

                {/* CONTENT */}

                <div
                  className="
                    relative
                    z-10
                    grid
                    h-full
                    grid-cols-5
                    items-center
                    gap-2
                    px-3
                    text-[11px]
                    font-mono
                    tabular-nums
                  "
                >

                  <div
                    className="
                      truncate
                      text-zinc-200
                    "
                  >
                    {level.price.toFixed(1)}
                  </div>

                  <div
                    className="
                      truncate
                      text-right
                      text-green-400
                    "
                  >
                    {level.buyVolume.toFixed(3)}
                  </div>

                  <div
                    className="
                      truncate
                      text-right
                      text-red-400
                    "
                  >
                    {level.sellVolume.toFixed(3)}
                  </div>

                  <div
                    className={`
                      truncate
                      text-right
                      font-semibold
                      ${
                        isBuy
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    `}
                  >
                    {level.delta > 0 ? "+" : ""}
                    {level.delta.toFixed(3)}
                  </div>

                  <div
                    className="
                      truncate
                      text-right
                      text-zinc-300
                    "
                  >
                    {level.total.toFixed(3)}
                  </div>

                </div>

              </div>

            )

          })}

          {dynamicLevels.length === 0 && (

            <div
              className="
                flex
                min-h-[240px]
                items-center
                justify-center
                text-sm
                text-zinc-500
              "
            >
              Waiting for footprint data...
            </div>

          )}

        </div>

      </div>

    </div>
  )
}

export default memo(Footprint)
