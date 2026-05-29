"use client"

import Panel from "@/components/ui/Panel"
import TradingChart from "@/components/TradingChart"

import useKlineSocket from "@/hooks/useKlineSocket"

import { Maximize2, X } from "lucide-react"

interface Props {
  id: string
  symbol: string
  timeframe: string

  onRemove: () => void

  onTimeframeChange: (
    id: string,
    timeframe: string
  ) => void
  onOpen?: () => void
}

const timeframes = [
  "1m",
  "5m",
  "15m",
  "1h",
  "4h",
]

export default function ChartTile({
  id,
  symbol,
  timeframe,
  onRemove,
  onTimeframeChange,
  onOpen,
}: Props) {

  const candles =
    useKlineSocket(
      symbol,
      timeframe
    )

  return (
    <Panel
      title={`${symbol.toUpperCase()} ${timeframe}`}
      right={
        <div className="flex items-center gap-2">

          <select
            value={timeframe}
            onChange={(e) =>
              onTimeframeChange(
                id,
                e.target.value
              )
            }
            className="
              bg-black
              border
              border-zinc-700
              rounded-md
              px-2
              py-1
              text-xs
            "
          >
            {timeframes.map((tf) => (
              <option
                key={tf}
                value={tf}
              >
                {tf}
              </option>
            ))}
          </select>

          <button
            onClick={onOpen}
            className="
              text-zinc-400
              hover:text-white
            "
            aria-label="Open advanced chart"
          >
            <Maximize2 size={14} />
          </button>

          <button
            onClick={onRemove}
            className="
              text-zinc-400
              hover:text-red-400
            "
            aria-label="Remove chart"
          >
            <X size={14} />
          </button>

        </div>
      }
    >

	<div
	  className="
		group
		relative
		h-[320px]
		min-h-[320px]
		w-full
		overflow-hidden
		text-left
	  "
	>
	  <TradingChart
		data={candles}
	  />
	  <button
		type="button"
		onClick={onOpen}
		className="absolute inset-0 z-20 hidden items-center justify-center bg-black/35 text-xs font-semibold text-white group-hover:flex"
		aria-label={`Open ${symbol.toUpperCase()} ${timeframe} advanced chart`}
	  >
		Open advanced chart
	  </button>
	</div>

    </Panel>
  )
}