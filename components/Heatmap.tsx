"use client"

import {
  useEffect,
  useRef,
} from "react"

import {
  HeatmapFrame,
} from "@/hooks/useDepthHeatmap"

interface Props {
  levels: HeatmapFrame[]
}

export default function Heatmap({
  levels,
}: Props) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas =
      canvasRef.current

    if (!canvas) return

    const ctx =
      canvas.getContext("2d")

    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(
      0,
      0,
      width,
      height
    )

    if (!levels.length) return

    const allPrices =
      levels.flatMap((f) => [
        ...f.bids.map((b) => b.price),
        ...f.asks.map((a) => a.price),
      ])

    const minPrice =
      Math.min(...allPrices)

    const maxPrice =
      Math.max(...allPrices)

    const priceRange =
      maxPrice - minPrice || 1

    const frameWidth =
      width / levels.length

    levels.forEach(
      (frame, xIndex) => {
        const combined = [
          ...frame.bids,
          ...frame.asks,
        ]

        combined.forEach((level) => {
          const y =
            height -
            ((level.price -
              minPrice) /
              priceRange) *
              height

          const intensity =
            Math.min(
              level.liquidity / 5,
              1
            )

          if (level.side === "bid") {
            ctx.fillStyle = `rgba(0,255,120,${intensity})`
          } else {
            ctx.fillStyle = `rgba(255,80,80,${intensity})`
          }

          ctx.fillRect(
            xIndex * frameWidth,
            y,
            frameWidth + 1,
            3
          )
        })
      }
    )
  }, [levels])

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">

      <div className="text-lg font-semibold mb-4">
        Liquidity Heatmap
      </div>

      <canvas
        ref={canvasRef}
        width={700}
        height={320}
        className="w-full h-[320px] rounded"
      />
    </div>
  )
}