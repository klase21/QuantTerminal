// ======================================================
// components/Orderbook.tsx
// ======================================================

"use client"

interface Level {
  price: number
  qty: number
}

interface Props {
  bids: Level[]
  asks: Level[]
}

export default function Orderbook({
  bids,
  asks,
}: Props) {

  return (

    <div
      className="
        grid
        grid-cols-2
        gap-4
        text-sm
      "
    >

      {/* ======================================================
          BIDS
      ====================================================== */}

      <div>

        <div
          className="
            mb-2
            text-emerald-400
            font-semibold
          "
        >
          Bids
        </div>

        <div
          className="
            space-y-1
          "
        >

          {bids.map(
            (
              bid,
              index
            ) => (

              <div

                key={`${bid.price}-${index}`}

                className="
                  flex
                  items-center
                  justify-between
                  rounded-lg
                  bg-emerald-500/5
                  px-2
                  py-1
                "
              >

                <span
                  className="
                    text-emerald-400
                  "
                >
                  {bid.price.toLocaleString()}
                </span>

                <span
                  className="
                    text-zinc-400
                  "
                >
                  {bid.qty.toLocaleString()}
                </span>

              </div>

            )
          )}

        </div>

      </div>

      {/* ======================================================
          ASKS
      ====================================================== */}

      <div>

        <div
          className="
            mb-2
            text-red-400
            font-semibold
          "
        >
          Asks
        </div>

        <div
          className="
            space-y-1
          "
        >

          {asks.map(
            (
              ask,
              index
            ) => (

              <div

                key={`${ask.price}-${index}`}

                className="
                  flex
                  items-center
                  justify-between
                  rounded-lg
                  bg-red-500/5
                  px-2
                  py-1
                "
              >

                <span
                  className="
                    text-red-400
                  "
                >
                  {ask.price.toLocaleString()}
                </span>

                <span
                  className="
                    text-zinc-400
                  "
                >
                  {ask.qty.toLocaleString()}
                </span>

              </div>

            )
          )}

        </div>

      </div>

    </div>

  )

}