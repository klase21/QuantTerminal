// ======================================================
// components/MarketOverview.tsx
// ======================================================

"use client"

interface Ticker {

  symbol: string

  price: number

  change24h: number

  volume: number

  exchange: string

}

interface Props {

  tickers?: Ticker[]

}

export default function MarketOverview({
  tickers = [],
}: Props) {

  return (

    <div className="space-y-3">

      <div
        className="
          text-sm
          font-semibold
        "
      >
        Market Overview
      </div>

      {tickers.length === 0 && (

        <div
          className="
            text-xs
            text-zinc-500
          "
        >
          No market data
        </div>

      )}

      {tickers.map((ticker) => (

        <div
          key={ticker.symbol}
          className="
            flex
            items-center
            justify-between
            rounded-xl
            border
            border-zinc-800
            bg-zinc-900
            px-3
            py-2
          "
        >

          <div>

            <div className="text-sm">
              {ticker.symbol}
            </div>

            <div
              className="
                text-xs
                text-zinc-500
              "
            >
              {ticker.exchange}
            </div>

          </div>

          <div className="text-right">

            <div className="text-sm">
              $
              {ticker.price.toLocaleString()}
            </div>

            <div
              className={
                ticker.change24h >= 0
                  ? "text-green-500 text-xs"
                  : "text-red-500 text-xs"
              }
            >
              {ticker.change24h.toFixed(2)}%
            </div>

          </div>

        </div>

      ))}

    </div>

  )

}