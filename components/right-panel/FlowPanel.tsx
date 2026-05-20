"use client"

<<<<<<< HEAD
=======
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Waves,
} from "lucide-react"

>>>>>>> 41de28d (feat(flow): add flow summary cards, whale tracking, delta/cvd metrics, and trade intensity)
type Props = {
  trades: any[]
  flow: any
}

export default function FlowPanel({
  trades,
  flow,
}: Props) {

<<<<<<< HEAD
  return (

    <div className="p-4 text-sm text-zinc-400">

      Flow Panel Coming Soon
=======
  const safeTrades =
    trades || []

  const recentTrades =
    [...safeTrades]
      .reverse()
      .slice(0, 150)

  const whaleTrades =
    recentTrades.filter(
      (trade: any) => {
        const price = Number(
          trade.price || trade.p || 0
        )

        const qty = Number(
          trade.qty || trade.q || 0
        )

        return price * qty > 100000
      }
    )

  const tradeIntensity =
    recentTrades.length > 120
      ? "EXTREME"
      : recentTrades.length > 80
      ? "HIGH"
      : recentTrades.length > 40
      ? "NORMAL"
      : "LOW"

  const intensityColor =
    tradeIntensity === "EXTREME"
      ? "text-yellow-400"
      : tradeIntensity === "HIGH"
      ? "text-orange-400"
      : tradeIntensity === "NORMAL"
      ? "text-blue-400"
      : "text-zinc-500"

  return (

    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
        overflow-hidden
      "
    >

      {/* HEADER */}

      <div
        className="
          shrink-0
          border-b
          border-zinc-800
          px-4
          py-3
        "
      >

        <div
          className="
            text-sm
            font-semibold
            text-white
          "
        >
          Trade Flow
        </div>

        <div
          className="
            mt-1
            text-xs
            text-zinc-500
          "
        >
          Real-time aggressive order flow
        </div>

      </div>

      {/* SUMMARY CARDS */}

      <div
        className="
          shrink-0
          grid
          grid-cols-2
          gap-2
          border-b
          border-zinc-800
          p-3
        "
      >

        <div
          className="
            rounded-2xl
            border
            border-green-900/40
            bg-green-500/10
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              Buy Volume
            </div>

            <ArrowUpRight
              size={14}
              className="text-green-400"
            />

          </div>

          <div
            className="
              mt-2
              text-lg
              font-bold
              text-green-400
            "
          >
            {Number(
              flow?.buyVolume || 0
            ).toFixed(2)}
          </div>

        </div>

        <div
          className="
            rounded-2xl
            border
            border-red-900/40
            bg-red-500/10
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              Sell Volume
            </div>

            <ArrowDownRight
              size={14}
              className="text-red-400"
            />

          </div>

          <div
            className="
              mt-2
              text-lg
              font-bold
              text-red-400
            "
          >
            {Number(
              flow?.sellVolume || 0
            ).toFixed(2)}
          </div>

        </div>

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-900
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              Delta / CVD
            </div>

            <Waves
              size={14}
              className="text-cyan-400"
            />

          </div>

          <div
            className={`
              mt-2
              text-sm
              font-bold
              ${
                (flow?.delta || 0) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }
            `}
          >
            Δ {Number(
              flow?.delta || 0
            ).toFixed(2)}
          </div>

          <div
            className={`
              mt-1
              text-xs
              ${
                (flow?.cvd || 0) >= 0
                  ? "text-green-300"
                  : "text-red-300"
              }
            `}
          >
            CVD {Number(
              flow?.cvd || 0
            ).toFixed(2)}
          </div>

        </div>

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-900
            p-3
          "
        >

          <div className="flex items-center justify-between">

            <div className="text-[11px] text-zinc-500">
              Trade Intensity
            </div>

            <Activity
              size={14}
              className={intensityColor}
            />

          </div>

          <div
            className={`
              mt-2
              text-sm
              font-bold
              ${intensityColor}
            `}
          >
            {tradeIntensity}
          </div>

          <div className="mt-1 text-xs text-zinc-500">
            {recentTrades.length} recent trades
          </div>

        </div>

      </div>

      {/* WHALE SUMMARY */}

      <div
        className="
          shrink-0
          border-b
          border-zinc-800
          px-4
          py-3
        "
      >

        <div className="flex items-center justify-between">

          <div>

            <div className="text-xs font-semibold text-white">
              Whale Activity
            </div>

            <div className="mt-1 text-[11px] text-zinc-500">
              Trades above $100k notional
            </div>

          </div>

          <div
            className="
              rounded-full
              border
              border-yellow-500/20
              bg-yellow-500/10
              px-3
              py-1
              text-xs
              font-semibold
              text-yellow-400
            "
          >
            {whaleTrades.length}
          </div>

        </div>

      </div>

      {/* FLOW LIST */}

      <div
        className="
          flex-1
          min-h-0
          overflow-y-auto
          px-2
          py-2
        "
      >

        <div
          className="
            flex
            flex-col
            gap-2
          "
        >

          {recentTrades.map(
            (trade: any, index: number) => {

              const side =
                trade.side ||
                trade.S ||
                "buy"

              const price =
                Number(
                  trade.price ||
                  trade.p ||
                  0
                )

              const qty =
                Number(
                  trade.qty ||
                  trade.q ||
                  0
                )

              const total =
                price * qty

              const isBuy =
                side === "buy" ||
                side === "BUY"

              const isWhale =
                total > 100000

              return (

                <div
                  key={`${price}-${index}`}
                  className={`
                    rounded-2xl
                    border
                    px-3
                    py-2
                    transition-all

                    ${
                      isBuy
                        ? `
                          border-green-900
                          bg-green-500/10
                        `
                        : `
                          border-red-900
                          bg-red-500/10
                        `
                    }

                    ${
                      isWhale
                        ? `
                          ring-1
                          ring-yellow-500/40
                        `
                        : ""
                    }
                  `}
                >

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >

                    <div
                      className={`
                        text-xs
                        font-semibold
                        uppercase

                        ${
                          isBuy
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      `}
                    >
                      {isBuy
                        ? "BUY"
                        : "SELL"}
                    </div>

                    <div
                      className="
                        flex-1
                        text-center
                        font-mono
                        text-sm
                        text-zinc-200
                      "
                    >
                      {price.toLocaleString()}
                    </div>

                    <div
                      className="
                        text-right
                        font-mono
                        text-xs
                        text-zinc-400
                      "
                    >
                      {qty.toFixed(3)}
                    </div>

                  </div>

                  <div
                    className="
                      mt-2
                      flex
                      items-center
                      justify-between
                    "
                  >

                    <div
                      className="
                        text-[11px]
                        text-zinc-500
                      "
                    >
                      Notional
                    </div>

                    <div
                      className={`
                        flex
                        items-center
                        gap-2
                        text-xs
                        font-semibold

                        ${
                          isWhale
                            ? "text-yellow-400"
                            : "text-zinc-300"
                        }
                      `}
                    >

                      {isWhale && (
                        <span>
                          🐋
                        </span>
                      )}

                      <span>
                        $
                        {Math.round(
                          total
                        ).toLocaleString()}
                      </span>

                    </div>

                  </div>

                </div>

              )

            }
          )}

          {recentTrades.length === 0 && (

            <div
              className="
                flex
                items-center
                justify-center
                py-10
                text-sm
                text-zinc-500
              "
            >
              Waiting for trade flow...
            </div>

          )}

        </div>

      </div>
>>>>>>> 41de28d (feat(flow): add flow summary cards, whale tracking, delta/cvd metrics, and trade intensity)

    </div>

  )
<<<<<<< HEAD
}
=======

}
>>>>>>> 41de28d (feat(flow): add flow summary cards, whale tracking, delta/cvd metrics, and trade intensity)
