"use client"

import { memo } from "react"

interface Level {
  price: number
  volume: number
}

interface Props {
  levels: Level[]
}

function VolumeProfile({
  levels,
}: Props) {

  const safeLevels =
    levels || []

  const maxVolume = Math.max(
    ...safeLevels.map(
      (l) => l.volume || 0
    ),
    1
  )

  const poc =
    safeLevels.length > 0
      ? safeLevels.reduce(
          (max, current) =>
            current.volume >
            max.volume
              ? current
              : max
        )
      : null

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
          flex
          items-center
          justify-between
          px-4
          pt-4
          pb-3
          shrink-0
          border-b
          border-zinc-800
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
            Volume Profile
          </div>

          <div
            className="
              text-xs
              text-zinc-500
              mt-1
            "
          >
            Futures Volume Distribution
          </div>

        </div>

        {poc && (

          <div className="text-right">

            <div
              className="
                text-[10px]
                text-zinc-500
              "
            >
              POC
            </div>

            <div
              className="
                text-sm
                font-bold
                text-orange-400
              "
            >
              {poc.price.toLocaleString()}
            </div>

          </div>

        )}

      </div>

      {/* LEVELS */}

      <div
        className="
          flex-1
          min-h-0
          overflow-y-auto
          overflow-x-hidden
          px-2
          py-2
        "
      >

        <div
          className="
            flex
            flex-col
            gap-[2px]
          "
        >

          {safeLevels.map((level) => {

            const intensity =
              level.volume /
              maxVolume

            return (

              <div
                key={level.price}
                className="
                  relative
                  h-6
                  shrink-0
                  rounded
                  overflow-hidden
                  bg-zinc-900
                "
              >

                {/* HISTOGRAM */}

                <div
                  className="
                    absolute
                    right-0
                    top-0
                    h-full
                    bg-blue-500
                    transition-all
                    duration-150
                  "
                  style={{
                    width: `${
                      intensity * 100
                    }%`,
                    opacity:
                      0.2 + intensity * 0.8,
                  }}
                />

                {/* CONTENT */}

                <div
                  className="
                    relative
                    z-10
                    flex
                    items-center
                    justify-between
                    h-full
                    px-2
                    text-[11px]
                    font-medium
                    whitespace-nowrap
                  "
                >

                  <div
                    className="
                      text-zinc-300
                      truncate
                    "
                  >
                    {level.price.toLocaleString()}
                  </div>

                  <div
                    className="
                      text-blue-300
                      ml-2
                      shrink-0
                    "
                  >
                    {level.volume.toFixed(2)}
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
                h-full
                min-h-[240px]
                text-sm
                text-zinc-500
              "
            >
              Waiting for volume profile...
            </div>

          )}

        </div>

      </div>

    </div>
  )
}

export default memo(VolumeProfile)