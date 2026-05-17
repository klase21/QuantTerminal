// ======================================================
// components/HeatmapCanvas.tsx
// REAL LIQUIDITY HEATMAP
// ======================================================

"use client"

import { useEffect, useRef } from "react"

interface HeatmapLevel {
  price: number
  liquidity: number
  side: "bid" | "ask"
}

interface HeatmapFrame {
  time: number
  levels: HeatmapLevel[]
}

interface Props {
  frames: HeatmapFrame[]
  width?: number
  height?: number
  maxLiquidity?: number
}

export default function HeatmapCanvas({
  frames,
  width = 900,
  height = 400,
  maxLiquidity = 50,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    if (!frames.length) return

    // ======================================================
    // PRICE RANGE
    // ======================================================

    let minPrice = Infinity
    let maxPrice = -Infinity

    frames.forEach((frame) => {
      frame.levels.forEach((level) => {
        if (level.price < minPrice) minPrice = level.price
        if (level.price > maxPrice) maxPrice = level.price
      })
    })

    const priceRange = maxPrice - minPrice || 1

    // ======================================================
    // GRID SIZE
    // ======================================================

    const frameWidth = width / frames.length

    // ======================================================
    // DRAW HEATMAP
    // ======================================================

    frames.forEach((frame, frameIndex) => {
      const x = frameIndex * frameWidth

      frame.levels.forEach((level) => {
        const normalized =
          Math.min(level.liquidity, maxLiquidity) / maxLiquidity

        const y =
          height -
          ((level.price - minPrice) / priceRange) * height

        const alpha = Math.max(normalized, 0.05)

        // bids = green
        // asks = red

        if (level.side === "bid") {
          ctx.fillStyle = `rgba(0,255,120,${alpha})`
        } else {
          ctx.fillStyle = `rgba(255,60,60,${alpha})`
        }

        ctx.fillRect(
          x,
          y,
          frameWidth + 1,
          3
        )
      })
    })

    // ======================================================
    // BORDER
    // ======================================================

    ctx.strokeStyle = "rgba(255,255,255,0.08)"
    ctx.strokeRect(0, 0, width, height)

  }, [frames, width, height, maxLiquidity])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full rounded-xl bg-black"
    />
  )
}