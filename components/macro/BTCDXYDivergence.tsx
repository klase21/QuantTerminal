// ======================================================
// components/macro/BTCDXYDivergence.tsx
// ======================================================

"use client"

interface MacroAsset {

  history?: number[]

  changePercent?: number

}

interface Props {

  btc?: MacroAsset

  dxy?: MacroAsset

}

export default function BTCDXYDivergence({
  btc,
  dxy,
}: Props) {

  // ======================================================
  // SAFE HISTORY
  // ======================================================

  const btcHistory =
    Array.isArray(
      btc?.history
    )
      ? btc.history
      : []

  const dxyHistory =
    Array.isArray(
      dxy?.history
    )
      ? dxy.history
      : []

  // ======================================================
  // NORMALIZE DATA
  // ======================================================

  function normalize(
    arr?: unknown
  ): number[] {

    if (
      !Array.isArray(arr)
    ) {

      return []

    }

    const clean =
      arr.filter(
        (
          v
        ): v is number =>

          typeof v ===
            "number" &&
          Number.isFinite(v)
      )

    if (
      clean.length === 0
    ) {

      return []

    }

    const min =
      Math.min(...clean)

    const max =
      Math.max(...clean)

    // flat chart

    if (max === min) {

      return clean.map(
        () => 50
      )

    }

    return clean.map(
      (v) =>

        (
          (
            v - min
          ) /
          (
            max - min
          )
        ) * 100
    )

  }

  // ======================================================
  // NORMALIZED SERIES
  // ======================================================

  const btcNormalized =
    normalize(
      btcHistory
    )

  const dxyNormalized =
    normalize(
      dxyHistory
    )

  // ======================================================
  // CREATE SVG PATH
  // ======================================================

  function createPath(
    data?: number[]
  ) {

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {

      return ""

    }

    return data
      .map(
        (
          value,
          index
        ) => {

          const x =
            (
              index /
              Math.max(
                data.length - 1,
                1
              )
            ) * 100

          const y =
            100 - value

          return `${
            index === 0
              ? "M"
              : "L"
          } ${x} ${y}`

        }
      )
      .join(" ")

  }

  // ======================================================
  // DIVERGENCE SCORE
  // ======================================================

  const btcChange =
    Number(
      btc?.changePercent ??
        0
    )

  const dxyChange =
    Number(
      dxy?.changePercent ??
        0
    )

  const divergenceValue =
    btcChange -
    dxyChange

  const divergence =
    divergenceValue.toFixed(
      2
    )

  const bullish =
    divergenceValue > 0

  // ======================================================
  // EMPTY STATE
  // ======================================================

  const hasData =
    btcNormalized.length >
      0 ||
    dxyNormalized.length >
      0

  // ======================================================
  // UI
  // ======================================================

  return (

    <div
      className="
        rounded-2xl
        border
        border-zinc-800
        bg-zinc-950
        p-4
      "
    >

      {/* HEADER */}

      <div
        className="
          mb-4
          flex
          items-center
          justify-between
        "
      >

        <div>

          <div
            className="
              text-sm
              font-bold
              text-white
            "
          >

            BTC vs DXY

          </div>

          <div
            className="
              text-xs
              text-zinc-500
            "
          >

            Inverse Correlation
            Engine

          </div>

        </div>

        <div
          className={`
            text-sm
            font-bold

            ${
              bullish
                ? "text-emerald-400"
                : "text-red-400"
            }
          `}
        >

          {
            bullish
              ? "+"
              : ""
          }

          {divergence}%

        </div>

      </div>

      {/* CHART */}

      <div
        className="
          relative
          overflow-hidden
          rounded-xl
          border
          border-zinc-800
          bg-black
        "
      >

        {

          hasData ? (

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="
                h-44
                w-full
              "
            >

              {/* GRID */}

              {[20, 40, 60, 80]
                .map(
                  (y) => (

                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="100"
                      y2={y}
                      stroke="#27272a"
                      strokeWidth="0.4"
                    />

                  )
                )}

              {/* BTC */}

              <path
                d={createPath(
                  btcNormalized
                )}
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* DXY */}

              <path
                d={createPath(
                  dxyNormalized
                )}
                fill="none"
                stroke="#f87171"
                strokeWidth="2"
                strokeLinecap="round"
              />

            </svg>

          ) : (

            <div
              className="
                flex
                h-44
                items-center
                justify-center
                text-sm
                text-zinc-500
              "
            >

              No macro data available

            </div>

          )

        }

      </div>

      {/* LEGEND */}

      <div
        className="
          mt-3
          flex
          items-center
          gap-4
          text-xs
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <div
            className="
              h-2
              w-2
              rounded-full
              bg-emerald-400
            "
          />

          <span
            className="
              text-zinc-400
            "
          >

            BTC

          </span>

        </div>

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <div
            className="
              h-2
              w-2
              rounded-full
              bg-red-400
            "
          />

          <span
            className="
              text-zinc-400
            "
          >

            DXY

          </span>

        </div>

      </div>

    </div>

  )

}