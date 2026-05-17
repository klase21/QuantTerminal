"use client"

export interface HeatLevel {
  price: number
  liquidity: number
  side: "bid" | "ask"
}

interface Props {
  levels: HeatLevel[]
}

export default function Heatmap({
  levels,
}: Props) {

  if (!levels.length) {

    return (

      <div
        className="
          h-[400px]
          flex
          items-center
          justify-center
          text-zinc-500
          text-sm
        "
      >
        No heatmap data
      </div>

    )

  }

  const maxLiquidity =
    Math.max(
      ...levels.map(
        (l) => l.liquidity
      )
    )

  return (

    <div
      className="
        h-[400px]
        overflow-y-auto
        space-y-[2px]
      "
    >

      {levels.map(
        (
          level,
          index
        ) => {

          const intensity =
            level.liquidity /
            maxLiquidity

          return (

            <div
              key={index}
              className="
                relative
                h-5
                rounded
                overflow-hidden
                bg-zinc-900
              "
            >

              {/* HEAT */}
              <div
                className={`
                  absolute
                  inset-y-0
                  left-0

                  ${
                    level.side === "bid"
                      ? "bg-emerald-500/70"
                      : "bg-red-500/70"
                  }
                `}
                style={{
                  width: `${
                    intensity * 100
                  }%`,
                }}
              />

              {/* TEXT */}
              <div
                className="
                  relative
                  z-10
                  flex
                  items-center
                  justify-between
                  px-2
                  text-[10px]
                  text-white
                "
              >

                <span>
                  {level.price.toFixed(2)}
                </span>

                <span>
                  {Math.round(
                    level.liquidity
                  ).toLocaleString()}
                </span>

              </div>

            </div>

          )

        }
      )}

    </div>

  )

}