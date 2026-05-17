// ======================================================
// components/LightweightChart.tsx
// ======================================================

"use client"

import {
  createChart,
  CandlestickSeries,
} from "lightweight-charts"

import {
  useEffect,
  useRef,
} from "react"

export default function LightweightChart() {

  const chartRef =
    useRef<HTMLDivElement>(null)

  useEffect(() => {

    if (!chartRef.current) return

    const chart = createChart(
      chartRef.current,
      {
        layout: {
          background: {
            color: "#09090b",
          },
          textColor: "#d4d4d8",
        },

        width:
          chartRef.current.clientWidth,

        height: 500,
      }
    )

    const series =
      chart.addSeries(CandlestickSeries)

    series.setData([
      {
        time: "2025-01-01",
        open: 100,
        high: 120,
        low: 90,
        close: 110,
      },
    ])

    return () => chart.remove()

  }, [])

  return (
    <div
      ref={chartRef}
      className="w-full h-full"
    />
  )
}