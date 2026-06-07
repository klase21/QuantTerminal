"use client"

const items = [
  { symbol: "DXY", value: "99.44", change: "+0.12%", signal: "Dollar Pressure" },
  { symbol: "US10Y", value: "4.65", change: "-0.30%", signal: "Tech Relief" },
  { symbol: "NASDAQ", value: "26028", change: "+0.81%", signal: "Risk-On" },
  { symbol: "BTC", value: "77165", change: "+0.53%", signal: "Bullish" },
  { symbol: "ETH", value: "2127", change: "+0.81%", signal: "Bullish" },
]

export default function MacroMiniCardsRow() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {items.map((item) => (
        <div
          key={item.symbol}
          className="min-w-[160px] rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-zinc-500">
              {item.symbol}
            </div>

            <div className="text-[10px] text-emerald-400">
              {item.change}
            </div>
          </div>

          <div className="mt-1 text-sm font-semibold text-white">
            {item.value}
          </div>

          <div className="mt-1 text-[10px] text-zinc-400">
            {item.signal}
          </div>
        </div>
      ))}
    </div>
  )
}
