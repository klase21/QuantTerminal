"use client"

import {
  createChart,
  ColorType,
  CandlestickSeries,
} from "lightweight-charts"

import {
  useEffect,
  useRef,
} from "react"

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface Props {
  data: Candle[]
}

export default function TradingChart({
  data,
}: Props) {
  const chartContainerRef =
    useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current)
      return

    const chart = createChart(
      chartContainerRef.current,
      {
        layout: {
          background: {
            type: ColorType.Solid,
            color: "#09090b",
          },
          textColor: "#a1a1aa",
        },

        grid: {
          vertLines: {
            color: "#18181b",
          },
          horzLines: {
            color: "#18181b",
          },
        },

        width:
          chartContainerRef.current
            .clientWidth,

        height: 500,

        crosshair: {
          mode: 1,
        },

        rightPriceScale: {
          borderColor: "#27272a",
        },

        timeScale: {
          borderColor: "#27272a",
        },
      }
    )

    const candleSeries =
      chart.addSeries(
        CandlestickSeries,
        {
          upColor: "#22c55e",
          downColor: "#ef4444",

          borderUpColor: "#22c55e",
          borderDownColor: "#ef4444",

          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        }
      )

    candleSeries.setData(data)

    const handleResize = () => {
      chart.applyOptions({
        width:
          chartContainerRef.current
            ?.clientWidth,
      })
    }

    window.addEventListener(
      "resize",
      handleResize
    )

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      )

      chart.remove()
    }
  }, [data])

  return (
    <div
      ref={chartContainerRef}
      className="w-full"
    />
  )
}