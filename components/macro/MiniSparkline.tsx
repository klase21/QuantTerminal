// ======================================================
// components/macro/MiniSparkline.tsx
// ======================================================

"use client"

interface Props {

  values: number[]

  positive?: boolean

  width?: number

  height?: number

}

export default function MiniSparkline({

  values,

  positive = true,

  width = 120,

  height = 36,

}: Props) {

  // ======================================================
  // EMPTY
  // ======================================================

  if (
    !values ||
    values.length < 2
  ) {

    return null

  }

  // ======================================================
  // NORMALIZE
  // ======================================================

  const min =
    Math.min(...values)

  const max =
    Math.max(...values)

  const range =
    max - min || 1

  // ======================================================
  // BUILD PATH
  // ======================================================

  const points =
    values.map(
      (
        value,
        index
      ) => {

        const x =
          (index /
            (values.length - 1)) *
          width

        const y =
          height -

          (
            (
              value - min
            ) / range
          ) * height

        return `${x},${y}`

      }
    )

  const path =
    points.join(" ")

  // ======================================================
  // COLORS
  // ======================================================

  const stroke =
    positive

      ? "#4ade80"

      : "#f87171"

  const fill =
    positive

      ? "rgba(74,222,128,0.12)"

      : "rgba(248,113,113,0.12)"

  // ======================================================
  // AREA PATH
  // ======================================================

  const areaPath = `

    M 0 ${height}

    L ${points.join(" L ")}

    L ${width} ${height}

    Z

  `

  // ======================================================
  // UI
  // ======================================================

  return (

    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="
        overflow-visible
      "
    >

      {/* AREA */}

      <path
        d={areaPath}
        fill={fill}
      />

      {/* LINE */}

      <polyline

        fill="none"

        stroke={stroke}

        strokeWidth="2"

        strokeLinecap="round"

        strokeLinejoin="round"

        points={path}

      />

    </svg>

  )

}