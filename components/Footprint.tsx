"use client"

import { memo } from "react"

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

function Footprint({
  levels,
}: Props) {

  const safeLevels =
    levels || []

  const max = Math.max(
    ...safeLevels.map(
      (l) => l.total || 0
    ),
    1
  )

  return (

    <div
      className="
        flex
        flex-col
        h-full
        min-h-0
        rounded-2xl
        border
        border-zinc-800
        bg-zinc-950
        overflow-hidden
      "
    >

      {/* HEADER */}

      <div
        className="
          shrink-0
          px-4
          pt-4
          pb-3
          border-b
          border-zinc-800
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
                text-xs
                text-zinc-500
                mt-1
              "
            >
              Real-Time Volume Delta
            </div>

          </div>

          <div
            className="
              flex
              items-center
              gap-3
              text-[11px]
              text-zinc-400
              shrink-0
            "
          >

            <div className="flex items-center gap-1">

              <div
                className="
                  w-2
                  h-2
                  rounded-full
                  bg-green-500
                "
              />

              Buy

            </div>

            <div className="flex items-center gap-1">

              <div
                className="
                  w-2
                  h-2
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
          overflow-y-auto
          overflow-x-hidden
        "
      >

        {/* COLUMN HEADER */}

        <div
          className="
            sticky
            top-0
            z-20
            grid
            grid-cols-5
            gap-2
            px-3
            py-2
            text-[10px]
            uppercase
            tracking-wider
            text-zinc-500
            border-b
            border-zinc-800
            bg-zinc-950
            backdrop-blur
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

          {safeLevels.map((level) => {

            const strength =
              (level.total / max) * 100

            const isBuy =
              level.delta >= 0

            return (

              <div
                key={level.price}
                className="
                  relative
                  overflow-hidden
                  rounded-md
                  border
                  border-zinc-900
                  bg-black
                  h-8
                  shrink-0
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
                    grid-cols-5
                    gap-2
                    h-full
                    items-center
                    px-3
                    text-[11px]
                    font-mono
                    tabular-nums
                  "
                >

                  <div
                    className="
                      text-zinc-200
                      truncate
                    "
                  >
                    {level.price.toFixed(1)}
                  </div>

                  <div
                    className="
                      text-right
                      text-green-400
                      truncate
                    "
                  >
                    {level.buyVolume.toFixed(3)}
                  </div>

                  <div
                    className="
                      text-right
                      text-red-400
                      truncate
                    "
                  >
                    {level.sellVolume.toFixed(3)}
                  </div>

                  <div
                    className={`
                      text-right
                      font-semibold
                      truncate
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
                      text-right
                      text-zinc-300
                      truncate
                    "
                  >
                    {level.total.toFixed(3)}
                  </div>

                </div>

              </div>

            )
          })}

          {safeLevels.length === 0 && (

            <div
              className="
                flex
                items-center
                justify-center
                min-h-[240px]
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