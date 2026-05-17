"use client"

import Panel from "@/components/ui/Panel"
import TradingChart from "@/components/TradingChart"

import useKlineSocket from "@/hooks/useKlineSocket"

import { X } from "lucide-react"

interface Props {
  id: string
  symbol: string
  timeframe: string

  onRemove: () => void
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
            onClick={onRemove}
            className="
              text-zinc-400
              hover:text-red-400
            "
          >
            <X size={14} />
          </button>

        </div>
      }
    >

      <div className="h-[320px]">

        <TradingChart
          data={candles}
        />

      </div>

    </Panel>
  )
}