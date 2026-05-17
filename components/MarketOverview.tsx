"use client"

interface Props {
  tickers: Record<string, any>
}

export default function MarketOverview({
  tickers = {},
}: Props) {

  const coins = Object.values(tickers || {})

  return (
    <div className="rounded-2xl border border-zinc-800 p-6 bg-zinc-950">
      <h2 className="text-xl font-bold mb-4">
        Market Overview
      </h2>

      <div className="space-y-4">
        {coins.map((coin: any) => (
          <div
            key={coin.symbol}
            className="flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">
                {coin.symbol}
              </div>

              <div className="text-sm text-zinc-400">
                ${coin.price?.toFixed(2)}
              </div>
            </div>

            <div
              className={
                coin.change >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {coin.change?.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}