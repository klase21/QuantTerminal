// ======================================================
// components/TradingViewChart.tsx
// TRADINGVIEW ADVANCED CHART
// ======================================================

"use client"

import { useEffect, useRef } from "react"

export default function TradingViewChart() {

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {

    if (!ref.current) return

    const existingScript =
      document.getElementById(
        "tradingview-widget-script"
      )

    if (existingScript) return

    const script =
      document.createElement("script")

    script.id =
      "tradingview-widget-script"

    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"

    script.type = "text/javascript"

    script.async = true

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "BINANCE:BTCUSDT",
      interval: "15",
      timezone: "Asia/Seoul",
      theme: "dark",
      style: "1",
      locale: "en",
      hide_top_toolbar: false,
      allow_symbol_change: true,
      save_image: true,
      studies: [
        "Volume@tv-basicstudies",
      ],
    })

    ref.current.appendChild(script)

  }, [])

  return (
    <div
      className="
      tradingview-widget-container
      w-full
      h-full
    "
      ref={ref}
    />
  )
}